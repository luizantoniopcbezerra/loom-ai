package io.loomai.backend.terminal;

import io.loomai.backend.shared.shell.UserShellResolver;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TerminalWebSocketHandler implements WebSocketHandler {

    private record SessionState(Process process, BufferedWriter writer) {}

    private final Map<String, SessionState> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession ws) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(UserShellResolver.interactiveShell())
                .redirectErrorStream(true);
        pb.environment().put("TERM", "dumb");

        Process process = pb.start();
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()));
        sessions.put(ws.getId(), new SessionState(process, writer));

        Thread.ofVirtual().start(() -> {
            try {
                byte[] buf = new byte[4096];
                InputStream is = process.getInputStream();
                int n;
                while ((n = is.read(buf)) != -1) {
                    String chunk = new String(buf, 0, n);
                    if (ws.isOpen()) {
                        synchronized (ws) {
                            ws.sendMessage(new TextMessage(chunk));
                        }
                    }
                }
            } catch (IOException ignored) {}
        });
    }

    @Override
    public void handleMessage(WebSocketSession ws, WebSocketMessage<?> message) throws Exception {
        SessionState state = sessions.get(ws.getId());
        if (state != null && message instanceof TextMessage tm) {
            state.writer().write(tm.getPayload());
            state.writer().flush();
        }
    }

    @Override
    public void handleTransportError(WebSocketSession ws, Throwable ex) {
        cleanup(ws.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession ws, CloseStatus status) {
        cleanup(ws.getId());
    }

    private void cleanup(String id) {
        SessionState state = sessions.remove(id);
        if (state != null) state.process().destroyForcibly();
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
}

package io.loomai.backend.conversation;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.loomai.backend.shared.error.ApiException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalAgentConversationReplyServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void shouldExtractAssistantTextFromCodexJsonStream() throws Exception {
        LocalAgentConversationReplyService service = new LocalAgentConversationReplyService(new ObjectMapper());
        Method extractText = LocalAgentConversationReplyService.class.getDeclaredMethod("extractText", String.class);
        extractText.setAccessible(true);

        String output = """
                {"type":"thread.started","thread_id":"019e6714-8e36-74d3-b564-894381bc9d06"}
                {"type":"turn.started"}
                {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"oi"}}
                {"type":"turn.completed","usage":{"input_tokens":9902,"cached_input_tokens":8064,"output_tokens":63}}
                """;

        String parsed = (String) extractText.invoke(service, output);

        assertThat(parsed).isEqualTo("oi");
    }

    @Test
    void shouldCancelActiveLocalExecution() throws Exception {
        LocalAgentConversationReplyService service = new LocalAgentConversationReplyService(new ObjectMapper());
        Method runLocalCommand = LocalAgentConversationReplyService.class.getDeclaredMethod(
                "runLocalCommand",
                String.class,
                String.class,
                List.class,
                String.class,
                String.class,
                boolean.class
        );
        runLocalCommand.setAccessible(true);

        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
            try {
                return (String) runLocalCommand.invoke(service, "conversation-1", "sleep 30", List.of(), null, null, false);
            } catch (Exception exception) {
                throw new RuntimeException(exception);
            }
        });

        boolean cancelled = false;
        for (int index = 0; index < 20; index++) {
            if (service.cancelReply("conversation-1")) {
                cancelled = true;
                break;
            }
            TimeUnit.MILLISECONDS.sleep(50);
        }

        assertThat(cancelled).isTrue();
        assertThatThrownBy(() -> future.get(2, TimeUnit.SECONDS))
                .isInstanceOf(ExecutionException.class)
                .hasCauseInstanceOf(RuntimeException.class)
                .rootCause()
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("cancelada");
    }

    @Test
    void shouldPreferBinaryPathWhenAgentProvidesIt() throws Exception {
        LocalAgentConversationReplyService service = new LocalAgentConversationReplyService(new ObjectMapper());
        Method resolveCommand = LocalAgentConversationReplyService.class.getDeclaredMethod("resolveCommand", Map.class);
        resolveCommand.setAccessible(true);

        Path binary = Files.createFile(tempDir.resolve("opencode"));
        binary.toFile().setExecutable(true);

        String command = (String) resolveCommand.invoke(service, Map.of(
                "command", "opencode",
                "binaryPath", binary.toString()
        ));

        assertThat(command).isEqualTo(binary.toString());
    }
}

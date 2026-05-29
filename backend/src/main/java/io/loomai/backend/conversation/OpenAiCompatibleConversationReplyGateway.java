package io.loomai.backend.conversation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class OpenAiCompatibleConversationReplyGateway implements ConversationReplyGateway {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(60);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String chatUrl;
    private final String apiKey;
    private final String model;

    public OpenAiCompatibleConversationReplyGateway(
            ObjectMapper objectMapper,
            @Value("${loom.llm.chat-url:}") String chatUrl,
            @Value("${loom.llm.api-key:}") String apiKey,
            @Value("${loom.llm.model:}") String model
    ) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.chatUrl = chatUrl == null ? "" : chatUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
    }

    @Override
    public String generateReply(List<Message> history) {
        if (chatUrl.isBlank() || apiKey.isBlank() || model.isBlank()) {
            throw new ApiException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Configure LOOM_LLM_CHAT_URL, LOOM_LLM_API_KEY e LOOM_LLM_MODEL para habilitar respostas reais."
            );
        }

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "model", model,
                    "messages", history.stream()
                            .map(message -> Map.of(
                                    "role", normalizeRole(message.role()),
                                    "content", message.content()
                            ))
                            .toList()
            ));

            HttpRequest request = HttpRequest.newBuilder(URI.create(chatUrl))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException(
                        ErrorCode.SERVICE_UNAVAILABLE,
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "O provedor de IA respondeu com erro: " + summarizeBody(response.body())
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            if (contentNode.isMissingNode() || contentNode.asText().isBlank()) {
                throw new ApiException(
                        ErrorCode.SERVICE_UNAVAILABLE,
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "O provedor de IA retornou uma resposta vazia."
                );
            }

            return contentNode.asText();
        } catch (ApiException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ApiException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Falha ao ler a resposta do provedor de IA."
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ApiException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "A requisicao para o provedor de IA foi interrompida."
            );
        } catch (Exception exception) {
            throw new ApiException(
                    ErrorCode.SERVICE_UNAVAILABLE,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "O backend local nao conseguiu falar com o provedor de IA."
            );
        }
    }

    private String normalizeRole(String role) {
        return switch (role) {
            case "assistant", "system" -> role;
            default -> "user";
        };
    }

    private String summarizeBody(String body) {
        if (body == null || body.isBlank()) {
            return "sem detalhes";
        }

        String compact = body.replace('\n', ' ').replace('\r', ' ').trim();
        if (compact.length() <= 160) {
            return compact;
        }
        return compact.substring(0, 160).trim() + "...";
    }
}

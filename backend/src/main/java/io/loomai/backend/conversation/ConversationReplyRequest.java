package io.loomai.backend.conversation;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ConversationReplyRequest(
        @JsonProperty("agent_id")
        String agentId,
        @JsonProperty("agent_name")
        String agentName,
        @JsonProperty("model_name")
        String modelName
) {
}

package io.loomai.backend.session;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public record SessionRequest(
    @JsonProperty("workflow_id") String workflowId,
    @JsonProperty("agent_ids") List<String> agentIds,
    @JsonProperty("params") Map<String, String> params,
    @JsonProperty("workspace_path") String workspacePath
) {
    public SessionRequest {
        if (agentIds == null) agentIds = List.of();
        if (params == null) params = Map.of();
    }
}

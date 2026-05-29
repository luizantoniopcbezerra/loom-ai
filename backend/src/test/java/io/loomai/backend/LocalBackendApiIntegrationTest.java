package io.loomai.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.loomai.backend.agent.Agent;
import io.loomai.backend.agent.LocalAgentScanner;
import io.loomai.backend.conversation.ConversationReplyGateway;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LocalBackendApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private ConversationReplyGateway conversationReplyGateway;

    @MockBean
    private LocalAgentScanner localAgentScanner;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.execute("DELETE FROM messages");
        jdbcTemplate.execute("DELETE FROM conversations");
        jdbcTemplate.execute("DELETE FROM workflows");
        jdbcTemplate.execute("DELETE FROM agents");
        jdbcTemplate.execute("DELETE FROM settings");
        jdbcTemplate.execute("DELETE FROM profiles");
    }

    @Test
    void shouldReturnHealthStatus() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.database").value("up"));
    }

    @Test
    void shouldCreateAndReadProfile() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "Tiago", "color", "#00b8d4"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("Tiago"))
                .andExpect(jsonPath("$.color").value("#00b8d4"))
                .andExpect(jsonPath("$.id").isString());

        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("Tiago"));
    }

    @Test
    void shouldReturnNotFoundWhenProfileDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void shouldValidateProfilePayload() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "", "color", "blue"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.fieldViolations").isArray());
    }

    @Test
    void shouldCreateAndReadSettings() throws Exception {
        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "accentColor", "#d9357a",
                                "sidebarExpanded", true,
                                "theme", "dark"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.theme").value("dark"))
                .andExpect(jsonPath("$.sidebarExpanded").value(true));

        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accentColor").value("#d9357a"));
    }

    @Test
    void shouldCreateAndListLocalAgents() throws Exception {
        mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Codex Coder",
                                  "adapterType": "codex_local",
                                  "adapterConfig": {
                                    "command": "codex",
                                    "model": "gpt-5.3-codex"
                                  },
                                  "status": "active"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Codex Coder"))
                .andExpect(jsonPath("$.adapter_type").value("codex_local"))
                .andExpect(jsonPath("$.adapter_config.model").value("gpt-5.3-codex"));

        mockMvc.perform(get("/api/agents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Codex Coder"))
                .andExpect(jsonPath("$[0].adapter_type").value("codex_local"));
    }

    @Test
    void shouldUpdateExistingLocalAgent() throws Exception {
        jdbcTemplate.update(
                """
                INSERT INTO agents (id, name, adapter_type, adapter_config_json, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                "2a4f6f95-309b-44ef-8f75-f1c8cce56c9b",
                "Claude Architect",
                "claude_local",
                "{\"command\":\"claude\",\"model\":\"claude-sonnet-4-6\"}",
                "active",
                "2026-01-01T00:00:00Z"
        );

        mockMvc.perform(put("/api/agents/{agentId}", "2a4f6f95-309b-44ef-8f75-f1c8cce56c9b")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Claude Reviewer",
                                  "adapterType": "claude_local",
                                  "adapterConfig": {
                                    "command": "claude",
                                    "model": "claude-opus-4-7"
                                  },
                                  "status": "idle"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Claude Reviewer"))
                .andExpect(jsonPath("$.status").value("idle"))
                .andExpect(jsonPath("$.adapter_config.model").value("claude-opus-4-7"));
    }

    @Test
    void shouldListAdapterModels() throws Exception {
        mockMvc.perform(get("/api/adapters/{adapterType}/models", "codex_local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("gpt-5.4"))
                .andExpect(jsonPath("$[1].id").value("gpt-5.3-codex"));
    }

    @Test
    void shouldRescanAgentsWithoutDuplicatingAndRemoveMissingAutoDetectedOnes() throws Exception {
        jdbcTemplate.update(
                """
                INSERT INTO agents (id, name, adapter_type, adapter_config_json, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                "stale-auto-agent",
                "Claude Code",
                "claude_local",
                "{\"command\":\"claude\",\"binaryPath\":\"/old/.claude\",\"detectedVersion\":\"old\",\"model\":\"claude-sonnet-4-6\"}",
                "idle",
                "2026-01-01T00:00:00Z"
        );
        jdbcTemplate.update(
                """
                INSERT INTO agents (id, name, adapter_type, adapter_config_json, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                "manual-agent",
                "Manual Codex",
                "codex_local",
                "{\"command\":\"codex\",\"model\":\"gpt-5.3-codex\"}",
                "active",
                "2026-01-01T00:00:00Z"
        );

        Agent detectedClaude = new Agent(
                "detected-claude-agent",
                "Claude Code",
                "claude_local",
                Map.of(
                        "command", "claude",
                        "binaryPath", "/home/test/.claude",
                        "detectedVersion", "1.2.3",
                        "model", "claude-sonnet-4-6"
                ),
                "active",
                Instant.parse("2026-05-27T12:00:00Z")
        );
        given(localAgentScanner.scanInstalledAgents()).willReturn(List.of(detectedClaude));

        mockMvc.perform(post("/api/agents/scan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Claude Code"))
                .andExpect(jsonPath("$[1].name").value("Manual Codex"));

        mockMvc.perform(post("/api/agents/scan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        Integer totalAgents = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM agents", Integer.class);
        Integer autoDetectedAgents = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM agents WHERE adapter_config_json LIKE '%binaryPath%'",
                Integer.class
        );

        assertThat(totalAgents).isEqualTo(2);
        assertThat(autoDetectedAgents).isEqualTo(1);
    }

    @Test
    void shouldCreateConversationAndMessages() throws Exception {
        String conversationId = createConversation("Binary Search");

        mockMvc.perform(post("/api/conversations/{conversationId}/messages", conversationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "user", "content", "Explain binary search"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.conversation_id").value(conversationId))
                .andExpect(jsonPath("$.role").value("user"));

        mockMvc.perform(get("/api/conversations/{conversationId}/messages", conversationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Explain binary search"));
    }

    @Test
    void shouldCreateAssistantReplyFromBackendEndpoint() throws Exception {
        String conversationId = createConversation("Binary Search");

        mockMvc.perform(post("/api/conversations/{conversationId}/messages", conversationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "user", "content", "Explain binary search"))))
                .andExpect(status().isCreated());

        given(conversationReplyGateway.generateReply(org.mockito.ArgumentMatchers.anyList()))
                .willReturn("Binary search halves the search space each step.");

        mockMvc.perform(post("/api/conversations/{conversationId}/reply", conversationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.conversation_id").value(conversationId))
                .andExpect(jsonPath("$.role").value("assistant"))
                .andExpect(jsonPath("$.content").value("Binary search halves the search space each step."));

        mockMvc.perform(get("/api/conversations/{conversationId}/messages", conversationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1].role").value("assistant"))
                .andExpect(jsonPath("$[1].content").value("Binary search halves the search space each step."));
    }

    @Test
    void shouldReturnNotFoundForMessagesWhenConversationDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/conversations/{conversationId}/messages", "missing-id"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void shouldListConversationsByUpdatedAtDescending() throws Exception {
        String firstConversationId = createConversation("Older");
        String secondConversationId = createConversation("Newer");

        mockMvc.perform(post("/api/conversations/{conversationId}/messages", firstConversationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "assistant", "content", "Newest activity"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/conversations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(firstConversationId))
                .andExpect(jsonPath("$[1].id").value(secondConversationId));
    }

    @Test
    void shouldCreateUpdateAndListWorkflows() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Default Flow",
                                  "definition": {
                                    "nodes": [{"id":"n1","type":"input"}],
                                    "edges": []
                                  }
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Default Flow"))
                .andReturn();

        String workflowId = readBody(createResult).get("id").asText();

        mockMvc.perform(put("/api/workflows/{workflowId}", workflowId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Updated Flow",
                                  "definition": {
                                    "nodes": [{"id":"n1","type":"input"},{"id":"n2","type":"codex"}],
                                    "edges": [{"from":"n1","to":"n2"}]
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Flow"));

        mockMvc.perform(get("/api/workflows"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(workflowId))
                .andExpect(jsonPath("$[0].definition.nodes[1].type").value("codex"));
    }

    @Test
    void shouldReturnInvalidJsonForMalformedBody() throws Exception {
        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Flow\",\"definition\":"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_JSON"));
    }

    private String createConversation(String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", title))))
                .andExpect(status().isCreated())
                .andReturn();

        return readBody(result).get("id").asText();
    }

    private JsonNode readBody(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}

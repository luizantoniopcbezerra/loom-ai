package io.loomai.backend.agent;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

@RestController
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    @GetMapping("/api/agents")
    public List<Agent> getAgents() {
        return agentService.getAgents();
    }

    @PostMapping("/api/agents/scan")
    public List<Agent> scanAgents() {
        return agentService.scanAgents();
    }

    @PostMapping("/api/agents")
    @ResponseStatus(HttpStatus.CREATED)
    public Agent createAgent(@Valid @RequestBody AgentRequest request) {
        return agentService.createAgent(request);
    }

    @PutMapping("/api/agents/{agentId}")
    public Agent saveAgent(@PathVariable String agentId, @Valid @RequestBody AgentRequest request) {
        return agentService.saveAgent(agentId, request);
    }

    @GetMapping("/api/adapters/{adapterType}/models")
    public List<AdapterModel> getAdapterModels(@PathVariable String adapterType) {
        return agentService.getAdapterModels(adapterType);
    }
}

package io.loomai.backend.workflow;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    private final WorkflowService workflowService;

    public WorkflowController(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @GetMapping
    public List<Workflow> getWorkflows() {
        return workflowService.getWorkflows();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Workflow createWorkflow(@Valid @RequestBody WorkflowRequest request) {
        return workflowService.createWorkflow(request);
    }

    @PutMapping("/{workflowId}")
    public Workflow updateWorkflow(
            @PathVariable String workflowId,
            @Valid @RequestBody WorkflowRequest request
    ) {
        return workflowService.updateWorkflow(workflowId, request);
    }

    @DeleteMapping("/{workflowId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWorkflow(@PathVariable String workflowId) {
        workflowService.deleteWorkflow(workflowId);
    }
}

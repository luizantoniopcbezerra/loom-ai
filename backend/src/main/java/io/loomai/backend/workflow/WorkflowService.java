package io.loomai.backend.workflow;

import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import io.loomai.backend.shared.time.UtcClock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class WorkflowService {

    private final WorkflowRepository workflowRepository;
    private final UtcClock utcClock;

    public WorkflowService(WorkflowRepository workflowRepository, UtcClock utcClock) {
        this.workflowRepository = workflowRepository;
        this.utcClock = utcClock;
    }

    public List<Workflow> getWorkflows() {
        return workflowRepository.findAll();
    }

    public Workflow createWorkflow(WorkflowRequest request) {
        Instant now = utcClock.now();
        Workflow workflow = new Workflow(
                UUID.randomUUID().toString(),
                request.name().trim(),
                request.definition(),
                now,
                now
        );
        return workflowRepository.save(workflow);
    }

    public void deleteWorkflow(String workflowId) {
        workflowRepository.findById(workflowId)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Recurso nao encontrado."
                ));
        workflowRepository.deleteById(workflowId);
    }

    public Workflow updateWorkflow(String workflowId, WorkflowRequest request) {
        Workflow existing = workflowRepository.findById(workflowId)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Recurso nao encontrado."
                ));

        Workflow workflow = new Workflow(
                existing.id(),
                request.name().trim(),
                request.definition(),
                existing.createdAt(),
                utcClock.now()
        );
        return workflowRepository.update(workflow);
    }
}

package io.loomai.backend.conversation;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @GetMapping
    public List<Conversation> getConversations() {
        return conversationService.getConversations();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Conversation createConversation(@Valid @RequestBody ConversationRequest request) {
        return conversationService.createConversation(request);
    }

    @GetMapping("/{conversationId}/messages")
    public List<Message> getMessages(@PathVariable String conversationId) {
        return conversationService.getMessages(conversationId);
    }

    @PostMapping("/{conversationId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public Message createMessage(
            @PathVariable String conversationId,
            @Valid @RequestBody MessageRequest request
    ) {
        return conversationService.createMessage(conversationId, request);
    }

    @PostMapping("/{conversationId}/reply")
    @ResponseStatus(HttpStatus.CREATED)
    public Message createAssistantReply(
            @PathVariable String conversationId,
            @RequestBody(required = false) ConversationReplyRequest request
    ) {
        return conversationService.createAssistantReply(
                conversationId,
                request == null ? new ConversationReplyRequest(null, null, null) : request
        );
    }

    @DeleteMapping("/{conversationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteConversation(@PathVariable String conversationId) {
        conversationService.deleteConversation(conversationId);
    }

    @PostMapping("/{conversationId}/reply/cancel")
    public CancelReplyResponse cancelAssistantReply(@PathVariable String conversationId) {
        return new CancelReplyResponse(conversationService.cancelAssistantReply(conversationId));
    }
}

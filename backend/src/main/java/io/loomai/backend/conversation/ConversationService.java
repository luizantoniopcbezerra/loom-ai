package io.loomai.backend.conversation;

import io.loomai.backend.agent.Agent;
import io.loomai.backend.agent.AgentRepository;
import io.loomai.backend.shared.error.ApiException;
import io.loomai.backend.shared.error.ErrorCode;
import io.loomai.backend.shared.time.UtcClock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AgentRepository agentRepository;
    private final LocalAgentConversationReplyService localAgentConversationReplyService;
    private final ConversationReplyGateway conversationReplyGateway;
    private final UtcClock utcClock;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            AgentRepository agentRepository,
            LocalAgentConversationReplyService localAgentConversationReplyService,
            ConversationReplyGateway conversationReplyGateway,
            UtcClock utcClock
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.agentRepository = agentRepository;
        this.localAgentConversationReplyService = localAgentConversationReplyService;
        this.conversationReplyGateway = conversationReplyGateway;
        this.utcClock = utcClock;
    }

    public List<Conversation> getConversations() {
        return conversationRepository.findAll();
    }

    public Conversation createConversation(ConversationRequest request) {
        Instant now = utcClock.now();
        Conversation conversation = new Conversation(
                UUID.randomUUID().toString(),
                request.title().trim(),
                now,
                now
        );
        return conversationRepository.save(conversation);
    }

    public List<Message> getMessages(String conversationId) {
        getConversation(conversationId);
        return messageRepository.findByConversationId(conversationId);
    }

    public Message createMessage(String conversationId, MessageRequest request) {
        getConversation(conversationId);
        Instant now = utcClock.now();
        Message message = new Message(
                UUID.randomUUID().toString(),
                conversationId,
                request.role(),
                request.content(),
                now
        );
        Message savedMessage = messageRepository.save(message);
        conversationRepository.touch(conversationId, now);
        return savedMessage;
    }

    public Message createAssistantReply(String conversationId, ConversationReplyRequest request) {
        getConversation(conversationId);
        List<Message> history = messageRepository.findByConversationId(conversationId);
        String content = resolveReply(conversationId, request, history);

        Instant now = utcClock.now();
        Message reply = new Message(
                UUID.randomUUID().toString(),
                conversationId,
                "assistant",
                content,
                now
        );
        Message savedReply = messageRepository.save(reply);
        conversationRepository.touch(conversationId, now);
        return savedReply;
    }

    public void deleteConversation(String conversationId) {
        getConversation(conversationId);
        messageRepository.deleteByConversationId(conversationId);
        conversationRepository.deleteById(conversationId);
    }

    public boolean cancelAssistantReply(String conversationId) {
        getConversation(conversationId);
        return localAgentConversationReplyService.cancelReply(conversationId);
    }

    private String resolveReply(String conversationId, ConversationReplyRequest request, List<Message> history) {
        Agent selectedAgent = findSelectedAgent(request);
        if (selectedAgent != null) {
            return localAgentConversationReplyService.generateReply(
                    conversationId,
                    selectedAgent,
                    history,
                    request.modelName()
            );
        }
        return conversationReplyGateway.generateReply(history);
    }

    private Agent findSelectedAgent(ConversationReplyRequest request) {
        if (request == null) {
            return null;
        }

        if (request.agentId() != null && !request.agentId().isBlank()) {
            return agentRepository.findById(request.agentId()).orElse(null);
        }
        if (request.agentName() != null && !request.agentName().isBlank()) {
            return agentRepository.findByName(request.agentName().trim()).orElse(null);
        }
        return null;
    }

    private Conversation getConversation(String conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.NOT_FOUND,
                        HttpStatus.NOT_FOUND,
                        "Recurso nao encontrado."
                ));
    }
}

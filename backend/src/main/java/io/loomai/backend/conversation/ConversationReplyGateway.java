package io.loomai.backend.conversation;

import java.util.List;

public interface ConversationReplyGateway {

    String generateReply(List<Message> history);
}

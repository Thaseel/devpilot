using { devpilot as db } from '../db/schema';

service ChatService @(path: '/chat') {

  entity Conversations as projection on db.Conversations;
  entity Messages      as projection on db.Messages;
  entity Artifacts     as projection on db.Artifacts;

  // Custom action: send a message and get AI response
  action sendMessage(
    conversationId : UUID,
    message        : String
  ) returns {
    reply       : String;
    messageId   : UUID;
  };

  // Create new conversation
  action createConversation(
    title     : String,
    agentType : String
  ) returns {
    conversationId : UUID;
  };
}
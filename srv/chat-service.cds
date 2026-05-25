// using { devpilot as db } from '../db/schema';

// service ChatService @(path: '/chat') {

//   entity Conversations as projection on db.Conversations;
//   entity Messages      as projection on db.Messages;
//   entity Artifacts     as projection on db.Artifacts;

//   // Custom action: send a message and get AI response
//   action sendMessage(
//     conversationId : UUID,
//     message        : String
//   ) returns {
//     reply       : String;
//     messageId   : UUID;
//   };

//   // Create new conversation
//   action createConversation(
//     title     : String,
//     agentType : String
//   ) returns {
//     conversationId : UUID;
//   };
// }

using { devpilot as db } from '../db/schema';

service ChatService @(path: '/chat') {

  entity Conversations as projection on db.Conversations;
  entity Messages      as projection on db.Messages;
  entity Artifacts     as projection on db.Artifacts;

  // Send a message → get AI reply
  action sendMessage(
    conversationId : UUID,
    message        : String,
    agentType      : String   // optional override; default 'auto'
  ) returns {
    reply       : LargeString;
    messageId   : UUID;
    agentUsed   : String;
    modelUsed   : String;
    tokensUsed  : Integer;
  };

  // Create new conversation
  action createConversation(
    title     : String,
    agentType : String
  ) returns {
    conversationId : UUID;
  };

  // Health check for AI service
  function aiHealth() returns {
    healthy  : Boolean;
    provider : String;
    model    : String;
    error    : String;
  };
}
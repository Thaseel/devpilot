namespace devpilot;

using { cuid, managed } from '@sap/cds/common';

// A conversation = one chat session
entity Conversations : cuid, managed {
  title       : String(200);
  userId      : String(100);
  agentType   : String(50);   // 'router', 'cap', 'ui5', 'abap', etc.
  messages    : Composition of many Messages on messages.conversation = $self;
}

// Each message in a conversation
entity Messages : cuid, managed {
  conversation : Association to Conversations;
  role         : String(20);    // 'user' | 'assistant' | 'system'
  content      : LargeString;
  tokensUsed   : Integer;
  modelUsed    : String(50);
  agentUsed    : String(50);   // 🆕 which specialist replied
  errorFlag    : Boolean default false;  // 🆕 mark errored messages
}

// Generated artifacts (code, projects)
entity Artifacts : cuid, managed {
  conversation : Association to Conversations;
  message      : Association to Messages;   // 🆕 link artifact to its message
  name         : String(200);
  type         : String(50);    // 'cap-project', 'ui5-app', 'abap-class', etc.
  content      : LargeString;   // could be JSON with file structure
  language     : String(20);
}
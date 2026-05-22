const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

  const { Conversations, Messages } = this.entities;

  // Action: create a new conversation
  this.on('createConversation', async (req) => {
    const { title, agentType } = req.data;
    const userId = req.user?.id || 'anonymous';

    const result = await INSERT.into(Conversations).entries({
      title: title || 'New Chat',
      userId: userId,
      agentType: agentType || 'router'
    });

    const newId = result.results[0].ID || result.ID;
    return { conversationId: newId };
  });

  // Action: send a message (echo for now, real AI in Sprint 2)
  this.on('sendMessage', async (req) => {
    const { conversationId, message } = req.data;

    if (!conversationId || !message) {
      return req.error(400, 'conversationId and message are required');
    }

    // Save user message
    await INSERT.into(Messages).entries({
      conversation_ID: conversationId,
      role: 'user',
      content: message
    });

    // TODO Sprint 2: Call AI service here
    const aiReply = `🤖 [Echo Mode] You said: "${message}". AI integration coming in Sprint 2!`;

    // Save assistant message
    const assistantInsert = await INSERT.into(Messages).entries({
      conversation_ID: conversationId,
      role: 'assistant',
      content: aiReply,
      modelUsed: 'echo-v1'
    });

    const messageId = assistantInsert.results?.[0]?.ID || assistantInsert.ID;

    return {
      reply: aiReply,
      messageId: messageId
    };
  });

});

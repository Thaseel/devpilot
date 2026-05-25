const cds = require('@sap/cds');
const { getAIClient } = require('./lib/aiClient');

const LOG = cds.log('chat-service');
const HISTORY_LIMIT = 10; // last N messages for context

module.exports = cds.service.impl(async function () {

  const { Conversations, Messages } = this.entities;
  const ai = getAIClient();

  // ─────────────────────────────────────────────
  // Action: createConversation
  // ─────────────────────────────────────────────
  this.on('createConversation', async (req) => {
    const { title, agentType } = req.data;
    const userId = req.user?.id || 'anonymous';

    const id = cds.utils.uuid();
    await INSERT.into(Conversations).entries({
      ID: id,
      title: title || 'New Chat',
      userId,
      agentType: agentType || 'auto',
    });

    LOG.info(`Conversation created: ${id} for user ${userId}`);
    return { conversationId: id };
  });

  // ─────────────────────────────────────────────
  // Action: sendMessage  (the BIG one)
  // ─────────────────────────────────────────────
  this.on('sendMessage', async (req) => {
    const { conversationId, message, agentType } = req.data;

    // ── Validation ──
    if (!conversationId || !message?.trim()) {
      return req.error(400, 'conversationId and non-empty message are required');
    }

    // ── 1. Verify conversation exists ──
    const conv = await SELECT.one.from(Conversations).where({ ID: conversationId });
    if (!conv) return req.error(404, `Conversation ${conversationId} not found`);

    // ── 2. Save the user's message ──
    const userMsgId = cds.utils.uuid();
    await INSERT.into(Messages).entries({
      ID: userMsgId,
      conversation_ID: conversationId,
      role: 'user',
      content: message,
    });

    // ── 3. Load conversation history (last N) ──
    const historyRows = await SELECT.from(Messages)
      .where({ conversation_ID: conversationId })
      .orderBy('createdAt asc')
      .columns('role', 'content', 'createdAt');

    // Exclude the message we just inserted from history (it'll be the 'current' message in the AI request)
    const history = historyRows
      .filter(m => m.content !== message || m.role !== 'user')
      .slice(-HISTORY_LIMIT)
      .map(m => ({ role: m.role, content: m.content }));

    // ── 4. Decide which agent to use ──
    const chosenAgent = agentType || conv.agentType || 'auto';

    // ── 5. Call the Python AI service ──
    let aiResult;
    try {
      aiResult = await ai.chat({
        message,
        history,
        agentType: chosenAgent,
        conversationId,
      });
    } catch (err) {
      LOG.error('AI call failed:', err.message);

      // Save an error message so user sees what happened
      const errMsgId = cds.utils.uuid();
      const errReply = `❌ AI service error: ${err.message}`;
      await INSERT.into(Messages).entries({
        ID: errMsgId,
        conversation_ID: conversationId,
        role: 'assistant',
        content: errReply,
        errorFlag: true,
      });
      return {
        reply: errReply,
        messageId: errMsgId,
        agentUsed: 'error',
        modelUsed: 'none',
        tokensUsed: 0,
      };
    }

    // ── 6. Save the assistant's reply ──
    const assistantMsgId = cds.utils.uuid();
    await INSERT.into(Messages).entries({
      ID: assistantMsgId,
      conversation_ID: conversationId,
      role: 'assistant',
      content: aiResult.reply,
      agentUsed: aiResult.agent_used,
      modelUsed: aiResult.model_used,
      tokensUsed: aiResult.tokens_used || 0,
    });

    LOG.info(`Reply saved: ${assistantMsgId} | agent=${aiResult.agent_used} | tokens=${aiResult.tokens_used}`);

    // ── 7. Return to UI ──
    return {
      reply: aiResult.reply,
      messageId: assistantMsgId,
      agentUsed: aiResult.agent_used,
      modelUsed: aiResult.model_used,
      tokensUsed: aiResult.tokens_used || 0,
    };
  });

  // ─────────────────────────────────────────────
  // Function: aiHealth
  // ─────────────────────────────────────────────
  this.on('aiHealth', async () => {
    const result = await ai.health();
    return {
      healthy: result.healthy,
      provider: result.provider || 'unknown',
      model: result.model || 'unknown',
      error: result.error || '',
    };
  });

});
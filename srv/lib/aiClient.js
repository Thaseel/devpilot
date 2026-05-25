const axios = require('axios');
const cds = require('@sap/cds');

const LOG = cds.log('ai-client');

class AIClient {
  constructor() {
    const aiConfig = cds.env.requires?.ai || {};
    this.baseURL = aiConfig.url || process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.timeout = aiConfig.timeout || 60000; // 60s for slow LLMs

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    LOG.info(`AI Client initialized → ${this.baseURL}`);
  }

  /**
   * Send a chat message to the Python AI service.
   * @param {Object} params
   * @param {string} params.message - User's current message
   * @param {Array} params.history - [{role, content}, ...]
   * @param {string} params.agentType - 'auto' | 'cap' | 'ui5' | 'abap' | 'debug' | 'functional' | 'general'
   * @param {string} params.conversationId
   * @returns {Promise<{reply, agent_used, model_used, tokens_used}>}
   */
  async chat({ message, history = [], agentType = 'auto', conversationId = null }) {
    try {
      const payload = {
        message,
        history,
        agent_type: agentType,
        conversation_id: conversationId,
      };

      LOG.info(`→ POST /chat | agent=${agentType} | history=${history.length} msgs`);

      const { data } = await this.http.post('/chat', payload);

      LOG.info(`← reply received | agent=${data.agent_used} | model=${data.model_used} | tokens=${data.tokens_used}`);
      return data;
    } catch (err) {
      // Detailed error categorization
      if (err.code === 'ECONNREFUSED') {
        throw new Error(`AI service is not running at ${this.baseURL}. Start it with: uvicorn app.main:app --port 8000`);
      }
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
        throw new Error('AI service timed out. The model may be slow or overloaded. Try again.');
      }
      if (err.response) {
        const detail = err.response.data?.detail || err.response.statusText;
        throw new Error(`AI service error (${err.response.status}): ${detail}`);
      }
      throw new Error(`AI client error: ${err.message}`);
    }
  }

  /**
   * Health check for the AI service.
   */
  async health() {
    try {
      const { data } = await this.http.get('/health', { timeout: 5000 });
      return { healthy: true, ...data };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }
}

// Singleton — one instance reused across requests
let _instance = null;
function getAIClient() {
  if (!_instance) _instance = new AIClient();
  return _instance;
}

module.exports = { getAIClient };
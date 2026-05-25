sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.devpilot.devpilotui.controller.Chat", {

        onInit: function () {
            this._localModel = new JSONModel({
                messages: [],
                conversationId: null,
                isLoading: false,
                aiStatus: "Checking...",
                aiStatusState: "None"
            });
            this.getView().setModel(this._localModel);

            this._checkAIHealth();
            this._createConversation();
            this._attachEnterKey();
        },

        // ─────────── AI Health ───────────
        _checkAIHealth: function () {
            fetch("/chat/aiHealth")
                .then(r => r.json())
                .then(data => {
                    const d = data.value || data;
                    if (d.healthy) {
                        this._localModel.setProperty("/aiStatus", `AI Online · ${d.model}`);
                        this._localModel.setProperty("/aiStatusState", "Success");
                    } else {
                        this._localModel.setProperty("/aiStatus", "AI Offline");
                        this._localModel.setProperty("/aiStatusState", "Error");
                    }
                })
                .catch(() => {
                    this._localModel.setProperty("/aiStatus", "AI Unreachable");
                    this._localModel.setProperty("/aiStatusState", "Error");
                });
        },

        // ─────────── Conversation ───────────
        _createConversation: function () {
            return fetch("/chat/createConversation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Chat " + new Date().toLocaleString(),
                    agentType: "auto"
                })
            })
            .then(r => r.json())
            .then(data => {
                const id = data.conversationId || data.value?.conversationId;
                this._localModel.setProperty("/conversationId", id);
                console.log("Conversation:", id);
            })
            .catch(err => {
                MessageToast.show("Failed to start conversation");
                console.error(err);
            });
        },

        onNewChat: function () {
            MessageBox.confirm("Start a new chat? Current conversation stays saved.", {
                onClose: (action) => {
                    if (action === MessageBox.Action.OK) {
                        this._localModel.setProperty("/messages", []);
                        this._createConversation();
                    }
                }
            });
        },

        // ─────────── Sending ───────────
        _attachEnterKey: function () {
            const oInput = this.byId("inputBox");
            oInput.attachBrowserEvent("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.onSend();
                }
            });
        },

        onInputChange: function () {
            // hook for future: typing indicator, suggestions, etc.
        },

        onSend: function () {
            const oInput = this.byId("inputBox");
            const sMessage = oInput.getValue().trim();
            const sConvId = this._localModel.getProperty("/conversationId");
            const sAgentType = this.byId("agentSelect").getSelectedKey();

            if (!sMessage) return;
            if (!sConvId) {
                MessageToast.show("Conversation not ready, please wait");
                return;
            }
            if (this._localModel.getProperty("/isLoading")) return;

            // 1. Add user message immediately
            const aMessages = this._localModel.getProperty("/messages").slice();
            aMessages.push({
                role: "user",
                content: sMessage,
                contentHtml: this._escapeHtml(sMessage)
            });

            // 2. Add placeholder for assistant
            aMessages.push({
                role: "assistant",
                content: "",
                contentHtml: "<em>⏳ Thinking...</em>",
                agentUsed: "",
                modelUsed: "",
                tokensUsed: 0
            });

            this._localModel.setProperty("/messages", aMessages);
            this._localModel.setProperty("/isLoading", true);
            oInput.setValue("");
            this._scrollToBottom();

            // 3. Call backend
            fetch("/chat/sendMessage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: sConvId,
                    message: sMessage,
                    agentType: sAgentType
                })
            })
            .then(r => r.json())
            .then(data => {
                const d = data.value || data;
                const reply = d.reply || "(no reply)";
                const updated = this._localModel.getProperty("/messages").slice();
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: reply,
                    contentHtml: this._renderMarkdown(reply),
                    agentUsed: d.agentUsed || "",
                    modelUsed: d.modelUsed || "",
                    tokensUsed: d.tokensUsed || 0
                };
                this._localModel.setProperty("/messages", updated);
            })
            .catch(err => {
                const updated = this._localModel.getProperty("/messages").slice();
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: "Error: " + err.message,
                    contentHtml: "<span style='color:red'>❌ " + this._escapeHtml(err.message) + "</span>",
                    agentUsed: "error",
                    modelUsed: "",
                    tokensUsed: 0
                };
                this._localModel.setProperty("/messages", updated);
            })
            .finally(() => {
                this._localModel.setProperty("/isLoading", false);
                this._scrollToBottom();
            });
        },

        // ─────────── Helpers ───────────
        _escapeHtml: function (str) {
            if (!str) return "";
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        },

        /**
         * Lightweight Markdown renderer — handles fenced code blocks,
         * inline code, bold, italics, line breaks. Keeps things safe.
         */
        _renderMarkdown: function (text) {
            if (!text) return "";

            // Extract fenced code blocks first (so they don't get mangled)
            const codeBlocks = [];
            let html = text.replace(/```([\w:.-/]*)\n([\s\S]*?)```/g, (match, lang, code) => {
                const idx = codeBlocks.length;
                codeBlocks.push({ lang: lang || "code", code: code });
                return `@@CODEBLOCK_${idx}@@`;
            });

            // Escape rest
            html = this._escapeHtml(html);

            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code class="inlineCode">$1</code>');

            // Bold
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // Italics
            html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

            // Newlines
            html = html.replace(/\n/g, "<br/>");

            // Re-inject code blocks
            html = html.replace(/@@CODEBLOCK_(\d+)@@/g, (m, i) => {
                const block = codeBlocks[parseInt(i, 10)];
                const safeCode = this._escapeHtml(block.code);
                return `<div class="codeBlock"><div class="codeLang">${this._escapeHtml(block.lang)}</div><pre><code>${safeCode}</code></pre></div>`;
            });

            return html;
        },

        _scrollToBottom: function () {
            setTimeout(() => {
                const oScroll = this.byId("messagesScroll");
                if (oScroll) {
                    const dom = oScroll.getDomRef();
                    if (dom) dom.scrollTop = dom.scrollHeight;
                }
            }, 100);
        }

    });
});
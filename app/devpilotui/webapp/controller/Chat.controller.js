sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("com.devpilot.devpilotui.controller.Chat", {

        onInit: function () {
            // Local model for messages
            this._localModel = new JSONModel({
                messages: [],
                conversationId: null,
                isLoading: false
            });
            this.getView().setModel(this._localModel);

            // Create a fresh conversation on load
            this._createConversation();
        },

        _createConversation: function () {
            const sUrl = "/chat/createConversation";
            fetch(sUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Chat " + new Date().toLocaleString(),
                    agentType: "router"
                })
            })
            .then(r => r.json())
            .then(data => {
                const id = data.conversationId || data.value?.conversationId || data.d?.conversationId;
                this._localModel.setProperty("/conversationId", id);
                console.log("Conversation created:", id);
            })
            .catch(err => {
                MessageToast.show("Failed to start conversation");
                console.error(err);
            });
        },

        onSend: function () {
            const oInput = this.byId("inputBox");
            const sMessage = oInput.getValue().trim();
            const sConvId = this._localModel.getProperty("/conversationId");

            if (!sMessage) return;
            if (!sConvId) {
                MessageToast.show("Conversation not ready yet, try again");
                return;
            }

            // Append user message immediately
            const aMessages = this._localModel.getProperty("/messages");
            aMessages.push({ role: "user", content: sMessage });
            this._localModel.setProperty("/messages", aMessages);
            oInput.setValue("");

            // Add a placeholder assistant message
            aMessages.push({ role: "assistant", content: "⏳ Thinking..." });
            this._localModel.setProperty("/messages", [...aMessages]);

            // Call backend
            fetch("/chat/sendMessage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: sConvId,
                    message: sMessage
                })
            })
            .then(r => r.json())
            .then(data => {
                const reply = data.reply || data.value?.reply || "(no reply)";
                // Replace last placeholder
                aMessages[aMessages.length - 1] = { role: "assistant", content: reply };
                this._localModel.setProperty("/messages", [...aMessages]);
            })
            .catch(err => {
                aMessages[aMessages.length - 1] = { role: "assistant", content: "❌ Error: " + err.message };
                this._localModel.setProperty("/messages", [...aMessages]);
            });
        }

    });
});
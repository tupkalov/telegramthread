import telegramifyMarkdown from 'telegramify-markdown'
import { callbackStore } from './Callbacks.js';

export default class Chat {
    constructor(chat, { bot }) {
        this.data = chat;
        this.bot = bot;
    }

    get id() {
        return this.data.id;
    }

    is (id) {
        return this.data.id === id;
    }

    static getByMessage (message) {
        if (!this.chats) {
            this.chats = {};
        }
        const chatId = message.data.chat.id;
        if (!this.chats[chatId]) {
            this.chats[chatId] = new Chat(message.data.chat, { bot: message.bot });
        }
        return this.chats[chatId];
    }

    startThread(Thread, startMessage) {
        this.thread?.stop()
        this.thread = new Thread(this);
        this.thread.process(startMessage);

        return this.thread;
    }

    stopThread() {
        if (this.thread) {
            this.thread.stop();
        }
    }

    nextThreadMessage(message) {
        this.thread.process(message);
    }
    async _sendTyping(type) {
        return await this.bot.instance.sendChatAction(this.id, type).catch(error => {
            console.error("Error sending chat action " + type, error);
        });
    }
    startTyping(type = "typing") {
        this.stopTyping();
        this._sendTyping(type);
        const timer = setInterval(() => this._sendTyping(type), 4000);
        return this._stopTyping = () => clearInterval(timer);
    }

    stopTyping() {
        this._stopTyping?.();
    }

    processSendOptions(options = {}) {
        const sendOptions = {};
        if (options.inlineKeyboard) {
            sendOptions.reply_markup = {
                inline_keyboard: options.inlineKeyboard.map(row => row.map(({ text, action }) => {
                    return {
                        text,
                        callback_data: callbackStore.setCallback(action)
                    }
                }))
            };
        }
        return sendOptions
    }

    

    async sendPhoto(fileId, options = {}) {
        const sendOptions = {};
        if (options.caption) {
            sendOptions.caption = telegramifyMarkdown(caption || '', 'escape');
            sendOptions.parse_mode = 'MarkdownV2';
        }

        Object.assign(sendOptions, this.processSendOptions(options));

        return await this.bot.instance.sendPhoto(this.id, fileId, sendOptions);
    }

    async sendText(text, options) {
        const sendOptions = {
            parse_mode: 'MarkdownV2',
            ...this.processSendOptions(options)
        };

        if (!text) throw new Error("Text is required");

        return await this.bot.instance.sendMessage(this.id, telegramifyMarkdown(text, 'escape'), sendOptions);
    }

    async editTextMessage(messageId, text, sendOptions) {
        if (!text) throw new Error("Text is required");

        return await this.bot.instance.editMessageText(telegramifyMarkdown(text, 'escape'), {
            chat_id: this.id,
            message_id: messageId,
            parse_mode: 'MarkdownV2',
            ...this.processSendOptions(sendOptions)
        });
    }
}


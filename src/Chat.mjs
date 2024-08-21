import telegramifyMarkdown from 'telegramify-markdown'
import { callbackStore } from './Callbacks.mjs';
import AbstractThread from './AbstractThread.mjs';

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

    startThread(Thread, ...args) {
        this.thread?.stop()
        const threadOptions = {};
        
        if (!(Thread.prototype instanceof AbstractThread)) {
            threadOptions.processing = Thread;
            Thread = AbstractThread;
        }
        this.thread = new Thread(this, threadOptions);
        return this.thread.process(this.lastUserMessage, ...args);
    }

    setLastUserMessage(message) {
        this.lastUserMessage = message;
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
            sendOptions.caption = telegramifyMarkdown(options.caption || '', 'escape');
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

    async sendMediaGroup(media, options = {}) {
        return await this.bot.instance.sendMediaGroup(this.id, media, {
            parse_mode: 'MarkdownV2',
            ...this.processSendOptions(options)
        });
    }
}


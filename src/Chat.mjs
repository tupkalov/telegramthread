import telegramifyMarkdown from 'telegramify-markdown'
import { callbackStore } from './Callbacks.mjs';
import AbstractThread from './AbstractThread.mjs';

export default class Chat {
    constructor(data) {
        this.data = data;
    }

    get id() {
        return this.data.id;
    }

    get bot() {
        return global._telegramthread_bot;
    }

    get Message() {
        return this.bot.Message;
    }

    is (id) {
        return this.data.id === id;
    }

    static getByMessage (message) {
        if (!this.chats) {
            this.chats = {};
        }
        const chatId = message.data.chat.id;
        if (!chatId) throw new Error("Chat id is required");

        if (!this.chats[chatId]) {
            this.chats[chatId] = new this(message.data.chat);
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

        return this.thread.process(...args);
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
                inline_keyboard: options.inlineKeyboard.map(row => row.map(({ text, action, callbackKey }) => {
                    return {
                        text,
                        callback_data: action ? callbackStore.setCallback(action) : callbackKey ?? (() => { throw new Error("Action or callbackKey is required") })()
                    }
                }))
            };
        }

        if (options.replyTo) {
            sendOptions.reply_parameters = {
                message_id: options.replyTo.id
            }
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

        const tgMessage = await this.bot.instance.sendPhoto(this.id, fileId, sendOptions);
        if (options?.extend) Object.assign(tgMessage, options.extend);
        return new this.Message(tgMessage, { newMessageInChat: true });
    }

    async sendText(text, options) {
        let sendOptions = {
            parse_mode: 'MarkdownV2',
            ...this.processSendOptions(options)
        };

        if (!text) throw new Error("Text is required");

        if (options?.split) {
            const messages = text.match(/[\s\S]{1,4096}/g);
            const results = [];
            for (const message of messages) {
                const formattedMessage = telegramifyMarkdown(message, 'escape');
                let sentMessage;
                try {
                    sentMessage = await this._sendText(formattedMessage, sendOptions, options);
                } catch (error) {
                    if (error.message.includes("an't parse entities: Can't find end")) {
                        sentMessage = await this._sendText(formattedMessage, { ...sendOptions, parse_mode: null }, options);
                    } else
                        throw error
                }
                
                sendOptions = { ...sendOptions, ...this.processSendOptions({ replyTo: sentMessage }) };
                results.push(sentMessage);
            }
            return results;
        }

        return await this._sendText(telegramifyMarkdown(text, 'escape'), sendOptions, options);
    }

    async _sendText(text, sendOptions, options) {
        const tgMessage = await this.bot.instance.sendMessage(this.id, text, sendOptions);
        if (options?.extend) Object.assign(tgMessage, options.extend);
        return new this.Message(tgMessage, { newMessageInChat: true });
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

    // Логирование ошибки в консоль и в ответ юзеру
    catchError(error) {
        this.bot.catchError(error, this.id);
    }

    toJSON() {
        return { ...this.data};
    }
}


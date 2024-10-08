import TelegramBot from 'node-telegram-bot-api';
import Message from './Message.mjs';
import { callbackStore } from './Callbacks.mjs';


export default class Bot {

    constructor ({ token = process.env.TELEGRAM_BOT_TOKEN } = {}) {
        if (!token) {
            throw new Error("TelegramThreadBot: token is required");
        }
        this.token = token;
    }

    start() {
        this.instance = new TelegramBot(this.token, {polling: true});
        
        this.instance.on("callback_query", async (query) => {
            try {
                const text = await callbackStore.executeCallback(query.data);
                if (text) {
                    this.instance.answerCallbackQuery(query.id, { text });
                } else {
                    this.instance.answerCallbackQuery(query.id);
                }
            } catch (error) {
                console.error(`An error occurred on callbackQuery ${query.data}`, error);
                this.instance.sendMessage(query.message.chat.id, `An error occurred on callbackQuery ${query.data} ${error.message}`);
            }
        });

        this.instance.on("polling_error", (error) => {
            console.error(error.message);
        });
    }

    onMessage(callback) {
        this.instance.on("message", async (msg) => {
            try {
                const message = new Message(msg, { bot: this, newMessageInChat: true });
                const oldThread = message.chat.thread;
                await callback(message, message.chat);

                // Не обработано
                if (message.chat.thread && oldThread === message.chat.thread) {
                    return await message.chat.nextThreadMessage(message);
                }

            } catch (error) {
                if (error.name === "TelegramError") {
                    console.error("TelegramError: " + error.message, error.response.body);
                } else {
                    console.error(error);
                }
                this.instance.sendMessage(msg.chat.id, "An error occurred " + error.message);
            }
        });
    }

    getFileLink(fileId) {
        return this.instance.getFileLink(fileId);
    }
}
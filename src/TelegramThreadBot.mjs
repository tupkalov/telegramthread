import TelegramBot from 'node-telegram-bot-api';
import Message from './Message.mjs';
import Chat from './Chat.mjs';
import { callbackStore } from './Callbacks.mjs';
import EventEmitter from 'events';

const CATCH_ERRORS = true;

export default class Bot extends EventEmitter {

    constructor ({ token = process.env.TELEGRAM_BOT_TOKEN, MessageClass = Message, ChatClass = Chat } = {}) {
        super()

        if (!token) {
            throw new Error("TelegramThreadBot: token is required");
        }
        this.token = token;
        
        if (!global._telegramthread_bot)
            global._telegramthread_bot = this;

        Object.defineProperty(this, "Chat", {
            value: ChatClass,
            enumerable: false
        })

        Object.defineProperty(this, "Message", {
            value: MessageClass,
            enumerable: false
        })
    }

    start() {
        this.instance = new TelegramBot(this.token, {
            polling: {
                params: { limit: 1 }
            }
        });
        
        this.instance.on("callback_query", async (query) => {
            var awaited = false;
            this.emit('callback_query', {
                key: query.data,
                message: new Message(query.message),
                waitUntil: async (promise) => {
                    if (awaited) return;
                    awaited = true;
                    const result = await promise.catch(error => {
                        console.error("Error in callback", error);
                        return "An error occurred in callback";
                    })

                    this.instance.answerCallbackQuery(query.id, (typeof result === 'string') ? { text: result } : {})
                        .catch(error => this.catchError(error, query.message.chat.id));
                }
            });
        });

        this.on("callback_query", async ({ key,  waitUntil }) => {
            if (callbackStore.isExists(key)) {
                waitUntil(callbackStore.executeCallback(key));
            }
        });

        this.instance.on("polling_error", async (error) => {
            console.error(error.message);
            if (error.message.includes('FATAL')) {
                await this.instance.stopPolling();
                await this.instance.startPolling();
            }
        });
    }

    onMessage(callback) {
        const handler = async (msg) => {
            const message = new this.Message(msg, { newMessageInChat: true });
            const oldThread = message.chat.thread;
            await callback(message, message.chat);

            // Не обработано
            if (message.chat.thread && oldThread === message.chat.thread) {
                return await message.chat.nextThreadMessage(message);
            }
        };

        this.instance.on("message", async (...args) => {
            if (CATCH_ERRORS) {
                try {
                    await handler(...args);
                } catch (error) {
                    this.catchError(error, args[0].chat.id);
                }
            } else {
                await handler(...args);
            }
        });
    }

    catchError(error, chatId) {
        switch (error.name) {
            case "MessageError":
                console.error("MessageError: " + error.message, error.info);
                if (error.from) this.catchError(error.from);
                break;
            case "AbortError":
                return;
            case "TelegramError":
                console.error("TelegramError: " + error.message, error.response.body);
                break;
            case "Error":
                if (error.message.includes("query is too old")) {
                    return;
                }
            default:
                console.error(error);
        }

        if (chatId) {
            this.instance.sendMessage(chatId, "An error occurred " + error.message);
        }
    }

    getFileLink(fileId) {
        return this.instance.getFileLink(fileId);
    }
}
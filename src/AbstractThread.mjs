export default class AbstractThread {
    constructor(chat, { processing }) {
        if (!chat) throw new Error("Chat is required");
        this.chat = chat;
        
        if (processing) {
            this.processing = processing;
        }
    }

    get message() {
        if (!this.lastMessage) {
            this.lastMessage = this.chat.lastUserMessage;
        }

        return new Proxy(this.lastMessage, {
            get: (target, prop) => {
                if (typeof target[prop] === "function") {
                    if (this.stopped) return () => {};
                }
                return target[prop];
            }
        });
    }

    get bot() {
        return this.chat.bot;
    }

    stop(error) {
        this._stop?.(error);
        this.stopped = true;
        if (this.chat.thread === this) {
            delete this.chat.thread;
        }
    }

    stopError() {
        return new Error("Thread stopped");
    }

    isWaitingImage() {
        return this._waitingOptions?.image;
    }

    process(...args) {
        if (this._waitingMessage) return this._waitingMessage(this.lastMessage = args[0]);
        if (this._proccessing) return; // Игнорируем сообщение если его не ждем

        this.chat.startTyping();

        // Начинаем процесс
        const nextMessage = (options) => {
            if (this.stopped) throw this.stopError();
            return this.getNextMessage(options)
        };

        return this._proccessing = this.processing(...args, nextMessage).catch(error => {
            if (error.message === "Thread stopped") return;
            throw error;
        }).then(() => {
            this.stop();
        }).catch(error => {
            console.error(error);
            this.chat.sendText("An error occurred " + error.message).catch(() => {});
        }).finally(() => {
            this.chat.stopTyping();
        });
    }

    getNextMessage(options) {
        if (this.stopped) {
            throw this.stopError();

        } else {
            var resolve, reject;
            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            
            this._stop = error => reject(error || this.stopError());
            this.chat.stopTyping();
            if (options) {
                this._waitingOptions = options;
            }

            this._waitingMessage = (message) => {
                delete this._waitingOptions;
                delete this._waitingMessage;
                delete this._stop;
                this.chat.startTyping();
                resolve(message);
            }
            return promise;
        }
    }
}
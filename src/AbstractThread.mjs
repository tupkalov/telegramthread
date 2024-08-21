export default class AbstractThread {
    constructor(chat, { processing }) {
        if (!chat) throw new Error("Chat is required");
        this.chat = chat;
        
        if (processing) {
            this.processing = processing;
        }
    }

    get message() {
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

    stop() {
        this._stop?.();
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

    process(message, ...args) {
        if (this._waitingMessage) return this._waitingMessage(this.lastMessage = message, ...args);
        if (this._proccessing) return; // Игнорируем сообщение если его не ждем

        if (!this.lastMessage) {
            this.lastMessage = this.startMessage = message;
        }
        this.chat.startTyping();

        // Начинаем процесс
        return this._proccessing = this.processing(this.chat, this.startMessage, (options) => {
            if (this.stopped) throw this.stopError();
            return this.getNextMessage(options)
        }, ...args).catch(error => {
            if (error.message === "Thread stopped") return;
            throw error;
        }).then(() => {
            this.stop();
        }).catch(error => {
            console.error(error);
            this.chat.sendText("An error occurred " + error.message).catch(() => {});
        }).finally(() => {
            this.chat.stopTyping()
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
            
            this._stop = () => reject(this.stopError());
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
import Chat from './Chat.js';

export default class Message {
    constructor(msg, { bot, text, photo }) {
        this.data = msg;
        if (text) this.setText(text);
        else if (photo) this.setPhoto();
        
        this.bot = bot;
        this.chat = Chat.getByMessage(this);
    }

    updateData(msg) {
        this.data = msg;
    }
    
    static createFrom(from, options) {
        if (from instanceof Message) {
            return new this({ ...from.data }, { bot: from.bot, ...options });
        }
        throw new Error('Unsupported from type');
    }
    
    static createInChat(chat, options) {
        const data = { chat: chat.data, text: options.text };
        return new this(data, { bot: chat.bot, ...options });
    }

    setText(text) {
        this.data.text = text;
    }

    setPhoto() {
        this.data.photo = this.data.photo.map(photo => {
            photo.file_id = photo.file_id;
            return photo;
        });
    }

    get id() {
        return this.data.message_id;
    }

    get text() {
        return this.data.text;
    }

    get from() {
        return this.data.from;
    }

    is (text) {
        return this.data.text === text;
    }

    isPhoto() {
        return this.data.photo?.length;
    }

    getLastPhoto() {
        return [...this.data.photo].pop();
    }


    async reply(data, options) {
        if (typeof data === 'string') {
            const newData = await this.chat.sendText(data, options);

            return new this.constructor(newData, { bot: this.bot });
        }
        throw new Error('Unsupported data type');
    }

    async editText(text, sendOptions) {
        const data = await this.chat.editTextMessage(this.id, text || this.data.text, {
            inlineKeyboard: this.inlineKeyboard,
            ...sendOptions 
        })

        this.updateData(data);
        return this;
    }

    async updateInlineKeyboard(inlineKeyboard) {
        this.inlineKeyboard = inlineKeyboard;
        return await this.editText(this.text, { inlineKeyboard });
    }

    async replyPhoto(fileId, { caption } = {}) {
        if (caption && _caption.length > 1024) {
            await this.chat.sendPhoto(fileId);
            await this.reply(caption);
        } else {
            await this.chat.sendPhoto(fileId, { caption });
        }
    }

    startThread(Thread) {
        return this.chat.startThread(Thread, this);
    }
}
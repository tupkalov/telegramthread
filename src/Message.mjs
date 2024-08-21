import Chat from './Chat.mjs';

export default class Message {
    constructor(msg, { chat, bot, text }) {
        this.data = msg;
        if (text) this.setText(text);
        
        this.bot = bot;
        this.chat = chat || Chat.getByMessage(this);
    }

    setText(text) {
        this.data.text = text;
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

    async editText(text, sendOptions) {
        const data = await this.chat.editTextMessage(this.id, text || this.data.text, {
            inlineKeyboard: this.inlineKeyboard,
            ...sendOptions 
        })

        this.data = data;
        return this;
    }

    startThread(Thread, ...args) {
        return this.chat.startThread(Thread, this, ...args);
    }
}
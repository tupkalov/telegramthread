import Chat from './Chat.mjs';

export default class Message {
    constructor(msg, { chat, bot, text, newMessageInChat }) {
        this.data = msg;
        if (text) this.setText(text);
        
        this.bot = bot;
        this.chat = chat || Chat.getByMessage(this);
        
        if (newMessageInChat) {
            this.chat.setLastUserMessage(this);
        }
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

    getFileId(index) {
        if (!this.isPhoto()) throw new Error("Message is not a photo");

        if (index !== undefined) {
            return this.data.photo[index].file_id;
        } else
            return this.getLastPhoto().file_id;
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
export default class Message {
    constructor(msg, { newMessageInChat = false } = {}) {
        this.data = msg;
        
        this.Chat.getByMessage(this);

        if (newMessageInChat) {
            this.chat.setLastUserMessage(this);
        }
    }

    setText(text) {
        this.data.text = text;
    }

    get Chat() {    
        return this.bot.Chat;
    }

    get bot () {
        return global._telegramthread_bot;
    }

    get chat () {
        return this.Chat.getByMessage(this);
    }

    get id() {
        return this.data.message_id;
    }

    get caption () {
        if (!this.isPhoto()) throw new Error("Message is not a photo");
        return this.data.caption;
    }

    get text() {
        return this.data.text;
    }

    get from() {
        return this.data.from;
    }
    
    get date() {
        return this.data.date;
    }

    is (text) {
        return this.data.text === text;
    }

    isText() {
        return !!this.data.text;
    }

    isPhoto() {
        return this.data.photo?.length;
    }

    isBot() {
        return this.data.from.is_bot;
    }

    isCommand() {
        if (this.data.text && this.data.text.startsWith('/')) return true;

        if (this.data.entities) {
            if (this.data.entities.some(entity => entity.type === "bot_command")) {
                return true;
            }
        }
        return false;
    }

    getCommands() {
        if (!this.isCommand() || !this.data.entities) return [];
        return this.data.entities.map(entity => this.data.text.substr(entity.offset, entity.length));
    }

    getLastPhoto() {
        return [...this.data.photo].pop();
    }

    getText() {
        return this.isPhoto() ? this.caption : this.text;
    }

    getTextWithoutCommands() {
        var result = this.getText() ;
        if (this.isCommand()) {
            result = result.replace(/(?:^|\s)\/[^\s]+/, '').trim();
        }
        return result
    }

    isReply() {
        return !!this.data.reply_to_message;
    }

    getReplyId() {
        return this.data.reply_to_message?.message_id;
    }

    getReply() {
        return new this.constructor(this.data.reply_to_message); 
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

    toJSON() {
        return { ...this.data };
    }
}
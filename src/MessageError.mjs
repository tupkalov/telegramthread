export default class MessageError extends Error {
    constructor(message, { clientMessage, error, from, info }) {
        super(message);
        if (clientMessage) this.clientMessage = clientMessage;
        if (from && !error) error = from;
        if (error) this.error = error;
        this.info = info || {};
    }

    get name() {
        return "MessageError";
    }
}
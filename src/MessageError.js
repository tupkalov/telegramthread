export default class MessageError extends Error {
    constructor(message, { clientMessage }) {
        super(message);
        this.clientMessage = clientMessage;
    }
}
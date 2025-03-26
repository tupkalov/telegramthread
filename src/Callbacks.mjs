import ObjectId from 'objectid';

export default class Callbacks {
    constructor() {
        this.callbacks = {};
    }

    setCallback(callback) {
        const id = ObjectId();
        this.callbacks[id] = async () => {
            try {
                const res = await callback();
                delete this.callbacks[id];
                return res;
            } catch (error) {
                console.error("Error in callback " + id, error);

                if (error.clientMessage) {
                    return error.message;
                }
            }
        }
        return id.toString();
    }

    isExists(id) {
        return !!this.callbacks[id];
    }

    executeCallback(id) {
        return this.callbacks[id]?.();
    }
}

export const callbackStore = new Callbacks();
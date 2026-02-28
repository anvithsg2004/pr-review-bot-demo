class MessageQueue {
    constructor() {
        this.queues = new Map();
    }

    publish(topic, message) {
        // `topic` is the name of the queue, `message` is the data to be stored
        if (!this.queues.has(topic)) {
            this.queues.set(topic, []);
        }
        this.queues.get(topic).push({
            id: Date.now(),
            data: message,
            timestamp: new Date().toISOString()
        });
    }

    consume(topic) {
        const queue = this.queues.get(topic);
        if (!queue || queue.length === 0) return null;
        return queue.shift();
    }
}



module.exports = MessageQueue;
function FifoQueue() {
    this.queue = [];

    this.push = function (value) {
        if (Array.isArray(value)) {
            this.queue.push.apply(this.queue, value);
            return this;
        }

        this.queue.push(value);
        return this;
    };

    this.get = function () {
        this.queue.shift();
        return this;
    };

    this.toArray = function () {
        return this.queue;
    }
};

const queue = new FifoQueue();
queue.push([1, 2, 3]).push(4).push(5).push([6, 7, 8]);

console.log(queue.toArray());

queue.get().get().get();

console.log(queue.toArray());

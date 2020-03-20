class Poller {
    constructor(timeout = 100, callback) {
        this.timeout = timeout;
        this.callback = callback;
    }

    poll() {
        setInterval(() => this.callback('poll'), this.timeout);
    }
}

let poller = new Poller(1000, () => {
    console.log('triggered');
});

poller.poll();
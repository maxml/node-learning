
function LinkedList() {
    this.head = null;
    this.tail = null;

    this.init = function (value) {
        const newNode = new LinkedListNode(value, this.head);
        this.head = newNode;

        if (!this.tail) {
            this.tail = newNode;
        }

        return this;
    }

    this.toArray = function () {
        const nodes = [];

        let currentNode = this.head;
        while (currentNode) {
            nodes.push(currentNode);
            currentNode = currentNode.next;
        }

        return nodes;
    }

    this.push = function (value) {
        const newNode = new LinkedListNode(value);

        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;

            return this;
        }

        this.tail.next = newNode;
        this.tail = newNode;

        return this;
    }

    this.remove = function (value) {
        if (!this.head) {
            return null;
        }

        let deletedNode = null;

        while (this.head && this.head.value === value) {
            deletedNode = this.head;
            this.head = this.head.next;
        }

        let currentNode = this.head;
        if (currentNode) {
            while (currentNode.next) {
                if (currentNode.next.value === value) {
                    deletedNode = currentNode.next;
                    currentNode.next = currentNode.next.next;
                } else {
                    currentNode = currentNode.next;
                }
            }
        }

        if (this.tail.value === value) {
            this.tail = currentNode;
        }

        return deletedNode;
    }

    // FIX:
    this.find = function (value) {
        if (!this.head) {
            return null;
        }

        let currentNode = this.head;

        while (currentNode) {
            if (value !== undefined && currentNode.value === value) {
                return currentNode;
            }

            currentNode = currentNode.next;
        }

        return currentNode;
    }

    this.deleteTail = function () {
        const deletedTail = this.tail;

        if (this.head === this.tail) {
            this.head = null;
            this.tail = null;

            return deletedTail;
        }

        let currentNode = this.head;
        while (currentNode.next) {
            if (!currentNode.next.next) {
                currentNode.next = null;
            } else {
                currentNode = currentNode.next;
            }
        }

        this.tail = currentNode;

        return deletedTail;
    }

    this.deleteHead = function () {
        if (!this.head) {
            return null;
        }

        const deletedHead = this.head;

        if (this.head.next) {
            this.head = this.head.next;
        } else {
            this.head = null;
            this.tail = null;
        }

        return deletedHead;
    }

    this.fromArray = function (values) {
        values.forEach(value => this.push(value));

        return this;
    }

    this.reverse = function () {
        let currNode = this.head;
        let prevNode = null;
        let nextNode = null;

        while (currNode) {
            nextNode = currNode.next;

            currNode.next = prevNode;

            prevNode = currNode;
            currNode = nextNode;
        }

        this.tail = this.head;
        this.head = prevNode;

        return this;
    }

    function LinkedListNode(value, next) {
        this.value = value;
        this.next = next;

        toString = function (callback) {
            return callback ? callback(this.value) : `${this.value}`;
        }
    }

    this.traversal = (callback) => {
        let currentNode = this.head;

        while (currentNode) {
            callback(currentNode.value);
            currentNode = currentNode.next;
        }
    }
}

function test() {
    const list = new LinkedList();
    list.push(3);
    list.push(2);
    console.log(list.toArray());

    list.remove(2);
    console.log(list.toArray());
    list.remove(3);
    console.log(list.toArray());

    list.fromArray([4, 5, 6]);
    list.reverse();
    console.log(list.toArray());

    list.deleteHead();
    list.deleteTail();
    console.log(list.toArray());

    list.push(7);
    list.push(8);
    list.push(9);

    const res = [];
    list.traversal((item) => {
        res.push(item);
    });
    console.log(res);
}
// test();

module.exports = LinkedList;
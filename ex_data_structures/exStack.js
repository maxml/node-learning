const LinkedList = require('./exLinkedList');

function Stack() {
    this.linkedList = new LinkedList();

    this.isEmpty = function () {
        return !this.linkedList.head;
    }

    this.peek = function () {
        if (this.isEmpty()) {
            return null;
        }

        return this.linkedList.head.value;
    }

    this.push = function (value) {
        this.linkedList.push(value);
    }

    this.pop = function () {
        const removedHead = this.linkedList.deleteHead();
        return removedHead ? removedHead.value : null;
    }

    this.toArray = function () {
        return this.linkedList
            .toArray()
            .map(linkedListNode => linkedListNode.value);
    }
}

const stack = new Stack();
console.log(stack.isEmpty());
stack.push(1);
stack.push(2);
stack.push(3);

console.log(stack.toArray());

stack.pop();
console.log(stack.toArray());

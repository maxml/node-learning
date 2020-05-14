function BinaryTree(nodeValueCompareFunction) {

    this.root = new BinarySearchTreeNode(null, nodeValueCompareFunction);

    this.insert = function (value) {
        return this.root.insert(value);
    }

    this.contains = function (value) {
        return this.root.contains(value);
    }

    this.remove = function (value) {
        return this.root.remove(value);
    }

    this.toString = function () {
        return this.root.toString();
    }

}

function BinaryTreeNode(value) {
    this.left = null;
    this.right = null;
    this.parent = null;
    this.value = value;

    this.meta = new Map();

    this.nodeComparator = new Comparator();

    this.insert = function (value) {
        if (this.nodeValueComparator.equal(this.value, null)) {
            this.value = value;

            return this;
        }

        if (this.nodeValueComparator.lessThan(value, this.value)) {
            if (this.left) {
                return this.left.insert(value);
            }

            const newNode = new BinarySearchTreeNode(value, this.compareFunction);
            this.setLeft(newNode);

            return newNode;
        }

        if (this.nodeValueComparator.greaterThan(value, this.value)) {
            if (this.right) {
                return this.right.insert(value);
            }

            const newNode = new BinarySearchTreeNode(value, this.compareFunction);
            this.setRight(newNode);

            return newNode;
        }

        return this;
    }

    this.find = function (value) {
        if (this.nodeValueComparator.equal(this.value, value)) {
            return this;
        }

        if (this.nodeValueComparator.lessThan(value, this.value) && this.left) {
            return this.left.find(value);
        }

        if (this.nodeValueComparator.greaterThan(value, this.value) && this.right) {
            return this.right.find(value);
        }

        return null;
    }

    this.contains = function (value) {
        return !!this.find(value);
    }

    this.remove = function (value) {
        const nodeToRemove = this.find(value);

        if (!nodeToRemove) {
            throw new Error('Item not found in the tree');
        }

        const { parent } = nodeToRemove;

        if (!nodeToRemove.left && !nodeToRemove.right) {
            if (parent) {
                parent.removeChild(nodeToRemove);
            } else {
                nodeToRemove.setValue(undefined);
            }
        } else if (nodeToRemove.left && nodeToRemove.right) {
            const nextBiggerNode = nodeToRemove.right.findMin();
            if (!this.nodeComparator.equal(nextBiggerNode, nodeToRemove.right)) {
                this.remove(nextBiggerNode.value);
                nodeToRemove.setValue(nextBiggerNode.value);
            } else {
                nodeToRemove.setValue(nodeToRemove.right.value);
                nodeToRemove.setRight(nodeToRemove.right.right);
            }
        } else {
            const childNode = nodeToRemove.left || nodeToRemove.right;

            if (parent) {
                parent.replaceChild(nodeToRemove, childNode);
            } else {
                BinaryTreeNode.copyNode(childNode, nodeToRemove);
            }
        }

        nodeToRemove.parent = null;

        return true;
    }

    this.getLeftHeight = function () {
        if (!this.left) {
            return 0;
        }

        return this.left.height + 1;
    }

    this.getRightHeight = function () {
        if (!this.right) {
            return 0;
        }

        return this.right.height + 1;
    }

    this.findMin = function () {
        if (!this.left) {
            return this;
        }

        return this.left.findMin();
    }

    this.getHeight = function () {
        return Math.max(this.leftHeight, this.rightHeight);
    }

    this.getBalanceFactor = function () {
        return this.leftHeight - this.rightHeight;
    }

    this.getUncle = function () {
        if (!this.parent) {
            return undefined;
        }

        if (!this.parent.parent) {
            return undefined;
        }

        if (!this.parent.parent.left || !this.parent.parent.right) {
            return undefined;
        }

        if (this.nodeComparator.equal(this.parent, this.parent.parent.left)) {
            return this.parent.parent.right;
        }

        return this.parent.parent.left;
    }

    this.setValue = function (value) {
        this.value = value;

        return this;
    }

    this.setLeft = function (node) {
        if (this.left) {
            this.left.parent = null;
        }

        this.left = node;

        if (this.left) {
            this.left.parent = this;
        }

        return this;
    }

    this.setRight = function (node) {
        if (this.right) {
            this.right.parent = null;
        }

        this.right = node;

        if (node) {
            this.right.parent = this;
        }

        return this;
    }

    this.removeChild = function (nodeToRemove) {
        if (this.left && this.nodeComparator.equal(this.left, nodeToRemove)) {
            this.left = null;
            return true;
        }

        if (this.right && this.nodeComparator.equal(this.right, nodeToRemove)) {
            this.right = null;
            return true;
        }

        return false;
    }

    this.replaceChild = function (nodeToReplace, replacementNode) {
        if (!nodeToReplace || !replacementNode) {
            return false;
        }

        if (this.left && this.nodeComparator.equal(this.left, nodeToReplace)) {
            this.left = replacementNode;
            return true;
        }

        if (this.right && this.nodeComparator.equal(this.right, nodeToReplace)) {
            this.right = replacementNode;
            return true;
        }

        return false;
    }

    this.copyNode = function (sourceNode, targetNode) {
        targetNode.setValue(sourceNode.value);
        targetNode.setLeft(sourceNode.left);
        targetNode.setRight(sourceNode.right);
    }

    this.traverseInOrder = function () {
        let traverse = [];

        if (this.left) {
            traverse = traverse.concat(this.left.traverseInOrder());
        }

        traverse.push(this.value);

        if (this.right) {
            traverse = traverse.concat(this.right.traverseInOrder());
        }

        return traverse;
    }

    this.toString = function () {
        return this.traverseInOrder().toString();
    }
}
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
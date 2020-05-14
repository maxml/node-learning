const LinkedList = require('./exLinkedList');

function GraphEdge(startVertex, endVertex, weight = 0) {
    this.startVertex = startVertex;
    this.endVertex = endVertex;
    this.weight = weight;

    this.getKey = function () {
        const startVertexKey = this.startVertex.getKey();
        const endVertexKey = this.endVertex.getKey();

        return `${startVertexKey}_${endVertexKey}`;
    }

    this.reverse = function () {
        const tmp = this.startVertex;
        this.startVertex = this.endVertex;
        this.endVertex = tmp;

        return this;
    }

    this.toString = function () {
        return this.getKey();
    }
}

function GraphVertex(value) {

    if (value === undefined) {
        throw new Error('Graph vertex must have a value');
    }

    const edgeComparator = (edgeA, edgeB) => {
        if (edgeA.getKey() === edgeB.getKey()) {
            return 0;
        }

        return edgeA.getKey() < edgeB.getKey() ? -1 : 1;
    };

    this.value = value;
    this.edges = new LinkedList(edgeComparator);

    this.addEdge = function (edge) {
        this.edges.push(edge);

        return this;
    }

    this.deleteEdge = function (edge) {
        this.edges.delete(edge);
    }

    this.getNeighbors = function () {
        const edges = this.edges.toArray();

        const neighborsConverter = (node) => {
            return node.value.startVertex === this ? node.value.endVertex : node.value.startVertex;
        };

        return edges.map(neighborsConverter);
    }

    this.getEdges = function () {
        return this.edges.toArray().map(linkedListNode => linkedListNode.value);
    }

    this.getDegree = function () {
        return this.edges.toArray().length;
    }

    this.hasEdge = function (requiredEdge) {
        const edgeNode = this.edges.find({
            callback: edge => edge === requiredEdge,
        });

        return !!edgeNode;
    }

    this.hasNeighbor = function (vertex) {
        const vertexNode = this.edges.find({
            callback: edge => edge.startVertex === vertex || edge.endVertex === vertex,
        });

        return !!vertexNode;
    }

    this.findEdge = function (vertex) {
        const edgeFinder = (edge) => {
            return edge.startVertex === vertex || edge.endVertex === vertex;
        };

        const edge = this.edges.find({ callback: edgeFinder });

        return edge ? edge.value : null;
    }

    this.getKey = function () {
        return this.value;
    }

    this.deleteAllEdges = function () {
        this.getEdges().forEach(edge => this.deleteEdge(edge));

        return this;
    }

    this.toString = function (callback) {
        return callback ? callback(this.value) : `${this.value}`;
    }
}

function Graph(isDirected) {

    this.vertices = {};
    this.edges = {};
    this.isDirected = isDirected;

    this.addVertex = function (newVertex) {
        this.vertices[newVertex.getKey()] = newVertex;

        return this;
    }

    this.getVertexByKey = function (vertexKey) {
        return this.vertices[vertexKey];
    }

    this.getNeighbors = function (vertex) {
        return vertex.getNeighbors();
    }

    this.getAllVertices = function () {
        return Object.values(this.vertices);
    }

    this.getAllEdges = function () {
        return Object.values(this.edges);
    }

    this.addEdge = function (edge) {
        let startVertex = this.getVertexByKey(edge.startVertex.getKey());
        let endVertex = this.getVertexByKey(edge.endVertex.getKey());

        if (!startVertex) {
            this.addVertex(edge.startVertex);
            startVertex = this.getVertexByKey(edge.startVertex.getKey());
        }

        if (!endVertex) {
            this.addVertex(edge.endVertex);
            endVertex = this.getVertexByKey(edge.endVertex.getKey());
        }

        if (this.edges[edge.getKey()]) {
            throw new Error('Edge has already been added before');
        } else {
            this.edges[edge.getKey()] = edge;
        }

        if (this.isDirected) {
            startVertex.addEdge(edge);
        } else {
            startVertex.addEdge(edge);
            endVertex.addEdge(edge);
        }

        return this;
    }

    this.deleteEdge = function (edge) {
        if (this.edges[edge.getKey()]) {
            delete this.edges[edge.getKey()];
        } else {
            throw new Error('Edge not found in graph');
        }

        const startVertex = this.getVertexByKey(edge.startVertex.getKey());
        const endVertex = this.getVertexByKey(edge.endVertex.getKey());

        startVertex.deleteEdge(edge);
        endVertex.deleteEdge(edge);
    }

    this.findEdge = function (startVertex, endVertex) {
        const vertex = this.getVertexByKey(startVertex.getKey());

        if (!vertex) {
            return null;
        }

        return vertex.findEdge(endVertex);
    }

    this.getWeight = function () {
        return this.getAllEdges().reduce((weight, graphEdge) => {
            return weight + graphEdge.weight;
        }, 0);
    }

    this.reverse = function () {
        this.getAllEdges().forEach((edge) => {
            this.deleteEdge(edge);

            edge.reverse();

            this.addEdge(edge);
        });

        return this;
    }

    this.getVerticesIndices = function () {
        const verticesIndices = {};
        this.getAllVertices().forEach((vertex, index) => {
            verticesIndices[vertex.getKey()] = index;
        });

        return verticesIndices;
    }

    this.getAdjacencyMatrix = function () {
        const vertices = this.getAllVertices();
        const verticesIndices = this.getVerticesIndices();

        const adjacencyMatrix = Array(vertices.length).fill(null).map(() => {
            return Array(vertices.length).fill(Infinity);
        });

        vertices.forEach((vertex, vertexIndex) => {
            vertex.getNeighbors().forEach((neighbor) => {
                const neighborIndex = verticesIndices[neighbor.getKey()];
                adjacencyMatrix[vertexIndex][neighborIndex] = this.findEdge(vertex, neighbor).weight;
            });
        });

        return adjacencyMatrix;
    }

    this.toString = function () {
        return Object.keys(this.vertices).toString();
    }
}

function test() {
    const graph = new Graph(true);

    const vertexA = new GraphVertex('A');
    const vertexB = new GraphVertex('B');
    const vertexC = new GraphVertex('C');
    const vertexD = new GraphVertex('D');

    const edgeAB = new GraphEdge(vertexA, vertexB);
    const edgeBC = new GraphEdge(vertexB, vertexC);
    const edgeCD = new GraphEdge(vertexC, vertexD);
    const edgeAD = new GraphEdge(vertexA, vertexD);

    graph
        .addEdge(edgeAB)
        .addEdge(edgeBC)
        .addEdge(edgeCD)
        .addEdge(edgeAD);

    const neighbors = graph.getNeighbors(vertexA);

    console.log(graph.toString());
    console.log(neighbors.toString());

}
test();
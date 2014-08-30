"use strict";

function Engine(canvas) {

var context = canvas.getContext('2d');

// width of edge in pixels
var edgeHalfWidth = 25;
// number of segments to draw edge
var edgeSegmentsCount = 10;

// colors
var styleColorEdgeBase = "#555";
var styleColorEdgeLine = "#fff";

// counters for ids
var vertexId = 0;
var edgeId = 0;

function Vertex() {
	this.id = ++vertexId;
	// position
	this.positionX = 0;
	this.positionY = 0;
	// normalized direction
	this.directionX = 0;
	this.directionY = 0;
}
Engine.Vertex = Vertex;

function Edge() {
	this.id = ++edgeId;
	this.vertexA = null;
	this.vertexB = null;
	this.leftEdge = null;
	this.rightEdge = null;
	this.bezierLengthA = 0;
	this.bezierLengthB = 0;

	// cache for positions (center-right-left)
	this.points = new Float32Array((edgeSegmentsCount + 1) * 3 * 2);
}
Engine.Edge = Edge;
Edge.prototype.updatePoints = function() {
	var vertexA = this.vertexA;
	var vertexB = this.vertexB;

	var aDirX = vertexA.directionX;
	var aDirY = vertexA.directionY;
	var bDirX = vertexB.directionX;
	var bDirY = vertexB.directionY;

	// calculate bezier points
	var ax = vertexA.positionX;
	var ay = vertexA.positionY;
	var bx = vertexB.positionX;
	var by = vertexB.positionY;

	var aLength = this.bezierLengthA;
	var bLength = this.bezierLengthB;

	var cx = ax + aDirX * aLength;
	var cy = ay + aDirY * aLength;
	var dx = bx + bDirX * bLength;
	var dy = by + bDirY * bLength;

	// calculate path points (A-C-D-B)
	for(var i = 0; i <= edgeSegmentsCount; ++i) {
		var t = i / edgeSegmentsCount;

		// point
		var acx = lerp(ax, cx, t);
		var acy = lerp(ay, cy, t);
		var cdx = lerp(cx, dx, t);
		var cdy = lerp(cy, dy, t);
		var dbx = lerp(dx, bx, t);
		var dby = lerp(dy, by, t);

		var acdx = lerp(acx, cdx, t);
		var acdy = lerp(acy, cdy, t);
		var cdbx = lerp(cdx, dbx, t);
		var cdby = lerp(cdy, dby, t);

		var centerX = lerp(acdx, cdbx, t);
		var centerY = lerp(acdy, cdby, t);

		// tangent
		var acx_ = cx - ax;
		var acy_ = cy - ay;
		var cdx_ = dx - cx;
		var cdy_ = dy - cy;
		var dbx_ = bx - dx;
		var dby_ = by - dy;

		var acdx_ = lerp(acx_, cdx_, t);
		var acdy_ = lerp(acy_, cdy_, t);
		var cdbx_ = lerp(cdx_, dbx_, t);
		var cdby_ = lerp(cdy_, dby_, t);

		var tangentX = lerp(acdx_, cdbx_, t);
		var tangentY = lerp(acdy_, cdby_, t);
		var tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
		tangentX /= tangentLength;
		tangentY /= tangentLength;

		// right
		var rightX = -tangentY * edgeHalfWidth;
		var rightY = tangentX * edgeHalfWidth;

		// center point
		this.points[(i * 3 + 0) * 2 + 0] = centerX;
		this.points[(i * 3 + 0) * 2 + 1] = centerY;
		// right point
		this.points[(i * 3 + 1) * 2 + 0] = centerX + rightX;
		this.points[(i * 3 + 1) * 2 + 1] = centerY + rightY;
		// left point
		this.points[(i * 3 + 2) * 2 + 0] = centerX - rightX;
		this.points[(i * 3 + 2) * 2 + 1] = centerY - rightY;
	}
};

function Graph() {
	this.vertices = [];
	this.edges = [];
}
Engine.Graph = Graph;
Graph.prototype.getVertexIndex = function(vertex) {
	for(var i = 0; i < this.vertices.length; ++i)
		if(this.vertices[i].id == vertex.id)
			return i;
	throw "no such vertex";
};
Graph.prototype.getEdgeIndex = function(edge) {
	for(var i = 0; i < this.edges.length; ++i)
		if(this.edges[i].id == edge.id)
			return i;
	throw "no such edge";
};
Graph.prototype.serialize = function() {
	var self = this;
	return {
		vertices: this.vertices.map(function(vertex) {
			return {
				x: vertex.positionX,
				y: vertex.positionY,
				dx: vertex.directionX,
				dy: vertex.directionY
			};
		}),
		edges: this.edges.map(function(edge) {
			return {
				a: self.getVertexIndex(edge.vertexA),
				b: self.getVertexIndex(edge.vertexB),
				l: edge.leftEdge ? self.getEdgeIndex(edge.leftEdge) : -1,
				r: edge.rightEdge ? self.getEdgeIndex(edge.rightEdge) : -1,
				al: edge.bezierLengthA,
				bl: edge.bezierLengthB
			};
		})
	};
};
Graph.deserialize = function(o) {
	var graph = new Graph();
	graph.vertices = o.vertices.map(function(v) {
		var vertex = new Vertex();
		vertex.positionX = v.x;
		vertex.positionY = v.y;
		vertex.directionX = v.dx;
		vertex.directionY = v.dy;
		return vertex;
	});
	graph.edges = o.edges.map(function(e) {
		var edge = new Edge();
		edge.vertexA = graph.vertices[e.a];
		edge.vertexB = graph.vertices[e.b];
		edge.bezierLengthA = e.al;
		edge.bezierLengthB = e.bl;
		return edge;
	});
	for(var i = 0; i < o.edges.length; ++i) {
		var l = o.edges[i].l;
		var r = o.edges[i].r;
		graph.edges[i].leftEdge = l >= 0 ? graph.edges[l] : null;
		graph.edges[i].rightEdge = r >= 0 ? graph.edges[r] : null;
		graph.edges[i].updatePoints();
	}
	return graph;
};

function drawGraph(graph) {
	var edges = graph.edges;

	for(var i = 0; i < edges.length; ++i) {
		var edge = edges[i];
		var points = edge.points;

		// make path
		context.fillStyle = styleColorEdgeBase;
		context.beginPath();
		context.moveTo(points[(0 * 3 + 2) * 2 + 0], points[(0 * 3 + 2) * 2 + 1]);
		for(var j = 1; j <= edgeSegmentsCount; ++j)
			context.lineTo(points[(j * 3 + 2) * 2 + 0], points[(j * 3 + 2) * 2 + 1]);
		for(var j = edgeSegmentsCount; j >= 0; --j)
			context.lineTo(points[(j * 3 + 1) * 2 + 0], points[(j * 3 + 1) * 2 + 1]);
		context.fill();
	}
}
this.drawGraph = drawGraph;

function lerp(a, b, t) {
	return a + (b - a) * t;
}

}

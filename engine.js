"use strict";

function Engine(canvas) {

var context = canvas.getContext('2d');

// width of edge in pixels
var edgeHalfWidth = 25;
// number of segments to draw edge
var edgeSegmentsCount = 20;

// colors
var styleColorEdgeBase = "#555";
var styleColorEdgeLine = "#fff";
var styleColorEdgeSiblingLine = "#00f";
var styleColorEdgeSelection = "#0f0";
var styleEdgeLineWidth = 2;
var styleArrowLength = 10;
var styleArrowSide = 5;
var styleEdgeBorderDash = [10];
var styleEdgeBorderSolid = [];

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
	this.leftBorder = "none"; // "none", "dash", "solid"
	this.rightBorder = "none";

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
		var tangentLength = length(tangentX, tangentY);
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
Edge.prototype.getCenterX = function() {
	return this.points[(Math.floor(edgeSegmentsCount / 2) * 3 + 0) * 2 + 0];
};
Edge.prototype.getCenterY = function() {
	return this.points[(Math.floor(edgeSegmentsCount / 2) * 3 + 0) * 2 + 1];
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
Graph.prototype.addVertex = function(vertex) {
	this.vertices.push(vertex);
};
Graph.prototype.removeVertex = function(vertex) {
	for(var i = 0; i < this.vertices.length; ++i)
		if(this.vertices[i].id == vertex.id) {
			this.vertices.splice(i, 1);
			break;
		}
};
Graph.prototype.addEdge = function(edge) {
	this.edges.push(edge);
};
Graph.prototype.removeEdge = function(edge) {
	for(var i = 0; i < this.edges.length; ++i)
		if(this.edges[i].id == edge.id) {
			this.edges.splice(i, 1);
			break;
		}
};
Graph.prototype.update = function() {
	for(var i = 0; i < this.edges.length; ++i)
		this.edges[i].updatePoints();
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
				bl: edge.bezierLengthB,
				borl: edge.leftBorder,
				borr: edge.rightBorder
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
		edge.leftBorder = e.borl || "none";
		edge.rightBorder = e.borr || "none";
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

	// draw roads
	context.strokeStyle = styleColorEdgeBase;
	context.lineWidth = edgeHalfWidth * 2;
	for(var i = 0; i < edges.length; ++i) {
		var edge = edges[i];
		var vertexA = edge.vertexA;
		var vertexB = edge.vertexB;

		var correctionAX = vertexA.directionX;
		var correctionAY = vertexA.directionY;
		var correctionLength = length(correctionAX, correctionAY);
		correctionAX /= correctionLength;
		correctionAY /= correctionLength;
		var correctionBX = vertexB.directionX;
		var correctionBY = vertexB.directionY;
		var correctionLength = length(correctionBX, correctionBY);
		correctionBX /= correctionLength;
		correctionBY /= correctionLength;
		context.beginPath();
		context.moveTo(vertexA.positionX - correctionAX, vertexA.positionY - correctionAY);
		context.bezierCurveTo(
			vertexA.positionX + vertexA.directionX * edge.bezierLengthA,
			vertexA.positionY + vertexA.directionY * edge.bezierLengthA,
			vertexB.positionX + vertexB.directionX * edge.bezierLengthB,
			vertexB.positionY + vertexB.directionY * edge.bezierLengthB,
			vertexB.positionX + correctionBX, vertexB.positionY + correctionBY);
		context.stroke();
	}

	// draw borders
	context.strokeStyle = styleColorEdgeLine;
	context.lineWidth = styleEdgeLineWidth;
	for(var i = 0; i < edges.length; ++i) {
		var edge = edges[i];

		// right border
		drawBorder(edge, edge.rightBorder, 1);
		// left border
		drawBorder(edge, edge.leftBorder, 2);
	}
	context.setLineDash(styleEdgeBorderSolid);

	// draw arrows
	context.strokeStyle = styleColorEdgeLine;
	context.lineWidth = styleEdgeLineWidth;
	for(var i = 0; i < edges.length; ++i) {
		var edge = edges[i];
		var vertexA = edge.vertexA;
		var vertexB = edge.vertexB;
		var points = edge.points;

		var arrowDirX = vertexB.positionX - vertexA.positionX;
		var arrowDirY = vertexB.positionY - vertexA.positionY;
		var arrowDirLength = length(arrowDirX, arrowDirY);
		arrowDirX /= arrowDirLength;
		arrowDirY /= arrowDirLength;

		drawArrow(
			edge.getCenterX(),
			edge.getCenterY(),
			arrowDirX,
			arrowDirY);
	}
}
this.drawGraph = drawGraph;

function drawGraphDebug(graph) {
	var edges = graph.edges;

	context.strokeStyle = styleColorEdgeSiblingLine;
	context.lineWidth = styleEdgeLineWidth;
	for(var i = 0; i < edges.length; ++i) {
		var leftEdge = edges[i];
		var rightEdge = leftEdge.rightEdge;

		if(!rightEdge)
			continue;

		var centerLeftX = leftEdge.getCenterX();
		var centerLeftY = leftEdge.getCenterY();
		var centerRightX = rightEdge.getCenterX();
		var centerRightY = rightEdge.getCenterY();

		var centerX = (centerLeftX + centerRightX) * 0.5;
		var centerY = (centerLeftY + centerRightY) * 0.5;

		var leftDirX = leftEdge.vertexB.positionX - centerX;
		var leftDirY = leftEdge.vertexB.positionY - centerY;
		var leftDirLength = length(leftDirX, leftDirY);
		leftDirX /= leftDirLength;
		leftDirY /= leftDirLength;
		var rightDirX = rightEdge.vertexB.positionX - centerX;
		var rightDirY = rightEdge.vertexB.positionY - centerY;
		var rightDirLength = length(rightDirX, rightDirY);
		rightDirX /= rightDirLength;
		rightDirY /= rightDirLength;

		drawArrow(centerX, centerY, leftDirX, leftDirY);
		drawArrow(centerX, centerY, rightDirX, rightDirY);
	}
}
this.drawGraphDebug = drawGraphDebug;

function drawBorder(edge, borderType, k) {
	var vertexA = edge.vertexA;
	var vertexB = edge.vertexB;
	var points = edge.points;

	switch(borderType) {
	case 'none': return;
	case 'dash':
		context.setLineDash(styleEdgeBorderDash);
		break;
	case 'solid':
		context.setLineDash(styleEdgeBorderSolid);
		break;
	}

	var lerpCoef = 0.9;

	context.beginPath();
	context.moveTo(
		lerp(points[(0 * 3 + 0) * 2 + 0], points[(0 * 3 + k) * 2 + 0], lerpCoef),
		lerp(points[(0 * 3 + 0) * 2 + 1], points[(0 * 3 + k) * 2 + 1], lerpCoef));
	for(var i = 1; i <= edgeSegmentsCount; ++i) {
		context.lineTo(
			lerp(points[(i * 3 + 0) * 2 + 0], points[(i * 3 + k) * 2 + 0], lerpCoef),
			lerp(points[(i * 3 + 0) * 2 + 1], points[(i * 3 + k) * 2 + 1], lerpCoef));
	}
	context.stroke();
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function drawArrow(x, y, dirX, dirY) {
	var rightX = -dirY * styleArrowSide;
	var rightY = dirX * styleArrowSide;
	dirX *= styleArrowLength;
	dirY *= styleArrowLength;
	context.beginPath();
	context.moveTo(x, y);
	context.lineTo(x + dirX * 2, y + dirY * 2);
	context.stroke();
	context.beginPath();
	context.moveTo(x - rightX + dirX, y - rightY + dirY);
	context.lineTo(x + dirX * 2, y + dirY * 2);
	context.lineTo(x + rightX + dirX, y + rightY + dirY);
	context.stroke();
}

function drawEdgeSelection(edge) {
	var vertexA = edge.vertexA;
	var vertexB = edge.vertexB;

	context.strokeStyle = styleColorEdgeSelection;
	context.lineWidth = styleEdgeLineWidth;
	context.beginPath();
	context.moveTo(vertexA.positionX, vertexA.positionY);
	context.bezierCurveTo(
		vertexA.positionX + vertexA.directionX * edge.bezierLengthA,
		vertexA.positionY + vertexA.directionY * edge.bezierLengthA,
		vertexB.positionX + vertexB.directionX * edge.bezierLengthB,
		vertexB.positionY + vertexB.directionY * edge.bezierLengthB,
		vertexB.positionX, vertexB.positionY);
	context.stroke();
}
this.drawEdgeSelection = drawEdgeSelection;

function length(x, y) {
	return Math.sqrt(x * x + y * y);
}

}

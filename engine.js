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
var styleColorEdgeLightLine = "#0ff";
var styleEdgeLineWidth = 2;
var styleArrowLength = 10;
var styleArrowSide = 5;
var styleEdgeBorderDash = [10];
var styleEdgeBorderSolid = [];

// counters for ids
var vertexId = 0;
var edgeId = 0;
var lightId = 0;

function Vertex() {
	this.id = ++vertexId;
	// position
	this.positionX = 0;
	this.positionY = 0;
	// normalized direction
	this.directionX = 0;
	this.directionY = 0;

	// cache
	this.inEdges = [];
	this.outEdges = [];
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
	this.light = null;

	// cache for positions (center-right-left)
	this.points = new Float32Array((edgeSegmentsCount + 1) * 3 * 2);
	// cache for lengths
	this.lengths = new Float32Array(edgeSegmentsCount + 1);
	// cars
	this.cars = [];
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
	var sumLength = 0;
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

		if(i > 0)
			sumLength += length(centerX - this.points[((i - 1) * 3 + 0) * 2 + 0], centerY - this.points[((i - 1) * 3 + 0) * 2 + 1]);
		this.lengths[i] = sumLength;
	}
};
Edge.prototype.getCenterX = function() {
	return this.points[(Math.floor(edgeSegmentsCount / 2) * 3 + 0) * 2 + 0];
};
Edge.prototype.getCenterY = function() {
	return this.points[(Math.floor(edgeSegmentsCount / 2) * 3 + 0) * 2 + 1];
};
Edge.prototype.getTravel = function(travelIndex, travel) {
	var t = (travelIndex + (travel - this.lengths[travelIndex]) / (this.lengths[travelIndex + 1] - this.lengths[travelIndex])) / edgeSegmentsCount;

	// COPYPASTE >_<

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

	return {
		x: centerX,
		y: centerY,
		angle: Math.atan2(tangentY, tangentX)
	};
};
Edge.prototype.addCar = function(car) {
	this.cars.push(car);
};
Edge.prototype.removeCar = function(car) {
	for(var i = 0; i < this.cars.length; ++i)
		if(this.cars[i] == car) {
			this.cars.splice(i, 1);
			break;
		}
};

function Light() {
	this.id = ++lightId;
	this.positionX = 0;
	this.positionY = 0;
	this.angle = 0;
	this.color = "red";
};
Engine.Light = Light;

function Graph() {
	this.vertices = [];
	this.edges = [];
	this.lights = [];
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
Graph.prototype.getLightIndex = function(light) {
	for(var i = 0; i < this.lights.length; ++i)
		if(this.lights[i] == light)
			return i;
	throw "no such light";
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
Graph.prototype.addLight = function(light) {
	this.lights.push(light);
};
Graph.prototype.removeLight = function(light) {
	for(var i = 0; i < this.lights.length; ++i)
		if(this.lights[i] == light) {
			this.lights.splice(i, 1);
			break;
		}
};
Graph.prototype.update = function() {
	for(var i = 0; i < this.edges.length; ++i)
		this.edges[i].updatePoints();
};
Graph.prototype.updateInOutEdges = function() {
	for(var i = 0; i < this.edges.length; ++i) {
		var edge = this.edges[i];
		edge.vertexA.outEdges.push(edge);
		edge.vertexB.inEdges.push(edge);
	}
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
				borr: edge.rightBorder,
				light: edge.light ? self.getLightIndex(edge.light) : -1
			};
		}),
		lights: this.lights.map(function(light) {
			return {
				x: light.positionX,
				y: light.positionY,
				a: light.angle,
				c: light.color
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
	graph.lights = o.lights.map(function(l) {
		var light = new Light();
		light.positionX = l.x;
		light.positionY = l.y;
		light.angle = l.a;
		light.color = l.c;
		return light;
	});
	for(var i = 0; i < o.edges.length; ++i) {
		var l = o.edges[i].l;
		var r = o.edges[i].r;
		graph.edges[i].leftEdge = l >= 0 ? graph.edges[l] : null;
		graph.edges[i].rightEdge = r >= 0 ? graph.edges[r] : null;
		graph.edges[i].updatePoints();
		graph.edges[i].light = o.edges[i].light >= 0 ? graph.lights[o.edges[i].light] : null;
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
}
this.drawGraph = drawGraph;

function drawGraphDebug(graph) {
	var edges = graph.edges;

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

	// draw sibling arrows
	context.strokeStyle = styleColorEdgeSiblingLine;
	context.lineWidth = styleEdgeLineWidth;
	for(var i = 0; i < edges.length; ++i) {
		var edge = edges[i];

		var leftEdge = edge.leftEdge;
		if(leftEdge) {
			var centerRightX = edge.getCenterX();
			var centerRightY = edge.getCenterY();
			var centerLeftX = leftEdge.getCenterX();
			var centerLeftY = leftEdge.getCenterY();

			var normalX = centerRightX - centerLeftX;
			var normalY = centerRightY - centerLeftY;
			var normalLength = length(normalX, normalY);
			normalX /= normalLength;
			normalY /= normalLength;

			drawArrow(centerRightX - normalX * styleArrowLength * 2, centerRightY - normalY * styleArrowLength * 2, normalX, normalY);
		}

		var rightEdge = edge.rightEdge;
		if(rightEdge) {
			var centerLeftX = edge.getCenterX();
			var centerLeftY = edge.getCenterY();
			var centerRightX = rightEdge.getCenterX();
			var centerRightY = rightEdge.getCenterY();

			var normalX = centerRightX - centerLeftX;
			var normalY = centerRightY - centerLeftY;
			var normalLength = length(normalX, normalY);
			normalX /= normalLength;
			normalY /= normalLength;

			drawArrow(centerLeftX, centerLeftY, normalX, normalY);
		}
	}

	// draw light arrows
	context.strokeStyle = styleColorEdgeLightLine;
	context.lineWidth = styleEdgeLineWidth;
	for(var i = 0; i < edges.length; ++i) {
		var edge = edges[i];
		var light = edge.light;
		if(!light)
			continue;

		context.beginPath();
		context.moveTo(edge.vertexB.positionX, edge.vertexB.positionY);
		context.lineTo(light.positionX, light.positionY);
		context.stroke();
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

function randomSelect(a) {
	return a[Math.floor(Math.random() * a.length) % a.length];
}

var carMaxSpeed = 400;
var carAcceleration = 200;
var carBrake = 600;
var carRadius = 100;
var carRandomsCount = 5;
var carFreeDistance = 200;
var carMaxDepth = 3;

function Car(type) {
	this.type = type;
	this.edge = null;
	this.travel = 0; // position in units on edge
	this.travelIndex = 0; // index of segment of edge
	this.speed = carMaxSpeed;

	this.div = $('<div class="car car' + type + '"></div>');

	this.randoms = [];
}
Engine.Car = Car;
Car.prototype.updateRandoms = function() {
	while(this.randoms.length < carRandomsCount)
		this.randoms.push(Math.floor(Math.random() * 100));
};
Car.prototype.getRandom = function(index) {
	this.updateRandoms();
	return this.randoms[index];
};
Car.prototype.popRandom = function() {
	this.randoms.splice(0, 1);
};
Car.prototype.randomSelect = function(a) {
	var index = this.getRandom(0);
	this.popRandom();
	return a[index % a.length];
};
Car.prototype.place = function(edge) {
	if(this.edge)
		this.edge.removeCar(this);
	this.edge = edge;
	if(this.edge)
		this.edge.addCar(this);
};
Car.prototype.selectNextEdge = function() {
	var vertex = this.edge.vertexB;
	if(vertex.outEdges.length <= 0)
		return null;
	return this.randomSelect(vertex.outEdges);
};
Car.prototype.destroy = function() {
	this.place(null);
	this.div.remove();
};
function canGoForward(selfCar, edge, travel, depth) {
	if(travel < -carFreeDistance || depth >= carRandomsCount)
		return true;

	// check cars
	for(var i = 0; i < edge.cars.length; ++i) {
		var car = edge.cars[i];
		if(car == selfCar)
			continue;
		var distance = car.travel - travel;
		if(distance > 0 && distance < carFreeDistance)
			return false;
	}

	// go forward
	if(selfCar && edge.vertexB.outEdges.length > 0) {
		var forwardTravel = travel - edge.lengths[edgeSegmentsCount];
		var forwardEdge = edge.vertexB.outEdges[selfCar.getRandom(depth) % edge.vertexB.outEdges.length];
		if(!canGoForward(selfCar, forwardEdge, forwardTravel, depth + 1))
			return false;
	}

	// go backward
	for(var i = 0; i < edge.vertexA.inEdges.length; ++i) {
		var backwardEdge = edge.vertexA.inEdges[i];
		for(var j = 0; j < backwardEdge.cars.length; ++j) {
			var car = backwardEdge.cars[j];
			if(car == selfCar)
				continue;
			// if that car is not going to go on our edge, skip it
			if(backwardEdge.vertexB.outEdges[car.getRandom(0)] != edge)
				continue;
			var distance = car.travel - backwardEdge.lengths[edgeSegmentsCount] - travel;
			if(distance > 0 && distance < carFreeDistance)
				return false;
		}
	}

	return true;
}
Car.prototype.canGoForward = function() {
	return canGoForward(this, this.edge, this.travel, 0);
};
Car.prototype.process = function(world, time) {
	var isForward = this.canGoForward();
	this.speed = isForward ? Math.min(this.speed + carAcceleration * time, carMaxSpeed) : Math.max(this.speed - carBrake * time, 0);
	this.travel += this.speed * time;
	while(true) {
		// advance on current edge
		while(this.travelIndex < edgeSegmentsCount && this.travel >= this.edge.lengths[this.travelIndex + 1])
			++this.travelIndex;

		// if current edge has not been passed
		if(this.travelIndex < edgeSegmentsCount)
			break;

		this.travelIndex = 0;
		this.travel -= this.edge.lengths[edgeSegmentsCount];

		// select one of the edges
		var nextEdge = this.selectNextEdge();
		// if there is no next edge, destroy
		if(!nextEdge) {
			world.removeCar(this);
			return;
		}

		this.place(nextEdge);

		// repeat forwarding
	}

	// update position
	var o = this.edge.getTravel(this.travelIndex, this.travel);
	this.div[0].style.transform = 'rotate(' + (o.angle + Math.PI) + 'rad)';
	this.div[0].style.left = (o.x - 75) + 'px';
	this.div[0].style.top = (o.y - 25) + 'px';
};

function World(graph, div, carTypes) {
	this.div = div;
	this.carTypes = carTypes;
	this.cars = [];
	this.sourceVertices = [];
	for(var i = 0; i < graph.vertices.length; ++i)
		if(graph.vertices[i].inEdges.length <= 0 && graph.vertices[i].outEdges.length > 0)
			this.sourceVertices.push(graph.vertices[i]);
}
World.prototype.removeCar = function(car) {
	for(var i = 0; i < this.cars.length; ++i)
		if(this.cars[i] == car) {
			this.cars.splice(i, 1);
			car.destroy();
			break;
		}
};
World.prototype.process = function(time) {
	// spawn new cars
	if(Math.random() < 0.1) {
		var vertex = randomSelect(this.sourceVertices);
		var edge = randomSelect(vertex.outEdges);

		// check if we can place a car
		if(canGoForward(null, edge, 0, 0)) {
			var carType = randomSelect(this.carTypes);
			var car = new Car(carType);
			car.place(edge);

			this.cars.push(car);
			this.div.append(car.div);
		}
	}

	// advance cars
	for(var i = 0; i < this.cars.length; ++i)
		this.cars[i].process(this, time);
};
Engine.World = World;

}

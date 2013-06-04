/**
 * test.js
 * Panzoom tests
 */

describe("Panzoom", function() {
	var $elem = $("#panzoom");
	var $svgElem = $("#panzoom-svg");
	var $rect = $svgElem.find("rect");
	var $zoomIn = $(".zoom-in");
	var $zoomOut = $(".zoom-out");
	var $zoomRange = $(".zoom-range");
	var $reset = $(".reset");

	before(function() {
		$elem.panzoom();
	});

	/**
	 * Simulates a start by triggering faux mousedown and touchstart events
	 */
	function fauxStart() {
		var e = new jQuery.Event( "mousedown", {
			which: 1,
			pageX: 0,
			pageY: 0,
			touches: [
				{ pageX: 0, pageY: 0 }
			]
		});
		$elem.trigger( e );
		e.type = "touchstart";
		$elem.trigger( e );
	}

	it("should have elements available", function() {
		expect( $elem ).to.have.length( 1 );
		expect( $zoomIn ).to.have.length( 1 );
		expect( $zoomOut ).to.have.length( 1 );
		expect( $zoomRange ).to.have.length( 1 );
		expect( $reset ).to.have.length( 1 );
	});

	it("should chain and not create a new instance when called again", function() {
		var orig = $elem.panzoom("instance");
		expect( $elem.panzoom().panzoom("instance") ).to.eql( orig );
	});

	it("should destroy itself", function() {
		$elem.panzoom("destroy");
		expect( $elem.panzoom("instance") ).to.be.undefined;
	});

	it("should allow different starting values for zoom than 1", function() {
		$elem.css( "transform", "scale(2)" );
		var panzoom = $elem.panzoom({ $zoomRange: $zoomRange }).panzoom("instance");
		expect( panzoom.getTransform() ).to.contain("matrix");
		expect( $zoomRange.val() ).to.equal("2");
		// Clean-up
		$elem.css( "transform", "" );
		$elem.panzoom("destroy");
	});

	it("should create a new panzoom with buttons", function() {
		$elem.panzoom({
			$zoomIn: $zoomIn,
			$zoomOut: $zoomOut,
			$zoomRange: $zoomRange,
			$reset: $reset
		});
		expect( $elem.panzoom("option", "$zoomIn") ).to.have.length( 1 );
	});

	it("should allow retrieval of all options without affecting them", function() {
		var options = $elem.panzoom("option");
		options.$zoomIn = null;
		expect( $elem.panzoom("option", "$zoomIn") ).to.not.be.null;
	});

	it("should set options correctly", function() {
		var panzoom = $elem.panzoom("instance");
		var options = $elem.panzoom("option");
		var transition = panzoom._transition;
		$elem.panzoom("option", {
			duration: 500,
			easing: "linear"
		});
		// Updates the transition property
		expect( panzoom._transition ).to.not.equal( transition );
		$elem.panzoom( "option", "duration", options.duration );
		$elem.panzoom( "option", "easing", options.easing );
		expect( panzoom._transition ).to.equal( transition );
	});

	it("should set the cursor option", function(){
		$elem.panzoom( "option", "cursor", "default" );
		expect( $elem.panzoom("option", "cursor") ).to.equal("default");
		expect( $elem.css("cursor") ).to.equal("default");
		// Clean-up
		$elem.panzoom( "option", "cursor", "move" );
		expect( $elem.css("cursor") ).to.equal("move");
	});

	it("should not transition if transition is set to false", function() {
		$elem.panzoom( "option", "transition", false );
		$elem.panzoom("reset");
		expect( $elem.css("transform") ).to.equal("none");
		// Clean-up
		$elem.panzoom( "option", "transition", true );
	});

	it("should not pan if disablePan is set to true", function() {
		$elem.panzoom( "option", "disablePan", true );
		var panzoom = $elem.panzoom("instance");
		var setMatrix = panzoom.setMatrix;
		var called = false;
		panzoom.setMatrix = function() {
			called = true;
		};
		fauxStart();
		expect( called ).to.be.false;

		// Clean-up
		panzoom.setMatrix = setMatrix;
		$elem.panzoom( "option", "disablePan", false );
	});

	it("should unbind zoom if disableZoom is set to true", function() {
		$elem.panzoom( "option", "disableZoom", true );
		var events = $._data( $zoomIn[0], "events" );
		var clickEvent = events && ( events.click || events.touchend );
		expect( clickEvent ).to.not.exist;

		// Clean-up
		$elem.panzoom( "option", "disableZoom", false );
		events = $._data( $zoomIn[0], "events" );
		clickEvent = events && ( events.click || events.touchend );
		expect( clickEvent ).to.not.be.empty;
	});

	it("should zoom, then reset transform matrix", function() {
		var panzoom = $elem.panzoom("instance");
		// Zoom twice
		$elem.panzoom("zoom");
		$elem.panzoom("zoom");
		expect( +panzoom.getMatrix()[0] ).to.be.above( 1 );

		$elem.panzoom("reset");
		expect( +panzoom.getMatrix()[0] ).to.equal( 1 );
	});

	it("should set the zoom range input's value on zoom", function() {
		var cur = $zoomRange.val();
		$elem.panzoom("zoom");
		var val = $zoomRange.val();
		expect( val ).to.not.equal( cur );
		expect( val ).to.equal( $elem.panzoom("getMatrix")[0] );
	});

	it("should bind the onStart event", function() {
		var called = false;
		var instance = $elem.panzoom("instance");
		function testStart( e, panzoom, startPageX ) {
			called = true;
			expect( startPageX ).to.equal( 0 );
			expect( panzoom ).to.eql( instance );
			expect( panzoom.panning ).to.be.true;
		}
		$elem.panzoom( "option", "onStart", testStart );
		instance._startMove( 0, 0 );
		$(document).trigger("mouseup").trigger("touchend");
		$elem.off( "panzoomstart", testStart );
		$elem.panzoom( "option", "onStart", null );
		expect( called ).to.be.true;
	});

	it("should keep panning up-to-date for isPanning()", function() {
		fauxStart();
		var panzoom = $elem.panzoom("instance");
		expect( panzoom.isPanning() ).to.be.true;
		$(document).trigger("mouseup").trigger("touchend");
		expect( panzoom.isPanning() ).to.be.false;
	});

	it("should bind the onEnd event", function() {
		var called = false;
		var instance = $elem.panzoom("instance");
		function testEnd( e, panzoom ) {
			called = true;
			expect( panzoom ).to.eql( instance );
			expect( panzoom.panning ).to.be.false;
		}
		$elem.panzoom( "option", "onEnd", testEnd );
		instance._startMove( 0, 0 );
		$(document).trigger("mouseup").trigger("touchend");
		$elem.off( "panzoomend", testEnd );
		$elem.panzoom( "option", "onEnd", null );
		expect( called ).to.be.true;
	});

	it("should bind the onChange event", function() {
		var called = false;
		var instance = $elem.panzoom("instance");
		function testChange( e, panzoom, transform ) {
			called = true;
			expect( panzoom ).to.eql( instance );
			expect( transform ).to.be.a("string");
			expect( panzoom.panning ).to.be.false;
		}
		$elem.panzoom( "option", "onChange", testChange );
		$elem.panzoom( "setMatrix", [ 1, 0, 0, 1, 0, 0 ] );
		$elem.off( "panzoomchange", testChange );
		$elem.panzoom( "option", "onChange", null );
		expect( called ).to.be.true;
	});

	it("should not trigger the change event if the silent option is true", function() {
		var called = false;
		function testChange() {
			called = true;
		}
		$elem.on( "panzoomchange", testChange );
		$elem.panzoom( "setMatrix", [ 1, 0, 0, 1, 0, 0 ], { silent: true });
		$elem.off( "panzoomchange", testChange );
		expect( called ).to.be.false;
	});

	it("should trigger the zoom event on zoom", function() {
		var called = false;
		function testZoom( e, panzoom, scale ) {
			called = true;
			expect( scale ).to.be.a("number");
		}
		$elem.on( "panzoomzoom", testZoom );
		$elem.panzoom("zoom");
		expect( called ).to.be.true;
	});

	it("should not trigger the zoom event when silenced", function() {
		var called = false;
		function testZoom() {
			called = true;
		}
		$elem.on( "panzoomzoom", testZoom );
		$elem.panzoom("zoom", { silent: true });
		expect( called ).to.be.false;
	});

	it("should trigger the pan event on pan", function() {
		var called = false;
		function testPan( e, panzoom, x, y ) {
			called = true;
			expect( x ).to.be.a("number");
			expect( y ).to.be.a("number");
		}
		$elem.on( "panzoompan", testPan );
		fauxStart();
		var e = jQuery.Event("mousemove", {
			pageX: 1,
			pageY: 1,
			touches: [
				{ pageX: 1, pageY: 1 }
			]
		});
		var $doc = $(document).trigger( e );
		e.type = "touchmove";
		$doc.trigger( e ).trigger("mouseup").trigger("touchend");
		expect( called ).to.be.true;
	});

	it("should allow string or arrays when setting the matrix", function() {
		var panzoom = $elem.panzoom("instance");
		var _matrix = panzoom.getMatrix();
		panzoom.setMatrix("none");
		expect( panzoom.getTransform() ).to.equal("none");
		panzoom.setMatrix( _matrix );
		expect( panzoom.getMatrix() ).to.eql( _matrix );
	});

	it("should trigger the reset event on reset", function() {
		var called = false;
		function testReset( e, panzoom, matrix ) {
			called = true;
			expect( matrix ).to.be.an("array");
		}
		$elem.on("panzoomreset", testReset).panzoom("reset");
		expect( called ).to.be.true;
	});

	it("should reset zoom only on resetZoom", function() {
		var panzoom = $elem.panzoom("instance");
		panzoom.setMatrix([ 2, 0, 0, 2, 1, 1 ], false);
		$elem.panzoom("resetZoom", false);
		var matrix = panzoom.getMatrix();
		expect( matrix[0] ).to.equal( "1" );
		expect( matrix[3] ).to.equal( "1" );
		expect( matrix[4] ).to.equal( "1" );
		expect( matrix[5] ).to.equal( "1" );
		$elem.panzoom("reset");
	});

	it("should reset pan only on resetPan", function() {
		var panzoom = $elem.panzoom("instance");
		panzoom.setMatrix([ 2, 0, 0, 2, 1, 1 ], false);
		$elem.panzoom("resetPan");
		var matrix = panzoom.getMatrix();
		expect( matrix[0] ).to.equal( "2" );
		expect( matrix[3] ).to.equal( "2" );
		expect( matrix[4] ).to.equal( "0" );
		expect( matrix[5] ).to.equal( "0" );
		$elem.panzoom("reset");
	});

	it("should reset to the specified transform on reset", function() {
		var transform = "matrix(1, 0, 0, -1, 0, 0)";
		// Reset to upside-down
		$elem.panzoom( "option", "startTransform", transform );
		var panzoom = $elem.panzoom("instance");
		panzoom.reset();
		expect( panzoom.getTransform() ).to.equal( transform );
		$elem.css("transform", "none");
		$elem.panzoom( "option", "startTransform", undefined );
		panzoom.reset();
	});

	/**
	 * Simulates a pinch gesture (even in desktop browsers) starting at the move
	 * (the move event must already be bound)
	 * @param {Function} complete
	 */
	function testPinch( complete ) {
		var panzoom = $elem.panzoom("instance");
		var origMatrix = panzoom.getMatrix();

		// Faux events with touches property
		var e = new jQuery.Event("mousemove", {
			touches: [
				{ pageX: 10, pageY: 10 },
				{ pageX: 20, pageY: 20 }
			]
		});
		var $doc = $(document).trigger( e );
		e.type = "touchmove";
		$doc.trigger( e )
			// Kill events
			.trigger("touchend").trigger("mouseup");

		// Run tests
		complete();

		// Reset matrix
		panzoom.setMatrix( origMatrix );
	}

	it("should pan on the middle point when zooming (and gravitate towards that point)", function() {
		var panzoom = $elem.panzoom("instance");
		var matrix = panzoom.getMatrix();
		panzoom._startMove([
			{ pageX: 0, pageY: 0 },
			{ pageX: 10, pageY: 10 }
		]);
		testPinch(function() {
			var newMatrix = panzoom.getMatrix();
			expect( +newMatrix[4] ).to.equal( +matrix[4] + 11 );
			expect( +newMatrix[5] ).to.equal( +matrix[5] + 11 );
		});
	});

	if ( Modernizr.touch ) {
		it("should pan with 2 fingers even if disableZoom is true", function() {
			$elem.panzoom( "option", "disableZoom", true );
			var panzoom = $elem.panzoom("instance");
			var matrix = panzoom.getMatrix();

			// Start move by using touchstart
			var e = new jQuery.Event("touchstart", {
				touches: [
					{ pageX: 0, pageY: 0 },
					{ pageX: 10, pageY: 10 }
				]
			});
			$elem.trigger( e );
			testPinch(function() {
				var newMatrix = panzoom.getMatrix();
				// Make sure a pan was done
				expect( +newMatrix[4] ).to.not.equal( +matrix[4] );
				expect( +newMatrix[5] ).to.not.equal( +matrix[5] );
			});
			// Clean-up
			$elem.panzoom( "option", "disableZoom", false );
		});
	}

	/* SVG
	---------------------------------------------------------------------- */
	it("should create an SVG panzoom with buttons", function() {
		var panzoom = $svgElem.panzoom().panzoom("instance");
		// isSVG should be false on nodeName svg
		expect( panzoom.isSVG ).to.be.false;
		panzoom.destroy();
	});

	it("should create an SVG panzoom on a rect", function() {
		$rect.panzoom({
			$zoomIn: $zoomIn,
			$zoomOut: $zoomOut,
			$zoomRange: $zoomRange,
			$reset: $reset
		});
		var panzoom = $rect.panzoom("instance");
		expect( panzoom.isSVG ).to.be.true;
	});
});

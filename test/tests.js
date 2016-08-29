var videoId = "phVdqyThPgc";

QUnit.test("Selector: standard", function (assert) {
	var $set = $("#qunit-fixture .standard a:youtube");
	assert.equal($set.length, 6, "Found standard link(s)");

	$set.each(function(link) {
		assert.equal($(this).data('videoId'), videoId, "videoId correct");
	});
});


QUnit.test("Selector: alternate", function (assert) {
	var $set = $("#qunit-fixture .alternate a:youtube");
	assert.equal($set.length, 6, "Found alternate link(s)");

	$set.each(function(link) {
		assert.equal($(this).data('videoId'), videoId, "yt-video-id correct");
	});
});


QUnit.test("Selector: short", function (assert) {
	var $set = $("#qunit-fixture .short a:youtube");
	assert.equal($set.length, 3, "Found short link(s)");

	$set.each(function(link) {
		assert.equal($(this).data('videoId'), videoId, "yt-video-id correct");
	});
});


QUnit.test("Selector: embed", function (assert) {
	var $set = $("#qunit-fixture .embed a:youtube");
	assert.equal($set.length, 6, "Found embed link(s)");

	$set.each(function(link) {
		assert.equal($(this).data('videoId'), videoId, "yt-video-id correct");
	});
});


QUnit.test("videoId", function (assert) {
	var $links = $(".standard a:youtube, .alternate a:youtube, .short a:youtube, .embed a:youtube");
	$links.each(function (index) {
		var id = $.autotube.videoId(this);
		assert.equal(id, "phVdqyThPgc", this.href);
	});
});


QUnit.test("Template renderer created from id", function(assert) {
	var def = $.autotube.templateRenderer("test-template");
	var data = { city: "Spain", location: "plain" };
	def.done(function(renderer) {
		var result = renderer(data);
		assert.ok(result.indexOf("The rain in Spain falls mainly in the plain.") > -1, "Template rendered"); 
	});
});


QUnit.test("Template referenced by id is cached", function(assert) {
	var id = "cached-template";
	var def1 = $.autotube.templateRenderer(id);
	var testDone = assert.async();

	// Mark the renderer
	def1.done(function(renderer1) {
		renderer1.tag = "x";		

		// Get it again, check that it's marked
		var def2 = $.autotube.templateRenderer(id);
		def2.done(function(renderer2) {
			assert.equal(renderer2.tag, "x", "Cached renderer returned on reuse");

			testDone();
		});
	});
});


QUnit.test("Bad template id throws exception", function(assert) {
	assert.throws(function() {
		$.autotube.templateRenderer("badid");
	}, "Exception thrown");
});


QUnit.test("Template renderer created from url", function(assert) {
	var def = $.autotube.templateRenderer("/test/template1.html");
	var data = { speed: "quick", color: "brown", animal: "fox" };
	var done = assert.async();
	def.done(function(renderer) {
		var result = renderer(data);
		assert.ok(result.indexOf("The quick brown fox jumped") > -1, "Template rendered");
		done();
	});
});


QUnit.test("Template referenced by url is cached", function(assert) {
	var url = "/test/callout-template.html";
	var def1 = $.autotube.templateRenderer(url);
	var testDone = assert.async();

	// Mark the renderer
	def1.done(function(r1) {
		r1.tag = "z";

		// Get it again, check that it's marked
		var def2 = $.autotube.templateRenderer(url);
		def2.done(function(r2) {
			assert.equal(r2.tag, "z", "Cached renderer returned on reuse");
			testDone();
		});
	});
});


QUnit.test("Literal template compiles", function(assert) {
	var templateText = "<p>The {{=speed}} {{=color}} {{=animal}} jumped over the lazy dogs.</p>";
	var def = $.autotube.templateRenderer(templateText);
	var data = { speed: "quick", color: "brown", animal: "fox" };
	var text;

	var done = assert.async();
	def.done(function(render) {
		text = render(data);
		assert.ok(text.indexOf("The quick brown fox jumped over the lazy dogs.") > -1, text);
		done();
	});
});


QUnit.test("Template id may contain hyphen", function(assert) {

	var id = "hyphenated-name";
	var def = $.autotube.templateRenderer(id);
	var done = assert.async();

	def.done(function(renderer) {
		// Renderer is a function
		assert.equal(typeof(renderer), "function", "Template loaded.");

		// Ensure the id was treated as an id, and not a literal template definition
		var result = renderer({});
		assert.notEqual(result, id, "Argument not a literal template definition");

		done();
	});
});


QUnit.test("Template data object may contain subproperties", function(assert) {
	var templateText = "<p>The {{=sub.speed}} {{=sub.color}} {{=sub.animal}} jumped over the lazy dogs.</p>";
	var def = $.autotube.templateRenderer(templateText);
	var data = {
		sub: { speed: "quick", color: "brown", animal: "fox" }
	};
	var done = assert.async();

	def.done(function(renderer) {
		text = renderer(data);
		assert.equal(text, "<p>The quick brown fox jumped over the lazy dogs.</p>");
		done();
	});
});


QUnit.test("Init method stores data on elements", function(assert) {
	
	// Null callback to prevent callout getting into DOM
	var callback = function() {

	};

	var options = {
		calloutCallback: callback
	};

	var set = $("#qunit-fixture div.standard a:youtube");
	assert.ok(set.length, "Set not empty");
 	set.autotube(options);

 	set.each(function() {
 		var data = $(this).data("autotube");
 		assert.ok(data.settings, "Element data contains settings");
 	});

 	set.removeData("autotube");
});


QUnit.test("Init applied to element more than once throws", function(assert) {
	var set = $("#qunit-fixture div.standard a:youtube");
	set.autotube();
	assert.throws(function() {

		// Apply init to same elements
		set.autotube();
	});

	set.removeData("autotube");
});


QUnit.test("Callout callback invoked for each link", function(assert) {

	var done = assert.async();
	var videoId = "-21iYoe7cI4";

	// Callout callback
	var callback = function(info, $link, $callout) {
		assert.equal(info.videoId, videoId, "Video id matches");
		done();
	};

	var set = $("#callout-callback a:youtube");
	var options = {
		calloutCallback: callback 	
	};

	set.autotube(options);

	set.removeData("autotube");
});


QUnit.test("Custom callout renderer invoked", function(assert) {

	// Callout callback
	var callbackDone = assert.async();
	var callback = function(info, $link, $callout) {
		// Verify template renderer invoked
		assert.ok($callout.html().indexOf("I'm a callout for") > -1, "Custom template used");
		callbackDone();
	};

	// Callout template renderer callback
	var rendererDone = assert.async();
	var renderer = function(info) {
		assert.ok(true, "Custom template renderer invoked");
		rendererDone();
		return "<div>I'm a callout for " + info.videoId + "!</div>";
	};

	var options = { 
		calloutCallback: callback,
		calloutRenderer: renderer
	};
	var set = $("#custom-callout-renderer a:youtube").autotube(options);
});


QUnit.test("Default callout placer inserts markup", function(assert) {

	var set = $("#default-callout-placer a:youtube").autotube();

	var markup = $("#default-callout-placer-p div.video-callout");
	assert.equal(markup.length, 1, "Callout <div> exists");
});


QUnit.test("Custom callout placer invoked", function(assert) {

	var done = assert.async();
	var placer = function(info, $link, $callout) {
		assert.ok(info, "Info provided");
		done();
	};

	var options = {
		calloutCallback: placer
	};

	$("#custom-callout-placer a:youtube").autotube(options);
});


QUnit.test("getMetadata invokes callback", function(assert) {

	var $set = $("div#get-metadata a:youtube");
	assert.ok($set.length > 1, "Set contains at least one element");

	var done = assert.async($set.length);

	var callback = function(metadata) {
			assert.equal(metadata.kind, "youtube#video", "Callback invoked with metadata");
			done();
	};

	var options = { apikey: ytDataApiKey };
	$set.getMetadata(options, callback);
});


QUnit.test("getMetadata adds custom data", function(assert) {
	var $set = $("#qunit-fixture .standard li:nth-child(1) a:youtube");
	var done = assert.async();

	var options = { apikey: ytDataApiKey };
	$set.getMetadata(options, function(vdata) {
		assert.equal(vdata.autotube.duration, "1:54");
		done();
	});
});


QUnit.test("Iso8601", function(assert) {

	var d1 = new Iso8601('PT3M12S');
	var expected = { years:0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 3, seconds: 12 };
	
	assert.propEqual(d1, expected);

	var d2 = new Iso8601('P2Y3M4W5DT20H31M21S');
	expected = { years: 2, months: 3, weeks: 4, days: 5, hours: 20, minutes: 31, seconds: 21 };
	assert.propEqual(d2, expected);

});


QUnit.test("Iso8601 display", function(assert) {
	assert.equal(new Iso8601("PT6S").toDisplay(), "0:06", "Short time");

	assert.equal(new Iso8601("PT4M56S").toDisplay(), "4:56", "Medium time");

	assert.equal(new Iso8601("PT1H3M19S").toDisplay(), "1:03:19", "Long time");
});


QUnit.test("Iso8601.toDispalay", function(assert) {
	var d1 = new Iso8601('PT4S');
	assert.equal(d1.toDisplay(), '0:04', 'PT4S');

	var d2 = new Iso8601('PT1M8S');
	assert.equal(d2.toDisplay(), '1:08', 'PT1M8S');

	var d3 = new Iso8601('PT1H6M9S');
	assert.equal(d3.toDisplay(), '1:06:09', 'PT1H6M9S');

	var d4 = new Iso8601('PT1M24S');
	assert.equal(d4.toDisplay(), '1:24', 'PT1M24S');
});


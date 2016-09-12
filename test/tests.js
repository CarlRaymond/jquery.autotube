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
	var engine = new TemplateEngine();
	var def = engine.template("test-template");
	var data = { city: "Spain", location: "plain" };
	def.done(function(template) {
		var result = template(data);
		assert.ok(result.indexOf("The rain in Spain falls mainly in the plain.") > -1, "Template rendered"); 
	});
});


QUnit.test("Template referenced by id is cached", function(assert) {
	var id = "cached-template";
	var engine = new TemplateEngine();
	var def1 = engine.template(id);
	var testDone = assert.async();

	// Mark the renderer
	def1.done(function(template1) {
		template1.tag = "x";		

		// Get it again, check that it's marked
		var def2 = engine.template(id);
		def2.done(function(template2) {
			assert.equal(template2.tag, "x", "Cached template renderer returned on reuse");

			testDone();
		});
	});
});


QUnit.test("Bad template id throws exception", function(assert) {
	var engine = new TemplateEngine();
	assert.throws(function() {
		engine.template("badid");
	}, "Exception thrown");
});


QUnit.test("Template renderer created from url", function(assert) {
	var engine = new TemplateEngine();
	var def = engine.template("/test/template1.html");
	var data = { speed: "quick", color: "brown", animal: "fox" };
	var done = assert.async();
	def.done(function(template) {
		var result = template(data);
		assert.ok(result.indexOf("The quick brown fox jumped") > -1, "Template rendered");
		done();
	});
});


QUnit.test("Template referenced by url is cached", function(assert) {
	var engine = new TemplateEngine();
	var url = "/test/callout-template.html";
	var def1 = engine.template(url);
	var testDone = assert.async();

	// Mark the renderer
	def1.done(function(r1) {
		r1.tag = "z";

		// Get it again, check that it's marked
		var def2 = engine.template(url);
		def2.done(function(r2) {
			assert.equal(r2.tag, "z", "Cached template renderer returned on reuse");
			testDone();
		});
	});
});


QUnit.test("Literal template compiles", function(assert) {
	var engine = new TemplateEngine();
	var templateText = "<p>The {{=speed}} {{=color}} {{=animal}} jumped over the lazy dogs.</p>";
	var def = engine.template(templateText);
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
	var engine = new TemplateEngine();
	var id = "hyphenated-name";
	var def = engine.template(id);
	var done = assert.async();

	def.done(function(template) {
		// Template renderer is a function
		assert.equal(typeof(template), "function", "Template renderer loaded.");

		// Ensure the id was treated as an id, and not a literal template definition
		var result = template({});
		assert.notEqual(result, id, "Argument not a literal template definition");

		done();
	});
});


QUnit.test("Template data object may contain subproperties", function(assert) {
	var engine = new TemplateEngine();
	var templateText = "<p>The {{=sub.speed}} {{=sub.color}} {{=sub.animal}} jumped over the lazy dogs.</p>";
	var def = engine.template(templateText);
	var data = {
		sub: { speed: "quick", color: "brown", animal: "fox" }
	};
	var done = assert.async();

	def.done(function(template) {
		text = template(data);
		assert.equal(text, "<p>The quick brown fox jumped over the lazy dogs.</p>");
		done();
	});
});



QUnit.test("videoMetadata invokes callback", function(assert) {

	var $set = $("div#get-metadata a:youtube");
	assert.ok($set.length > 1, "Set contains at least one element");

	var done = assert.async($set.length);

	var callback = function(metadata) {
			assert.equal(metadata.kind, "youtube#video", "Callback invoked with metadata");
			done();
	};

	var options = { apikey: yourYoutubeDataApiKey };
	$set.videoMetadata(options, callback);
});


QUnit.test("videoMetadata adds custom data", function(assert) {
	var $set = $("#qunit-fixture .standard li:nth-child(1) a:youtube");
	var done = assert.async();

	var options = { apikey: yourYoutubeDataApiKey };
	$set.videoMetadata(options, function(metadata) {
		assert.equal(metadata._playingTime, "1:54");
		done();
	});
});


QUnit.test("videoPoster renders posters", function(assert) {

	var options = {
		apikey: yourYoutubeDataApiKey,
		template: 'callout-template',
		placer: 'appendToParent',
		onclick: 'replacePoster',
		posterSelector: ".video-player"
	};

	var $set = $("#posters a:youtube");
	var done = assert.async($set.length);
	assert.expect(0);

	var callback = function(elem, data) {
		done();
	};

	$set.videoPoster(options, callback);
});


QUnit.test("videoPoster invokes supplied renderer", function(assert) {
	var renderer = function(data) {
		assert.ok(data.snippet.title != null);
		done();
		return "<p>Title: <strong>" + data.snippet.title + "</strong></p>";
	};

	var options = {
		apikey: yourYoutubeDataApiKey,
		template: renderer,
		placer: 'replaceLink'
	};

	var $set = $("#external-renderer a:youtube");
	var done = assert.async($set.length);
	assert.expect($set.length);
	
	$set.videoPoster(options);
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


QUnit.test("YoutubeApiLoader loads API", function(assert) {
	var loader = new YoutubeApiLoader();
	var done = assert.async();

	var p = loader.load().done(function(YT) {
		assert.equal(typeof(YT.Player), "function");
		done();
	});
});


QUnit.test("YoutubeApiLoader multiple promises resolve", function(assert) {
	var loader = new YoutubeApiLoader();
	var done = assert.async(2);

	var p1 = loader.load();
	p1.done(function(YT) {
		assert.equal(typeof(YT.Player), "function");
		done();
	});

	var p2 = loader.load();
	p2.done(function(YT) {
		assert.equal(typeof(YT.Player), "function");
		done();
	});

});
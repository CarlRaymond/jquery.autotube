
QUnit.test("Selector: standard", function (assert) {
	var $set = $("#qunit-fixture .standard a:youtube");
	assert.equal($set.length, 6, "Found standard link(s)");
});

QUnit.test("Selector: alternate", function (assert) {
	var $set = $("#qunit-fixture .alternate a:youtube");
	assert.equal($set.length, 6, "Found alternate link(s)");
});

QUnit.test("Selector: short", function (assert) {
	var $set = $("#qunit-fixture .short a:youtube");
	assert.equal($set.length, 3, "Found short link(s)");
});

QUnit.test("Selector: embed", function (assert) {
	var $set = $("#qunit-fixture .embed a:youtube");
	assert.equal($set.length, 6, "Found embed link(s)");
});

QUnit.test("videoId", function (assert) {
	var $links = $("#qunit-fixture a:youtube");
	$links.each(function (index) {
		var id = $.autotube.videoId(this);
		assert.equal(id, "phVdqyThPgc", this.href);
	});
});



QUnit.test("Named template compiles", function (assert) {

	var template = $.autotube.template("test-template");
	assert.equal(typeof(template), "function");
});

QUnit.test("Named template cached", function(assert) {

	var name = "cached-template";
	var renderer1 = $.autotube.template(name);

	// Mark it
	renderer1.tag = "x";

	// Get it again,
	var renderer2 = $.autotube.template(name);
	assert.equal(renderer2.tag, renderer1.tag, "Cached parser returned on reuse");
});

QUnit.test("Named template renders text", function(assert) {
	var template = $.autotube.template("test-template");
	var data = { city: "Spain", location: "plain"};
	var result = template(data);
	assert.ok(result.indexOf("The rain in Spain falls mainly in the plain.") > -1, "Text found");
});


QUnit.test("Literal template compiles", function(assert) {
	var template = "<p>The <%=speed%> <%=color%> <%=animal%> jumped over the lazy dogs.</p>";
	var renderer = $.autotube.template(template);
	var data = { speed: "quick", color: "brown", animal: "fox" };

	var text = renderer(data);

	assert.ok(text.indexOf("The quick brown fox") > -1, text);

});


QUnit.test("Bad template name throws exception", function(assert) {
	assert.throws(function() {
		$.autotube.template("badname");
	}, "Exception thrown");
});


QUnit.test("Template id may contain hyphen", function(assert) {

	var id = "hyphenated-name";
	var renderer = $.autotube.template(id);

	assert.equal(typeof(renderer), "function", "Template loaded.");

	// Ensure the id was treated as an id, and not a literal template definition
	var result = renderer({});
	assert.notEqual(result, id, "Argument not a literal template definition");
});


QUnit.test("Init method stores data on elements", function(assert) {
	var options = { first: 1 };

	var set = $("#qunit-fixture div.standard a:youtube");
	assert.ok(set.length, "Set not empty");
 	set.autotube(options);

 	set.each(function() {
 		var data = $(this).data("autotube");
 		assert.ok(data, "Element data contains options");
 		assert.equal(data.settings.first, 1, "Property matches");
 	});

 	set.removeData("autotube");
});


QUnit.test("Plugin applied to element more than once throws", function(assert) {
	var set = $("#qunit-fixture div.standard a:youtube");
	set.autotube();
	assert.throws(function() {

		// Apply init to same elements
		set.autotube();
	});

	set.removeData("autotube");
});


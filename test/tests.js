/*
QUnit.test("plugin loaded", function (assert) {
	assert.ok(typeof(jQuery.tubist) === 'function', "Plugin loaded");
});
*/

QUnit.test("Selector: standard", function (assert) {
	var $set = $("#qunit-fixture .standard a:youtube");
	assert.equal($set.length, 2, "Found standard link(s)");
});

QUnit.test("Selector: alternate", function (assert) {
	var $set = $("#qunit-fixture .alternate a:youtube");
	assert.equal($set.length, 2, "Found alternate link(s)");
});

QUnit.test("Selector: short", function (assert) {
	var $set = $("#qunit-fixture .short a:youtube");
	assert.equal($set.length, 1, "Found short link(s)");
});

QUnit.test("Selector: embed", function (assert) {
	var $set = $("#qunit-fixture .embed a:youtube");
	assert.equal($set.length, 2, "Found embed link(s)");
});


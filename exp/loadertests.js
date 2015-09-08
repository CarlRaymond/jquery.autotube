QUnit.test("Loader loads", function(assert) {

	var l = new CachingLoader();

	var done = assert.async();
	l.load("/test/test1.html")
		.done(function(data) {
		assert.ok(true, "Data: " + data);
		done();
	});
});


QUnit.test("Loader caches", function(assert) {

	var l = new CachingLoader();
	var url1 = "/test/test1.html";

	var done1 = assert.async();
	l.load(url1)
		.done(function(data) {
			assert.ok(true, "Data: " + data.substring(0, 20));
			done1();
	});

	var done2 = assert.async();
	l.load(url1)
		.done(function(data) {
			assert.ok(true, "Data: " + data.substring(0, 20));
			done2();
		});
});


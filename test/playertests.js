QUnit.test("Player callback invoked", function(assert) {
	var done = assert.async();

	var calloutCallback = function(info, $link, $callout) {
		assert.ok(true, "Callout callback invoked.");

		// Simulate clicking the callout
		setTimeout(function() {
			$link.click();
		});
	};

	var playerCallback = function(info, $player) {
		assert.ok(true, "Player callback invoked");
		done();
	};

	var options = {
		calloutCallback: calloutCallback,
		playerCallback: playerCallback
	};

	$("a:youtube").autotube(options);

});
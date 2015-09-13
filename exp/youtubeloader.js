
(function($) {


	// Insert a script tag to aynchronously load the YouTube API.

	var apiLoaded = $.Deferred();
	var apiRequested = false;


	// Handler invoked when api is ready attached to window.
	window.onYouTubeIframeAPIReady = function() {
		console.log("API ready");
		apiLoaded.resolve();
	};

	if (!apiRequested) {
		apiRequested = true;
		$.getScript("https://www.youtube.com/iframe_api");
	}

	$.when(apiLoaded)
		.done(function() {
			console.log("Done.");
		});

	$.when(apiLoaded)
		.done(function() {
			console.log("Still done.");
		});
})(jQuery);


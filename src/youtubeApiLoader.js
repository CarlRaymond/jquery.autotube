;(function () {

	// A simple wrapper around the YouTube IFrame API. Create an instance of
	// YoutubeApiLoader, and invoke the load function. It will return a
	// promise that will resolve when the API is loaded.
	// The load method can be called multiple times, even across multiple
	// instances, but the API will only be loaded once.

	YoutubeApiLoader = function() {


		// Invoke to load YouTube API. Returns a promise the caller can wait on.
		// If getScript fails, we reject the deferred the client is waiting on.
		// If getScript succeeds, the API is still not fully loaded until the
		// ready handler is invoked, so do nothing.
		this.load = function() {
			if (!YoutubeApiLoader.apiRequested) {
				YoutubeApiLoader.apiRequested = true;

				$.getScript("https://www.youtube.com/iframe_api")
					.fail(function(jqxhr, settings, exception ) {
						YoutubeApiLoader.apiLoaded.reject("Unable to load YouTube IFrame API.: " + exception);
					});
			}

			return YoutubeApiLoader.apiLoaded.promise();
		};
	};


	// Store singleton properties on the function object itself.
	// Tracks YouTube API loading. Resolved when API loaded and ready.
	YoutubeApiLoader.apiLoaded = $.Deferred();

	// True when API has been requested.
	YoutubeApiLoader.apiRequested = false;

	// When YouTube api is ready, it invokes this handler.
	window.onYouTubeIframeAPIReady = function() {
		YoutubeApiLoader.apiLoaded.resolve();
	};

})();

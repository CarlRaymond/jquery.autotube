// Experiment to load and cache a URL via AJAX

function CachingLoader() {
	// Cache holds promises for each loaded URL
	this.cache = {};

	// Loads a URL. Return a promise.
	this.load = function(url) {

		if (this.cache[url]) {
			console.log("URL " + url + " already in cache.");
			return this.cache[url];
		}

		var prom = $.get(url)
			.done(function(data) {
				console.log("Recieved: " + data.substring(0, 20));
			})
			.fail(function() {
				throw "Unable to load " + url;
			})
			.promise();

		this.cache[url] = prom;
		return prom;
	};

}

/*! jquery.autotube - v1.0.0 - 2016-09-08
* https://github.com/CarlRaymond/jquery.autotube
* Copyright (c) 2016 ; Licensed GPLv2 */
// Parses time durations specified in ISO8601 format. 
// Typical duration: "PT12M3S", 12 minutes and 3 seconds
// Very long video: "P3W3DT20H31M21S", 3 weeks, 3 days, 20 hours, 31 minutes and 21 seconds

function Iso8601 (s) {
	'use strict';

	var pattern = /(P)([0-9]+Y)?([0-9]+M)?([0-9]+W)?([0-9]+D)?(T)([0-9]+H)?([0-9]+M)?([0-9]+S)?/;

	this.years = this.months = this.weeks = this.days = this.hours = this.minutes = this.seconds = 0;

	var matches = s.match(pattern);
	if (matches == null)
		return;

	// Set true when we see the 'T'. Changes interpretation of M unit.
	var tmode = false;
	matches.shift();
	var self = this;
	matches.forEach(function(part) {
		if (part === undefined)
			return;
		if (part == 'P')
			return;
		if (part == 'T') {
			tmode = true;
			return;
		}
		var unit = part.charAt(part.length-1);
		var val = parseInt(part.slice(0, -1), 10);
		switch (unit) {
			case 'Y':
				self.years = val;
				break;
			case 'M':
				if (tmode) {
					self.minutes = val;
				}
				else {
					self.months = val;
				}
				break;
			case 'W':
				self.weeks = val;
				break;
			case 'D':
				self.days = val;
				break;
			case 'H':
				self.hours = val;
				break;
			case 'M':
				self.minutes = val;
				break;
			case 'S':
				self.seconds = val;
				break;
		}

	});
}

// Returns a string with the duration:
// 0:14
// 4:25
// 1:30:28
Iso8601.prototype.toDisplay = function() {
		var time = '';
		time += this.seconds;
		if (this.seconds < 10) { time = '0' + time; }
		
		time = this.minutes + ':' + time;
		if (this.hours > 0) {
			if (this.minutes < 10) { time = '0' + time; }
			time = this.hours + ':' + time;
		}

		return time;
	};

// A simple wrapper around the YouTube IFrame API. Create an instance of
// YoutubeApiLoader, and invoke the load function. It will return a
// promise that will resolve when the API is loaded.
// The load method can be called multiple times, even across multiple
// instances, but the API will only be loaded once.

function YoutubeApiLoader() {

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
}


// Store singleton properties on the function object itself.
// Tracks YouTube API loading. Resolved when API loaded and ready.
YoutubeApiLoader.apiLoaded = $.Deferred();

// True when API has been requested.
YoutubeApiLoader.apiRequested = false;

// When YouTube api is ready, it invokes this handler.
window.onYouTubeIframeAPIReady = function() {
	YoutubeApiLoader.apiLoaded.resolve();
};

// Very simple template engine adapted from John Resig's Secrets of the
// Javascript Ninja, and http://ejohn.org/blog/javascript-micro-templating.
// Good luck figuring it out (the original was worse).
//
// The engine has one public method, Renderer(), which takes one argument
// that specifies the template text. It can take one of three forms:
// 1. The DOM id of a template in the HTML document (enclosed in a <script> tag)
// 2. A URL to a template file,
// 3. The literal template text itslef.
//
// In each case, Renderer returns a deferred object that resolves to a function
// which is invoked on a data object to render a template.
// Compiled templates loaded by id or url are cached, and so can be repeatedly
// invoked with little additional overhead. Templates created by passing the
// template text as a string literal are not cached.
//
// In all cases, Renderer returns a deferred, which resolves to the rendering
// function. Invoke the renderer with a data object to instantiate the template.
//
// Case 1: Compile a template in markup, by enclosing it in a <script> tag
// to prevent the browser from rendering the template text directly:
//
//	<script id="inlineTemplate'' type="text/template">
//	<p>The {{=weather}} in {{=locale}}... </p> 
//  </script>
// ...
// var engine = new TemplateEngine();
// var defRenderer = engine.template("inlineTemplate");
// defRenderer.done(function(template) {
//		var result = template({ weather: "rain", locale: "Spain" });
//		... do something with rendered markup.
// };
//
// Case 2: Compile a template fetched by URL:
//
// var engine = new TemplateEngine();
// var defRenderer = engine.template("/some/url/to/myTemplate.html");
// defRenderer.done(function(template) {
//		var result = template({ weather: "rain", locale: "Spain" });
//		... do something with rendered markup.
// });
// 
//
// Case 3: Compile a literal template:
//
// var engine = new TemplateEngine();
// var defRenderer = engine.template("<p>The {{=weather}} in {{=locale}}... </p>");
// derRenderer.done(function(template) {
// 		var result = template({ weather: "rain", locale: "Spain" });
//		... do something with the rendered markup.
// });

function TemplateEngine() {

	// Matches HTML4 compliant id names. HTML5 is more lax,
	// so lax that it can't be done with a reasonable RE.
	// So this is fine.
	var idexpr = /^[A-Za-z][A-Za-z0-9.:_-]*$/;

	// Matches a "url", which is anything that starts with a slash
	var urlexpr = /^\/.*/;

	// Cache for loaded templates
	var cache = {};

	// Invoked to compile template text into a function
	var compile = function(text) {
		// Compile a rendering function using
		// Function constructor and buttload of string replacements
		return new Function("obj",
			"var p=[], print=function() { p.push.apply(p, arguments); };" +
			"with(obj) { p.push('" +
			text
				.replace(/[\r\t\n]/g, " ")
				.split("{{").join("\t")
				.replace(/((^|}})[^\t]*)'/g, "$1\r")
				.replace(/\t=(.*?)}}/g, "',$1,'")
				.split("\t").join("');")
				.split("}}").join("p.push('")
				.split("\r").join("\\'") +
			"');} return p.join('');");
	};

	// Returns a deferred that resolves to a template renderer function. Execute the function
	// with a data object to instantiate the template.
	// The specifier can be the id of a script tag containing the template, or a url
	// to fetch the template from, or the template text itself.
	this.template = function(spec) {
		var def = $.Deferred();
		var template;

		// Template already cached?
		if (cache[spec]) {
			def.resolve(cache[spec]);
			return def;
		}

		// If id passed, get template from DOM
		if (idexpr.test(spec)) {
			var $specNode = $("#" + spec);
			if ($specNode.length === 0)
				throw('Template not found: "' + spec + '". Use the id of a script block (of type "text/html") or a url to an external HTML file containing the template.');
			template = compile($specNode.html());
			cache[spec] = template;
			def.resolve(template);
			return def;			
		}

		// If url passed, load template AJAXically.
		if (urlexpr.test(spec)) {
			var req = $.ajax(spec, { dataType: "html"});
			var compiled = req.then(function(text) {
				template = compile(text);
				cache[spec] = template;
				return template;
			});

			req.fail(function (jqXHR, textStatus, errorThrown ) {
				// Can't throw here (who would catch it?)
				if (window.console) {
					console.log('Error fetching template "' + spec + '": ' + errorThrown); 
				}
			});

			return compiled;
		}

		// Otherwise, spec is raw template text. Compile into a renderer, but don't cache.
		template = compile(spec);
		return def.resolve(template);
	};

}

// A jQuery plugin to find YouTube video links, load thumbnails and create a callout in markup via HTML
// template, and play the video on the page using the YouTube IFrame API.
//
// Basic usage:
//   $("...some link selector...").autotube();
//
// The plugin is wrapped up in an IIFE. The argument factory is a function invoked
// in one of three ways (depending on the environment) to register the plugin with jQuery.
; (function(factory) {
	'use strict';

	// Register as a module in a module environment, or as a plain jQuery
	// plugin in a bare environment.
	if (typeof module === "object" && typeof module.exports === "object") {
		// CommonJS environment
		factory(require("jquery"));
	}
	else if (typeof define === 'function' && define.amd) {
		// AMD environment. Register as an anonymous module.
		define(['jquery'], factory);
	} else {
		// Old-fashioned browser globals
		factory(jQuery);
	}
} (function($) {

	var defaults = {
		part: 'snippet,contentDetails',
		datakey : 'autotube'
	};



	var youtubeVideoApiUrl = "https://www.googleapis.com/youtube/v3/videos";

	var videoIdAttr = 'videoId';

	// RegExps for YouTube link forms
	var youtubeStandardExpr = /^https?:\/\/(www\.)?youtube.com\/watch\?v=([^?&]+)/i; // Group 2 is video ID
	var youtubeAlternateExpr = /^https?:\/\/(www\.)?youtube.com\/v\/([^\/\?]+)/i; // Group 2 is video ID
	var youtubeShortExpr = /^https?:\/\/youtu.be\/([^\/]+)/i; // Group 1 is video ID
	var youtubeEmbedExpr = /^https?:\/\/(www\.)?youtube.com\/embed\/([^\/]+)/i; // Group 2 is video ID

	// Custom selector for YouTube URLs. Usage: $("#somediv a:youtube")...
	// Also attaches the video ID to the link in the videoId data property
	$.expr[':'].youtube = function (obj) {
		var url = obj.href;
		if (!url) return false;

		var match = url.match(youtubeStandardExpr);
		if (match != null) {
			$(obj).data(videoIdAttr, match[2]);
			return true;
		}

		match = url.match(youtubeAlternateExpr);
		if (match != null) {
			$(obj).data(videoIdAttr, match[2]);
			return true;
		}

		match = url.match(youtubeShortExpr);
		if (match != null) {
			$(obj).data(videoIdAttr, match[1]);
			return true;
		}

		match = url.match(youtubeEmbedExpr);
		if (match != null) {
			$(obj).data(videoIdAttr, match[2]);
			return true;
		}

		return false;
	};

	// Template parsing engine
	var templateEngine = new TemplateEngine();

	// API loader
	var apiLoader = new YoutubeApiLoader();

	// Extract the YouTube video ID from a link. Cached in element data.
	var videoId = function (link) {

		// Cached in data?
		var id = $(link).data(videoIdAttr);
		if (id == null) {
			var match = link.href.match(youtubeStandardExpr);
			if (match != null)
				id = match[2];
			else {
				match = link.href.match(youtubeAlternateExpr);
				if (match != null)
					id = match[2];
				else {
					match = link.href.match(youtubeShortExpr);
					if (match != null)
						id = match[1];
					else {
						match = link.href.match(youtubeEmbedExpr);
						if (match != null)
						id = match[2];
					}
				}
			}
		}

		// Cache for next time
		if (id != null) {
			$(link).data(videoIdAttr, id);
		}

		return id;
	};

	// Gets the metadata for one or more videos. Each link has its metadata
	// stored in the data collection under the "autotube" property, including
	// some extra properties computed from the metadata.
	// Returns a deferred that will resolve when the GET request from Youtube
	// completes.
	var _fetchMetadata = function($set, settings) {

		// Combine all video IDs into a comma-separated list
		var ids = [];
		$set.each(function(index) {
			ids.push(videoId(this));
		});

		var params = {
			id: ids.join(','),
			part: settings.part,
			key: settings.apikey
		};

		// Get metadata for all videos in set
		def = $.get(youtubeVideoApiUrl, params);

		def.done(function(data) {
			$set.each(function(index) {
				var itemdata = data.items[index];

				// Add properties with some digested data
				var d = new Iso8601(itemdata.contentDetails.duration);
				var extraData = {
					_settings: settings,
					_playingTime: d.toDisplay()
				};
				$.extend(itemdata, extraData);
				$(this).data(settings.datakey, itemdata);
			});
		});

		return def;
	};

	// Fetches video metadata for a set of links, and invokes a callback for each.
	// The options object must include the apikey property, with the client's Youtube
	// Data API key.
	var videoMetadata = function(options, callback) {
		var $set = this;

		var settings = $.extend({}, defaults, options);

		_fetchMetadata($set, settings).done(function() {
			if (callback) {
				$set.each(function() {
					var metadata = $(this).data(settings.datakey);
					callback.call(this, metadata);
				});
			}
		});

		return $set;
	};


	// Get metadata for the links, compile the poster template, then instantiate the template for each,
	// and invoke the callback.
	var videoPoster = function(options, callback) {
		var $set = this;

		var settings = $.extend({}, defaults, options);

		// Get template renderer
		var templateReady;
		// User-supplied template renderer?
		if (typeof(settings.template) === 'function') {
			templateReady = $.Deferred().resolve(settings.template);
		}
		else {
			// Compile template with built-in template engine
			templateReady = templateEngine.template(settings.template);
		}

		// Get the metadata
		var metadataReady = _fetchMetadata($set, settings);

		$.when(templateReady, metadataReady).done(function(template, metadata) {
			$set.each(function() {
				var data = $(this).data(settings.datakey);
				var id = "autotube-poster-" + videoId(this);
				data._posterId = id;
				var $poster = $(template(data));

				if (settings.placer) {
					if (placers[settings.placer]) {
						// invoke the named placer
						placers[settings.placer].call(this, $poster, data);
					}
					else {
						throw 'Placer "' + settings.placer + '" is not valid.';
 					}
				}

				// Bind a click handler?
				if (settings.onclick) {
					var handler = null;
					if (typeof(settings.onclick) === 'string') {
						// Handler is name of built-in funciton
						handler = clickHandlers[settings.onclick];
						if (handler == null) {
							throw 'Click handler "' + settings.onclick + '" is not valid.';
						}
					}
					else {
						// Handler passed directly
						handler = settings.onclick;
					}

					var boundHandler = handler.bind($poster[0]);

					$(document).on("click", "#" + id, data, boundHandler);
				}

				// Invoke the callback, if any
				if (callback) {
					callback.call(this, $poster, data);
				}
			});
		});
	};


	// A dictionary of simple poster placer functions
	var placers = {
		appendToParent: function(elem) {
			$(this).parent().append(elem);
		},

		appendToLink: function(elem) {
			$(this).append(elem);
		},

		replaceLink: function(elem) {
			$(this).replaceWith(elem);
		}
	};


	/// Click handlers to play the video
	


	// Load the player over the poster
	var replacePoster = function(event) {
		var self = this;
		var apiReady = apiLoader.load();

		apiReady.done(function() {
			var args = {
				videoId: event.data.id,
				height: 360,
				width:640
			};
			var destination = $(self).find(event.data._settings.posterSelector)[0];
			var player = new YT.Player(destination, args);

		});

		return false;
	};

	// A dictionary of simple click handlers
	var clickHandlers = {
		replacePoster: replacePoster
	};


	// Attach plugins to jQuery
	$.fn.videoMetadata = videoMetadata;
	$.fn.videoPoster = videoPoster;

	// Attach internal fuctions to $.autotube for easier testing
	$.autotube = {
		videoId: videoId
	};
}));

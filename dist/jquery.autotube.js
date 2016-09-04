/*! jquery.autotube - v1.0.0 - 2016-09-03
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
		datakey : 'youtube'
	};



	var youtubeVideoApiUrl = "https://www.googleapis.com/youtube/v3/videos";

	// RegExps for YouTube link forms
	var youtubeStandardExpr = /^https?:\/\/(www\.)?youtube.com\/watch\?v=([^?&]+)/i; // Group 2 is video ID
	var youtubeAlternateExpr = /^https?:\/\/(www\.)?youtube.com\/v\/([^\/\?]+)/i; // Group 2 is video ID
	var youtubeShortExpr = /^https?:\/\/youtu.be\/([^\/]+)/i; // Group 1 is video ID
	var youtubeEmbedExpr = /^https?:\/\/(www\.)?youtube.com\/embed\/([^\/]+)/i; // Group 2 is video ID

	// Custom selector for YouTube URLs. Usage: $("#somediv a:youtube")...
	// Also attaches the video ID to the link in the data-video-id attribute
	$.expr[':'].youtube = function (obj) {
		var url = obj.href;
		if (!url) return false;

		var attr = 'videoId';
		var match = url.match(youtubeStandardExpr);
		if (match != null) {
			$(obj).data(attr, match[2]);
			return true;
		}

		match = url.match(youtubeAlternateExpr);
		if (match != null) {
			$(obj).data(attr, match[2]);
			return true;
		}

		match = url.match(youtubeShortExpr);
		if (match != null) {
			$(obj).data(attr, match[1]);
			return true;
		}

		match = url.match(youtubeEmbedExpr);
		if (match != null) {
			$(obj).data(attr, match[2]);
			return true;
		}

		return false;
	};

	// Template parsing engine
	var templateEngine = new TemplateEngine();



	// Default placer to position callout in the document
	var defaultCalloutCallback = function (info, $link, $callout) {
		// Place callout at end of link's parent
		$link.parent().append($callout);
	};

	// Default placer to position the player in the document
	var defaultPlayerCallback = function ($player) {
		// Place player at end of body
		$('body').append($player);
	};

	// Extract the YouTube video ID from a link
	var videoId = function (link) {
		var match = link.href.match(youtubeStandardExpr);
		if (match != null)
			return match[2];
		match = link.href.match(youtubeAlternateExpr);
		if (match != null)
			return match[2];
		match = link.href.match(youtubeShortExpr);
		if (match != null)
			return match[1];
		match = link.href.match(youtubeEmbedExpr);
		if (match != null)
			return match[2];

	};


	// Gets the metadata for one or more videos. Each link has its metadata
	// stored in the data collection under the "youtube" property, including
	// extra data in the "autotube" property.
	// Returns a deferred that will resolve when the GET request from Youtube
	// completes.
	var _fetchMetadata = function($set, settings) {

		// Combine all video IDs into a comma-separated list
		var ids = [];
		$set.each(function(index) {
			// Get id from data`
			var id = $(this).data('videoId');
			if (!id) {
				// Not present. Extract and save.
				id = videoId(this);
				$(this).data('videoId', id);
			}
			ids.push(id);
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
				var vdata = data.items[index];

				// Add autotube property with some digested data
				var d = new Iso8601(vdata.contentDetails.duration);
				vdata.autotube = {
					duration: d.toDisplay()
				};

				$(this).data(settings.datakey, vdata);
			});
		});

		return def;
	};

	// Fetches video metadata for a set of links, and invokes a callback for each.
	// The options object must include the apikey property, with the client's Youtube
	// Data API key.
	var getMetadata = function(options, callback) {
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


	// Get metadata for the links, compile the template, then instantiate the template for each,
	// and invoke the callback.
	var poster = function(options, callback) {
		var $set = this;

		var settings = $.extend({}, defaults, options);

		// Get template renderer
		var templateReady = templateEngine.template(settings.templatespec);
		
		// Get the metadata
		var metadataReady = _fetchMetadata($set, settings);

		$.when(templateReady, metadataReady).done(function(template, metadata) {
			$set.each(function() {
				var data = $(this).data(settings.datakey);
				var html = template(data);
				var elem = $(html);
				callback.call(this, elem, data);
			});
		});
	};


	// Invoked when an opener link in the callout is clicked
	var preparePlayer = function(event) {

		var info = event.data;
		var settings = info.settings;

		// Player already instantiated?
		// TODO ...

		var loader = new YoutubeApiLoader().load();

		// Render the player
		var defRenderer;
		// User-supplied callout renderer?
		if (info.playerRenderer) {
			defRenderer = $.Deferred().resolve(info.settings.playerRenderer);
		}
		else {
			// Compile the callout template renderer
			defRenderer = templates.renderer(info.settings.playerTemplate);
		}

		// When renderer, data and YouTube API are ready...
		$.when(defRenderer, loader).then(function (render) {
			var playerMarkup = render(info);
			var $player = $(playerMarkup);

			// Player markup not yet inserted into DOM, so an ordinary selector won't find it.
			var elem = $player.find("#" + info.iframeId)[0];

			// Instantiate YouTube player
			var ytplayer = new YT.Player(elem, {
				height: settings.height,
				width: settings.width,
				videoId: info.videoId
			});

			// Invoke callback to place player
			info.settings.playerCallback(info, $player, ytplayer); 
		});

	};


	// Plugin proper. Dispatches method calls using the usual jQuery pattern.
	$.fn.autotube = function (method) {
		// Method calling logic. If named method exists, execute it with passed arguments
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		}
			// If no argument, or an object passed, invoke init method.
		else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		}
		else {
			throw 'Method ' + method + ' does not exist on jQuery.autotube';
		}
	};


	$.fn.getMetadata = getMetadata;
	$.fn.poster = poster;

	// Attach internal fuctions to $.autotube for easier testing
	$.autotube = {
		videoId: videoId
	};
}));

// A jQuery plugin to find YouTube video links, load thumbnails and create a callout in markup via HTML
// template, and play the video on the page using the YouTube IFrame API.
//
// Basic usage:
//   $("...some link selector...").autotube();
//
// The plugin is wrapped up in an IIFE. The argument factory is a function invoked
// in one of three ways (depending on the environment) to register the plugin with jQuery.
; (function(factory) {

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


	// Tracks YouTube API loading. Resolved when API loaded and ready.
	var apiLoaded = $.Deferred();

	// True when API has been requested.
	var apiRequested = false;

	// When YouTube api is ready, it invokes this handler.
	window.onYouTubeIframeAPIReady = function() {
		apiLoaded.resolve();
	};

	// Invoke to load YouTube API, then wait on apiLoaded.
	var requestApi = function() {
		if (!apiRequested) {
			apiRequested = true;
			$.getScript("https://www.youtube.com/iframe_api");
		}
	};


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

	// Matches HTML4 compliant id names. HTML5 is more lax,
	// so lax that it can't be done with a reasonable RE.
	// So this is fine.
	var idexpr = /^[A-Za-z][A-Za-z0-9.:_-]*$/;

	// Matches a "url", which is anything that starts with a slash
	var urlexpr = /^\/.*/;

	// Very simple template engine adapted from John Resig's Secrets of the
	// Javascript Ninja, and http://ejohn.org/blog/javascript-micro-templating.
	// Good luck figuring it out (the original was worse).
	var templateCache = {};

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
	// with a data object to render the template.
	// The specifier can be the id of a script tag containing the template, or a url
	// to fetch the template from, or the template text itself.
	var templateRenderer = function(spec) {
		var def = $.Deferred();
		var renderer;

		// Template already cached?
		if (templateCache[spec]) {
			def.resolve(templateCache[spec]);
			return def;
		}

		// If id passed, get template from DOM
		if (idexpr.test(spec)) {
			var $specNode = $("#" + spec);
			if ($specNode.length === 0)
				throw('Template not found: "' + spec + '". Use the "calloutTemplate" option with the id of a script block (of type "text/html") or a url to an external HTML file containing the template.');
			renderer = compile($specNode.html());
			templateCache[spec] = renderer;
			def.resolve(renderer);
			return def;			
		}

		// If url passed, load template AJAXically.
		if (urlexpr.test(spec)) {
			var req = $.ajax(spec, { dataType: "html"});
			var compiled = req.then(function(text) {
				renderer = compile(text);
				templateCache[spec] = renderer;
				return renderer;
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
		renderer = compile(spec);
		return def.resolve(renderer);
	};

	// Default options for plugin
	var defaults = {
		calloutTemplate: "video-callout-template",
		playerTemplate: "video-player-template",
		calloutImageFilename: "default.jpg",
		calloutCallback: defaultCalloutCallback,
		playerCallback: defaultPlayerCallback,
		width: 640,
		height: 360
	};

	// Plugin method "init"
	var init = function (options) {
		var settings = $.extend({}, defaults, options);

		// For each element, init will attach data, consisting of the settings and the per-link info.
		// Ensure init not already applied to set. Find elements with autotube data on them.
		if (this.filter(function () { return $(this).data('autotube'); }).length !== 0) {
			$.error('Autotube already applied to a selected element');
		}

		var defRenderer;
		// User-supplied callout renderer?
		if (settings.calloutRenderer) {
			defRenderer = $.Deferred().resolve(settings.calloutRenderer);
		}
		else {
			// Compile the callout template renderer
			defRenderer = templateRenderer(settings.calloutTemplate);
		}

		var set = this;
		defRenderer.done(function(render) {
			// Process each link
			set.each(function (index) {
				var $link = $(this);
				var vid = videoId(this);
				var title = $link.data("title") || $link.text();

				// Create per-link info object to attach to the link
				var info = {
					settings: settings,
					videoId: vid,
					posterId: "video-poster-" + index,
					playerId: "video-player-" + index,
					iframeId: "video-iframe-" + index,
					posterUrl: 'https://img.youtube.com/vi/' + vid + '/' + settings.calloutImageFilename,
					title: title
				};

				// Render the callout
				var calloutMarkup = render(info);
				var $callout = $(calloutMarkup);

				// Remove href from link
				$link.attr("href", "#");

				// Add click handler to original link and all links in callout
				var $openers = $("a[href='#']", $callout).add($link);
				$openers.on("click.autotube", null, info, preparePlayer);

				// Save info on the link
				$link.data("autotube", info);

				// Invoke callback to place elements and do any necessary hookuping.
				settings.calloutCallback(info, $link, $callout);

			});
		});

		return settings;
	};

	// Plugin method "stop"
	var stop = function () {

	};

	// Invoked when an opener link in the callout is clicked
	var preparePlayer = function(event) {

		var info = event.data;
		var settings = info.settings;

		// Player already instantiated?
		// TODO ...


		requestApi();

		// Render the player
		var defRenderer;
		// User-supplied callout renderer?
		if (info.playerRenderer) {
			defRenderer = $.Deferred().resolve(info.settings.playerRenderer);
		}
		else {
			// Compile the callout template renderer
			defRenderer = templateRenderer(info.settings.playerTemplate);
		}

		// When renderer and YouTube API are ready...
		$.when(defRenderer, apiLoaded).then(function (render) {
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

	// Parses a time duration in ISO8601 format. Returns an object with fields 'hours', 'minutes', and 'seconds'.
	var parseDuration = function(duration) {
		// Typical duration: PT12M3S
		// Very long video: P3W3DT20H31M21S
		var iso8601 = /(P)([0-9]+Y)?([0-9]+M)?([0-9]+W)?([0-9]+D)?(T)([0-9]+H)?([0-9]+M)?([0-9]+S)?/;

		var result = {};				
		var matches = duration.match(iso8601);
		if (matches == null)
			return null;

		// Set true when we see the 'T'. Changes interpretation of M unit.
		var tmode = false;
		matches.forEach(function(part) {
			if (part === undefined)
				return;
			if (part == 'T') {
				tmode = true;
			}
			var unit = part.charAt(part.length-1);
			var val = parseInt(part.slice(0, -1), 10);
			switch (unit) {
				case 'Y':
					result.years = val;
					break;
				case 'M':
					if (tmode) {
						result.minutes = val;
					}
					else {
						result.months = val;
					}
					break;
				case 'W':
					result.weeks = val;
					break;
				case 'D':
					result.days = val;
					break;
				case 'H':
					result.hours = val;
					break;
				case 'M':
					result.minutes = val;
					break;
				case 'S':
					result.seconds = val;
					break;
			}

		});

		return result;
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


	// Callable plugin methods
	var methods = {
		init: init
	};


	// Attach internal fuctions to $.autotube for easier testing
	$.autotube = {
		videoId: videoId,
		templateRenderer: templateRenderer,
		parseDuration: parseDuration
	};
}));

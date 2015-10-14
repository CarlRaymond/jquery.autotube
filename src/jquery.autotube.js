// A jQuery plugin to find YouTube video links, load thumbnails and create a callout in markup via HTML
// template, and play the video on the page using the YouTube IFrame API.
//
// Basic usage:
//   $("...some link selector...").autotube();
//
// Uses pattern at https://github.com/umdjs/umd/blob/master/jqueryPlugin.js to declare
// the plugin so that it works with or without an AMD-compatible module loader, like RequireJS.
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], factory);
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function ($) {

	// RegExps for YouTube link forms
	var youtubeStandardExpr = /^https?:\/\/(www\.)?youtube.com\/watch\?v=([^?&]+)/i; // Group 2 is video ID
	var youtubeAlternateExpr = /^https?:\/\/(www\.)?youtube.com\/v\/([^\/\?]+)/i; // Group 2 is video ID
	var youtubeShortExpr = /^https?:\/\/youtu.be\/([^\/]+)/i; // Group 1 is video ID
	var youtubeEmbedExpr = /^https?:\/\/(www\.)?youtube.com\/embed\/([^\/]+)/i; // Group 2 is video ID

	// Custom selector for YouTube URLs. Usage: $("#somediv a:youtube")...
	$.expr[':'].youtube = function (obj) {
		var url = obj.href;
		if (!url) return false;
		return (url.match(youtubeStandardExpr) != null) ||
			(url.match(youtubeAlternateExpr) != null) ||
			(url.match(youtubeShortExpr) != null) ||
			(url.match(youtubeEmbedExpr) != null);
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
				throw('Template not found: "' + spec + '"');
			renderer = compile($specNode.html());
			templateCache[spec] = renderer;
			def.resolve(renderer);
			return def;			
		}

		// If url passed, load template AJAXically.
		if (urlexpr.test(spec)) {
			var req = $.ajax(spec);
			var compiled = req.then(function(data) {
				renderer = compile(data);
				templateCache[spec] = renderer;
				return renderer;
			});

			return compiled;
		}

		// Otherwise, spec is raw template text. Compile, but don't cache.
		renderer = compile(spec);
		return def.resolve(renderer);
	};

	// Default options for plugin
	var defaults = {
		calloutTemplate: "video-callout-template",
		playerTemplate: "video-player-template",
		calloutImageFilename: "default.jpg",
		calloutCallback: defaultCalloutCallback,
		playerCallback: defaultPlayerCallback
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
		if (settings.calloutRender) {
			defRenderer = $.Deferred().resolve(settings.calloutRenderer);
		}
		else {
			// Compile the callout template renderer
			defRenderer = templateRenderer(settings.calloutTemplate);
		}

		var set = this;
		defRenderer.done(function(renderer) {
			// Process each link
			set.each(function (index) {
				var $link = $(this);
				var vid = videoId(this);
				var title = $link.data("title") || $link.text();
				var info = {
					videoId: vid,
					posterId: "video-poster-" + index,
					playerId: "video-player-" + index,
					iframeId: "video-iframe-" + index,
					posterUrl: 'https://img.youtube.com/vi/' + vid + '/' + settings.calloutImageFilename,
					title: title
				};

				var calloutMarkup = settings.renderer(info);
				var $callout = $(calloutMarkup);

				// Invoke callback to place elements and do any necessary hookuping.
				settings.calloutCallback(info, $link, $callout);

				// Remove href from link
				$link.attr("href", "#");

				// Add click handler to original link and all links in callout
				var $openers = $("a[href='#']", $callout).add($link);
				$openers.on("click.autotube", null, info, showPlayer);

				// Save info on the link
				$link.data("autotube", { settings: settings, info: info });
			});
		});

		return settings;
	};

	// Plugin method "stop"
	var stop = function () {

	};


	var showPlayer = function(event) {

		alert("Showing player for video " + event.data.videoId);

		var templateReady = $.Deferred();
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
		templateRenderer: templateRenderer
	};
}));

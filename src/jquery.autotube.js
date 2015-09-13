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

	// Very simple template engine adapted from John Resig's Secrets of the
	// Javascript Ninja, and http://ejohn.org/blog/javascript-micro-templating.
	// Good luck figuring it out (the original was worse).
	// Call it with the name of a template to return a compiled rendering
	// function, or call it with the text of a template and data to render the text.
	var templateCache = {};
	var template = function(str, data) {

		// Matches HTML4 compliant id names. HTML5 is more lax,
		// so lax that it can't be done with a reasonable RE.
		// So this is fine.
		var idexpr = /^[A-Za-z][A-Za-z0-9.:_-]*$/;

		// Matches a "url", which is anything that starts with a slash
		var urlexpr = /^\/.*/;

		var t;
		if (idexpr.test(str)) {
			// Passed id of template. Get from cache.
			t = templateCache[str];
			if (t) return t;

			// Get template text from DOM, compile and cache
			var $text = $("#" + str);
			if ($text.length === 0)
				throw('Template not found: "' + str + '"');
			t = compile($text.html());
			templateCache[str] = t;
		}
		else if (urlexpr.test(str)) {
			// Passed url of template.
		}
		else {
			// Passed text of template. Compile.
			t = compile(str);
		}

		// If data supplied, render the template with the
		// data; otherwise return the compiled renderer.
		return data ? t(data) : t;
	};


	// Invoked by template function to compile template text
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
		if (this.filter(function () { return $(this).data('autotube');  }).length !== 0) {
			$.error('Autotube already applied to a selected element');
		}

		// Compile the callout and player renderers, if not user-supplied
		settings.calloutRenderer = settings.calloutRenderer || template(settings.calloutTemplate);
		settings.playerRenderer = settings.playerRenderer || template(settings.playerTemplate);

		// Process each link
		this.each(function (index) {
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

			var calloutMarkup = settings.calloutRenderer(info);
			var $callout = $(calloutMarkup);

			// Invoke callback to place elements and do any necessary hookuping.
			settings.calloutCallback(info, $link, $callout);

			// Save info on the link
			$link.data("autotube", { settings: settings, info: info });
		});


		return settings;
	};

	// Plugin method "stop"
	var stop = function () {

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
		template: template
	};
}));

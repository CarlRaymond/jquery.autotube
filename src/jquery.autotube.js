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

	var templates = new TemplateEngine();



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

	// Fetches video metadata for a set of links, and returns a promise.
	var getMetadata = function(options, callback) {
		var $set = this;

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

		var defaults = {
			part: 'snippet,contentDetails'
		};
		var settings = $.extend({}, defaults, options);

		var params = {
			id: ids.join(','),
			part: settings.part,
			key: settings.apikey
		};

		// Get metadata for all videos in set
		var def = $.get(youtubeVideoApiUrl, params);

		def.done(function(data) {
			$set.each(function(index) {
				var vdata = data.items[index];

				// Add autotube property with some digested data
				var d = new Iso8601(vdata.contentDetails.duration);
				vdata.autotube = {
					duration: d.toDisplay()
				};

				$(this).data('youtube', vdata);
				if (callback) {
					callback.call(this, vdata);
				}
			});
		});

		return def;
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
			defRenderer = templates.renderer(settings.calloutTemplate);
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
			defRenderer = templates.renderer(info.settings.playerTemplate);
		}

		// When renderer, data and YouTube API are ready...
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

	$.fn.getMetadata = getMetadata;

	// Attach internal fuctions to $.autotube for easier testing
	$.autotube = {
		videoId: videoId
	};
}));

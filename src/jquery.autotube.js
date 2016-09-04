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

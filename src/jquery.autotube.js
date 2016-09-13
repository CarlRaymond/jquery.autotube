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

		// Configure click handler
		if (typeof(settings.onclick) === 'string') {
			// Handler is name of built-in funciton
			var handler = clickHandlers[settings.onclick];
			if (handler == null) {
				throw 'Click handler "' + settings.onclick + '" is not valid.';
			}
			settings.onclick = handler;
		}

		// Configure placer
		if (typeof(settings.placer) === 'string') {
			var placer = placers[settings.placer];
			if (placer == null) {
				throw 'Poster placer "' + settings.placer +'" is not valid.';
			}
			settings.placer = placer;
		}

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

				// Invoke the poster placer
				if (settings.placer) {
					settings.placer.call(this, $poster, data);
				}

				// Bind a click handler?
				if (settings.onclick) {
					var boundHandler = settings.onclick.bind($poster[0]);
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

		apiReady.done(function(YT) {
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

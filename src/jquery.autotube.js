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
	var youtubeStandardExpr = /^https?:\/\/(www\.)?youtube.com\/watch\?v=([^?&]+)/i;
	var youtubeAlternateExpr = /^https?:\/\/(www\.)?youtube.com\/v\/([^\/\?]+)/i;
	var youtubeShortExpr = /^https?:\/\/youtu.be\/([^\/]+)/i;
	var youtubeEmbedExpr = /^https?:\/\/(www\.)?youtube.com\/embed\/([^\/]+)/i;

	// Custom selector for YouTube URLs
	$.expr[':'].youtube = function (obj) {
		var url = obj.href;
		if (!url) return false;
		return (url.match(youtubeStandardExpr) != null) ||
	(url.match(youtubeAlternateExpr) != null) ||
	(url.match(youtubeShortExpr) != null) ||
	(url.match(youtubeEmbedExpr) != null);
	};

	// Default options for plugin
	var defaults = {
		calloutTemplate: "#video-callout-template",
		calloutImageFilename: "default.jpg"

	};


	var init = function (options) {
		var settings = $.extend({}, defaults, options);

		// Compile the callout and player templates
		var calloutTemplate = $.template("callout", $(options.calloutTemplateId));
		var playerTemplate = $.template("player", $(options.playerItemplateId));

		// Process each link
		this.each(function (index) {
			var $link = $(this);
			var videoId = util.videoId($link);
			var info = {
				videoId: videoId,
				posterId: "video-poster-" + index,
				playerId: "video-player-" + index,
				iframeId: "video-iframe-" + index,
				calloutImageUrl: 'https://img.youtube.com/vi/' + videoId + '/' + settings.calloutImageFilename
			};

			// Instantiate the callout template
			var calloutMarkup = $.render(info, "callout");
			var $callout = $(calloutMarkup);

			// Instantiate the player dialog
			var playerMarkup = $.render(info, "player");
			var $player = $(playerMarkup);

			if (options.callback) {
				// Invoke callback to place elements and do any necessary hookuping.
				options.callback($link, $callout, $player, info);
			}
			else {
				// Default treatment. Place callout at end of link's parent, and place player at end of body.
				$link.parent().append($callout);
				$('body').append($player);
			}

		});

		return settings;
	};


	// Utility functions
	var util = {
		// Extracts the YouTube video ID from a link
		videoId: function (link) {
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
		}
	};

	// Plugin proper. Dispatches method calls using the usual jQuery pattern.
	var plugin = function (method) {
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



	// Attach plugin to jQuery set object 
	$.fn.autotube = plugin;

	// Attach utilty to jQuery for easier testing
	$.autotube = util;

}));

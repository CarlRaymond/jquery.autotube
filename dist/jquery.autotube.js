/*! jquery.autotube - v1.0.0 - 2015-08-27
* https://github.com/CarlRaymond/jquery.autotube
* Copyright (c) 2015 ; Licensed GPLv2 */
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
			throw 'Method ' + method + ' does not exist on jQuery.tubist';
		}
	};

	// Callable plugin methods
	var methods = {
		init: function (options) {
			var settings = $.extend({}, defaults, options);

			// ...
			return settings;
		}

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


	// Attach plugin to jQuery set object 
	$.fn.autotube = plugin;

	// Attach utilty to jQuery for easier testing
	$.autotube = util;

}));

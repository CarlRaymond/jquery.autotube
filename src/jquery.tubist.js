// A jQuery plugin to find YouTube video links, load thumbnails and create a callout in markup via HTML
// template, and play the video on the page using the YouTube IFrame API.
//
// See http://en.wikipedia.org/wiki/Magnetic_card to understand the format of the data on a card.
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

	// Extracts the YouTube video ID from a link
	$.youtubeVideoId = function (link) {
		var match = link.href.match(youtubeStandardExpr);
		if (match != null)
			return match[1];
		match = link.href.match(youtubeAlternateExpr);
		if (match != null)
			return match[1];
		match = link.href.match(youtubeShortExpr);
		if (match != null)
			return match[1];
		match = link.href.match(youtubeEmbedExpr);
		if (match != null)
			return match[1];
	};


}));

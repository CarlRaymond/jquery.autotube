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

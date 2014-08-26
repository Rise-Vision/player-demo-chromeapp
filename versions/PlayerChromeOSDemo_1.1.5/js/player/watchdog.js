// Copyright © 2010 - May 2014 Rise Vision Incorporated.
// Use of this software is governed by the GPLv3 license
// (reproduced in the LICENSE file).

rvWatchdog = function () {

	var HEARTBEAT_TIMER_INTERVAL_MS = 60 * 1000;
	var MAX_HEARTBEAT_GAP_MS = 3 * HEARTBEAT_TIMER_INTERVAL_MS;
	
	var lastHearbeat;
	var callback;
	
	this.start = function(callback_function) {
		console.log('Watchdog start');
		callback = callback_function;
		this.poke();
		//onTimer();
	};

	this.poke = function() {
		//console.log('poke');
		lastHearbeat = new Date();
	};

	var onTimer = function() {
		try {
			//console.log('on timer');
			var now = new Date();
			if ((lastHearbeat.getTime() + MAX_HEARTBEAT_GAP_MS) < now.getTime()) {
				if (callback) {
					console.log('watchdog triggered at ' + now);
					callback();
				}
			}
		} catch (e) {
			console.log('watchdog error: ' + e.message);
		} finally {
			setTimeout(onTimer, HEARTBEAT_TIMER_INTERVAL_MS);	
		}
		
	};

};


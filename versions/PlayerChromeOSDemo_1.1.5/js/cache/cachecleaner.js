// Copyright © 2010 - May 2014 Rise Vision Incorporated.
// Use of this software is governed by the GPLv3 license
// (reproduced in the LICENSE file).

rvCacheCleaner = function () {
		
	var TIMER_INTERVAL_MS = 24 * 60 * 60 * 1000; //24 hours
	
	var start = function() {
		console.log('DeleteExpiredJob start');
		onTimer();
	};

	this.forceDeleteExpired = function() {
		deleteExpired();
	};

	var deleteExpired = function() {
		console.log('deleteExpired');
		//it's easier to work with files in worker. Close worker when done;
	    var worker = new Worker("/js/cache/filemanagersync.js");
	    worker.postMessage({'cmd': 'deleteExpired'});
	};

	var onTimer = function() {
		try {
			//console.log('on timer');
			deleteExpired();
		} catch (e) {
			console.log('deleteExpired error: ' + e.message);
		} finally {
			setTimeout(onTimer, TIMER_INTERVAL_MS);	
		}
	};
	
	start();

};


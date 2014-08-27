// Copyright © 2010 - May 2014 Rise Vision Incorporated.
// Use of this software is governed by the GPLv3 license
// (reproduced in the LICENSE file).

var $rv = $rv || {}; //Rise Vision namespace

rvCache = function () {

	var CACHE_SERVER_PORT = 9494;

	var ws; //web server
	var workers; //list of file manager workers
	var cacheCleaner; //helper object to remove expired files every 24h
	var cacheDir; //cache folder
	var socketRequests = new rvHashTable(); // key = socket; value = request URL
	var fileRequests = new rvFileRequests();  //info about file last modified time
	
	this.init = function() {
		ws = new rvWebServer(CACHE_SERVER_PORT, onRequest);
		ws.start();
		
		workers = new rvWorkers(onFileReady, onDownloadIfModified, onClearCache, onGetCachedFiles);
		this.workers = workers;
		cacheCleaner = new rvCacheCleaner();
	};
	
	var log = function(msg) {
		console.log(msg);
	}
	
	var onRequest = function(socketId, cmd, qs, keepAlive, range) {
		ws.openSockets.put(socketId, null)
		try {
			log("Cache request: cmd=" + cmd + " | socketId=" + socketId + " | qs=" + qs);
	        
	    	var url = ws.getUrlParam(qs, "url");
	    	//var isVideo = cmd && (cmd.toLowerCase().indexOf("/video") === 0);
	    	//var isImage = cmd && (cmd.toLowerCase().indexOf("/image") === 0);
	        
	        if (cmd === "/ping") {
	        	var cb = ws.getUrlParam(qs, "callback");
				cb = cb ? cb + "();" : "";
				ws.writeTextResponse(socketId, cb, keepAlive, ws.CONTENT_TYPE_JAVASCRIPT);
	        } else if (cmd === "/clear_cache") {
	    		socketRequests.put(socketId, {"url": "cmd:clear_cache", "keepAlive": keepAlive});
				workers.clearCache();
	        } else if (cmd === "/get_cached_files") {
	    		socketRequests.put(socketId, {"url": "cmd:get_cached_files", "keepAlive": keepAlive});
				workers.getCachedFiles();
	        } else if (url) {
		    	url = decodeURIComponent( url.replace(/\+/g, "%20") );
	        	processRequest_GetVideo(socketId, url, keepAlive, range);
	        } else {
				log("Unrecognized request. Returning " + ws.HTTP_BAD_REQUEST_TEXT);
				ws.writeErrorResponse(socketId, ws.HTTP_BAD_REQUEST_TEXT, keepAlive);
	        }
		} catch (e) {
			log("Cache onRequest error: " + e.message);
		}
	};

	var processRequest_GetVideo = function(socketId, fileUrl, keepAlive, range) {
		fileRequests.register(fileUrl);
		var urlIsAlreadyRequested = socketRequests.valExists(fileUrl);
		socketRequests.put(socketId, {"url": fileUrl, "keepAlive": keepAlive, "range": range});
		if (!urlIsAlreadyRequested) {
			workers.getFile(fileUrl);
		}
	};

	var onFileReady = function(requestUrl, file, headers) {
		var socketIds = socketRequests.keySet();
		for (var i = 0; i < socketIds.length; i++) {
			var socketId = socketIds[i];
			var socketInfo = socketRequests.get(socketId);
			if (requestUrl == socketInfo.url) {
				var keepAlive = socketInfo.keepAlive;
				var range = socketInfo.range;
				socketRequests.remove(socketId);
				socketId = parseInt(socketId, 10);
				log("onFileReady: socketId=" + socketId + " | url=" + requestUrl + " | range=" + range);
				if (file) {
					if (range && range.length == 1) {
						range.push(file.size - 1);
					}
					ws.writeResponse_Headers(socketId, file.size, headers, keepAlive, range);
					if (file.size) {
						ws.writeResponse_Body_File(socketId, file.size, keepAlive, range, file);
					} else {
						ws.writeResponse_End(socketId, keepAlive);
					}
				} else {
					ws.writeErrorResponse(socketId, ws.HTTP_NOT_FOUND_TEXT, keepAlive);
				}
			}
		}
		
		//downloadIfModified(requestUrl);
	};

	var onClearCache = function() {
		var socketIds = socketRequests.keySet();
		for (var i = 0; i < socketIds.length; i++) {
			var socketId = socketIds[i];
			var socketInfo = socketRequests.get(socketId);
			if ("cmd:clear_cache" == socketInfo.url) {
				var keepAlive = socketInfo.keepAlive;
				socketRequests.remove(socketId);
				socketId = parseInt(socketId, 10);
				log("onClearCache: socketId=" + socketId);
				ws.writeTextResponse(socketId, "All cached files have been removed.", keepAlive, ws.CONTENT_TYPE_TEXT_PLAIN);
			}
		}
	};

	var onGetCachedFiles = function(files) {
		var socketIds = socketRequests.keySet();
		for (var i = 0; i < socketIds.length; i++) {
			var socketId = socketIds[i];
			var socketInfo = socketRequests.get(socketId);
			if ("cmd:get_cached_files" == socketInfo.url) {
				var keepAlive = socketInfo.keepAlive;
				socketRequests.remove(socketId);
				socketId = parseInt(socketId, 10);
				log("onGetCachedFiles: socketId=" + socketId);
				var htmlStr = JSON.stringify(files);
				console.log(htmlStr);
				ws.writeTextResponse(socketId, htmlStr, keepAlive, ws.CONTENT_TYPE_JAVASCRIPT);
			}
		}
	};
	
	var downloadIfModified = function(fileUrl) {
		//TODO: optimize - use one worker to download modified files
		if (fileRequests.beginRequest(fileUrl)) {
			workers.downloadIfModified(fileUrl);
		}
	};

	var onDownloadIfModified = function(fileUrl) {
		fileRequests.endRequest(fileUrl);
	};
	
	this.printStats = function() {
		log("Open sockets "  + ws.openSockets.keySet());
		ws.printSocketInfo();
		//ws.reset();
	};


};


// Copyright © 2010 - May 2014 Rise Vision Incorporated.
// Use of this software is governed by the GPLv3 license
// (reproduced in the LICENSE file).

importScripts("/js/hashtable.js");

rvFileManagerSync = function () {

	//constants
	var HEADER_IF_NONE_MATCH = "If-None-Match";
	var HEADER_IF_MODIFIED_SINCE = "If-Modified-Since";
	var HEADER_CONTENT_LENGTH = "Content-Length";
	var HEADER_CONTENT_TYPE = "Content-Type";
	var HEADER_LAST_MODIFIED = "Last-Modified";
	var HEADER_ETAG = "ETag";
	var HEADER_FILE_URL = "File-URL";
	var FILE_EXT_DATA = "dat";
	var FILE_EXT_HEADERS = "txt";

	var FILE_KEEP_IN_CACHE_DURATION_DAYS = 30;
	var FILE_KEEP_IN_CACHE_DURATION_MS = FILE_KEEP_IN_CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000; //milliseconds

	var fs; //file system 
	var fsCache; //cache folder
	
	this.init = function() {
		initFS();
	};
	
	var initFS = function () {
		//we request 5GB, but we get unlimited as specified in manifest
		self.requestFileSystemSync = self.webkitRequestFileSystemSync || self.requestFileSystemSync;
		fs = self.requestFileSystemSync(PERSISTENT, 5*1024*1024*1024 /*5GB*/);
		fsCache = fs.root.getDirectory("cache", {create : true});
		log('initFS complete');
	};

//	var errorHandler = function(e) {
//		  var msg = '';
//
//		  switch (e.code) {
//		    case FileError.QUOTA_EXCEEDED_ERR:
//		      msg = 'QUOTA_EXCEEDED_ERR';
//		      break;
//		    case FileError.NOT_FOUND_ERR:
//		      msg = 'NOT_FOUND_ERR';
//		      break;
//		    case FileError.SECURITY_ERR:
//		      msg = 'SECURITY_ERR';
//		      break;
//		    case FileError.INVALID_MODIFICATION_ERR:
//		      msg = 'INVALID_MODIFICATION_ERR';
//		      break;
//		    case FileError.INVALID_STATE_ERR:
//		      msg = 'INVALID_STATE_ERR';
//		      break;
//		    default:
//		      msg = 'Unknown Error';
//		      break;
//		  };
//
//		  log('Error: ' + msg);
//	};

	this.fileUrlToFileName = function(str) {
		//get string hash of fileUrl
	    var hash = 0xFFFFFFFF, i, char;
	    hash = hash - hash;
	    if (str.length == 0) return hash;
	    for (var i = 0; i < str.length; i++) {
	        char = str.charCodeAt(i);
	        hash = ((hash<<5)-hash)+char;
	        hash = hash & hash; // bitwise operation converts big number to 32bit integer
	    }
	    hash = intToHex8(hash);
	    return hash;
	};

	var intToHex8 = function(value) {
	    //convert signed integer to unsigned integer
		if (value < 0) {
			value = value >>> 0;
		}

	    //format output to HEX
		var res = value.toString(16).toUpperCase();
	    //make sure the result is 8 char long
		res = "00000000".substr(0,8-res.length) + res;
		
		return res;
		
	};
	
	this.getFile = function(fileUrl, retVal) {
		var file;
		try {
			var fileName = this.fileUrlToFileName(fileUrl);
			var version = getCurrentVersion(fileName);
			if (version == -1) {
				log("File not found. Starting download...");
				file = this.download(fileName, fileUrl, retVal);
			} else {
				log("File is found in cache.");
				retVal.headers = readAllHeaders(formatFileName(fileName, version, FILE_EXT_HEADERS), true);
				var fileEntry = fsCache.getFile(formatFileName(fileName, version, FILE_EXT_DATA), {create: false});
				file = fileEntry.file();
			}
		} catch (e) {
			log("get error: "  + e.message);
		}
		return file;
	};

	var fileIsExpired = function(file) {
		var today = new Date().setHours(0,0,0,0); 
		var fileDate = file.lastModifiedDate.setHours(0,0,0,0);
		return (today - fileDate >= FILE_KEEP_IN_CACHE_DURATION_MS);
	};

	this.deleteExpired = function() {
		try {
			var dirReader = fsCache.createReader();
			var entries = dirReader.readEntries();
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.isFile && endsWith(entry.name, FILE_EXT_HEADERS)) {
					if (fileIsExpired(entry.file())) {
						log("deleting expired file: " + entry.name);
						var datFileName = entry.name.substring(0,18) + FILE_EXT_DATA;
						var datFile = fsCache.getFile(datFileName, {create: false});
						datFile.remove(); //remove data file.
						entry.remove(); //remove header file.
					}
				}
			}
		} catch (e) {
			log("deleteExpired worker error: "  + e.message);
		}
	};

	this.deleteAllDuplicates = function() {
		try {
			var dirReader = fsCache.createReader();
			var entries = dirReader.readEntries();
			var names = new rvHashTable();
			//find the latest versions of all files
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.isFile && endsWith(entry.name, FILE_EXT_DATA)) {
					var name = extractFileName(entry.name);
					var version = extractFileVersionAsInt(entry.name);
					var savedVersion = names.get(name);
					if (savedVersion === null || savedVersion < version){
						names.put(name, version);
					}
				}
			}
			//remove duplicates - files with older versions
			for (var i = 0, entry; entry = entries[i]; ++i) {
				if (entry.isFile && (endsWith(entry.name, FILE_EXT_DATA) || endsWith(entry.name, FILE_EXT_HEADERS))) {
					var name = extractFileName(entry.name);
					var version = extractFileVersionAsInt(entry.name);
					if (version !== names.get(name)) {
						entry.remove(); //remove header file.
					}
				}
			}

		} catch (e) {
			log("deleteExpired worker error: "  + e.message);
		}
	};

	this.clearCache = function() {
		try {
			var dirReader = fsCache.createReader();
			var entries = dirReader.readEntries();
			for (var i = 0, entry; entry = entries[i]; ++i) {
				entry.remove();
			}
		} catch (e) {
			log("clearCache worker error: "  + e.message);
		}
	};

	this.getCachedFiles = function() {
		var res = [];
		try {
			var dirReader = fsCache.createReader();
			var entries = dirReader.readEntries();
			for (var i = 0, entry; entry = entries[i]; ++i) {
				res.push({name: entry.name, size: entry.getMetadata().size});
			}
		} catch (e) {
			log("clearCache worker error: "  + e.message);
		}
		return res;
	};

	var readAllHeaders = function(fileName, refVal, needToUpdateFileLastAccessedTime) {
		var fileEntry = fsCache.getFile(fileName, {create: false});
		var file = fileEntry.file();
		var headers = blobToStr(file);
		if (needToUpdateFileLastAccessedTime) {
			//update file last modified so we know last time it waas accessed
			var today = new Date().setHours(0,0,0,0); 
			var fileDate = file.lastModifiedDate.setHours(0,0,0,0);
			// setHours() returns milliseconds (int type) which is easy to compare
			if (today !== fileDate) {
				fileEntry.createWriter().write(strToBlob(headers));
			}
		}
		return headers;
	};
	
	var strToBlob = function(txt) {
		return new Blob([ txt ], {type : "text/plain;charset=UTF-8"});
	};

	var blobToStr = function(blob) {
		var reader = new FileReaderSync();
        return reader.readAsText(blob);
	};

	this.download = function(fileName, fileUrl, retVal, condHeader) {
		var file = null;
		try {
		    var xhr = new XMLHttpRequest();
		    xhr.responseType = "blob";
		    xhr.open('GET', fileUrl, false); //async=FALSE
		    if (condHeader) {
			    xhr.setRequestHeader(condHeader.name, condHeader.value);
		    }
		    xhr.send();
		} catch (e) {
			log("download error: " + e.message);
		}

		try {
			log(" --- on download. xhr.readyState="+xhr.readyState+" | xhr.status="+xhr.status); //DO NOT DELETE!!! This line somehow magically fixes InvalidState error.
			if (xhr.status >= 200 && xhr.status < 300) {
				log("file download is complete.");
				file = saveResponseData(fileName, fileUrl, xhr, retVal);
			} else {
				log("download status code: " + xhr.status);
			}
		} catch (e) {
			log("save file error: " + e.message);
		}

		return file;
	};

	var saveResponseData = function(fileName, fileUrl, xhr, retVal) {
		var headers = extractHeaders(xhr, fileUrl);
		var version = getCurrentVersion(fileName) + 1;
		//save data file
		var dataFileName = formatFileName(fileName, version, FILE_EXT_DATA)

		var file = saveFile(dataFileName, xhr.response);
		
		//try to recover from errors like InvalidStateError i.e. "state had changed" message.
		//try saving second time if first time fails. 		
		if (!file) {
			deleteFile(dataFileName); //usually 0 length file is created, so delete it first
			file = saveFile(dataFileName, xhr.response);
		}
		
		if (!file) {
			deleteFile(dataFileName);
		} else {
			//save headers
			saveFile(formatFileName(fileName, version, FILE_EXT_HEADERS), strToBlob(headers));
			if (retVal) {
				retVal.headers = headers;
			}
		}
		return file;
	};

	this.downloadIfModified = function(fileUrl) {

		//send HEAD request
		var fileName = this.fileUrlToFileName(fileUrl);
		var version = getCurrentVersion(fileName);
		var headersStr = readAllHeaders(formatFileName(fileName, version, FILE_EXT_HEADERS), false);
		var headers = headersStrToObj(headersStr);
		
	    if (!(headers && (headers.ETag || headers.LastModified))) {
	    	//if neither ETag nor LastModified exist, then there is no way to check if file is modified
	    	return false;
	    }

	    var condHeader = null; //conditional header
		try {
		    var xhr = new XMLHttpRequest();
		    xhr.responseType = "blob";
		    xhr.open('HEAD', fileUrl, false); //async=FALSE
			if (headers.ETag) {
			    xhr.setRequestHeader(HEADER_IF_NONE_MATCH, headers.ETag);
			    condHeader = {"name": HEADER_IF_NONE_MATCH, "value": headers.ETag};
			} else {
			    xhr.setRequestHeader(HEADER_IF_MODIFIED_SINCE, headers.LastModified);
			    condHeader = {"name": HEADER_IF_MODIFIED_SINCE, "value": headers.LastModified};
			}
		    xhr.send();
		} catch (e) {
			log("checkIfModiifed download error: " + e.message);
			return false;
		}
		
		//expected responses: "200 OK" or "304 Not Modified"		
		if (xhr.status >= 200 && xhr.status < 300) {
			//check if entire file has been downloaded. It happens when 
			// - HEAD requests are treated as GET on server
			// - Chrome replaces HEAD by GET when it follows 301 redirect
			if (xhr.response && xhr.response.size > 0) {
				//response includes data - skip GET request and just save data
				log('File is modified. HEAD request returned data (oh-oh!). Saving... fileName=' + fileName);
				saveResponseData(fileName, fileUrl, xhr, null);
			} else {
				log('File is modified. Re-downloading... fileName=' + fileName);
				this.download(fileName, fileUrl, null, condHeader);
			}
			return true;
		}

		return false;
	};

	var headersStrToObj = function(headersStr) {
		var res = null;
		if (headersStr) {
			res = {};
			var arr = headersStr.split("\n");
			for (var i = 0; i < arr.length; i++) {
				var key = arr[i].split(":", 1)[0]; //use split to get the key only because there might be more than one ":"
				key = key ? key.toLowerCase() : "";
				var value = arr[i].substring(key.length+1);
				value = value ? value.trim() : "";
				if ("content-type" == key) {
					res.ContentType = value;
				} else if ("content-length" == key) {
					res.ContentLength = value;
				} else if ("last-modified" == key) {
					res.LastModified = value;
				} else if ("etag" == key) {
					res.ETag = value;
				}
			}
		}
		return res;
	};
	
	var formatFileName = function(name, version, ext) {
		return name + "." + intToHex8(version) + "." + ext;
	};
	
	var extractHeaders = function(xhr, fileUrl) {
		var headers = [];
		
		var v = xhr.getResponseHeader(HEADER_ETAG);
		if (v) {
			headers.push(HEADER_ETAG + ": " + v);
		}
		v = xhr.getResponseHeader(HEADER_LAST_MODIFIED);
		if (v) {
			headers.push(HEADER_LAST_MODIFIED + ": " + v);
		}
		
		headers.push(HEADER_CONTENT_TYPE + ": " + xhr.response.type);
		headers.push(HEADER_CONTENT_LENGTH + ": " + xhr.response.size);
		headers.push(HEADER_FILE_URL + ": " + fileUrl);
		
		log(headers);
		
		return headers.join("\n");
	};
	
	var saveFile = function(fileName, data) {
		var file = null;
		try {
			var fileEntry = fsCache.getFile(fileName, {create: true});
			fileEntry.createWriter().write(data);
			file = fileEntry.file();
		} catch (e) {
			log("saveFile error: "  + e.message);
		}
		return file;
	};
	
	var deleteFile = function(fileName) {
		try {
			var fileEntry = fsCache.getFile(fileName, {create: false});
			fileEntry.remove(); 
		} catch (e) {
			log("deleteFile error: "  + e.message);
		}
	};

	var getCurrentVersion = function(name, versions) {
		var maxVersion = -1;

		var dirReader = fsCache.createReader();
		var entries = dirReader.readEntries();
		for (var i = 0, entry; entry = entries[i]; ++i) {
			if (entry.isFile && startsWith(entry.name, name) && endsWith(entry.name, FILE_EXT_HEADERS)) {
				var version = extractFileVersionAsInt(entry.name);
				if (versions)
					versions.push(version);
				if (version > maxVersion)
					maxVersion = version;
			}
		}

		return maxVersion;
	};

	var extractFileName = function(name) {
		return name.substring(0, 8);
	};

	var extractFileVersion = function(name) {
		return name.substring(9, 17);
	};

	var extractFileVersionAsInt = function(name) {
		return parseInt(extractFileVersion(name), 16);
	};

	var startsWith = function(str, suffix) {
	    return str.indexOf(suffix) == 0
	};
	
	var endsWith = function(str, suffix) {
	    return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};
	
};

function messageHandler(event) {
	try {
	    var data = event.data ? event.data : {};
	    //"self" is the property of the HTML5 Worker object. No need to declare it.
		self.id = data.id;
		log('New message cmd=' + data.cmd);

		if (!self.fm) {
		    self.fm = new rvFileManagerSync();
		}

		self.fm.init();
		switch (data.cmd) {
		case 'getFile':
			var retVal = {}; //helper object to return function results (headers) by reference 
			var file = self.fm.getFile(data.fileUrl, retVal);
			self.postMessage({'cmd': 'getFile_complete', 'id': id, 'fileUrl': data.fileUrl, 'file': file, 'headers': retVal.headers});
			break;
		case 'downloadIfModified':
			self.fm.downloadIfModified(data.fileUrl)
			self.postMessage({'cmd': 'downloadIfModified_complete', 'id': id, 'fileUrl': data.fileUrl});
			break;
		case 'deleteExpired':
			self.fm.deleteAllDuplicates();
			self.fm.deleteExpired();
			self.close(); // Terminates the worker.
			break;
		case 'clearCache':
			self.fm.clearCache();
			self.postMessage({'cmd': 'clearCache_complete', 'id': id});
			break;
		case 'getCachedFiles':
			var cachedFiles = self.fm.getCachedFiles();
			self.postMessage({'cmd': 'getCachedFiles_complete', 'id': id, 'files': cachedFiles});
			break;
		case 'stop':
			break;
		default:
			log('Unknown command: ' + data.cmd);
		};
	} catch (e) {
		   self.postMessage({'cmd': 'log', 'id': self.id, 'msg': 'error' + e.message});
	}

};


//Defining the callback function raised when the main page will call us
this.addEventListener('message', messageHandler, false);

var log = function(msg) {
    self.postMessage({'cmd': 'log', 'id': self.id, 'msg': msg});
};	

var returnFile = function(fileUrl, fileLocalUrl) {
    self.postMessage({'cmd': 'log', 'id': self.id, 'fileUrl': fileUrl, 'fileLocalUrl': fileLocalUrl});
};	

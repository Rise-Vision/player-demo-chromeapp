// Copyright © 2010 - May 2014 Rise Vision Incorporated.
// Use of this software is governed by the GPLv3 license
// (reproduced in the LICENSE file).

var $rv = $rv || {}; //Rise Vision namespace
console.log(launchData);

var downloadFileComplete = function(xhrProgressEvent, fileName, fileUrl) {

    // we have the file details
    // so now we need to wrap the file up, including
    // the caching information to return back
    var xhr = xhrProgressEvent.target;
    fileData = xhr.response; //blob
    var fileInfo = xhr.getAllResponseHeaders();

    if(xhr.readyState === 4) {
      if(xhr.status === 200) {
    	  console.log("downloadFileComplete OK. URL:" + window.URL.createObjectURL(fileData));
    	  
    	  
    	  var headers = extractHeaders(xhr, fileUrl);
    	  
    	  var version = getCurrentVersion(fileName) + 1;
    	  
    	  var w = new Worker("/js/cache/filemanagersync.js")
    	  w.postMessage(fileName);
    	  
    	  getCurrentVersion(fileName) + 1;

    	  saveFile(formatFileName(fileName, version, FILE_EXT_DATA), fileData);
    	  headerBlob = new Blob([headers], {type: "text/plain;charset=UTF-8"});
    	  saveFile(formatFileName(fileName, version, FILE_EXT_HEADERS), headerBlob);
    	  //testImage.src = window.URL.createObjectURL(fileData);
    	  //saveFile(fileData)
        //callbackSuccess(fileData, fileInfo);
      } else {
    	  console.log("downloadFileComplete NOT OK");
        //callbackError(xhrProgressEvent);
      }
    }
};

$rv.debug = launchData.debugMode;

onload = function (e) {
    console.log('body.onload is called');

	var w = chrome.app.window.current()
	        w.setBounds({
            left: launchData.windowOptions.left,
            top: launchData.windowOptions.top,
            width: launchData.windowOptions.width,
            height: launchData.windowOptions.height
    	} );


    $rv.browser = document.querySelector('#viewer');
    

    $rv.browser.addEventListener('newwindow', function(e) {
    		console.log("[WebView.newwindow]");
		e.preventDefault();
          	console.log("webview newwindow event");	
          	window.open(e.targetUrl, { 'bounds': {'width': 400,'height': 500} });
          	//chrome.app.window.open("index.html", { 'bounds': {'width': 400,'height': 500} });
	});

    
    $rv.browser.addEventListener('exit', function(e) {
    	console.log("[WebView.exit] reason: " + e.reason);
		if (e.reason === 'crash' || e.reason === 'crashed') {
			//$rv.browser.src = 'data:text/plain,Browser crashed. It will restart shortly!';
			//TODO: restart WebView ASAP
		}
	});
    
    $rv.browser.addEventListener('permissionrequest', function(e) {
	    console.log('Permission '+e.permission+' requested by webview');
    	  if ( e.permission === 'geolocation' ) {
    	    e.request.allow();
    	  }
    	  else if ( e.permission === 'loadplugin' ) {
    	    e.request.allow();
    	  } else {
    	    e.request.deny();
    	  }
    });
    
    if ($rv.debug) {
    	onresize = resizeBrowser;

//      document.querySelector('#btClose').onclick = function() {
//    	window.close();
//    };

    	var btRefresh = document.querySelector('#btRefresh')
        if (btRefresh) {
        	btRefresh.style.display = "inline";
        	btRefresh.onclick = function() {
                if ($rv.browser) {
                	$rv.browser.reload();
                }
        	};
        }

    	var btCacheStatus = document.querySelector('#btCacheStatus')
        if (btCacheStatus) {
        	btCacheStatus.style.display = "inline";
        	btCacheStatus.onclick = function() {
            	$rv.cache.printStats();
            	
        	};
        }

    }

    var btClose = document.querySelector('#btClose')
    if (btClose) {
        btClose.onclick = function() {
            if ($rv.browser) {
                window.close();
            }
        };
    }
        
    $rv.config = new rvConfig();
    $rv.config.init(onConfigLoad);
    resizeBrowser();
};

var onConfigLoad = function() {
    $rv.cache = new rvCache();
    $rv.cache.init($rv.config);
    
    $rv.player = new rvPlayer();
    $rv.player.init($rv.config);

//    if ($rv.config.screenWidth && $rv.config.screenHeight) {
//    	console.log("screen size is loaded from cache");
//    	window.resizeTo($rv.config.screenWidth, $rv.config.screenHeight);
//    } else {
//    	console.log("screen size is NOT loaded from cache");
//    }
    
    resizeBrowser();
	
};

function resizeBrowser() {
	$rv.heightOffset = $rv.debug ? 50 : 0;
    if ($rv.browser) {
        var windowWidth = launchData.windowOptions.width;
        var windowHeight = launchData.windowOptions.height - $rv.heightOffset;
        $rv.browser.style.width = windowWidth + "px";
        $rv.browser.style.height = windowHeight + "px";
        //$rv.config.saveScreenSize(windowWidth, windowHeight);
        console.log('resize to screenWidth = ' + windowWidth + ' | screenHeight = ' + windowHeight);

    }
} 

$rv.close = function() {
	window.close();
};

$rv.onSocketCreated = function(socketId) {
    launchData.sockets.push(socketId);
};

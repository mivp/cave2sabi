// Copyright 2012-2015 Luc Renambot, University of Illinois at Chicago.
//    All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Contact: Luc Renambot - renambot@gmail.com

/*jslint node: true */


// ---------------------------------------------
//  Include dependencies
// ---------------------------------------------

// Basic includes
var os    = require('os');
var url   = require('url');
var fs    = require('fs');
var util  = require('util');
var net   = require('net');
var path  = require('path');

// Better parser fro JSON
var JSON5 = require('json5');

// To talk to the web clients
var io = require('socket.io');

// To talk to other servers
var cio = require('socket.io-client');

// To detect file type
var mime = require('mime');

// To build a web server
var http = require('http');

// Parsing url with parameters
var querystring = require('querystring');

// To do authentification
var http_auth = require('http-auth');

// OSC library
var osc = require('./src/node-osc/lib/osc.js');

// Blocking exec function
//var exec  = require('exec-sync');

// Serial port communication library
var serialport = require("serialport");
var SerialPort = serialport.SerialPort; // localize object constructor

// Application messages
var AppRPC = require('./src/AppRPC');

// Command line argument processing
var optimist = require('optimist');

// the HTTP server
var hserver;
// the HTTP port
var hport = 9000;

// the HTTP server
var tcp_server;
// the HTTP port
var tcp_port = 11000;
var tcp_clients = [];

var platform = os.platform() === "win32" ? "Windows" : os.platform() === "darwin" ? "Mac OS X" : "Linux";

// ---------------------------------------------
//  Parse command line arguments
// ---------------------------------------------

console.log('--------------------------------------------');
optimist = optimist.usage('Usage: $0 -f [json file]');
if (platform === "Windows") {
	optimist = optimist.default('f', path.join('config', 'windows.json'));
} else {
	optimist = optimist.default('f', path.join('config', 'sabi.json'));	
}
optimist = optimist.describe('f', 'Load a configuration file');
// optimist.showHelp();
var argv = optimist.argv;
var ConfigFile = argv.f;
console.log('Reading configuration file:', ConfigFile);
console.log('--------------------------------------------');

// ---------------------------------------------
//  Read the configuration file
// ---------------------------------------------

var configdata = fs.readFileSync(path.join(__dirname,ConfigFile));
var cfg = JSON5.parse(configdata);

// Get the port of the webserver from configuration file
if (cfg.global.server_port) {
	hport = parseInt( cfg.global.server_port );
}
// Get the port for TCP connection from configuration file
if (cfg.global.tcp_port) {
	tcp_port = parseInt( cfg.global.tcp_port );
}

// ---------------------------------------------
//  Return the mime type of a file 
//     used for the web server
// ---------------------------------------------

// Mime function
function contentType(apath) {
	return mime.getType(apath);
}

// ---------------------------------------------
//  Sleep for a little while
// ---------------------------------------------

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds){
			break;
		}
	}
}


// ---------------------------------------------
// Requesting new authentication instance.
// ---------------------------------------------

var digest = http_auth.digest({
	realm: "sabi",
	file:  path.join(__dirname, 'users.htpasswd'),
});

// ---------------------------------------------
//   Build the main page of the site
// ---------------------------------------------

function buildMainPage(cfg) {
	var p, b;
	var data = '';

	// Generate the page
	data += '<div data-role="page" id="MAIN" data-theme="a">\n';

	var numpages = cfg.main.pages.length;

	// Panel
	if (numpages > 1) {
		data += '<div data-role="panel" style="background: rgba(0,0,0,.80);" id="navpanel" data-display="overlay" data-theme="a">';
		data += '<h2>Menu</h2>';
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#' +  b  + '">' + b + '</a> </p>\n';
		}
		data += '</div><!-- /panel --> ';
	}


	data += '<div data-role="header" data-position="fixed">\n';
	data += cfg.main.header ;
	if (numpages > 1) {
		data += '<a href="#navpanel" data-icon="bars" data-role="button" data-inline="true" data-iconpos="notext">Panel</a>\n';
	}
	data += '</div>\n\n';

	// Content of the page
	data += '<div data-role="content">\n';

	if (cfg.main.image) {
		data += '<div style="text-align: center;">\n';
		data += '<img src="' + cfg.main.image + '" ';
		if (cfg.main.image_style) {
			data += cfg.main.image_style;
		}
		data += '/>\n';
		data += '</div>\n';
	}

	if (numpages === 1) {
		data += buildaPage(cfg, cfg.main.pages[0]);
	} else {
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#' +  b  + '">' + b + '</a> </p>\n';
		}
		data += '</div>\n\n';		
	}

	data += '<div data-role="footer" data-position="fixed">\n';
	data += cfg.main.footer;
	data += '</div>\n\n';

	data += '</div>\n';

	return data;
}

// ---------------------------------------------
//   Build any othe page from the configuration
// ---------------------------------------------

function buildaPage(cfg, name) {
	var a, p, b, theme, role, collapsed;
	var data = '';

	var numpages = cfg.main.pages.length;

	// Panel
	if (numpages > 1) {
		// Generate the page
		data += '<div data-role="page" id="' + name + '" data-theme="b">\n';

		// Panel
		data += '<div data-role="panel" id="navpanel" style="background: rgba(0,0,0,.80);" data-display="overlay" data-theme="a">';
		data += '<h2>Menu</h2>';
		data += '<p> <a data-role="button" data-icon="grid" data-iconpos="right" href="..">Home</a> </p>\n';
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			if (b!=name) {
				data += '<p> <a data-role="button" data-icon="arrow-r" data-iconpos="right" href="#' +  b  + '">' + b + '</a> </p>\n';
			}
		}
		data += '</div><!-- /panel --> ';

		// Header
		data += '<div data-role="header" data-position="fixed">\n';
		data += '<h1>' + cfg[name].title + '</h1>';
		data += '<a href="#navpanel" data-icon="bars" data-role="button" data-inline="true" data-iconpos="notext">Panel</a>\n';
		data += '</div>\n\n';

		// Content of the page
		data += '<div data-role="content">\n';
	}


	var groups = cfg[name].groups;
	if (groups) {
		for (p in groups) {
			data += '<div data-role="collapsible" data-theme="b" data-content-theme="a" data-collapsed="false">\n';
			b = groups[p];
			var c = cfg[name][b];
			data += '<h3>' + c.title + '</h3>\n';
			if (c.image) {
				data += '<div>\n';
				if (c.description) {
					data += c.description + '\n';				
				}
				data += '<table style="width:100%;" cellpadding="10">\n';
				data += '<colgroup>\n';
				//data += '<col style="width: 100px;" />\n';
				data += '<col style="width: 15%;max-width:250px" />\n';
				data += '<col style="width: auto;align:right"/>\n';
				data += '</colgroup>\n';
				data += '<tr>\n';
				data += '<td> <img style="width:90%" src="' + c.image + '"/> </td>\n';
				data += '<td>\n<div>\n';
				for (a in c.actions) {
					theme = "a";
					if (c.actions[a].theme){
						theme = c.actions[a].theme;
					}
					role = "button";
					if (c.actions[a].role) {
						role = c.actions[a].role;
					}
					if (role=="button") {
						if(c.actions[a].previs) {

							data += '<p><a href="#popupPrevis" data-rel="popup" data-icon="gear" data-role="button" data-theme="' + theme + '" class="sabijs" >Run previs</a></p>\n';
							
							data += '<div data-role="popup" id="popupPrevis" data-theme="a" class="ui-corner-all">\n';
							data += '	<form>\n';
							data += '		<div style="padding:10px 20px;">\n';
							data += '			<h4>Input tag:</h4>';
							data += '			<label for="popup-input1" class="ui-hidden-accessible">Tag:</label>';
							data += '			<input type="text" name="popup-input1" id="popup-input1" value="" placeholder="tag" data-theme="a">';
	            			data += ' 			<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b" data-rel="back" id="popupBtnOK">OK</a>\n';
							data += ' 			<a href="#" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-btn-b" data-rel="back">Cancel</a>\n';
							data += '		</div>\n';
							data += '	</form>\n';
							data += '</div>\n';			
						}
						else {
							data += '<p><a data-icon="gear" data-role="button" data-theme="' + theme + '" class="sabijs" id="';
							if (c.actions[a].macro) {
								data += c.actions[a].macro +'">';
							} else {
								data += c.actions[a].action +'">';
							}
							data += c.actions[a].title;
							data += '</a> </p>\n';
						}
						
					} else if (role =="collapsible") {
						collapsed = true;
						if (c.actions[a].collapsed == "false") {
							collapsed = false;
						}
						data += '<div data-role="collapsible" data-collapsed="' + collapsed +'" ';
						data += 'data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">\n';
						} else {
							data += c.actions[a].action +'">\n';
						}
						data += '<h3>' + c.actions[a].title + '</h3>\n';
						data += '<div data-role="fieldcontain"></div>\n';
						data += '</div>\n';
					} else if (role == "range") {
						data += '<div data-role="fieldcontain">\n';
						var minv = 0;
						var maxv = 0;
						if (c.actions[a].minvalue) {
							minv = parseFloat(c.actions[a].minvalue);
						}
						if (c.actions[a].maxvalue) {
							maxv = parseFloat(c.actions[a].maxvalue);
						}
						var medium = (maxv + minv) / 2.0;
						data += '<input type="range" data-track-theme="b" data-highlight="true" ';
						data += 'value=' + medium + ' min=' + minv + ' max=' + maxv;
						if (c.actions[a].macro) {
							data += 'data-theme="' + theme + '" class="sabijs" id="' + c.actions[a].macro +'">\n';
						} else {
							data += 'data-theme="' + theme + '" class="sabijs" id="' + c.actions[a].action +'">\n';
						}
						data += '</div>\n';
					}

				}
				data += '</div></td></tr>\n';
				data += '</table></div>\n';
			} else {
				if (c.description) {
					data += '<p>' + c.description + '</p>\n';				
				}
				for (a in c.actions) {
					theme = "a";
					if (c.actions[a].theme) {
						theme = c.actions[a].theme;
					}
					role = "button";
					if (c.actions[a].role) {
						role = c.actions[a].role;
					}
					if (role=="button") {
						data += '<p><a data-icon="gear" data-role="button" data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">';
						} else {
							data += c.actions[a].action +'">';
						}
						data += c.actions[a].title;
						data += '</a> </p>\n';
					} else if (role =="collapsible") {
						collapsed = true;
						if (c.actions[a].collapsed == "false") {
							collapsed = false;
						}
						data += '<div data-role="collapsible" data-collapsed="' + collapsed +'" ';
						data += 'data-theme="' + theme + '" class="sabijs" id="';
						if (c.actions[a].macro) {
							data += c.actions[a].macro +'">\n';
						} else {
							data += c.actions[a].action +'">\n';
						}
						data += '<h3>' + c.actions[a].title + '</h3>\n';
						data += '<div data-role="fieldcontain"></div>\n';
						data += '</div>\n';
					}
				}
			}
			data += '</div>\n\n';
		}
	}

	// Back to main page button
	//data += '<p><a data-role="button" data-theme="b" data-icon="arrow-l" data-iconpos="left" href="#MAIN">Back to Main page</a></p>\n\n';
	
	if (numpages > 1) {
		// End of page content
		data += '</div>\n\n';

		// Footer
		data += '<div data-role="footer" data-position="fixed">\n';
		data += '  <div data-role="navbar" data-iconpos="left" >';
		data += '  <ul>';
		data += '    <li> <a href="#MAIN" data-theme="b" data-icon="grid">Home</a> </li>\n';
		// Put the navbar items in the navigation bar
		for (p in cfg.main.pages) {
			b = cfg.main.pages[p];
			if (b!=name && cfg[b].navbar && cfg[b].navbar=="true" ) {
				data += '    <li> <a href="#' +  b  + '" data-icon="star">' + b + '</a> </li>\n';
			}
		}
		data += '  </ul>';
		data += '  </div><!-- /navbar -->';
		//data += cfg.main.footer;
		data += '</div>\n\n';

		// end of page
		data += '</div>\n';
	}

	return data;
}


// ---------------------------------------------
// Process one page load
// ---------------------------------------------

function process_request(cfg, req, res) {
	if (req.method === "GET") {
		var apath = url.parse(req.url).pathname;
		if (apath == '/') {
			// Open the header template
			apath = '/src/header';
			// Read the data synchronously
			data = fs.readFileSync(__dirname + apath);

			// Build the main page
			data += buildMainPage(cfg);

			// Build the other pages
			var numpages = cfg.main.pages.length;
			if (numpages > 1) {
				for (var p in cfg.main.pages) {
					var b = cfg.main.pages[p];
					data += buildaPage(cfg, b);
				}
			}

			// Add the main script
			data += '\n<script type="text/javascript" src="src/mobile.js"></script>\n\n';

			// Close the HTML syntax
			data += "</body></html>";

			// Send the whole thing as HTML
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write(data, 'utf8');
			res.end();
		} else {
			//console.log("Agent: " + req.headers['user-agent']);
			console.log("serving to ", req.connection.remoteAddress, apath);
			fs.readFile(__dirname + apath, function(err, data) {
				if (err) {
					res.writeHead(404);
					res.end();
				} else {
					res.writeHead(200, {'Content-Type': contentType(apath)});
					res.write(data, 'utf8');
					res.end();
				}
			});
		}
	} else if (req.method === "PUT") {
		var parsed  = url.parse(req.url);
		var putName = decodeURIComponent(parsed.pathname);
		if (putName === "/upload") {
			var params     = querystring.parse(parsed.query);
			var action     = params.action;
			var filename   = cfg.actions[action].editor;
			var fileLength = 0;
			var wstream    = fs.createWriteStream(filename);

			wstream.on('finish', function() {
				// stream closed
				console.log('HTTP>		PUT file has been written', filename, fileLength, 'bytes');
			});
			// Getting data
			req.on('data', function(chunk) {
				// Write into output stream
				wstream.write(chunk);
				fileLength += chunk.length;
			});
			// Data no more
			req.on('end', function() {
				// No more date
				console.log("HTTP>		PUT Received:", fileLength, filename);
				// Close the write stream
				wstream.end();
				// empty 200 OK response for now
				res.writeHead(200, "OK", {'Content-Type': 'text/html'});
				res.end();
			});
		}
	}
}

// ---------------------------------------------
// Create the web server
// ---------------------------------------------

// hserver = http.createServer(function(req, res){
// 	var secure = cfg.global.security;
// 	if (secure && (secure === "true")) {
// 		// apply basic login check
// 		basic.apply(req, res, function(username) {   // secure access
// 			// process one request
// 			process_request(cfg, req, res);
// 		});   // end of secure
// 	} else {
// 		// process one request
// 		process_request(cfg, req, res);
// 	}
// });

var secure = cfg.global.security;
if (secure && (secure === "true")) {
	// pass the digest object to do authentification
	hserver = http.createServer(digest, function(req, res) {
			process_request(cfg, req, res);
	});
}
else {
	hserver = http.createServer(function(req, res) {
		// process one request
		process_request(cfg, req, res);
	});
}


// ---------------------------------------------
// Create the TCP server
// ---------------------------------------------

function processTCPData(data) {

	var actions = cfg.actions;
	var macros  = cfg.macros;
	var id      = data;

	console.log("processTCPData: ", id);

    // Is it a macro ?
    if (macros && id in macros) {
    	console.log("Found macro:",id);
    	processMacro(id);
    }
    // Is it an action ?
    if (actions && id in actions) {
      // if the id is an action
      var act = id;
      if ( actions[act].oscmessage ) {
          // the action is an OSC message
          if (actions[act].parameters) {
          	processOSC({message: actions[act].oscmessage,
          		server: actions[act].server,
          		parameters: [ actions[act].parameters ] } );
          } else {
          	processOSC({message: actions[act].oscmessage,
          		server: actions[act].server } );
          }
      } else if ( actions[act].serial ) {
        // the action is a serial-port message
        processSerialPort({message:actions[act].serial, baud:actions[act].baud, port: actions[act].port});
    } else if ( actions[act].command ) {
        // the action is a command (as opposed to a script)
        console.log("Command", actions[act].command);
        processRPC( {method: 'command', value: [act, actions[act].command] } );
    } else {
        // The action is a script on the local machine
        console.log("Should trigger:", actions[act].script);
        processRPC( {method: 'action', value: [act, actions[act].script] } );
    }
}
else {
	console.log("Action unknown: [%s]", id);
}
}

// Callback method executed when data is received from a socket
//
function receiveTCPData(socket, data) {
	// Clean up the message
	mesg = data.toString().replace(/(\r\n|\n|\r)/gm,"");
	if (mesg.length > 0) {
		console.log("TCP message: [%s]", mesg);
		if (mesg == "@quit") {
			socket.end('Goodbye!\n');
		} else {
			processTCPData(mesg);
			socket.write('@done\n');
		}
	}
}

// Method executed when a socket ends
//
function closeTCPSocket(socket) {
	var i = tcp_clients.indexOf(socket);
	if (i != -1) {
		tcp_clients.splice(i, 1);
		console.log("Closing a TCP client connection: %d client(s)", tcp_clients.length);
	}
}

//  Callback method executed when a new TCP socket is opened.
// 
function newTCPSocket(socket) {
	tcp_clients.push(socket);
	console.log("Opening a new TCP client connection: %d client(s)", tcp_clients.length);
	socket.write('Welcome to the Sabi.js TCP server!\n');
	socket.on('end', function() {
		closeTCPSocket(socket);
	});
	socket.on('data', function(data) {
		receiveTCPData(socket, data);
	});
}

// Create a new server and provide a callback for when a connection occurs
tcp_server = net.createServer(newTCPSocket);

// Listen on port tcp_port
tcp_server.listen(tcp_port);
// console.log("TCP server running at localhost:" + tcp_port );


// ---------------------------------------------
// Setup the websocket port
// ---------------------------------------------

var sio = io(hserver);

// ---------------------------------------------
// Process commands
// ---------------------------------------------

function processMacro(data) {
	var id = data;
	var actions = cfg.actions;
	var macros  = cfg.macros;
	// Go through the list of action in the macro
	for (var idx in macros[id]) {
		// process each action one at a time
		var act = macros[id][idx];
		console.log("Macro " + id + " : action " + act);

		if (actions[act].oscmessage) {
		    // the action is an OSC message
		    if (actions[act].parameters) {
		    	processOSC({message: actions[act].oscmessage, server: actions[act].server,
		    		parameters: [ actions[act].parameters ]});
		    } else {
		    	processOSC({message: actions[act].oscmessage, server: actions[act].server});
		    }
		} else if ( actions[act].serial ) {
		  // the action is a serial-port message
		  processSerialPort({message:actions[act].serial, baud:actions[act].baud, port:actions[act].port});
		} else if ( actions[act].command ) {
			// the action is a command (as opposed to a script)
			console.log("Here", act, actions[act].command);
			processRPC({method:'command', value:[act, actions[act].command]});
		} else {
		  // The action is a script on a machine (remote or local)
		  // if it's on a different server
		  if (actions[act].server) {
		  	var url = 'http://' + actions[act].server;
		  	console.log("Connecting to:", url);
		  	var remotesocket = cio.connect( url );
		  	console.log("Connected to server: " + url);
		  	remotesocket.emit('RPC', {method: 'action', value: [act, actions[act].script]});
		  	remotesocket.once('return', function (data) {
		  		console.log("remote status: ", data);
		  	}); // jshint ignore:line
		  } else {
		    //if (actions[act].return == "process")
		    //  this.sendCallandProcess('action', [act, actions[act].script]);
		    // else
		    processRPC({method:'action', value:[act, actions[act].script]});
		}
	}
		// End of the current action in macro
	}
}

function processEditor(data, socket) {
	console.log("Editor for:", data);
	try {
		var filename =  data.value;
		var shortname = path.basename(filename);

		// Test if file exists
		fs.access(filename, fs.F_OK, function (err) {
			if (err) {
				socket.emit('file', {action: data.action, name: shortname, data: "{\n}"});
			} else {
				// If exists, is it readable/writable
				fs.access(filename, fs.R_OK | fs.W_OK, function (err) {
					if (err) {
						console.log('Error with file, need read/write access', filename);				
					} else {
						var content = fs.readFileSync(filename, 'utf8');
						try {
							// try to parse the JSON
							var pretty  = JSON.stringify(JSON5.parse(content), null, 4);
							socket.emit('file', {action: data.action, name: shortname, data: pretty});
						} catch(e) {
							// parsing failed, just send file content
							socket.emit('file', {action: data.action, name: shortname, data: content});
						}
					}
				});
			}
		});

	} catch (e) {
		console.log('Error reading file', data.value, e);
	}
}

function processRPC(data, socket) {
	console.log("RPC for:", data);
	for (var f in AppRPC) {
		var func = AppRPC[f];
		if (typeof func == "function") {
			if (f == data.method) (func)(data,socket);
		}
	}
}

function processSerialPort(data) {
	var sp = new SerialPort(data.port, {
		parser: serialport.parsers.readline("\r"),
		baudrate: parseInt(data.baud)
	});
	sp.on("data", function (data) {
		console.log("Got: "+data);
		sp.close();
	});
	sp.on( "error", function( msg ) {
		console.log("error: " + msg );
	});
	sp.on('close', function (err) {
		console.log('port closed');
	});
	sp.on('open', function () {
		sp.write(data.message);
		sp.flush();
	});
}

function processOSC(data) {
	var addr    = data.server.split(':');
	var oclient = new osc.Client(addr[0], parseInt(addr[1]));
	var reply   = null;
	if (data.parameters) {
		// for all parameters are converted to type float for OSC messages
		//    need to add int, string, ...
		var params = data.parameters.map(parseFloat);
		if (params.length === 1) {
			reply = new osc.Message(data.message, params[0]);
		}
		if (params.length === 2) {
			reply = new osc.Message(data.message, params[0],params[1]);
		}
		if (params.length === 3) {
			reply = new osc.Message(data.message, params[0],params[1],params[2]);
		}
		if (params.length === 4) {
			reply = new osc.Message(data.message, params[0],params[1],params[2],params[3]);
		}
		if (params.length === 5) {
			reply = new osc.Message(data.message, params[0],params[1],params[2],params[3],params[4]);
		}
	} else {
		reply = new osc.Message(data.message);
	}
	oclient.send(reply, oclient);
}


// ---------------------------------------------
// Callback for the websocket
// ---------------------------------------------

sio.on('connection', function (socket) {
	console.log("New connection from " + socket.request.connection.remoteAddress);

	// Send the name of the configuration file to the web client
	//    the client will parse the file
	socket.emit('start', ConfigFile);

	socket.on("RPC", function (data) {
		processRPC(data, socket);
	});

	socket.on("EDITOR", function (data) {
		processEditor(data, socket);
	});

	socket.on("SERIALPORT", function (data) {
		processSerialPort(data);
	});

	socket.on("Macro", function (data) {
		processMacro(data);
	});

	socket.on("OSC", function (data) {
		processOSC(data);
	});

	socket.on('disconnect', function (socket) {
		console.log("Connection closed");
	});

	socket.on('previs', function(data) {
		console.log('previs received', data);
		script.Command('scripts/previsRun ' + data.tag);
  	});

});


// ---------------------------------------------
// Start the webserver and get ready...
// ---------------------------------------------

// Listen on the given port and IPv4 local interfaces
hserver.listen(hport, "0.0.0.0");
console.log("\nHTTP server running at http://localhost:" + hport );
console.log("\n");


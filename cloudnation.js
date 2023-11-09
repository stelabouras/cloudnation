(function() {

	var Cloudnation = {
	
		showSpectrum: false,

		loadBackground: true,

		US_API_KEY: 'edebfae51c3c8c6ffbf303716256015ec6aec7652091a1d921a8bcc5c3e18344',

		// Stats
		stats: null,

		// Web Audio
		context: null,
		audioBuffer: null,
		sourceNode: null,
		analyser: null,
		javascriptNode: null,
		
		// Audio handling
		startFrequency: 0,
		endFrequency: 17,		
		cutoffValue: 221.0,
		gainValue: 5,
		radius: 140,

		audioFrequencies: [],

		// Canvas
		canvas: null,
		ctx: null,
		canvasWidth: 0,
		canvasHeight: 0,
		windowWidth: 0,
		windowHeight: 0,

		// Elements
		cloudnationLogo : null,

		// Starfield
		stars: 750,
		starData: [],
		starSpeed: 1,
		dist: 256,

		glowColor: { r: 255, g: 255, b: 255, a: 0.35 },

		// Beat detection
		minBeatFrequency : 0, //inclusive
		maxBeatFrequency : 6, //inclusive
		beatDetectionTrigger : -36,

		// Scale
		lastTS: 0,
		beatScale: 1.8,
		beatScaleFalloff: 680, // msec
		currentScale: 1.0,
		previousScale: 1.0,
		currentFalloff: 0,

		redDelay: 0,
		greenDelay: 0,
		blueDelay: 0,

		container: null,
		input: null,

		initialize: function() {

			if (!window.AudioContext) {

			    if (! window.webkitAudioContext) {

			        alert('no audiocontext found');
			        return;
			  	}

			    window.AudioContext = window.webkitAudioContext;
			}

			this.stats = new Stats();
			this.stats.showPanel( 0 );
			document.body.appendChild( this.stats.dom );

			this.container = document.getElementById('container');
			this.canvas = document.getElementById('canvas');
			this.cloudnationLogo = document.getElementById('logo');

			this.ctx = canvas.getContext("2d");

			this.canvasWidth = this.canvas.width;
			this.canvasHeight= this.canvas.height;

			this.windowWidth = window.innerWidth;
			this.windowHeight= window.innerHeight; 

			this.onWindowResize(); 

			this.createStars();

			window.addEventListener('keydown', function(event) {

				if(event.keyCode != 27)
					return;

				if(this.container.style.opacity > 0)
					this.hideInterface()
				else
					this.showInterface();

			}.bind(this), false);

			window.addEventListener('resize', this.onWindowResize.bind(this), false );

			document.addEventListener('drop', this.onDocumentDrop.bind(this), false);

			document.addEventListener('dragover', this.onDocumentDragOver.bind(this), false);

			document.querySelector('#loaded').addEventListener('click', () => {
				if (this.audioData == null)
					return;

                this.hideInterface();

                if(!this.loadBackground)
                	this.decodeAndPlaySound(this.audioData);
                else
	                this.loadBackgroundImage(() => { 
	                	this.decodeAndPlaySound(this.audioData); 
	             });
			});

			window.requestAnimationFrame(this.render.bind(this));
		},

		hideInterface : function() {
			this.container.style.opacity = 0;
		},

		showInterface : function() {
			this.container.style.opacity = 1;
		},

		// Events

		audioData: null,

		onDocumentDrop: function(event) {

		    event.stopPropagation();
		    event.preventDefault();

		    if(event.dataTransfer.files[0]) {

		        var file = event.dataTransfer.files[0];

		        if(file.type == 'audio/ogg' 
		        	|| file.type == 'video/ogg'
		        	|| file.type == 'audio/mpeg'
		        	|| file.type == 'audio/mp3') {

		            var reader = new FileReader();

		            reader.onload = (fileEvent)  => {

		                this.audioData = fileEvent.target.result;

		                document.querySelector('#container h2').style.display = 'none';
		                document.querySelector('#loaded').style.display = 'flex';
		            };
		    
		            reader.readAsArrayBuffer(file);
		        }
		    }
		},

 		onDocumentDragOver: function(event) {

		    event.stopPropagation();
		    event.preventDefault();

		    return false;
		},

		onWindowResize: function(event) {

		    this.windowWidth = window.innerWidth;
		    this.windowHeight= window.innerHeight;    

		    this.canvas.width = this.windowWidth;
		    this.canvas.height = this.windowHeight;

		    this.canvas.style.width = this.windowWidth + 'px';
		    this.canvas.style.height = this.windowHeight + 'px';

		    this.canvasWidth = this.windowWidth;
		    this.canvasHeight= this.windowHeight;
		},

		// WebAudio and Sound loading

		setupAudioNodes: function() {

		    this.javascriptNode = this.context.createScriptProcessor(2048, 1, 1);
		    this.javascriptNode.connect(this.context.destination);
			this.javascriptNode.onaudioprocess = function() {

			    // get the average for the first channel
			    var audioFrequencies = new Float32Array(this.analyser.frequencyBinCount);

			    // Array length -> 256 [0-255] representing the frequency bands
			    // Array values -> [0-255]
			    this.analyser.getFloatFrequencyData(audioFrequencies);

			    this.audioFrequencies.unshift(audioFrequencies);

			    var maxAllowed = Math.max(this.redDelay, this.greenDelay, this.blueDelay);

			    if(this.audioFrequencies.length > maxAllowed + 1)
			    	this.audioFrequencies.pop();

			}.bind(this);

		    this.analyser = this.context.createAnalyser();
		    this.analyser.smoothingTimeConstant = 0.75;
		    this.analyser.fftSize = 2048;

		    this.analyser.connect(this.javascriptNode);
		},

		loadSound: function(sound_url) {

		    var request = new XMLHttpRequest();
		    request.open('GET', sound_url , true);
		    request.responseType = 'arraybuffer';
		    request.onload = function() {

		        if(!this.loadBackground)
		            this.decodeAndPlaySound(request.response);
		        else
		            this.loadBackgroundImage(function() { this.decodeAndPlaySound(request.response); }.bind(this));

		    }.bind(this);

		    request.send();
		},

		loadBackgroundImage: function(callback) {

		    var usRequest = new XMLHttpRequest();
		    usRequest.open('GET', '//api.unsplash.com/photos/random/?client_id=' + this.US_API_KEY + '&collections=176316', true);
		    usRequest.onload = function() {

		        var response = JSON.parse(usRequest.response);

		        if(response.urls.regular) {

		            var imgSrc = response.urls.regular;

		            var img = new Image();
		            img.onload = function () {

		                document.body.style.background = 'transparent url(\'' + response.urls.regular + '\') no-repeat';
		                document.body.style.backgroundSize = 'cover';

		                if(callback)
		                    callback();
		            }
		            img.src =  imgSrc;
		        }
		        else {

		            document.body.style.background = '#000';

		            if(callback)
		                callback();
		        }
		    };
		    usRequest.send();   
		},

		decodeAndPlaySound: function(response) {

		    if(this.sourceNode)
		        this.sourceNode.disconnect();

			this.context = new AudioContext();

			this.setupAudioNodes();
			
		    this.sourceNode = this.context.createBufferSource();
		    this.sourceNode.connect(this.analyser);
		    this.sourceNode.connect(this.context.destination);

		    this.context.decodeAudioData(response, function(buffer) {

		        this.sourceNode.buffer = buffer;
		        this.sourceNode.start(0);

		    }.bind(this), function(error) { console.log(error); });
		},

		// Starfield

		drawStarfield: function(ctx) {

		    this.drawStars(ctx);

		    for( var i=0; i< this.stars; i++ ) {

		        this.starData[i*4+2] -= this.starSpeed;
		        this.starData[i*4+0] = this.starData[i*4+0] + 0.5 * Math.sin(this.starData[i*4+2] / 256);
		        this.starData[i*4+1] = this.starData[i*4+1] + 0.5 * Math.sin(this.starData[i*4+2] / 256);

		        if (this.starData[i*4+2] < -this.dist) {

		            this.starData[i*4+2] = this.dist;
		            this.starData[i*4+0] = -1 * (Math.random() * this.dist)>>0;
		            this.starData[i*4+1] = (((Math.random() > .5) ? 1 : -1) * (Math.random() * this.dist))>>0;
		        }
		    }
		},

		createStars: function() {

		    var i;

		    for( i=0; i< this.stars*4; i++ ) 
		        this.starData.push(0);

		    for ( i = 0; i < this.stars; i++ ) {

		        this.starData[i*4+0] = -1 * (Math.random() * this.dist)>>0;
		        this.starData[i*4+1] = ((Math.random() > .5) ? 1 : -1) * (Math.random() * this.dist)>>0;
		        this.starData[i*4+2] = ((Math.random() > .5) ? 1 : -1) * (Math.random() * this.dist)>>0;

		        var d = Math.random();

		        if (d < .2)
		            this.starData[i*4+3] = 'rgba(255, 255, 255, 0.2)';
		        else if (d < .4)
		            this.starData[i*4+3] = 'rgba(255, 255, 255, 0.7)';
		        else if (d < .6)
		            this.starData[i*4+3] = 'rgba(255, 255, 255, 0.3)';
		        else if (d <.8 )
		            this.starData[i*4+3] = 'rgba(255, 255, 255, 0.5)';
		        else
		            this.starData[i*4+3] = 'rgba(255, 255, 255, 0.6)';
		    }
		},

		drawStars: function(ctx) {

		    var i,l;

		    for ( i = 0, l= this.stars; i < l; i++ ) {

		        var x = this.starData[i*4+0];
		        var y = this.starData[i*4+1];
		        var z = this.starData[i*4+2];

		        if (z > 0) {

		            var xp = ( this.canvasWidth >> 1 ) + (x * this.dist) / z;
		            var yp = ( this.canvasHeight >> 1 ) + (y * this.dist) / z;

		            var s= 5 * (1 - (z / this.dist));

		            ctx.fillStyle= this.starData[i*4+3];
		            ctx.beginPath();
		            ctx.arc(xp, yp, s,0,2*Math.PI);
		            ctx.fill();

		            ctx.beginPath();
		            ctx.arc(this.canvasWidth - xp, yp, s,0,2*Math.PI);
		            ctx.fill();
		        }
		    }
		},

		// Utilities

		degreesToRadians: function(degrees) { return (degrees * Math.PI)/180; },

		normalizeValue: function(value) {

		    if(!isFinite(value))
		        return 0;

		    var newValue = 256 - Math.abs(value) - this.cutoffValue;

		    if(newValue < 0)
		        newValue = 0;

		    return newValue * this.gainValue;
		},

		// Rendering

		render: function(timestamp) {

		    this.stats.begin();

		    if(!this.lastTS) {

		        this.lastTS = Date.now();

				window.requestAnimationFrame(this.render.bind(this));
		        return;
		    }

		    var deltaTS = timestamp - this.lastTS;
		    this.lastTS = timestamp;

		    if(this.currentFalloff > 0) {

		        this.currentFalloff -= deltaTS;

		        if(this.currentFalloff < 0) {

		            this.currentFalloff = 0;
		            this.currentScale = 1;
		            this.previousScale = 1;
		        }
		    }

		    if(this.audioFrequencies != undefined && this.audioFrequencies.length > 0 && isFinite(this.audioFrequencies[0][0]))  {

			    var soundKey 	= 0;
			    var soundKeyCnt = 0;

			    for(var keyIndex = this.minBeatFrequency; keyIndex < this.maxBeatFrequency + 1; keyIndex++) {

			    	soundKey += this.audioFrequencies[0][keyIndex];
			    	soundKeyCnt ++;
			    }

			    if(soundKeyCnt > 0)
				    soundKey = soundKey / soundKeyCnt;

			    var scaleFactor = 1.0;

			    if(soundKey >= this.beatDetectionTrigger) {

			    	var absSoundKey = Math.abs(soundKey);

		            this.previousScale = 1.0;
		            this.currentFalloff = this.beatScaleFalloff;
		            this.currentScale = this.beatScale;
		            this.starSpeed = 5;
			    }
			    else 
			    	this.starSpeed = 1;
		    }

		    if(this.currentFalloff > 0) {

		        var scaleSmooth = Smooth([this.currentScale, this.previousScale]);

		        scaleFactor = scaleSmooth(((this.beatScaleFalloff -  this.currentFalloff) / this.beatScaleFalloff));
		    }

		    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

		    this.drawStarfield(this.ctx);

		    this.drawSpectrum(scaleFactor, soundKey);

		   	this.stats.end();

			 window.requestAnimationFrame(this.render.bind(this));
		},

		drawSpectrum: function(scaleFactor, soundKey) {

		    if(this.showSpectrum && this.audioFrequencies != undefined && this.audioFrequencies.length > 0) {

		        this.ctx.save();

		        this.ctx.translate(0, 300);

		        for ( var i = 0; i < this.audioFrequencies[0].length; i++ ) {

			        this.ctx.fillStyle = 'red';
		            this.ctx.fillRect(i * 10 + 10, 0, 5, this.audioFrequencies[0][i]);      

		            if(i >= this.minBeatFrequency && i <= this.maxBeatFrequency) {

			           	this.ctx.fillStyle = 'white';
			            this.ctx.fillRect(i * 10 + 10, soundKey, 5, 1);      		            
		            }

		           	this.ctx.fillStyle = 'yellow';
		            this.ctx.fillRect(i * 10 + 10, this.beatDetectionTrigger, 5, 1);      		            

		        }

		        this.ctx.restore();
		    }
		    
		    this.ctx.save();

		    this.ctx.translate(this.canvasWidth/2, this.canvasHeight/2);

		    this.ctx.scale(scaleFactor, scaleFactor);

		    var points = [];
		    var pointsMirror = [];

		    var pointsR = [];
		    var pointsMirrorR = [];

		    var pointsG = [];
		    var pointsMirrorG = [];

		    var pointsB = [];
		    var pointsMirrorB = [];

		    if(this.audioFrequencies != undefined && this.audioFrequencies.length > 0) {

			    var angle = 180 / (2 + this.endFrequency - this.startFrequency);
			    var index = 0;

		        var x0 = this.radius * Math.cos(index * this.degreesToRadians(angle));
		        var y0 = this.radius * Math.sin(index * this.degreesToRadians(angle));

		        points.push(x0, y0);
		        pointsMirror.push(x0, -y0);
		        pointsR.push(x0, y0);
		        pointsMirrorR.push(x0, -y0);
		        pointsG.push(x0, y0);
		        pointsMirrorG.push(x0, -y0);
		        pointsB.push(x0, y0);
		        pointsMirrorB.push(x0, -y0);

			    index++;

			    for ( var i = this.startFrequency; i < this.endFrequency + 1; i++ ) {

			        var value = this.normalizeValue(this.audioFrequencies[0][i]);

			        var xW = (this.radius + value) * Math.cos(index * this.degreesToRadians(angle));
			        var yW = (this.radius + value) * Math.sin(index * this.degreesToRadians(angle));

			        points.push(xW, yW);
			        pointsMirror.push(xW, -yW);

			        if(this.audioFrequencies[this.redDelay]) {

				        var valueR = this.normalizeValue(this.audioFrequencies[this.redDelay][i]) * 1.2;

				        var xR = (this.radius + valueR) * Math.cos(index * this.degreesToRadians(angle));
				        var yR = (this.radius + valueR) * Math.sin(index * this.degreesToRadians(angle));

				        pointsR.push(xR, yR);
				        pointsMirrorR.push(xR, -yR);
				    }

				   if(this.audioFrequencies[this.greenDelay]) {

				         var valueG = this.normalizeValue(this.audioFrequencies[this.greenDelay][i]) * 1.7;

				        var xG = (this.radius + valueG) * Math.cos(index * this.degreesToRadians(angle));
				        var yG = (this.radius + valueG) * Math.sin(index * this.degreesToRadians(angle));

				        pointsG.push(xG, yG);
				        pointsMirrorG.push(xG, -yG);
					}

				    if(this.audioFrequencies[this.blueDelay]) {

				        var valueB = this.normalizeValue(this.audioFrequencies[this.blueDelay][i]) * 1.4;

				        var xB = (this.radius + valueB) * Math.cos(index * this.degreesToRadians(angle));
				        var yB = (this.radius + valueB) * Math.sin(index * this.degreesToRadians(angle));

				        pointsB.push(xB, yB);
				        pointsMirrorB.push(xB, -yB);
				    }

			        index++;
			    }

		        var xF = this.radius * Math.cos(index * this.degreesToRadians(angle));
		        var yF = this.radius * Math.sin(index * this.degreesToRadians(angle));

		        points.push(xF, yF);
		        pointsMirror.push(xF, -yF);
		        pointsR.push(xF, yF);
		        pointsMirrorR.push(xF, -yF);
		        pointsG.push(xF, yF);
		        pointsMirrorG.push(xF, -yF);
		        pointsB.push(xF, yF);
		        pointsMirrorB.push(xF, -yF);		    	
		    }

		    this.ctx.save();

		    this.ctx.rotate(this.degreesToRadians(-90));

		    if(scaleFactor > 1) {

		      this.ctx.shadowColor = 'rgba(' + this.glowColor.r + ',' + this.glowColor.g + ',' + this.glowColor.b + ',' + this.glowColor.a + ')';
		      this.ctx.shadowBlur = 5 * (scaleFactor * 100 - 100);
		    }

		    if(pointsG.length > 0) {

			    this.ctx.beginPath();
			    this.ctx.curve(pointsG);
			    this.ctx.curve(pointsMirrorG);
			    this.ctx.fillStyle='#00ff00';
			    this.ctx.fill();
		    }

		    if(pointsB.length > 0) {

			    this.ctx.beginPath();
			    this.ctx.curve(pointsB);
			    this.ctx.curve(pointsMirrorB);
			    this.ctx.fillStyle='#0000ff';
			    this.ctx.fill();
		    }

		    if(pointsR.length > 0) {

			    this.ctx.beginPath();
			    this.ctx.curve(pointsR);
			    this.ctx.curve(pointsMirrorR);
			    this.ctx.fillStyle='#ff0000';
			    this.ctx.fill();
		    }

		    this.ctx.beginPath();
		    this.ctx.curve(points);
		    this.ctx.curve(pointsMirror);
		    this.ctx.fillStyle="#ffffff";;
		    this.ctx.fill();

		    this.ctx.restore();

		    this.ctx.beginPath();
		    this.ctx.arc(0, 0, this.radius, 0, 2 * Math.PI, false);
		    this.ctx.fillStyle = '#ffffff';
		    this.ctx.fill();

		    this.ctx.drawImage(this.cloudnationLogo, - 150, - 150);

		    this.ctx.restore();
		}
	};

	window.Cloudnation = Cloudnation;

})();

document.addEventListener('DOMContentLoaded', function() { 

	Cloudnation.initialize(); 

	var gui = new dat.GUI();
	gui.add(Cloudnation, 'showSpectrum');
	gui.add(Cloudnation, 'loadBackground');

	var f1 = gui.addFolder('Circle Visualization');
	f1.add(Cloudnation, 'startFrequency', 0, 255).step(1);
	f1.add(Cloudnation, 'endFrequency', 0, 255).step(1);
	f1.add(Cloudnation, 'cutoffValue', 0, 255);
	f1.add(Cloudnation, 'gainValue', 1, 10);

	f1.add(Cloudnation, 'redDelay', 0, 10);
	f1.add(Cloudnation, 'greenDelay', 0, 10);
	f1.add(Cloudnation, 'blueDelay', 0, 10);

	var f2 = gui.addFolder('Beat detection');
	f2.add(Cloudnation, 'minBeatFrequency', 0, 255).step(1);
	f2.add(Cloudnation, 'maxBeatFrequency', 0, 255).step(1);
	f2.add(Cloudnation, 'beatDetectionTrigger', -255, 0);
	f2.add(Cloudnation, 'beatScaleFalloff', 0, 1000);
	f2.add(Cloudnation, 'beatScale', 1, 10);

	gui.closed = true;

}, false);
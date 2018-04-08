"use strict";

var hold = false;
$(function() {
	$("#hold").change(function(ev){
		hold = ev.target.checked;
	});
});

receive_audio()	
.catch(function(e) { alert(""+e); }); 

async function receive_audio() {
	if (navigator.mediaDevicess) throw new Error("getUserMedia not supported");
	
	var devices = await navigator.mediaDevices.enumerateDevices()
	var audio_input_devices = devices.filter((d) => { 
		console.log("device", d.kind, d.label, d.deviceId);
		return d.kind === 'audioinput'
	});

	var stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: audio_input_devices[0].deviceId } });
	
	/*
	audioElnt.srcObject = stream;
	audioElnt.onloadedmetadata = function(e) { audioElnt.play(); };
	*/
	
	var audioCtx = new AudioContext();
	var source = audioCtx.createMediaStreamSource(stream);
	console.log("audio context sampleRate: ", audioCtx.sampleRate);
	
	function analyser_display() {
		var analyser = audioCtx.createAnalyser();
		analyser.fftSize = 32;
		analyser.maxDecibels = 0;
		var bufferLength = analyser.frequencyBinCount;
		var dataArray = new Uint8Array(bufferLength);
		source.connect(analyser);

		// Draw to canvas
		var canvas = document.getElementById("oscilloscope");
		var canvasCtx = canvas.getContext("2d");
		var sliceWidth = Math.floor(canvas.width/(bufferLength+1));
		function analyser_draw() {
			// ??
			// var drawVisual = requestAnimationFrame(draw);
				
			//analyser.getByteTimeDomainData(dataArray);
			analyser.getByteFrequencyData(dataArray);

			canvasCtx.fillStyle = 'white';
			canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
			
			canvasCtx.lineWidth = "1px";
			canvasCtx.strokeStyle = 'red';
			
			canvasCtx.beginPath();
			var x = sliceWidth/2;
			for (var i=0; i<bufferLength; i++) {
				var y = dataArray[i] * canvas.height / 256.;
				canvasCtx.moveTo(x, 0);
				canvasCtx.lineTo(x, y);

				if (i === 0) canvasCtx.strokeStyle = 'grey';
				x += sliceWidth;
			}
			canvasCtx.stroke();
		};
		return analyser_draw;
	}
	var analyser_draw = analyser_display();

	// ScriptProcessorNode with bufferSize of 4096, a single input and no output channel
	var scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
	console.log("scriptProcessor.bufferSize", scriptProcessor.bufferSize);

	var dataframe;
	scriptProcessor.onaudioprocess = function(e) {
		if (hold) 
			return;

		//console.log(e.inputBuffer);
		var inputData = e.inputBuffer.getChannelData(0); // mono channel
		//console.log([...inputData]);
		var data = [...inputData];
		var min = data.reduce((acc,x) => Math.min(acc, x), 0.0);
		var max = data.reduce((acc,x) => Math.max(acc, x), 0.0);

		console.log(min, max);
		if (min<-0.7 && max>0.7) {
			if (!dataframe) {
				// start new dataframe
				console.log("start new dataframe");
				dataframe = [];
			}
		}
		if (dataframe) {
			console.log("frame");
			//data = data.map(x => Math.round((x+1.0)*(3/2)));
			dataframe = dataframe.concat(data);
		}
		if (dataframe && (dataframe.length>100000 || (min>-0.05 & max<0.05))) {
			// end of dataframe
			console.log("end of dataframe");
			plot(dataframe);
			dataframe = undefined;
			$("#hold").attr("checked", true);
			hold = true;
		}
		
		analyser_draw();
		
    };

	source.connect(scriptProcessor);
	scriptProcessor.connect(audioCtx.destination);
}

var s_convolution_samples;
function convolution_samples() {
	if (!s_convolution_samples)
		s_convolution_samples = [
			sample_none, quadra_none, 
			sample_vals[0], quadra_vals[0], 
			sample_vals[1], quadra_vals[1] ];
	return s_convolution_samples;
}

function plot(data) {
	var n = data.length - sample_size;

	var none = [];
	var val0 = [];
	var val1 = [];

	var convol_samples = convolution_samples();
	var tmp = new Array(convol_samples.length).fill(0);
	for (var k=0; k<sample_size; k++) {
		for (var j=0; j<convol_samples.length; j++)
			tmp[j] += convol_samples[j][k] * data[k];
	}

	for (var iStart=0; iStart<n; iStart++) {
		if (modulation_used == "psk") {
			// phase shifting modulation
			none.push(tmp[0]*tmp[0]+tmp[1]*tmp[1]);
			val0.push(tmp[2]);
			val1.push(tmp[3]);
		} else {
			// frequency shifting modulation
			none.push(tmp[0]*tmp[0]+tmp[1]*tmp[1]);
			val0.push(tmp[2]*tmp[2]+tmp[3]*tmp[3]);
			val1.push(tmp[4]*tmp[4]+tmp[5]*tmp[5]);
		}
		for (var j=0; j<convol_samples.length; j++) {
			var w = convol_samples[j][iStart%sample_size];
			tmp[j] -= w * data[iStart];
			tmp[j] += w * data[iStart+sample_size]
		}
	}


	Highcharts.chart('container', {
		chart: {
			zoomType: 'x'
		},

		title: {
			text: 'Audio Received'
		},

		tooltip: {
			valueDecimals: 2
		},

		series: [{
			data: data,
			lineWidth: 0.5,
			name: 'audio'
		}, {
			data: none,
			name: 'none'
		}, {
			data: val0,
			name: 'val0'
		}, {
			data: val1,
			name: 'val1'
		}]

	});
}
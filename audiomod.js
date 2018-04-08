"use strict";

$(function() {
	$("#start").click(function(ev) {
		setTimeout(diffuse_audio, 0 * 1000);
	});
});

function get_bit_stream() {	
	var data = "les modems 56 kbit/s sont concus pour travailler dans l'environnement des reseaux numeriques"
		//+ "ils utilisent la modulation par impulsions codees (PCM, Pulse Code Modulation) pour convertir le signal module en sequence numerique"
		//+ "l'amplitude est mesuree 8 000 fois par seconde, avec une resolution de 8 bits ; le debit theorique devrait atteindre 64 kbit/s, "
		//+ "mais le debit reel se situe generalement entre 40 et 56 kbit/s, selon l'etat de la ligne de transmission.";
	
	console.log("data", "#"+data.length, data);
	
	/*
	var b64r = btoa(data);  // base 64 raw
	var b64s = b64r.replace(/=/g,"");  // base 64 strip of trqiling equals
	var test = atob(b64s) // still works 
	var b64c = Array.from(b64s);  // base 64 as array of chars
	var b64d = b64c.map( c => { // base 64 as array of numbers
		var x = c.charCodeAt(0); 
		if (x>=97 && x<(97+26)) return x-97+26;  // a-z 
		if (x>=65 && x<(65+26)) return x-65;     // A-Z
		if (x>=48 && x<(48+10)) return x-48+52;  // 0-9
		throw new Error("not a base64 char");
		});
	*/

	var n = data.length;
	var bs = new Array(8*n); 
	var b = 0;
	for (var i=0; i<n; i++) {
			var c = data.charCodeAt(i);
			bs[b++] = (0x0001 & c); 
			bs[b++] = (0x0002 & c)>>1;
			bs[b++] = (0x0004 & c)>>2;
			bs[b++] = (0x0008 & c)>>3;
			bs[b++] = (0x0010 & c)>>4;
			bs[b++] = (0x0020 & c)>>5;
			bs[b++] = (0x0040 & c)>>6;
			bs[b++] = (0x0080 & c)>>7;
			if (0xFF00 & c) throw new Error("byte greater than 256"); 
	}
	console.log("data bit stream", "#"+bs.length, bs);
	return bs;
}

const modulation_used = "psk"; 
const nb_repeat = 2;
const sample_lcm = 64; // lowest common multiple (between the different wave period used for frequency modulation could be 5*6 or 4*8)
const sample_size = nb_repeat * sample_lcm;
var sample_none = new Array(sample_size).fill(0).map((x,i) => Math.sin(2*Math.PI * 2 * i/sample_lcm)); 
var quadra_none = new Array(sample_size).fill(0).map((x,i) => Math.cos(2*Math.PI * 2 * i/sample_lcm)); 
var sample_vals, quadra_vals;
if (modulation_used == "psk") {
	// phase_shifting modulation
	sample_vals = [
		new Array(sample_size).fill(0).map((x,i) => Math.sin(2*Math.PI * 4 * i/sample_lcm)),
		new Array(sample_size).fill(0).map((x,i) => Math.sin(2*Math.PI * 8 * i/sample_lcm)),
		];
	quadra_vals = [
		new Array(sample_size).fill(0).map((x,i) => Math.cos(2*Math.PI * 4 * i/sample_lcm)),
		new Array(sample_size).fill(0).map((x,i) => Math.cos(2*Math.PI * 8 * i/sample_lcm)),
		];
} else { 
	// frequency shifting modulation
	sample_vals = [
		new Array(sample_size).fill(0).map((x,i) => Math.sin(2*Math.PI * 4 * i/sample_lcm)),
		new Array(sample_size).fill(0).map((x,i) => -Math.sin(2*Math.PI * 4 * i/sample_lcm)),
		];
	quadra_vals = [
		new Array(sample_size).fill(0).map((x,i) => Math.cos(2*Math.PI * 4 * i/sample_lcm)),
		new Array(sample_size).fill(0).map((x,i) => -Math.cos(2*Math.PI * 4 * i/sample_lcm)),
		];
}

var audioCtx;
function diffuse_audio() {
	var bs = get_bit_stream();
	
	console.log("creating audio context");
	audioCtx = audioCtx || (new (window.AudioContext || window.webkitAudioContext)());	
	console.log("audio context sampleRate: ", audioCtx.sampleRate);

	console.log("audio sample buffer begin");
	var nbChannels = 1, buffLength = audioCtx.sampleRate * 3; // 3 seconds
	var buffers = audioCtx.createBuffer(nbChannels, buffLength, audioCtx.sampleRate);
	if (buffers.numberOfChannels!=1) throw new Error("buffers.numberOfChannels!=1");
	var buffer = buffers.getChannelData(0); // channel 0
	
	var i=0; 
	var nb_padding_repeat = 50;
	for (var bp=0; bp<nb_padding_repeat; bp++) {
		for (var k=0; k<sample_size && i<buffLength; k++, i++) 
			buffer[i] = sample_none[k];
	}
	for (var b=0; b<bs.length && i<buffLength; b++) {
		var sample_val = sample_vals[bs[b]];
		for (var k=0; k<sample_size; k++, i++) 
			buffer[i] = sample_val[k];
	}
	for (var bp=0; bp<nb_padding_repeat; bp++) {
		for (var k=0; k<sample_size && i<buffLength; k++, i++) 
			buffer[i] = sample_none[k];
	}
	
	if (i==buffLength) throw new Error("reached buffer capacity at byte "+b+"/"+bs.length);
	console.log("buffer done");

	plot_audio_mod(buffer)
	console.log("plot_audio_mod done");

	var source = audioCtx.createBufferSource();
	source.buffer = buffers;
	
	/*
	function modulateSquareSignal(squareSignalSource) {
		var oscillator = audioCtx.createOscillator();
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(440, 0); // 0or audioCtx.currentTime ??
		oscillator.connect(audioCtx.destination)
		oscillator.start(0);

		// multiplier : source times sinusoide
		var multiplyNode = audioCtx.createGain();
		oscillator.connect(multiplyNode);
		squareSignalSource.connect(multiplyNode.gain); // !! gain is a function of times

		return multiplyNode;
	}
	*/
	
	/*
	function addRepeat(sourceNode) {
		var gainNode = audioCtx.createGain();
		gainNode.gain.setValueAtTime(0.5, 0);
		sourceNode.connect(gainNode);

		var delayNode = audioCtx.createDelay(3); // delay in seconds
		gainNode.connect(delayNode);

		var mergeNode = audioCtx.createChannelMerger(2); // nb input
		sourceNode.connect(mergeNode, 0, 0); // source output id, destination input id
		delayNode.connect(mergeNode, 0, 0);
 		
		return mergeNode;
	}
	*/

	source.connect(audioCtx.destination);
	// -- or -- 
	// modulateSquareSignal(source).connect(audioCtx.destination);
	// -- or -- 
	// addRepeat(source).connect(audioCtx.destination);
	
	source.start();
}

function plot_audio_mod(data) {
	Highcharts.chart('container', {
		chart: {
			zoomType: 'x'
		},

		title: {
			text: 'Audio Modulated Signal'
		},

		tooltip: {
			valueDecimals: 2
		},

		series: [{
			data: data,
			lineWidth: 0.5,
			name: 'audio'
		}]

	});
}

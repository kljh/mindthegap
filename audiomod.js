var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

var nbChannels = 1, buffLength = audioCtx.sampleRate * 3; // 3 seconds
var myArrayBuffer = audioCtx.createBuffer(nbChannels, buffLength, audioCtx.sampleRate);

var data = "sdf,sn,mn,mn,mn,sdnmf,smdfn,smdnf,mnsf,mnmn,m,nsf,mn,sdmfn,smndf,smndf,snmd,fnm,msnf,mnsdqqwueyqwuyeturtqqaazxZZZ";

// Fill the buffer with white noise;
// just random values between -1.0 and 1.0
for (var channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
  // This gives us the actual ArrayBuffer that contains the data
  var nowBuffering = myArrayBuffer.getChannelData(channel);
  for (var i = 0; i < myArrayBuffer.length; i++) {
    // Math.random() is in [0; 1.0]
    // audio needs to be in [-1.0; 1.0]
    nowBuffering[i] = ( data.charCodeAt( i % data.length )  - 'm'.charCodeAt(0) ) / 256; //Math.random() * 2 - 1;
  }
}

// Get an AudioBufferSourceNode.
// This is the AudioNode to use when we want to play an AudioBuffer
var source = audioCtx.createBufferSource();
// set the buffer in the AudioBufferSourceNode
source.buffer = myArrayBuffer;
// connect the AudioBufferSourceNode to the
// destination so we can hear the sound
source.connect(audioCtx.destination);
// start the source playing
source.start();
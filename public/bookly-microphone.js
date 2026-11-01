// Collect 100 ms PCM frames off the UI thread. Audio is never played back locally.
class BooklyMicrophone extends AudioWorkletProcessor {
 constructor(){super();this.frame=new Float32Array(Math.round(sampleRate/10));this.offset=0;}
 process(inputs){
  const input=inputs[0]?.[0];if(input)for(const sample of input){this.frame[this.offset++]=sample;if(this.offset===this.frame.length){this.port.postMessage(this.frame,[this.frame.buffer]);this.frame=new Float32Array(Math.round(sampleRate/10));this.offset=0;}}
  return true;
 }
}
registerProcessor('bookly-microphone',BooklyMicrophone);

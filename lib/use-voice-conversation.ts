'use client';
import {useEffect,useRef,useState} from 'react';
import {pcm16,VoiceTurns} from './voice-turns';
type VoiceOptions={onTurn:(text:string)=>Promise<void>;onText:(text:string)=>void;onError:(message:string)=>void;isBlocked:()=>boolean};
export function useVoiceConversation(options:VoiceOptions){
 const [enabled,setEnabled]=useState(false),[connecting,setConnecting]=useState(false);
 const latest=useRef(options);latest.current=options;
 const current=useRef<{id:number;active:boolean;stream?:MediaStream;context?:AudioContext;socket?:WebSocket;node?:AudioWorkletNode;source?:MediaStreamAudioSourceNode;mute?:GainNode;turns?:VoiceTurns;abort:AbortController;idle?:ReturnType<typeof setTimeout>;limit?:ReturnType<typeof setTimeout>}|null>(null);
 const generation=useRef(0);
 function stop(){
  generation.current++;const c=current.current;current.current=null;
  if(c){c.active=false;c.abort.abort();c.turns?.stop();c.stream?.getTracks().forEach(t=>t.stop());c.socket?.close();c.source?.disconnect();c.node?.disconnect();c.mute?.disconnect();void c.context?.close().catch(()=>{});if(c.idle)clearTimeout(c.idle);if(c.limit)clearTimeout(c.limit);}
  setEnabled(false);setConnecting(false);latest.current.onText('');
 }
 function fail(message:string){stop();latest.current.onError(message);}
 async function start(){
  if(current.current?.active)return;
  const id=++generation.current,c={id,active:true,abort:new AbortController()} as NonNullable<typeof current.current>;current.current=c;setConnecting(true);setEnabled(true);
  const stillActive=()=>current.current===c&&c.active&&generation.current===id;
  const touch=()=>{if(c.idle)clearTimeout(c.idle);c.idle=setTimeout(()=>{if(stillActive())fail('Voice paused after two minutes without speech. Tap the microphone to reconnect.')},120000)};
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.AudioContext)throw Error('This browser does not support hands-free audio. You can keep chatting by text.');
   c.context=new AudioContext();await c.context.resume();
   c.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
   if(!stillActive()){c.stream.getTracks().forEach(t=>t.stop());return;}
   const response=await fetch('/api/voice/token',{method:'POST',signal:c.abort.signal});const data=await response.json() as {token?:string;error?:string};
   if(!response.ok||!data.token)throw Error(data.error||'Could not start realtime speech.');
   if(!stillActive())return;
   const params=new URLSearchParams({model_id:'scribe_v2_realtime',token:data.token,audio_format:'pcm_16000',commit_strategy:'vad',vad_silence_threshold_secs:'1.1',min_speech_duration_ms:'150',min_silence_duration_ms:'150',language_code:'en'});
   c.socket=new WebSocket('wss://api.elevenlabs.io/v1/speech-to-text/realtime?'+params);
   c.turns=new VoiceTurns({onTurn:async text=>{touch();await latest.current.onTurn(text);touch()},onText:text=>latest.current.onText(text),onError:e=>latest.current.onError(e instanceof Error?e.message:'Voice turn failed.'),isBlocked:()=>latest.current.isBlocked()});
   await new Promise<void>((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Realtime speech connection timed out. Tap the microphone to retry.')),15000);
    c.socket!.onerror=()=>{clearTimeout(timeout);if(stillActive())fail('Realtime speech connection failed. Text chat is still available.');reject(Error('Realtime speech connection failed.'))};
    c.socket!.onclose=()=>{clearTimeout(timeout);if(stillActive())fail('Voice disconnected. Tap the microphone to reconnect.');reject(Error('Voice disconnected.'))};
    c.socket!.onmessage=event=>{
     if(!stillActive())return;
     let message:{message_type:string;text?:string;error?:string};try{message=JSON.parse(event.data)}catch{return}
     if(message.message_type==='session_started'){clearTimeout(timeout);resolve();return;}
     if(message.message_type==='partial_transcript'){if(message.text?.trim())touch();c.turns?.partial(message.text||'');}
     else if(message.message_type==='committed_transcript'){touch();c.turns?.commit(message.text||'');}
     else if(message.message_type.endsWith('_error')||['error','auth_error','quota_exceeded','rate_limited','resource_exhausted','session_time_limit_exceeded','input_error','transcriber_error','insufficient_audio_activity'].includes(message.message_type)){clearTimeout(timeout);fail('Speech provider ended the session ('+message.message_type+'). Tap the microphone to retry.');reject(Error('Speech session ended.'));}
    };
   });
   if(!stillActive())return;
   await c.context.audioWorklet.addModule('/bookly-microphone.js');if(!stillActive())return;
   c.source=c.context.createMediaStreamSource(c.stream);c.node=new AudioWorkletNode(c.context,'bookly-microphone');c.mute=c.context.createGain();c.mute.gain.value=0;c.source.connect(c.node);c.node.connect(c.mute);c.mute.connect(c.context.destination);
   c.node.port.onmessage=event=>{
    if(!stillActive()||c.socket?.readyState!==WebSocket.OPEN)return;
    // Keep the connection alive with silence while Bea replies. This prevents her
    // own speaker audio becoming another customer turn. Interrupt is explicit.
    const samples=event.data as Float32Array;const blocked=latest.current.isBlocked()||!!c.turns?.processing;
    const bytes=blocked?new Uint8Array(3200):pcm16(samples,c.context!.sampleRate);
    let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    if(c.socket.bufferedAmount>256000){fail('The voice connection fell behind. Please reconnect.');return;}
    c.socket.send(JSON.stringify({message_type:'input_audio_chunk',audio_base_64:btoa(binary),sample_rate:16000}));
   };
   setConnecting(false);touch();c.limit=setTimeout(()=>{if(stillActive())fail('This voice session reached ten minutes. Tap the microphone to start another.')},600000);
  }catch(e){if(stillActive())fail(e instanceof Error?e.message:'Could not access the microphone.');}
 }
 useEffect(()=>{const hide=()=>{if(document.hidden&&current.current?.active)stop()};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);const c=current.current;if(c){c.active=false;c.abort.abort();c.turns?.stop();c.stream?.getTracks().forEach(t=>t.stop());c.socket?.close();c.node?.disconnect();c.source?.disconnect();c.mute?.disconnect();void c.context?.close().catch(()=>{});if(c.idle)clearTimeout(c.idle);if(c.limit)clearTimeout(c.limit);}}},[]);
 return {enabled,connecting,start,stop,isActive:()=>!!current.current?.active};
}

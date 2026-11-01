/** Coordinates committed speech turns without giving speech consent to perform order actions. */
type VoiceTurnOptions={onTurn:(text:string)=>Promise<void>;onText:(text:string)=>void;onError:(e:unknown)=>void;isBlocked:()=>boolean;graceMs?:number};
export class VoiceTurns {
 private options:VoiceTurnOptions;
 private buffer:string[]=[];
 private timer:ReturnType<typeof setTimeout>|null=null;
 private stopped=false;
 processing=false;
 constructor(options:VoiceTurnOptions){this.options=options}
 partial(text:string){if(!this.stopped&&!this.processing&&!this.options.isBlocked())this.options.onText([...this.buffer,text.trim()].filter(Boolean).join(' '));}
 commit(text:string){
  const value=text.trim();if(!value||this.stopped||this.processing||this.options.isBlocked())return;
  if(this.buffer.at(-1)!==value)this.buffer.push(value);
  this.options.onText(this.buffer.join(' '));
  if(this.timer)clearTimeout(this.timer);
  this.timer=setTimeout(()=>{this.timer=null;void this.flush()},this.options.graceMs??250);
 }
 private async flush(){
  if(this.stopped||this.processing||this.options.isBlocked()){this.buffer=[];return;}
  const text=this.buffer.join(' ').trim();this.buffer=[];if(!text)return;
  this.processing=true;
  try{await this.options.onTurn(text)}catch(e){this.options.onError(e)}finally{this.processing=false;}
 }
 stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.timer=null;this.buffer=[];}
}
export function pcm16(samples:Float32Array,inputRate:number,outputRate=16000):Uint8Array{
 const ratio=inputRate/outputRate,length=Math.floor(samples.length/ratio),out=new Uint8Array(length*2),view=new DataView(out.buffer);
 for(let i=0;i<length;i++){
  const start=Math.floor(i*ratio),end=Math.min(samples.length,Math.max(start+1,Math.floor((i+1)*ratio)));let sum=0;
  for(let j=start;j<end;j++)sum+=samples[j];const v=Math.max(-1,Math.min(1,sum/(end-start)));
  view.setInt16(i*2,v<0?v*32768:v*32767,true);
 }
 return out;
}

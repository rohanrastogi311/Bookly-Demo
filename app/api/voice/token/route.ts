import {sameOrigin,session,json,failure} from '@/lib/http';
import {config} from '@/lib/agent';
export async function POST(req:Request){try{
 sameOrigin(req);await session(req);const key=config().ELEVENLABS_API_KEY;
 if(!key)return json({error:'ElevenLabs is not connected. Text chat remains available.'},503);
 const r=await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',{method:'POST',headers:{'xi-api-key':key},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(`Realtime speech setup returned ${r.status}. Check ElevenLabs access and credits.`);
 const d=await r.json() as {token?:string};if(!d.token)throw Error('Speech provider returned no session token.');
 // Only an expiring, single-use STT credential reaches the browser. Never the API key.
 return json({token:d.token});
}catch(e){return failure(e,502)}}

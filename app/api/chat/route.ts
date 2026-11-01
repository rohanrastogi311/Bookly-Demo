import {session,sameOrigin,json,failure} from '@/lib/http';
import {saveSession} from '@/lib/store';
import {isConfirmationFollowup} from '@/lib/confirmation';
import {runAgent} from '@/lib/agent';
export async function POST(req:Request){try{sameOrigin(req);const body=await req.json() as {message?:string};if(typeof body.message!=='string'||!body.message.trim()||body.message.length>2000)return json({error:'Enter a message between 1 and 2,000 characters.'},400);const s=await session(req);if(s.state.messages.length>=100)return json({error:'This demo conversation has reached 100 messages. Start a new conversation.'},400);
 // Keep approval/help turns tied to the current proposal. A change of choice invalidates it before external calls.
 if(s.state.pending&&!isConfirmationFollowup(body.message,s.state.pending))s.state.pending=null;s.state.messages.push({role:'user',content:body.message.trim()});await saveSession(s);const started=Date.now();
 try{const result=await runAgent(s,body.message);s.state.messages.push({role:'assistant',content:result.content});await saveSession(s);return json({state:s.state,mode:result.mode,durationMs:Date.now()-started});}
 catch(e){s.state.pending=null;await saveSession(s);return json({error:e instanceof Error?e.message:'The provider did not respond.',state:s.state},502);}
 }catch(e){return failure(e)}}

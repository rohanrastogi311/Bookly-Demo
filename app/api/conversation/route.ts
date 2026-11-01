import {session,sameOrigin,json,failure} from '@/lib/http';
import {saveSession} from '@/lib/store';
import {startConversation} from '@/lib/domain';
export async function POST(req:Request){try{sameOrigin(req);const body=await req.json() as {rehearsal?:boolean};const s=await session(req);startConversation(s.state);if(typeof body.rehearsal==='boolean')s.state.rehearsal=body.rehearsal;await saveSession(s);return json({state:s.state});}catch(e){return failure(e)}}

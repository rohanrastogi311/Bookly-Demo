import {session,owner,createSession,sessionCookie,sameOrigin,json,failure} from '@/lib/http';
import {saveSession} from '@/lib/store';
/** Demo-only: switch to fresh isolated account fixtures; never touch provider credentials. */
export async function POST(req:Request){try{sameOrigin(req);const previous=await session(req);const s=await createSession(owner(req));s.state.rehearsal=!!previous.state.rehearsal;await saveSession(s);return json({state:s.state},200,{'Set-Cookie':sessionCookie(s.id,req)});}catch(e){return failure(e)}}

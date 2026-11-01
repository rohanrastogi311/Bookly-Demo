import {sameOrigin,json,failure,createSession,owner,sessionCookie,session} from '@/lib/http';
import {saveSession} from '@/lib/store';
import type {Scenario} from '@/lib/domain';
export async function POST(req:Request){try{sameOrigin(req);const {scenario,rehearsal}=await req.json() as {scenario:Scenario;rehearsal?:boolean};if(!['birthday','cutoff','shipped','security'].includes(scenario))throw Error('Unknown scenario.');let previous=false;try{previous=!!(await session(req)).state.rehearsal}catch{}const s=await createSession(owner(req),scenario);s.state.rehearsal=typeof rehearsal==='boolean'?rehearsal:previous;await saveSession(s);return json({state:s.state},200,{'Set-Cookie':sessionCookie(s.id,req)});}catch(e){return failure(e)}}

import {cookieId,owner,sessionCookie,json,failure,createSession} from '@/lib/http';
import {loadSession,stock,saveSession} from '@/lib/store';
import {BOOKS,orders,POLICY,unifyAccount} from '@/lib/domain';
import {config} from '@/lib/agent';
export async function GET(req:Request){try{const id=cookieId(req);let s=(id?await loadSession(id,owner(req)):null)||await createSession(owner(req));if(!s.state.demoVersion)s=await createSession(owner(req));if(!s.state.accountOrders){unifyAccount(s.state);await saveSession(s);}return json({state:s.state,revision:s.revision,books:BOOKS,orders:orders(s.state),inventory:await stock(s),policy:POLICY,capabilities:{ai:!!config().OPENAI_API_KEY,voice:!!config().ELEVENLABS_API_KEY,model:config().OPENAI_MODEL||'gpt-4.1-mini'}},200,{'Set-Cookie':sessionCookie(s.id,req)});}catch(e){return failure(e,500)}}

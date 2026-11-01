import {createSession,loadSession,type Session} from './store';
export function cookieId(req:Request){return /(?:^|;\s*)bookly_session=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.get('cookie')||'')?.[1];}
export function owner(req:Request){return req.headers.get('oai-authenticated-user-id')||'private-site-preview';}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('Cross-origin requests are not allowed.');}
export async function session(req:Request):Promise<Session>{const id=cookieId(req);const s=id?await loadSession(id,owner(req)):null;if(!s)throw Error('Session expired. Refresh the page.');return s;}
export function sessionCookie(id:string,req:Request){const secure=new URL(req.url).protocol==='https:'||req.headers.get('x-forwarded-proto')==='https';return `bookly_session=${id}; HttpOnly; ${secure?'Secure; ':''}SameSite=Lax; Path=/; Max-Age=604800`;}
export function json(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});}
export function failure(e:unknown,status=400){return json({error:e instanceof Error?e.message:'Request failed.'},status);}
export {createSession};

import {env} from 'cloudflare:workers';
import {BOOKS,seedState,type State,type Scenario,type Receipt,validateProposal,quoteBook,book,money,unifyAccount} from './domain';
export function db(){if(!env.DB)throw Error('Database is not configured.');return env.DB;}
export type Session={id:string;owner:string;revision:number;state:State};
export async function createSession(owner:string,scenario:Scenario='account'):Promise<Session>{
 const id=crypto.randomUUID(),now=new Date().toISOString(),state=seedState(scenario);if(scenario==='account')unifyAccount(state);
 await db().batch([db().prepare('INSERT INTO sessions(id,owner,revision,state,created_at,updated_at) VALUES(?,?,0,?,?,?)').bind(id,owner,JSON.stringify(state),now,now),...BOOKS.map(b=>db().prepare('INSERT INTO inventory(id,session_id,book_id,quantity) VALUES(?,?,?,?)').bind(id+':'+b.id,id,b.id,b.stock))]);
 return {id,owner,revision:0,state};
}
export async function loadSession(id:string,owner:string):Promise<Session|null>{const row=await db().prepare('SELECT * FROM sessions WHERE id=? AND owner=?').bind(id,owner).first<{id:string;owner:string;revision:number;state:string}>();if(!row)return null;const state:State=JSON.parse(row.state);return {...row,state};}
export async function saveSession(s:Session){const r=await db().prepare('UPDATE sessions SET state=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=?').bind(JSON.stringify(s.state),new Date().toISOString(),s.id,s.owner,s.revision).run();if(!r.meta.changes)throw Error('Conversation changed in another request. Refresh and try again.');s.revision++;}
export async function stock(s:Session){const r=await db().prepare('SELECT book_id,quantity FROM inventory WHERE session_id=?').bind(s.id).all<{book_id:string;quantity:number}>();return Object.fromEntries(r.results.map(x=>[x.book_id,x.quantity]));}
export async function complete(s:Session,token:string):Promise<Receipt>{
 const existing=await db().prepare('SELECT payload FROM resolutions WHERE session_id=? AND token=?').bind(s.id,token).first<{payload:string}>();if(existing)return JSON.parse(existing.payload);
 const p=s.state.pending;if(!p||p.token!==token)throw Error('This confirmation is no longer current. Please choose your resolution again.');
 if(Date.parse(p.expiresAt)<Date.now())throw Error('Confirmation expired. Ask Bea to check the options again.');
 const check=validateProposal(s.state,p.kind,p.bookId);if(!check.ok)throw Error(check.reason);
 if(p.kind==='replacement'){
  const inv=await stock(s),q=quoteBook(s.state,book(p.bookId!)!,inv[p.bookId!]||0);if(!q.eligible)throw Error('Stock or delivery eligibility changed. Please check alternatives again.');
 }
 const receipt:Receipt={id:'BR-'+crypto.randomUUID().slice(0,8).toUpperCase(),kind:p.kind,orderId:p.orderId,bookId:p.bookId,amount:p.amount,createdAt:new Date().toISOString(),arrival:p.arrival,originalDisposition:'Original delayed order cancelled; no additional charge.'};
 s.state.receipts=[...(s.state.receipts||[]),receipt];s.state.receipt=receipt;s.state.pending=null;s.state.stage='resolved';s.state.messages.push({role:'assistant',content:p.kind==='refund'?`Your simulated ${money(p.amount)} refund is recorded. The delayed original order is cancelled. Reference ${receipt.id}. No real payment was processed.`:`Your simulated replacement with ${book(p.bookId!)!.title} is recorded at no extra charge. The original order is cancelled. Delivery is estimated for ${p.arrival}, not guaranteed. Reference ${receipt.id}.`});
 // D1 batches are transactional. The insert rechecks revision and stock; a unique index prevents a second resolution.
 const insert=db().prepare(`INSERT INTO resolutions(id,session_id,order_id,token,kind,book_id,amount,payload,created_at)
 SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE id=? AND owner=? AND revision=?)
 AND (?='refund' OR EXISTS(SELECT 1 FROM inventory WHERE session_id=? AND book_id=? AND quantity>0))`).bind(receipt.id,s.id,p.orderId,token,p.kind,p.bookId||null,p.amount,JSON.stringify(receipt),receipt.createdAt,s.id,s.owner,s.revision,p.kind,s.id,p.bookId||'');
 const results=await db().batch([insert,db().prepare('UPDATE inventory SET quantity=quantity-1 WHERE session_id=? AND book_id=? AND EXISTS(SELECT 1 FROM resolutions WHERE id=?)').bind(s.id,p.bookId||'',receipt.id),db().prepare('UPDATE sessions SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM resolutions WHERE id=?)').bind(JSON.stringify(s.state),receipt.createdAt,s.id,s.revision,receipt.id)]);
 if(!results[0].meta.changes)throw Error('Conversation or stock changed. Refresh before confirming.');return receipt;
}

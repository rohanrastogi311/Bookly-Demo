export type Book = { id: string; title: string; author: string; price: number; age: string; tags: string[]; color: string; accent: string; motif: string; blurb: string; stock: number; warehouse: string; dispatchDays: number; deliveryDays: number };
export const BOOKS: Book[] = [
 {id:'dragon',title:'The Last Dragon',author:'Maya Wren',price:1499,age:'8–12',tags:['dragons','fantasy','adventure','friendship'],color:'#253c43',accent:'#e4b874',motif:'dragon',blurb:'A young mapmaker and the last dragon race to save a disappearing kingdom.',stock:0,warehouse:'North',dispatchDays:2,deliveryDays:2},
 {id:'ember',title:'Ember & the Sky Kingdom',author:'Eliza Hart',price:1499,age:'8–12',tags:['dragons','fantasy','adventure','friendship'],color:'#703b2d',accent:'#efc17d',motif:'sun',blurb:'A brave girl and a small dragon discover a kingdom above the clouds.',stock:8,warehouse:'Midlands',dispatchDays:0,deliveryDays:1},
 {id:'moon',title:'The Moonlit Library',author:'Theo Finch',price:1299,age:'8–12',tags:['fantasy','mystery','friendship'],color:'#293759',accent:'#d9c4ef',motif:'moon',blurb:'Every midnight, the books open doors into worlds that need a hero.',stock:4,warehouse:'Midlands',dispatchDays:0,deliveryDays:1},
 {id:'atlas',title:'Atlas of Hidden Worlds',author:'Nora Vale',price:1699,age:'8–12',tags:['fantasy','adventure','maps'],color:'#42624d',accent:'#f0d4a1',motif:'star',blurb:'An illustrated adventure through secret lands, ancient maps and impossible places.',stock:5,warehouse:'North',dispatchDays:1,deliveryDays:2},
 {id:'dragon-school',title:'Dragon School: First Flight',author:'Sam Alder',price:1199,age:'8–12',tags:['dragons','fantasy','adventure','school'],color:'#725c89',accent:'#f2d6ac',motif:'star',blurb:'An unlikely dragon rider learns that courage is something you practise.',stock:3,warehouse:'Midlands',dispatchDays:0,deliveryDays:1},
 {id:'garden',title:'The Small Wild Garden',author:'Iris Bell',price:1899,age:'Adult',tags:['gardening','nature'],color:'#c5c19a',accent:'#374f3b',motif:'leaf',blurb:'A practical guide to growing a garden that welcomes wildlife.',stock:12,warehouse:'Midlands',dispatchDays:0,deliveryDays:1}
];
export type Scenario = 'account'|'birthday'|'cutoff'|'shipped'|'security';
export type Message = {role:'user'|'assistant';content:string};
export type Event = {id:string;name:string;detail:string;durationMs:number;at:string;ok:boolean};
export type Quote = {bookId:string;estimatedArrival:string;deadline:string;eligible:boolean;reason:string;expiresAt:string;available:number;warehouse:string;price:number;similarity:number;matchedTags:string[]};
export type Proposal = {token:string;kind:'replacement'|'refund';orderId:string;bookId?:string;amount:number;expiresAt:string;summary:string;arrival?:string};
export type Receipt = {id:string;kind:string;orderId:string;bookId?:string;amount:number;createdAt:string;arrival?:string;originalDisposition:string};
export type Handoff = {id:string;summary:string;scope?:'account'|'order';orderId?:string;transcript?:Message[];order?:Order|null;createdAt?:string};
export type State = {demoVersion?:number;accountOrders?:Order[];receipts?:Receipt[];cases?:Handoff[];deadlineKnown?:boolean;agentTurns?:AgentMessage[][];rehearsal?:boolean;scenario:Scenario;now:string;deadline:string;messages:Message[];events:Event[];selectedOrder:string|null;quotes:Quote[];pending:Proposal|null;receipt:Receipt|null;escalation:Handoff|null;preferences:string[];stage:string};
export const money=(p:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
export const addDays=(iso:string,n:number)=>{const d=new Date(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export const book=(id:string)=>BOOKS.find(b=>b.id===id);
export function seedState(scenario:Scenario='birthday'):State{
 // Deliberately fixed simulation clock. Never represented as live carrier data.
 const now=scenario==='cutoff'?'2026-11-03T16:10:00Z':'2026-11-03T10:30:00Z';
 return {demoVersion:1,scenario,now,deadlineKnown:scenario!=='account',deadline:addDays(now,1),messages:[{role:'assistant',content:"Hi, I’m Bea, your Bookly assistant. Tell me what’s happening with your order, and we’ll work out the next step together."}],events:[],selectedOrder:null,quotes:[],pending:null,receipt:null,escalation:null,preferences:[],stage:'start'};
}
export type Order={id:string;bookId:string;title:string;price:number;status:string;estimatedArrival:string;destination:string;postcode:string;carrier:string;addressChanged:boolean;replacementEligible:boolean;refundEligible:boolean};
export function orders(state:State):Order[]{
 if(state.accountOrders)return state.accountOrders.map(o=>{const resolved=state.receipt?.orderId===o.id||state.receipts?.some(r=>r.orderId===o.id);return resolved?{...o,status:'cancelled',replacementEligible:false,refundEligible:false}:o});
 return [
 {id:'BK-1042',bookId:'dragon',title:'The Last Dragon',price:1499,status:state.receipt?'cancelled':state.scenario==='shipped'?'in_transit':'warehouse_delay',estimatedArrival:addDays(state.now,3),destination:'Birmingham · B1',postcode:'B1 1AA',carrier:'Bookly Parcel (simulated)',addressChanged:state.scenario==='security',replacementEligible:!state.receipt&&state.scenario!=='shipped',refundEligible:!state.receipt&&state.scenario!=='shipped'},
 {id:'BK-1038',bookId:'garden',title:'The Small Wild Garden',price:1899,status:'delivered',estimatedArrival:addDays(state.now,-2),destination:'Birmingham · B1',postcode:'B1 1AA',carrier:'Bookly Parcel (simulated)',addressChanged:false,replacementEligible:false,refundEligible:false}
 ];}
/** Upgrade old sessions without losing pending consent, receipts or their known order facts. */
export function unifyAccount(state:State){
 if(state.accountOrders)return;
 const existing=orders(state);const template=existing[0];
 state.accountOrders=[...existing,{...template,id:'BK-1051',bookId:'atlas',title:'Atlas of Hidden Worlds',price:1699,status:'in_transit',estimatedArrival:addDays(state.now,1),addressChanged:false,replacementEligible:false,refundEligible:false}];
 state.receipts=state.receipt?[state.receipt]:[];state.cases=state.escalation?[state.escalation]:[];
 state.deadlineKnown=!!(state.quotes.length||state.pending);state.scenario='account';
}
export function startConversation(state:State){
 unifyAccount(state);
 state.messages=seedState('account').messages;state.agentTurns=[];state.events=[];state.selectedOrder=null;state.quotes=[];state.pending=null;state.receipt=null;
 state.escalation=state.cases?.find(c=>c.scope!=='order')||null;
 state.preferences=[];state.deadline=addDays(state.now,1);state.deadlineKnown=false;state.stage='start';
}
export function quoteBook(state:State,b:Book,available:number,deadline=state.deadline):Quote{
 const cutoff=Number(state.now.slice(11,13))>=15?1:0;
 const arrival=addDays(state.now,b.dispatchDays+b.deliveryDays+cutoff);
 const original=book(orders(state).find(o=>o.id===state.selectedOrder)?.bookId||'dragon')!;
 const matchedTags=b.tags.filter(t=>original.tags.includes(t));
 const preferenceBoost=state.preferences.filter(t=>b.tags.includes(t)).length*3;
 const eligible=available>0&&arrival<=deadline&&b.price<=original.price&&b.id!==original.id;
 return {bookId:b.id,estimatedArrival:arrival,deadline,eligible,reason:available<1?'Out of stock':arrival>deadline?'Arrives after the deadline':b.price>original.price?'Above the no-charge replacement limit':'In stock; destination service and dispatch cutoff checked',expiresAt:new Date(Date.now()+5*60_000).toISOString(),available,warehouse:b.warehouse,price:b.price,similarity:matchedTags.length+preferenceBoost,matchedTags};
}
export function validateProposal(state:State,kind:string,bookId?:string):{ok:boolean;reason:string;quote?:Quote}{
 if(state.escalation&&(state.escalation.scope!=='order'||state.escalation.orderId===state.selectedOrder))return {ok:false,reason:'This account concern needs a human review. Automated order changes are paused.'};
 if(state.receipt?.orderId===state.selectedOrder||state.receipts?.some(r=>r.orderId===state.selectedOrder))return {ok:false,reason:'This order already has a completed resolution.'};
 const order=orders(state).find(o=>o.id===state.selectedOrder);
 if(!order)return {ok:false,reason:'Ask the customer which order they mean before proposing an action.'};
 if(order.addressChanged)return {ok:false,reason:'Unrecognised address change: create a priority support case.'};
 if(kind!=='refund'&&kind!=='replacement')return {ok:false,reason:'Unknown resolution.'};
 if(kind==='refund')return {ok:order.refundEligible,reason:order.refundEligible?'Eligible for a full simulated refund.':'This order is already shipped or delivered. A human must review the return/refund options.'};
 if(!order.replacementEligible)return {ok:false,reason:'The original parcel has shipped. Do not promise a swap or silently create a second charge.'};
 const q=state.quotes.find(q=>q.bookId===bookId);
 if(!q?.eligible)return {ok:false,reason:'Check stock, price and delivery eligibility before offering this book.'};
 if(Date.parse(q.expiresAt)<Date.now())return {ok:false,reason:'Delivery quote expired. Check availability again.'};
 return {ok:true,reason:'Eligible for a no-charge replacement; original delayed order will be cancelled.',quote:q};
}
export function newProposal(state:State,kind:'refund'|'replacement',bookId?:string):Proposal{
 const v=validateProposal(state,kind,bookId);if(!v.ok)throw Error(v.reason);
 const order=orders(state).find(o=>o.id===state.selectedOrder)!;const b=book(bookId||'');return {token:crypto.randomUUID(),kind,orderId:state.selectedOrder!,bookId:kind==='replacement'?bookId:undefined,amount:kind==='refund'?order.price:0,expiresAt:new Date(Date.now()+5*60_000).toISOString(),arrival:v.quote?.estimatedArrival,summary:kind==='refund'?`Refund ${money(order.price)} and cancel ${order.title}.`:`Replace ${order.title} with ${b!.title} at no extra charge. Cancel the delayed original order. Delivery estimated ${v.quote!.estimatedArrival}; not guaranteed.`};
}
export const POLICY={version:'bookly-demo-1',source:'Fictional Bookly policy, authored for this prototype',rules:['Only the signed-in demo customer’s orders are accessible.','Warehouse-delayed, unshipped orders qualify for a full refund or one no-charge replacement at or below the original item price.','Bookly covers express shipping for eligible delayed birthday gifts.','Replace only after checking warehouse stock, destination service, dispatch cutoff and delivery estimate. Estimates are not guarantees.','A replacement cancels the original unshipped order. No second charge and no partial swap after shipment.','Already-shipped orders and unfamiliar address changes require human review.','All refunds, replacements and handoffs are simulated; no real money or parcels move.']};

export type AgentMessage={role:string;content?:string|null;tool_calls?:{id:string;type:string;function:{name:string;arguments:string}}[];tool_call_id?:string};
export type OrderReference={status:'matched';orderId:string}|{status:'ambiguous'|'unknown'|'none'};
const normaliseReference=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/** Resolve only records owned by this session's customer. Never fuzzy-match an unknown ID. */
export function resolveOrderReference(state:State,value:unknown,embedded=false):OrderReference{
 if(typeof value!=='string'||!value.trim())return {status:'none'};
 const available=orders(state),normalised=normaliseReference(value);
 const ids=[...value.matchAll(/\bbk[\s-]*(\d+)\b/gi)].map(m=>'BK-'+m[1]);
 if(ids.length){
  if(ids.some(id=>!available.some(o=>o.id===id)))return {status:'unknown'};
  const unique=[...new Set(ids)];return unique.length===1?{status:'matched',orderId:unique[0]}:{status:'ambiguous'};
 }
 const matches=available.filter(o=>{
  const title=normaliseReference(o.title);
  if(!embedded)return normalised===title||normalised===normaliseReference(o.bookId);
  if((' '+normalised+' ').includes(' not '+title+' '))return false;
  return (' '+normalised+' ').includes(' '+title+' ')||(o.bookId==='dragon'&&/\bthe dragon book\b/i.test(value));
 });
 return matches.length===1?{status:'matched',orderId:matches[0].id}:matches.length>1?{status:'ambiguous'}:{status:'none'};
}

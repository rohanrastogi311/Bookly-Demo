import {BOOKS,type Proposal} from './domain';
const normalise=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/** A named action is required for spoken consent. Generic yes is never sufficient. */
export function matchesExplicitConfirmation(text:unknown,proposal:Pick<Proposal,'kind'>):boolean{
 if(typeof text!=='string')return false;
 const match=/^(?:yes )?(?:(?:i )?confirm|please confirm)(?: (?:the|my))? (replacement|refund)(?: please)?$/.exec(normalise(text));
 return match?.[1]===proposal.kind;
}
/** Preserve approval/help turns, while action changes invalidate the old token. */
export function isConfirmationFollowup(text:string,proposal?:Proposal|null):boolean{
 const t=normalise(text);
 if(/\b(instead|different|another|other book|changed my mind|change my|cancel|never mind|do not|don t|no thanks)\b/.test(t))return false;
 if(proposal){
  const mentionedIds=[...text.matchAll(/\bbk[\s-]*(\d+)\b/gi)].map(m=>'BK-'+m[1]);if(mentionedIds.some(id=>id!==proposal.orderId))return false;
  if(proposal.kind==='replacement'&&/\brefund\b/.test(t))return false;
  if(proposal.kind==='refund'&&/\breplacement\b/.test(t))return false;
  if(BOOKS.some(b=>b.id!==proposal.bookId&&b.id!=='dragon'&&t.includes(normalise(b.title))))return false;
 }
 return /^(yes|yes please|ok|okay|correct|that s right|that one|thank you|thanks)$/.test(t)||/\b(confirm|confirmation|button|click|approve|approval|review)\b/.test(t)||/^(what|when|where|how|why|is|will|does|do|am|are)\b/.test(t);
}
export function confirmationMessage(p:Proposal){return `Please review: ${p.summary} Say “confirm ${p.kind}” or use the Confirm ${p.kind} button to approve this exact change.`;}

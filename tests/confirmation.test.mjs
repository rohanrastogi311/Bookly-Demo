import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesExplicitConfirmation,isConfirmationFollowup} from '../lib/confirmation.ts';
const p={kind:'replacement',orderId:'BK-1042',bookId:'ember',token:'test',amount:0,expiresAt:'',summary:''};
test('explicit named-action phrases approve only the matching action',()=>{for(const text of ['Confirm replacement.','Please confirm my replacement.','Yes, confirm the replacement please.','I confirm the replacement'])assert.equal(matchesExplicitConfirmation(text,p),true,text);for(const text of ['yes','I confirm','confirm refund','do not confirm replacement','Can I confirm replacement?'])assert.equal(matchesExplicitConfirmation(text,p),false,text)});
test('confirmation help and generic yes preserve a proposal without approving it',()=>{for(const text of ['yes','Where is the confirmation button?','I want to confirm','Is this free?'])assert.equal(isConfirmationFollowup(text,p),true,text)});
test('changed action, book or order invalidates the old choice',()=>{for(const text of ['Actually I want a refund instead.','I want Dragon School: First Flight.','What about BK-1038?','I have changed my mind.','Cancel that pending choice.'])assert.equal(isConfirmationFollowup(text,p),false,text)});

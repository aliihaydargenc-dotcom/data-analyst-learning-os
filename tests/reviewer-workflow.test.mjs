import assert from 'node:assert/strict';
import {normalizeRubricComments,validateReviewDecision,reviewCanContributeToAdvancedMastery} from '../reviewer-workflow.mjs';

assert.deepEqual(normalizeRubricComments({sql:'  iyi ',unknown:'x','executive-communication':' net '}),{sql:'iyi','executive-communication':'net'});
assert.equal(validateReviewDecision({decision:'approved'}).ok,true);
assert.deepEqual(validateReviewDecision({decision:'changes_requested'}),{ok:false,reason:'feedback_required'});
assert.equal(validateReviewDecision({decision:'changes_requested',comment:'Nedensellik iddiasını kanıtla.'}).ok,true);
assert.equal(validateReviewDecision({decision:'invalid'}).reason,'invalid_decision');
assert.equal(reviewCanContributeToAdvancedMastery({status:'approved',reviewer_id:'r1',reviewed_at:'2026-09-24T00:00:00Z'}),true);
assert.equal(reviewCanContributeToAdvancedMastery({status:'approved',reviewer_id:null,reviewed_at:'2026-09-24T00:00:00Z'}),false);
assert.equal(reviewCanContributeToAdvancedMastery({status:'review_pending',reviewer_id:'r1',reviewed_at:'2026-09-24T00:00:00Z'}),false);
console.log('reviewer workflow tests passed');

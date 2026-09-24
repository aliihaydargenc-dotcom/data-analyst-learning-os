import assert from 'node:assert/strict';
import {buildPortfolioReview,createPortfolioSubmission} from '../portfolio-review.mjs';

const incomplete=buildPortfolioReview({
  caseData:{memo:'Taslak',evidence:{sql:true,kpi:true,chart:false,interpretation:true,summary:true}}
});
assert.equal(incomplete.status,'draft');
assert.equal(incomplete.reviewReady,false);
assert.equal(incomplete.automaticVerified,3);
assert.equal(incomplete.humanReviewStatus,'review_pending');

const caseData={
  memo:'Gelir düşüşünün günü ve tutarı doğrulandı; nedeni için segment, rezervasyon ve kanal dağılımı ayrıca incelenmelidir.',
  evidence:{sql:true,kpi:true,chart:true,interpretation:true,summary:true}
};
const ready=buildPortfolioReview({caseData});
assert.equal(ready.status,'ready_for_review');
assert.equal(ready.reviewReady,true);
assert.equal(ready.automaticVerified,4);
assert.equal(ready.automaticTotal,4);
assert.equal(ready.humanReviewStatus,'review_pending');
assert.equal(ready.rubric.find(item=>item.id==='executive-communication').verified,false);
assert.equal(ready.masteryImpact,'none_until_review');

const submitted=createPortfolioSubmission({caseData,now:new Date('2026-09-24T08:30:00.000Z')});
assert.equal(submitted.ok,true);
assert.equal(submitted.state.status,'review_pending');
assert.equal(submitted.state.submittedAt,'2026-09-24T08:30:00.000Z');

const pending=buildPortfolioReview({caseData,reviewState:submitted.state});
assert.equal(pending.status,'review_pending');
assert.equal(pending.submitted,true);

const approved=buildPortfolioReview({caseData,reviewState:{...submitted.state,reviewerDecision:'approved',reviewedAt:'2026-09-25T08:30:00.000Z'}});
assert.equal(approved.status,'reviewed');
assert.equal(approved.humanReviewStatus,'approved');
assert.equal(approved.rubric.find(item=>item.id==='executive-communication').verified,true);

const rejected=createPortfolioSubmission({caseData:{memo:'Eksik',evidence:{sql:true,kpi:true,chart:false,interpretation:true,summary:true}}});
assert.equal(rejected.ok,false);
assert.equal(rejected.reason,'evidence_incomplete');

console.log('Portfolio review: PASS');

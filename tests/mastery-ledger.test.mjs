import assert from 'node:assert/strict';
import {MASTERY_HISTORY_LIMIT,masteryDecisionSignature,recordMasteryDecision} from '../mastery-ledger.mjs';

const t0=new Date('2026-09-22T06:40:00.000Z');
const learning={
  evaluated:false,passed:false,state:'learning',weighted:null,failures:[],
  missingDimensions:['knowledge','interpretation','production','transfer'],
  verifiedDimensions:[],missingGates:[],verifiedGates:[],confidence:0,remediation:null
};

let history=recordMasteryDecision([],learning,{...learning},{observedAt:t0});
assert.deepEqual(history,[]);

const awaiting={
  ...learning,
  state:'awaiting_evidence',
  missingDimensions:['knowledge','interpretation','transfer'],
  verifiedDimensions:['production'],
  confidence:25
};
history=recordMasteryDecision(history,learning,awaiting,{
  observedAt:t0,
  verifiedEvidence:{production:{status:'verified',score:100,source:'semantic-lab',observedAt:t0.toISOString()}}
});
assert.equal(history.length,1);
assert.deepEqual(history[0].transition,{from:'learning',to:'awaiting_evidence'});
assert.equal(history[0].kind,'state-transition');
assert.equal(history[0].evidence.production.score,100);
assert.equal(history[0].evidence.production.source,'semantic-lab');

history=recordMasteryDecision(history,awaiting,structuredClone(awaiting),{
  observedAt:new Date('2026-09-22T06:41:00.000Z')
});
assert.equal(history.length,1);

const needsReview={
  evaluated:true,passed:false,state:'needs_review',weighted:77.5,
  failures:[{dimension:'transfer',required:80,actual:50}],
  missingDimensions:[],verifiedDimensions:['knowledge','interpretation','production','transfer'],
  missingGates:[],verifiedGates:[],confidence:100,
  remediation:{mode:'transfer-heavy',level:'L3',weighted:77.5,targets:[{dimension:'transfer',required:80,actual:50}]}
};
history=recordMasteryDecision(history,awaiting,needsReview,{
  observedAt:new Date('2026-09-22T06:42:00.000Z'),
  verifiedEvidence:{
    knowledge:{status:'verified',score:100,source:'mastery-assessment-v1',observedAt:t0.toISOString()},
    interpretation:{status:'verified',score:100,source:'mastery-assessment-v1',observedAt:t0.toISOString()},
    production:{status:'verified',score:100,source:'semantic-lab',observedAt:t0.toISOString()},
    transfer:{status:'verified',score:50,source:'mastery-assessment-v1',observedAt:t0.toISOString()}
  }
});
assert.equal(history.length,2);
assert.equal(history.at(-1).decision.failures[0].dimension,'transfer');
assert.equal(history.at(-1).decision.remediation.mode,'transfer-heavy');
assert.equal(history.at(-1).evidence.transfer.score,50);

const mastered={
  ...needsReview,
  passed:true,state:'mastered',weighted:95,failures:[],remediation:null
};
history=recordMasteryDecision(history,needsReview,mastered,{
  observedAt:new Date('2026-09-22T06:43:00.000Z'),
  masteryInputs:{rubricMin:5,capstone:100,architectureReview:true}
});
assert.equal(history.length,3);
assert.deepEqual(history.at(-1).transition,{from:'needs_review',to:'mastered'});
assert.equal(history.at(-1).decision.passed,true);
assert.deepEqual(history.at(-1).masteryInputs,{architectureReview:true,capstone:100,rubricMin:5});
assert.notEqual(masteryDecisionSignature(needsReview),masteryDecisionSignature(mastered));

const seeded=Array.from({length:MASTERY_HISTORY_LIMIT},(_,index)=>({id:`seed-${index}`}));
const capped=recordMasteryDecision(seeded,needsReview,mastered,{
  observedAt:new Date('2026-09-22T06:44:00.000Z')
});
assert.equal(capped.length,MASTERY_HISTORY_LIMIT);
assert.equal(capped[0].id,'seed-1');
assert.equal(capped.at(-1).transition.to,'mastered');

console.log('mastery ledger tests: PASS');

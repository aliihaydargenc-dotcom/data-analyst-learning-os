import assert from 'node:assert/strict';
import {createAdaptiveAssessment,nextAdaptiveQuestion,submitAdaptiveAnswer,summarizeAdaptiveAssessment} from '../adaptive-assessment.mjs';

function makeBank(domains){
  let id=1;
  return domains.flatMap(domain=>[2,3,4,5].map(level=>({
    id:String(id++),
    domain,
    level,
    topic:domain+' L'+level,
    answer:0,
    choices:['correct','wrong']
  })));
}

const bank=makeBank(['SQL','Python']);
const session=createAdaptiveAssessment(bank);

let question=nextAdaptiveQuestion(session,bank,{random:()=>0});
assert.equal(question.domain,'SQL');
assert.equal(question.level,3);

let step=submitAdaptiveAnswer(session,question,0);
assert.equal(step.correct,true);
assert.equal(step.domainCompleted,false);

question=nextAdaptiveQuestion(session,bank,{random:()=>0});
assert.equal(question.domain,'SQL');
assert.equal(question.level,4);

step=submitAdaptiveAnswer(session,question,1);
assert.equal(step.correct,false);
assert.equal(step.domainCompleted,true);
assert.equal(step.placement,'L3');

question=nextAdaptiveQuestion(session,bank,{random:()=>0});
assert.equal(question.domain,'Python');
assert.equal(question.level,3);

submitAdaptiveAnswer(session,question,1);
question=nextAdaptiveQuestion(session,bank,{random:()=>0});
assert.equal(question.level,2);

step=submitAdaptiveAnswer(session,question,1);
assert.equal(step.placement,'L1');
assert.equal(step.complete,true);
assert.equal(nextAdaptiveQuestion(session,bank,{random:()=>0}),null);

let summary=summarizeAdaptiveAssessment(session);
assert.deepEqual(summary.SQL,{level:'L3',correct:1,total:2,path:[3,4]});
assert.deepEqual(summary.Python,{level:'L1',correct:0,total:2,path:[3,2]});

const advancedBank=makeBank(['SQL']);
const advanced=createAdaptiveAssessment(advancedBank);
for(const expectedLevel of [3,4,5]){
  const current=nextAdaptiveQuestion(advanced,advancedBank,{random:()=>0});
  assert.equal(current.level,expectedLevel);
  submitAdaptiveAnswer(advanced,current,0);
}
summary=summarizeAdaptiveAssessment(advanced);
assert.equal(summary.SQL.level,'L5');
assert.equal(summary.SQL.total,3);
assert.equal(summary.SQL.correct,3);

const foundational=createAdaptiveAssessment(advancedBank);
question=nextAdaptiveQuestion(foundational,advancedBank,{random:()=>0});
submitAdaptiveAnswer(foundational,question,1);
question=nextAdaptiveQuestion(foundational,advancedBank,{random:()=>0});
assert.equal(question.level,2);
submitAdaptiveAnswer(foundational,question,0);
summary=summarizeAdaptiveAssessment(foundational);
assert.equal(summary.SQL.level,'L2');
assert.equal(summary.SQL.total,2);

console.log('adaptive assessment: PASS');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildMasteryAssessment} from '../mastery-assessment.mjs';
import {buildAdvancedMasteryChallenge} from '../advanced-mastery.mjs';
import {
  createLessonProgress,refreshMastery,recordVerifiedEvidence,
  recordTargetedMasteryAssessment,recordTargetedAdvancedMasteryChallenge
} from '../lesson-runtime.mjs';

const now=new Date('2026-09-22T06:20:00.000Z');

const lesson=JSON.parse(fs.readFileSync('content/lessons/sql.relational-thinking.001.json','utf8'));
let progress=createLessonProgress(lesson,now);
progress.completedAt=now.toISOString();
progress.retentionDue=[];
for(const [dimension,score] of Object.entries({knowledge:90,interpretation:90,production:90,transfer:50})){
  progress=recordVerifiedEvidence(lesson,progress,dimension,score,'remediation-test',now);
}
assert.equal(progress.mastery.state,'needs_review');
assert.equal(progress.mastery.remediation.mode,'transfer-heavy');
assert.deepEqual(progress.mastery.remediation.targets.map(item=>item.dimension),['transfer']);

const targetedAssessment=buildMasteryAssessment(lesson,['transfer']);
assert.deepEqual(targetedAssessment.dimensions.map(item=>item.dimension),['transfer']);
const transferAnswers=Object.fromEntries(targetedAssessment.dimensions.flatMap(group=>group.items.map(item=>[item.id,item.answerId])));
const repaired=recordTargetedMasteryAssessment(lesson,progress,['transfer'],transferAnswers,now);
assert.equal(repaired.ok,true);
progress=repaired.progress;
assert.equal(progress.verifiedEvidence.transfer.score,100);
assert.equal(progress.verifiedEvidence.knowledge.score,90);
assert.equal(progress.assessmentHistory.at(-1).remediation,true);
assert.deepEqual(progress.assessmentHistory.at(-1).scope,['transfer']);
assert.equal(progress.mastery.state,'mastered');

const labLesson=JSON.parse(fs.readFileSync('content/lessons/sql.select-null-filtering.001.json','utf8'));
let labProgress=createLessonProgress(labLesson,now);
labProgress.completedAt=now.toISOString();
labProgress.retentionDue=[];
for(const [dimension,score] of Object.entries({knowledge:100,interpretation:100,production:0,transfer:100})){
  labProgress=recordVerifiedEvidence(labLesson,labProgress,dimension,score,'remediation-test',now);
}
assert.equal(labProgress.mastery.state,'needs_review');
assert.deepEqual(labProgress.mastery.remediation.targets.map(item=>item.dimension),['production']);
const invalidProductionScope=recordTargetedMasteryAssessment(labLesson,labProgress,['production'],{},now);
assert.equal(invalidProductionScope.ok,false);
assert.equal(invalidProductionScope.reason,'invalid_assessment_scope');

const l5Lesson=JSON.parse(fs.readFileSync('content/lessons/sql.production-tuning.001.json','utf8'));
let l5=createLessonProgress(l5Lesson,now);
l5.completedAt=now.toISOString();
l5.retentionDue=[];
for(const dimension of ['knowledge','interpretation','production','transfer','retention']){
  l5=recordVerifiedEvidence(l5Lesson,l5,dimension,100,'remediation-test',now);
}
l5.masteryInputs.rubricMin=3;
l5=refreshMastery(l5Lesson,l5,now);
assert.equal(l5.mastery.state,'needs_review');
assert.equal(l5.mastery.remediation.mode,'advanced-review');
assert.deepEqual(l5.mastery.remediation.targets.map(item=>item.dimension),['rubricMin']);

const rubricOnly=buildAdvancedMasteryChallenge(l5Lesson,['rubric']);
assert.deepEqual(rubricOnly.gates.map(item=>item.gate),['rubric']);
const rubricAnswers=Object.fromEntries(rubricOnly.gates.flatMap(gate=>gate.items.map(item=>[item.id,item.answerId])));
const advancedRepair=recordTargetedAdvancedMasteryChallenge(l5Lesson,l5,['rubric'],rubricAnswers,now);
assert.equal(advancedRepair.ok,true);
assert.equal(advancedRepair.progress.masteryInputs.rubricMin,5);
assert.equal(advancedRepair.progress.advancedHistory.at(-1).remediation,true);
assert.deepEqual(advancedRepair.progress.advancedHistory.at(-1).scope,['rubric']);
assert.equal(advancedRepair.progress.mastery.state,'mastered');

console.log('targeted remediation tests: PASS');

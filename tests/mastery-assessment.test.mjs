import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildMasteryAssessment,evaluateMasteryAssessment,hasSemanticProductionLab} from '../mastery-assessment.mjs';

function correctAnswers(assessment){
  return Object.fromEntries(assessment.dimensions.flatMap(group=>group.items.map(item=>[item.id,item.answerId])));
}

const relational=JSON.parse(fs.readFileSync('content/lessons/sql.relational-thinking.001.json','utf8'));
const relationalAssessment=buildMasteryAssessment(relational);
assert.equal(hasSemanticProductionLab(relational),false);
assert.deepEqual(relationalAssessment.dimensions.map(item=>item.dimension),['knowledge','interpretation','production','transfer']);
for(const group of relationalAssessment.dimensions) assert.ok(group.items.length>=1);
let evaluation=evaluateMasteryAssessment(relational,correctAnswers(relationalAssessment));
assert.equal(evaluation.complete,true);
for(const dimension of ['knowledge','interpretation','production','transfer']) assert.equal(evaluation.dimensions[dimension].score,100);

const incompleteAnswers=correctAnswers(relationalAssessment);
delete incompleteAnswers[relationalAssessment.dimensions[0].items[0].id];
evaluation=evaluateMasteryAssessment(relational,incompleteAnswers);
assert.equal(evaluation.complete,false);

const qlik=JSON.parse(fs.readFileSync('content/lessons/qlik.associative-state.001.json','utf8'));
const qlikAssessment=buildMasteryAssessment(qlik);
assert.equal(hasSemanticProductionLab(qlik),true);
assert.deepEqual(qlikAssessment.dimensions.map(item=>item.dimension),['knowledge','interpretation','transfer']);
evaluation=evaluateMasteryAssessment(qlik,correctAnswers(qlikAssessment));
assert.equal(evaluation.complete,true);
for(const dimension of ['knowledge','interpretation','transfer']) assert.equal(evaluation.dimensions[dimension].score,100);

const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
assert.equal(catalog.production_lessons.length,72);
for(const entry of catalog.production_lessons){
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  const assessment=buildMasteryAssessment(lesson);
  const dimensions=assessment.dimensions.map(item=>item.dimension);
  assert.ok(dimensions.includes('knowledge'),`${lesson.id}: missing knowledge assessment`);
  assert.ok(dimensions.includes('interpretation'),`${lesson.id}: missing interpretation assessment`);
  assert.ok(dimensions.includes('transfer'),`${lesson.id}: missing transfer assessment`);
  assert.equal(dimensions.includes('production'),!hasSemanticProductionLab(lesson),`${lesson.id}: production source mismatch`);
  for(const group of assessment.dimensions) assert.ok(group.items.length>=1,`${lesson.id}: empty ${group.dimension} assessment`);
  const result=evaluateMasteryAssessment(lesson,correctAnswers(assessment));
  assert.equal(result.complete,true,`${lesson.id}: assessment should be complete`);
  for(const group of assessment.dimensions) assert.equal(result.dimensions[group.dimension].score,100,`${lesson.id}: ${group.dimension} answer key mismatch`);
}

console.log('mastery assessment tests: PASS');

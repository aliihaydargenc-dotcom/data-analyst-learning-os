import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advancedRequirementsForLevel,buildAdvancedMasteryChallenge,evaluateAdvancedMasteryChallenge} from '../advanced-mastery.mjs';

const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
const advancedLessons=catalog.production_lessons.filter(entry=>['L5','Expert'].includes(entry.level));
assert.equal(advancedLessons.length,24);

for(const entry of advancedLessons){
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  const expected=entry.level==='L5'?['rubric']:['rubric','capstone','architectureReview'];
  assert.deepEqual(advancedRequirementsForLevel(entry.level),expected);
  const challenge=buildAdvancedMasteryChallenge(lesson);
  assert.deepEqual(challenge.gates.map(gate=>gate.gate),expected,lesson.id+': gate mismatch');
  for(const gate of challenge.gates){
    assert.ok(gate.items.length>=4,lesson.id+': empty advanced gate '+gate.gate);
    for(const item of gate.items){
      assert.ok(item.options.length>=2,lesson.id+': insufficient options for '+item.id);
      assert.ok(item.options.some(option=>option.id===item.answerId),lesson.id+': missing answer option for '+item.id);
    }
  }
  const answers=Object.fromEntries(challenge.gates.flatMap(gate=>gate.items.map(item=>[item.id,item.answerId])));
  const evaluation=evaluateAdvancedMasteryChallenge(lesson,answers);
  assert.equal(evaluation.complete,true,lesson.id+': correct answers should complete');
  assert.equal(evaluation.inputs.rubricMin,5,lesson.id+': rubric should reach 5');
  if(entry.level==='Expert'){
    assert.equal(evaluation.inputs.capstone,100,lesson.id+': capstone should reach 100');
    assert.equal(evaluation.inputs.architectureReview,true,lesson.id+': architecture review should pass');
  }
}

const sample=JSON.parse(fs.readFileSync(advancedLessons[0].path,'utf8'));
const incomplete=evaluateAdvancedMasteryChallenge(sample,{});
assert.equal(incomplete.complete,false);

console.log('advanced mastery tests: PASS');

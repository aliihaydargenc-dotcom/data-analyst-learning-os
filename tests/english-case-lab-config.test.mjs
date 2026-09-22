import assert from 'node:assert/strict';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
const entries=catalog.production_lessons.filter(item=>item.track==='english');
assert.equal(entries.length,12);
assert.deepEqual(entries.map(item=>item.order),Array.from({length:12},(_,i)=>61+i));
for(const entry of entries){
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  assert.equal(lesson.track,'english');
  assert.ok(lesson.case_lab?.id,entry.id+' must define case_lab');
  assert.equal(lesson.case_lab.cases.length,3);
  assert.ok(lesson.case_lab.cases.every(item=>item.answer==='a'));
  const gated=lesson.sections.find(item=>item.requires_case_lab_pass);
  assert.equal(gated?.requires_case_lab_pass,lesson.case_lab.id);
  assert.ok(lesson.sources.includes('google-tech-writing'));
  assert.ok(lesson.sources.includes('ms-writing-style'));
  assert.ok(lesson.sources.includes('cefr-companion'));
}
console.log('english case lab config tests: PASS');

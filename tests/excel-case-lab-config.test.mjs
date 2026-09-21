import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
const entries=catalog.production_lessons.filter(item=>item.track==='excel');
assert.equal(entries.length,12);
for(const entry of entries){
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  assert.ok(lesson.case_lab?.id,entry.id+' must define case_lab');
  assert.equal(lesson.case_lab.cases.length,3,entry.id+' needs exactly three deterministic cases');
  const section=lesson.sections.find(item=>item.requires_case_lab_pass);
  assert.equal(section?.requires_case_lab_pass,lesson.case_lab.id);
  for(const item of lesson.case_lab.cases){
    assert.ok(item.options.some(option=>option.id===item.answer),entry.id+'/'+item.id+' answer must exist');
  }
}
console.log('excel case lab config tests: PASS');

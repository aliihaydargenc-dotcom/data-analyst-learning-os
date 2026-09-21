import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PYTHON_LAB_IDS} from '../lesson-python-lab.mjs';

const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
const pythonEntries=catalog.production_lessons.filter(item=>item.track==='python');
assert.equal(pythonEntries.length,12);
const ids=new Set(PYTHON_LAB_IDS);
assert.equal(ids.size,12);
for(const entry of pythonEntries){
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  assert.ok(lesson.python_lab?.id,entry.id+' must define python_lab');
  assert.ok(ids.has(lesson.python_lab.id),entry.id+' python_lab fixture missing');
  const section=lesson.sections.find(item=>item.requires_python_lab_pass);
  assert.equal(section?.requires_python_lab_pass,lesson.python_lab.id);
}
console.log('python lab config tests: PASS');

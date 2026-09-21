import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HTML_LAB_IDS} from '../lesson-html-lab.mjs';

const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
const entries=catalog.production_lessons.filter(item=>item.track==='html');
assert.equal(entries.length,12);
const ids=new Set(HTML_LAB_IDS);
assert.equal(ids.size,12);
for(const entry of entries){
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  assert.ok(lesson.html_lab?.id,entry.id+' must define html_lab');
  assert.ok(ids.has(lesson.html_lab.id),entry.id+' html fixture missing');
  const section=lesson.sections.find(item=>item.requires_html_lab_pass);
  assert.equal(section?.requires_html_lab_pass,lesson.html_lab.id);
  assert.ok(lesson.html_lab.starter_html.includes('<'),entry.id+' starter markup missing');
}
console.log('html lab config tests: PASS');

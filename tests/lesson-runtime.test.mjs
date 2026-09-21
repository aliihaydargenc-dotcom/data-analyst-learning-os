import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateLessonStructure,lessonLayerSummary,REQUIRED_LAYERS} from '../lesson-runtime.mjs';

const lesson=JSON.parse(fs.readFileSync('content/lessons/sql.relational-thinking.001.json','utf8'));
const result=validateLessonStructure(lesson);
assert.equal(result.ok,true);
assert.deepEqual(result.errors,[]);

const summary=lessonLayerSummary(lesson);
assert.equal(summary.length,REQUIRED_LAYERS.length);
for(const layer of REQUIRED_LAYERS){
  assert.ok(summary.find(item=>item.layer===layer)?.count>=1);
}

const broken=structuredClone(lesson);
broken.sections=broken.sections.filter(section=>section.layer!=='transfer');
const brokenResult=validateLessonStructure(broken);
assert.equal(brokenResult.ok,false);
assert.ok(brokenResult.errors.includes('layer:transfer'));

console.log('lesson runtime tests: PASS');

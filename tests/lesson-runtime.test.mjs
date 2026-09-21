import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateLessonStructure,lessonLayerSummary,REQUIRED_LAYERS,
  createLessonProgress,normalizeLessonProgress,canCompleteSection,
  completionPercent,completeSection,buildRetentionSchedule,saveEvidenceDraft
} from '../lesson-runtime.mjs';

const lesson=JSON.parse(fs.readFileSync('content/lessons/sql.relational-thinking.001.json','utf8'));
const result=validateLessonStructure(lesson);
assert.equal(result.ok,true);
assert.deepEqual(result.errors,[]);

const summary=lessonLayerSummary(lesson);
assert.equal(summary.length,REQUIRED_LAYERS.length);
for(const layer of REQUIRED_LAYERS) assert.ok(summary.find(item=>item.layer===layer)?.count>=1);

const broken=structuredClone(lesson);
broken.sections=broken.sections.filter(section=>section.layer!=='transfer');
const brokenResult=validateLessonStructure(broken);
assert.equal(brokenResult.ok,false);
assert.ok(brokenResult.errors.includes('layer:transfer'));

const now=new Date('2026-09-21T12:00:00.000Z');
let progress=createLessonProgress(lesson,now);
assert.equal(progress.lessonId,lesson.id);
assert.equal(completionPercent(lesson,progress),0);

const guided=lesson.sections.find(section=>section.layer==='guided_practice');
assert.equal(canCompleteSection(guided,''),false);
assert.equal(canCompleteSection(guided,'kısa'),false);
assert.equal(canCompleteSection(guided,'Reservations için bir satır tek bir booking kaydını temsil eder.'),true);

for(const section of lesson.sections){
  const response=['guided_practice','independent_practice','debugging','transfer'].includes(section.layer)
    ?'Bu bölüm için grain, key ve cardinality kararını gerekçeleriyle birlikte açıklayan yeterli uzunlukta bir yanıt taslağı.'
    :'';
  const completed=completeSection(lesson,progress,section.id,response,now);
  assert.equal(completed.ok,true);
  progress=completed.progress;
}
assert.equal(completionPercent(lesson,progress),100);
assert.equal(progress.completedAt,now.toISOString());
assert.equal(progress.retentionDue.length,3);
assert.equal(progress.retentionDue[0].day,1);
assert.equal(progress.retentionDue[1].day,7);
assert.equal(progress.retentionDue[2].day,30);

const schedule=buildRetentionSchedule(lesson,'2026-09-21T12:00:00.000Z');
assert.equal(schedule[0].dueAt,'2026-09-22T12:00:00.000Z');
assert.equal(schedule[2].dueAt,'2026-10-21T12:00:00.000Z');

progress=saveEvidenceDraft(lesson,progress,'production','Yeni dataset için grain ve uniqueness testi taslağı.',now);
assert.match(progress.evidenceDrafts.production,/grain/);

const normalized=normalizeLessonProgress(lesson,{...progress,completedSections:[...progress.completedSections,'not-real']},now);
assert.equal(normalized.completedSections.includes('not-real'),false);

console.log('lesson runtime tests: PASS');

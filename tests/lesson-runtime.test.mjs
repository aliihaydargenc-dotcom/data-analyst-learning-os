import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateLessonStructure,lessonLayerSummary,REQUIRED_LAYERS,
  createLessonProgress,normalizeLessonProgress,canCompleteSection,
  completionPercent,completeSection,buildRetentionSchedule,saveEvidenceDraft,
  labPassed,recordLabAttempt,recordCaseLabAttempt
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
assert.equal(progress.version,2);
assert.deepEqual(progress.labEvidence,{});
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

// Semantic lab gate is independent from section-completion text.
const filterLesson=JSON.parse(fs.readFileSync('content/lessons/sql.select-null-filtering.001.json','utf8'));
let filterProgress=createLessonProgress(filterLesson,now);
const independent=filterLesson.sections.find(section=>section.id==='independent-practice');
const response='NULL, UNKNOWN ve yarı-açık tarih aralığını hedef popülasyon ve deterministik sıralama açısından gerekçelendiriyorum.';
let gated=completeSection(filterLesson,filterProgress,independent.id,response,now);
assert.equal(gated.ok,false);
assert.equal(gated.reason,'lab_required');

filterProgress=recordLabAttempt(filterLesson,filterProgress,filterLesson.lab.id,{passed:false,summary:{visible:false,edge:false}},now);
assert.equal(labPassed(filterProgress,filterLesson.lab.id),false);
assert.equal(filterProgress.labEvidence[filterLesson.lab.id].attempts,1);

filterProgress=recordLabAttempt(filterLesson,filterProgress,filterLesson.lab.id,{passed:true,summary:{visible:true,edge:true}},now);
assert.equal(labPassed(filterProgress,filterLesson.lab.id),true);
assert.equal(filterProgress.labEvidence[filterLesson.lab.id].attempts,2);
assert.equal(filterProgress.labEvidence[filterLesson.lab.id].passedAt,now.toISOString());

gated=completeSection(filterLesson,filterProgress,independent.id,response,now);
assert.equal(gated.ok,true);

// Semantic case-lab gate supports non-SQL production lessons.
const qlikLesson=JSON.parse(fs.readFileSync('content/lessons/qlik.associative-state.001.json','utf8'));
let qlikProgress=createLessonProgress(qlikLesson,now);
const qlikIndependent=qlikLesson.sections.find(section=>section.requires_case_lab_pass);
const qlikResponse='Selection state, associative context ve business population ilişkisini gerekçeli biçimde açıklayan production yanıtı.';
let qlikGated=completeSection(qlikLesson,qlikProgress,qlikIndependent.id,qlikResponse,now);
assert.equal(qlikGated.ok,false);
assert.equal(qlikGated.reason,'case_lab_required');
qlikProgress=recordCaseLabAttempt(qlikLesson,qlikProgress,qlikLesson.case_lab.id,{passed:true,summary:{'case-1':true,'case-2':true,'case-3':true}},now);
assert.equal(labPassed(qlikProgress,qlikLesson.case_lab.id),true);
qlikGated=completeSection(qlikLesson,qlikProgress,qlikIndependent.id,qlikResponse,now);
assert.equal(qlikGated.ok,true);

console.log('lesson runtime tests: PASS');

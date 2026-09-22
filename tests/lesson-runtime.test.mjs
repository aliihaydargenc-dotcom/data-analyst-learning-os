import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateLessonStructure,lessonLayerSummary,REQUIRED_LAYERS,
  createLessonProgress,normalizeLessonProgress,canCompleteSection,
  completionPercent,completeSection,buildRetentionSchedule,saveEvidenceDraft,
  labPassed,recordLabAttempt,recordCaseLabAttempt,recordPythonLabAttempt,recordHtmlLabAttempt,
  completeRetentionReview,recordVerifiedEvidence,recordMasteryAssessment
} from '../lesson-runtime.mjs';
import {buildMasteryAssessment,evaluateMasteryAssessment} from '../mastery-assessment.mjs';

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
assert.equal(progress.version,4);
assert.deepEqual(progress.labEvidence,{});
assert.deepEqual(progress.verifiedEvidence,{});
assert.equal(progress.mastery.state,'learning');
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

const assessment=buildMasteryAssessment(lesson);
const assessmentAnswers=Object.fromEntries(assessment.dimensions.flatMap(group=>group.items.map(item=>[item.id,item.answerId])));
const assessmentEvaluation=evaluateMasteryAssessment(lesson,assessmentAnswers);
assert.equal(assessmentEvaluation.complete,true);
const assessmentResult=recordMasteryAssessment(lesson,progress,assessmentAnswers,now);
assert.equal(assessmentResult.ok,true);
progress=assessmentResult.progress;
assert.equal(progress.assessmentHistory.length,1);
assert.equal(progress.verifiedEvidence.knowledge.score,100);
assert.equal(progress.verifiedEvidence.interpretation.score,100);
assert.equal(progress.verifiedEvidence.production.score,100);
assert.equal(progress.verifiedEvidence.transfer.score,100);
assert.equal(progress.mastery.state,'mastered');

const schedule=buildRetentionSchedule(lesson,'2026-09-21T12:00:00.000Z');
assert.equal(schedule[0].dueAt,'2026-09-22T12:00:00.000Z');
assert.equal(schedule[2].dueAt,'2026-10-21T12:00:00.000Z');

for(const dimension of ['knowledge','interpretation','production','transfer']){
  progress=recordVerifiedEvidence(lesson,progress,dimension,100,'unit-test',now);
}
assert.equal(progress.mastery.evaluated,true);
assert.equal(progress.mastery.passed,true);
assert.equal(progress.mastery.state,'mastered');
const retentionResult=completeRetentionReview(
  lesson,progress,1,
  {response:'Kaynaklara bakmadan grain, key ve cardinality ilişkisini yeniden kurup fan-out riskini açıklıyorum.'},
  new Date('2026-09-22T12:00:00.000Z')
);
assert.equal(retentionResult.ok,true);
progress=retentionResult.progress;
assert.equal(progress.retentionDue[0].status,'completed');
assert.equal(progress.retentionHistory.length,1);
assert.equal(progress.mastery.state,'mastered');

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
assert.equal(filterProgress.labEvidence[filterLesson.lab.id].lastAttemptAt,now.toISOString());
assert.equal(filterProgress.verifiedEvidence.production.score,0);

filterProgress=recordLabAttempt(filterLesson,filterProgress,filterLesson.lab.id,{passed:true,summary:{visible:true,edge:true}},now);
assert.equal(labPassed(filterProgress,filterLesson.lab.id),true);
assert.equal(filterProgress.labEvidence[filterLesson.lab.id].attempts,2);
assert.equal(filterProgress.labEvidence[filterLesson.lab.id].passedAt,now.toISOString());
assert.equal(filterProgress.verifiedEvidence.production.score,100);

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

// Semantic Python-lab gate supports executable Python production lessons.
const pythonLesson=JSON.parse(fs.readFileSync('content/lessons/python.language-semantics.001.json','utf8'));
let pythonProgress=createLessonProgress(pythonLesson,now);
const pythonIndependent=pythonLesson.sections.find(section=>section.requires_python_lab_pass);
const pythonResponse='Truthiness, mutability ve type contractını visible ve edge fixture ile doğrulayan gerekçeli production yanıtı.';
let pythonGated=completeSection(pythonLesson,pythonProgress,pythonIndependent.id,pythonResponse,now);
assert.equal(pythonGated.ok,false);
assert.equal(pythonGated.reason,'python_lab_required');
pythonProgress=recordPythonLabAttempt(pythonLesson,pythonProgress,pythonLesson.python_lab.id,{passed:true,summary:{visible:true,edge:true}},now);
assert.equal(labPassed(pythonProgress,pythonLesson.python_lab.id),true);
pythonGated=completeSection(pythonLesson,pythonProgress,pythonIndependent.id,pythonResponse,now);
assert.equal(pythonGated.ok,true);

// Semantic HTML-lab gate supports executable DOM production lessons.
const htmlLesson=JSON.parse(fs.readFileSync('content/lessons/html.document-semantics.001.json','utf8'));
let htmlProgress=createLessonProgress(htmlLesson,now);
const htmlIndependent=htmlLesson.sections.find(section=>section.requires_html_lab_pass);
const htmlResponse='Semantic structure parser sonrası DOM ağacında native landmark, heading ve identity contractlarıyla doğrulanmalıdır.';
let htmlGated=completeSection(htmlLesson,htmlProgress,htmlIndependent.id,htmlResponse,now);
assert.equal(htmlGated.ok,false);
assert.equal(htmlGated.reason,'html_lab_required');
htmlProgress=recordHtmlLabAttempt(htmlLesson,htmlProgress,htmlLesson.html_lab.id,{passed:true,summary:{visible:true,edge:true}},now);
assert.equal(labPassed(htmlProgress,htmlLesson.html_lab.id),true);
htmlGated=completeSection(htmlLesson,htmlProgress,htmlIndependent.id,htmlResponse,now);
assert.equal(htmlGated.ok,true);

console.log('lesson runtime tests: PASS');

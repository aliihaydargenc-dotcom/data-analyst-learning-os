import {evaluateMastery,MASTERY_PROFILES,buildRemediationPlan,nextRetentionIntervalDays} from './mastery-engine.mjs';
import {evaluateMasteryAssessment,hasSemanticProductionLab,MASTERY_ASSESSMENT_VERSION} from './mastery-assessment.mjs';
import {evaluateAdvancedMasteryChallenge,advancedRequirementsForLevel,ADVANCED_MASTERY_VERSION} from './advanced-mastery.mjs';

export const REQUIRED_LAYERS=Object.freeze([
  'mental_model','worked_example','guided_practice','independent_practice','debugging','transfer','retention'
]);

export const RESPONSE_LAYERS=Object.freeze([
  'guided_practice','independent_practice','debugging','transfer'
]);

export function validateLessonStructure(lesson){
  const errors=[];
  if(!lesson?.id) errors.push('id');
  if(!lesson?.module_id) errors.push('module_id');
  if(!lesson?.track) errors.push('track');
  if(!lesson?.level) errors.push('level');
  if(!Array.isArray(lesson?.learning_objectives)||lesson.learning_objectives.length<3) errors.push('learning_objectives');
  if(!Array.isArray(lesson?.sections)||lesson.sections.length<7) errors.push('sections');

  const layers=new Set((lesson?.sections||[]).map(section=>section.layer));
  for(const layer of REQUIRED_LAYERS){
    if(!layers.has(layer)) errors.push(`layer:${layer}`);
  }

  if(!Array.isArray(lesson?.mastery_evidence)||lesson.mastery_evidence.length<4) errors.push('mastery_evidence');
  const dimensions=new Set((lesson?.mastery_evidence||[]).map(item=>item.dimension));
  for(const dimension of ['knowledge','interpretation','production','transfer']){
    if(!dimensions.has(dimension)) errors.push(`evidence:${dimension}`);
  }

  if(!Array.isArray(lesson?.sources)||lesson.sources.length===0) errors.push('sources');
  return {ok:errors.length===0,errors};
}

export function lessonLayerSummary(lesson){
  const sections=lesson?.sections||[];
  return REQUIRED_LAYERS.map(layer=>({
    layer,
    count:sections.filter(section=>section.layer===layer).length
  }));
}

export function createLessonProgress(lesson,now=new Date()){
  return {
    version:5,
    lessonId:lesson.id,
    startedAt:now.toISOString(),
    updatedAt:now.toISOString(),
    completedAt:null,
    completedSections:[],
    responses:{},
    evidenceDrafts:{},
    labEvidence:{},
    verifiedEvidence:{},
    retentionDue:[],
    retentionHistory:[],
    assessmentHistory:[],
    advancedHistory:[],
    masteryInputs:{},
    mastery:{
      evaluated:false,passed:false,state:'learning',weighted:null,failures:[],
      missingDimensions:['knowledge','interpretation','production','transfer'],
      verifiedDimensions:[],confidence:0,updatedAt:now.toISOString()
    }
  };
}

export function normalizeLessonProgress(lesson,value,now=new Date()){
  const base=createLessonProgress(lesson,now);
  if(!value||value.lessonId!==lesson.id) return base;
  const validIds=new Set((lesson.sections||[]).map(section=>section.id));
  const completed=[...new Set((value.completedSections||[]).filter(id=>validIds.has(id)))];
  const next={
    ...base,
    ...value,
    version:5,
    lessonId:lesson.id,
    completedSections:completed,
    responses:{...(value.responses||{})},
    evidenceDrafts:{...(value.evidenceDrafts||{})},
    labEvidence:{...(value.labEvidence||{})},
    verifiedEvidence:{...(value.verifiedEvidence||{})},
    retentionDue:Array.isArray(value.retentionDue)?value.retentionDue:[],
    retentionHistory:Array.isArray(value.retentionHistory)?value.retentionHistory:[],
    assessmentHistory:Array.isArray(value.assessmentHistory)?value.assessmentHistory:[],
    advancedHistory:Array.isArray(value.advancedHistory)?value.advancedHistory:[],
    masteryInputs:{...(value.masteryInputs||{})}
  };
  return refreshMastery(lesson,next,now);
}

export function sectionNeedsResponse(section){
  return RESPONSE_LAYERS.includes(section?.layer);
}

export function responseIsSubstantive(value){
  return typeof value==='string'&&value.trim().length>=20;
}

function validScore(value){
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
}

export function lessonLabId(lesson){
  return lesson?.lab?.id||lesson?.case_lab?.id||lesson?.python_lab?.id||lesson?.html_lab?.id||null;
}

export function refreshMastery(lesson,progress,now=new Date()){
  const next={...progress,verifiedEvidence:{...(progress?.verifiedEvidence||{})},masteryInputs:{...(progress?.masteryInputs||{})}};
  const profile=MASTERY_PROFILES[lesson?.level];
  if(!profile) return next;
  const required=['knowledge','interpretation','production','transfer'];
  if(profile.floors?.retention!==undefined) required.push('retention');
  const verifiedDimensions=required.filter(dimension=>validScore(next.verifiedEvidence?.[dimension]?.score));
  const missingDimensions=required.filter(dimension=>!verifiedDimensions.includes(dimension));
  const requiredGates=advancedRequirementsForLevel(lesson?.level);
  const gatePresence={
    rubric:typeof next.masteryInputs.rubricMin==='number'&&Number.isFinite(next.masteryInputs.rubricMin)&&next.masteryInputs.rubricMin>=1&&next.masteryInputs.rubricMin<=5,
    capstone:validScore(next.masteryInputs.capstone),
    architectureReview:typeof next.masteryInputs.architectureReview==='boolean'
  };
  const missingGates=requiredGates.filter(gate=>!gatePresence[gate]);
  const verifiedGates=requiredGates.filter(gate=>gatePresence[gate]);
  const nowMs=now.getTime();
  const due=(next.retentionDue||[]).filter(item=>item?.status!=='completed'&&new Date(item?.dueAt||0).getTime()<=nowMs);
  let evaluation=null;
  let evaluationEvidence=null;
  if(next.completedAt&&missingDimensions.length===0&&missingGates.length===0){
    const evidence={
      knowledge:next.verifiedEvidence.knowledge.score,
      interpretation:next.verifiedEvidence.interpretation.score,
      production:next.verifiedEvidence.production.score,
      transfer:next.verifiedEvidence.transfer.score,
      ...(validScore(next.verifiedEvidence.retention?.score)?{retention:next.verifiedEvidence.retention.score}:{})
    };
    Object.assign(evidence,next.masteryInputs||{});
    evaluationEvidence=evidence;
    evaluation=evaluateMastery(lesson.level,evidence);
  }
  let state='learning';
  if(next.completedAt){
    if(due.length) state='retention_due';
    else if(missingDimensions.length) state=missingDimensions.every(item=>item==='retention')?'ready_for_retention':'awaiting_evidence';
    else if(missingGates.length) state='awaiting_advanced_evidence';
    else state=evaluation?.passed?'mastered':'needs_review';
  }
  next.mastery={
    evaluated:Boolean(evaluation),
    passed:evaluation?.passed===true,
    state,
    weighted:evaluation?.weighted??null,
    failures:evaluation?.failures||[],
    missingDimensions,
    verifiedDimensions,
    missingGates,
    verifiedGates,
    remediation:evaluation&&!evaluation.passed?buildRemediationPlan(evaluationEvidence,evaluation):null,
    confidence:(required.length+requiredGates.length)
      ?Math.round(((verifiedDimensions.length+verifiedGates.length)/(required.length+requiredGates.length))*100)
      :0,
    updatedAt:now.toISOString()
  };
  return next;
}

export function recordVerifiedEvidence(lesson,progress,dimension,score,source='assessment',now=new Date()){
  const allowed=new Set([...(lesson?.mastery_evidence||[]).map(item=>item.dimension),'retention']);
  if(!allowed.has(dimension)) throw new Error(`Unknown verified evidence dimension: ${dimension}`);
  if(!validScore(score)) throw new Error(`Invalid verified evidence score for ${dimension}`);
  const next=normalizeLessonProgress(lesson,progress,now);
  next.verifiedEvidence[dimension]={status:'verified',score,source,observedAt:now.toISOString()};
  next.updatedAt=now.toISOString();
  return refreshMastery(lesson,next,now);
}

export function recordMasteryAssessment(lesson,progress,answers={},now=new Date()){
  const next=normalizeLessonProgress(lesson,progress,now);
  if(!next.completedAt) return {ok:false,reason:'lesson_incomplete',progress:next,evaluation:null};
  const evaluation=evaluateMasteryAssessment(lesson,answers);
  if(!evaluation||evaluation.lessonId!==lesson.id||evaluation.version!==MASTERY_ASSESSMENT_VERSION||evaluation.complete!==true){
    return {ok:false,reason:'invalid_assessment',progress:next,evaluation};
  }
  const expected=['knowledge','interpretation','transfer'];
  if(!hasSemanticProductionLab(lesson)) expected.splice(2,0,'production');
  for(const dimension of expected){
    const result=evaluation.dimensions?.[dimension];
    if(!result||!validScore(result.score)||!Number.isInteger(result.total)||result.total<1||result.answered!==result.total){
      return {ok:false,reason:'invalid_assessment',progress:next,evaluation};
    }
  }
  for(const dimension of expected){
    const result=evaluation.dimensions[dimension];
    next.verifiedEvidence[dimension]={
      status:'verified',score:result.score,source:'mastery-assessment-v1',
      observedAt:now.toISOString(),correct:result.correct,total:result.total
    };
  }
  next.assessmentHistory=[...(next.assessmentHistory||[]),{
    version:evaluation.version,completedAt:now.toISOString(),
    dimensions:Object.fromEntries(expected.map(dimension=>[dimension,{
      score:evaluation.dimensions[dimension].score,
      correct:evaluation.dimensions[dimension].correct,
      total:evaluation.dimensions[dimension].total
    }]))
  }].slice(-20);
  next.updatedAt=now.toISOString();
  return {ok:true,reason:null,progress:refreshMastery(lesson,next,now),evaluation};
}

export function recordAdvancedMasteryChallenge(lesson,progress,answers={},now=new Date()){
  const next=normalizeLessonProgress(lesson,progress,now);
  if(!next.completedAt) return {ok:false,reason:'lesson_incomplete',progress:next,evaluation:null};
  const required=advancedRequirementsForLevel(lesson?.level);
  if(required.length===0) return {ok:false,reason:'advanced_not_required',progress:next,evaluation:null};
  const evaluation=evaluateAdvancedMasteryChallenge(lesson,answers);
  if(!evaluation||evaluation.lessonId!==lesson.id||evaluation.version!==ADVANCED_MASTERY_VERSION||evaluation.complete!==true){
    return {ok:false,reason:'invalid_advanced_assessment',progress:next,evaluation};
  }
  if(required.includes('rubric')&&!(typeof evaluation.inputs?.rubricMin==='number'&&evaluation.inputs.rubricMin>=1&&evaluation.inputs.rubricMin<=5)){
    return {ok:false,reason:'invalid_advanced_assessment',progress:next,evaluation};
  }
  if(required.includes('capstone')&&!validScore(evaluation.inputs?.capstone)){
    return {ok:false,reason:'invalid_advanced_assessment',progress:next,evaluation};
  }
  if(required.includes('architectureReview')&&typeof evaluation.inputs?.architectureReview!=='boolean'){
    return {ok:false,reason:'invalid_advanced_assessment',progress:next,evaluation};
  }
  next.masteryInputs={
    ...next.masteryInputs,
    ...(required.includes('rubric')?{rubricMin:evaluation.inputs.rubricMin}:{}),
    ...(required.includes('capstone')?{capstone:evaluation.inputs.capstone}:{}),
    ...(required.includes('architectureReview')?{architectureReview:evaluation.inputs.architectureReview}:{})
  };
  next.advancedHistory=[...(next.advancedHistory||[]),{
    version:evaluation.version,
    completedAt:now.toISOString(),
    results:evaluation.results,
    inputs:Object.fromEntries(required.map(gate=>{
      const key=gate==='rubric'?'rubricMin':gate==='capstone'?'capstone':'architectureReview';
      return [key,evaluation.inputs[key]];
    }))
  }].slice(-20);
  next.updatedAt=now.toISOString();
  return {ok:true,reason:null,progress:refreshMastery(lesson,next,now),evaluation};
}

export function completeRetentionReview(lesson,progress,reviewKey,{response='',verified=false,passed=null,source='retrieval-response'}={},now=new Date()){
  const next=normalizeLessonProgress(lesson,progress,now);
  const index=(next.retentionDue||[]).findIndex(item=>{
    if(item?.status==='completed')return false;
    if(String(item?.id||'')===String(reviewKey))return true;
    return Number.isFinite(Number(reviewKey))&&Number(item?.day)===Number(reviewKey);
  });
  if(index<0) return {ok:false,reason:'review_not_found',progress:next};
  const item=next.retentionDue[index];
  const dueAt=new Date(item.dueAt||0).getTime();
  if(!Number.isFinite(dueAt)||now.getTime()<dueAt) return {ok:false,reason:'not_due',progress:next};
  if(!verified&&!responseIsSubstantive(response)) return {ok:false,reason:'response_required',progress:next};
  const completed={
    ...item,
    id:item.id||('scheduled-'+Number(item.day||0)),
    status:'completed',
    completedAt:now.toISOString(),
    response:responseIsSubstantive(response)?response.trim():'',
    verified:Boolean(verified),
    passed:verified&&typeof passed==='boolean'?passed:null,
    source
  };
  next.retentionDue=[...next.retentionDue];
  next.retentionDue[index]=completed;
  next.retentionHistory=[...(next.retentionHistory||[]),{
    id:completed.id,
    day:Number(item.day||0),dueAt:item.dueAt,completedAt:completed.completedAt,
    verified:completed.verified,passed:completed.passed,source,kind:item.kind||'scheduled'
  }];
  if(completed.verified&&typeof completed.passed==='boolean'){
    next.verifiedEvidence.retention={
      status:'verified',score:completed.passed?100:0,source,observedAt:now.toISOString()
    };
    if(completed.passed===false){
      const existingRecovery=next.retentionDue.some(entry=>entry?.status!=='completed'&&entry?.kind==='adaptive-recovery');
      if(!existingRecovery){
        const criticality=['L5','Expert'].includes(lesson?.level)?'high':'normal';
        const intervalDays=nextRetentionIntervalDays(next.retentionHistory,criticality);
        const due=new Date(now);
        due.setUTCDate(due.getUTCDate()+intervalDays);
        next.retentionDue.push({
          id:'recovery-'+now.getTime()+'-'+next.retentionHistory.length,
          day:intervalDays,
          intervalDays,
          evidence:'adaptive-retention-recovery',
          dueAt:due.toISOString(),
          status:'pending',
          kind:'adaptive-recovery',
          sourceReviewId:completed.id
        });
      }
    }
  }
  next.updatedAt=now.toISOString();
  return {ok:true,reason:null,progress:refreshMastery(lesson,next,now)};
}

export function canCompleteSection(section,response=''){
  return !sectionNeedsResponse(section)||responseIsSubstantive(response);
}

export function labPassed(progress,labId){
  return progress?.labEvidence?.[labId]?.passed===true;
}

export function recordLabAttempt(lesson,progress,labId,attempt,now=new Date()){
  if(!lesson?.lab||lesson.lab.id!==labId) throw new Error(`Unknown lesson lab: ${labId}`);
  const next=normalizeLessonProgress(lesson,progress,now);
  const previous=next.labEvidence[labId]||{attempts:0,passed:false,passedAt:null,lastPassed:false,lastSummary:null,lastAttemptAt:null};
  const passedNow=attempt?.passed===true;
  next.labEvidence[labId]={
    attempts:Number(previous.attempts||0)+1,
    passed:previous.passed===true||passedNow,
    passedAt:previous.passedAt||(passedNow?now.toISOString():null),
    lastPassed:passedNow,
    lastSummary:attempt?.summary??null,
    lastAttemptAt:now.toISOString()
  };
  next.verifiedEvidence.production={status:'verified',score:passedNow?100:0,source:'semantic-sql-lab',observedAt:now.toISOString()};
  next.updatedAt=now.toISOString();
  return refreshMastery(lesson,next,now);
}

export function recordCaseLabAttempt(lesson,progress,caseLabId,attempt,now=new Date()){
  if(!lesson?.case_lab||lesson.case_lab.id!==caseLabId) throw new Error(`Unknown lesson case lab: ${caseLabId}`);
  const next=normalizeLessonProgress(lesson,progress,now);
  const previous=next.labEvidence[caseLabId]||{attempts:0,passed:false,passedAt:null,lastPassed:false,lastSummary:null,lastAttemptAt:null};
  const passedNow=attempt?.passed===true;
  next.labEvidence[caseLabId]={
    attempts:Number(previous.attempts||0)+1,
    passed:previous.passed===true||passedNow,
    passedAt:previous.passedAt||(passedNow?now.toISOString():null),
    lastPassed:passedNow,
    lastSummary:attempt?.summary??null,
    lastAttemptAt:now.toISOString()
  };
  next.verifiedEvidence.production={status:'verified',score:passedNow?100:0,source:'semantic-case-lab',observedAt:now.toISOString()};
  next.updatedAt=now.toISOString();
  return refreshMastery(lesson,next,now);
}

export function recordPythonLabAttempt(lesson,progress,pythonLabId,attempt,now=new Date()){
  if(!lesson?.python_lab||lesson.python_lab.id!==pythonLabId) throw new Error(`Unknown lesson python lab: ${pythonLabId}`);
  const next=normalizeLessonProgress(lesson,progress,now);
  const previous=next.labEvidence[pythonLabId]||{attempts:0,passed:false,passedAt:null,lastPassed:false,lastSummary:null,lastAttemptAt:null};
  const passedNow=attempt?.passed===true;
  next.labEvidence[pythonLabId]={
    attempts:Number(previous.attempts||0)+1,
    passed:previous.passed===true||passedNow,
    passedAt:previous.passedAt||(passedNow?now.toISOString():null),
    lastPassed:passedNow,
    lastSummary:attempt?.summary??null,
    lastAttemptAt:now.toISOString()
  };
  next.verifiedEvidence.production={status:'verified',score:passedNow?100:0,source:'semantic-python-lab',observedAt:now.toISOString()};
  next.updatedAt=now.toISOString();
  return refreshMastery(lesson,next,now);
}

export function recordHtmlLabAttempt(lesson,progress,htmlLabId,attempt,now=new Date()){
  if(!lesson?.html_lab||lesson.html_lab.id!==htmlLabId) throw new Error(`Unknown lesson html lab: ${htmlLabId}`);
  const next=normalizeLessonProgress(lesson,progress,now);
  const previous=next.labEvidence[htmlLabId]||{attempts:0,passed:false,passedAt:null,lastPassed:false,lastSummary:null,lastAttemptAt:null};
  const passedNow=attempt?.passed===true;
  next.labEvidence[htmlLabId]={
    attempts:Number(previous.attempts||0)+1,
    passed:previous.passed===true||passedNow,
    passedAt:previous.passedAt||(passedNow?now.toISOString():null),
    lastPassed:passedNow,
    lastSummary:attempt?.summary??null,
    lastAttemptAt:now.toISOString()
  };
  next.verifiedEvidence.production={status:'verified',score:passedNow?100:0,source:'semantic-html-lab',observedAt:now.toISOString()};
  next.updatedAt=now.toISOString();
  return refreshMastery(lesson,next,now);
}

export function completionPercent(lesson,progress){
  const total=(lesson?.sections||[]).length;
  if(total===0) return 0;
  const completed=new Set(progress?.completedSections||[]);
  const count=(lesson.sections||[]).filter(section=>completed.has(section.id)).length;
  return Math.round((count/total)*100);
}

export function buildRetentionSchedule(lesson,completedAt){
  if(!completedAt) return [];
  const origin=new Date(completedAt);
  if(Number.isNaN(origin.getTime())) throw new Error('Invalid completedAt');
  const retention=(lesson.sections||[]).find(section=>section.layer==='retention');
  const schedule=retention?.schedule||[];
  return schedule.map(item=>{
    const day=Number(item.day||0);
    const due=new Date(origin);
    due.setUTCDate(due.getUTCDate()+day);
    return {id:'scheduled-'+day,day,evidence:item.evidence||'',dueAt:due.toISOString(),status:'pending',kind:'scheduled'};
  });
}

export function completeSection(lesson,progress,sectionId,response='',now=new Date()){
  const section=(lesson.sections||[]).find(item=>item.id===sectionId);
  if(!section) throw new Error(`Unknown section: ${sectionId}`);
  if(!canCompleteSection(section,response)) return {ok:false,reason:'response_required',progress};
  if(section.requires_lab_pass&&!labPassed(progress,section.requires_lab_pass)) return {ok:false,reason:'lab_required',progress};
  if(section.requires_case_lab_pass&&!labPassed(progress,section.requires_case_lab_pass)) return {ok:false,reason:'case_lab_required',progress};
  if(section.requires_python_lab_pass&&!labPassed(progress,section.requires_python_lab_pass)) return {ok:false,reason:'python_lab_required',progress};
  if(section.requires_html_lab_pass&&!labPassed(progress,section.requires_html_lab_pass)) return {ok:false,reason:'html_lab_required',progress};

  const next=normalizeLessonProgress(lesson,progress,now);
  if(responseIsSubstantive(response)) next.responses[sectionId]=response.trim();
  next.completedSections=[...new Set([...next.completedSections,sectionId])];
  next.updatedAt=now.toISOString();
  if(next.completedSections.length===lesson.sections.length&&!next.completedAt){
    next.completedAt=now.toISOString();
    next.retentionDue=buildRetentionSchedule(lesson,next.completedAt);
  }
  return {ok:true,reason:null,progress:refreshMastery(lesson,next,now)};
}

export function saveEvidenceDraft(lesson,progress,dimension,value,now=new Date()){
  const allowed=new Set((lesson.mastery_evidence||[]).map(item=>item.dimension));
  if(!allowed.has(dimension)) throw new Error(`Unknown evidence dimension: ${dimension}`);
  const next=normalizeLessonProgress(lesson,progress,now);
  next.evidenceDrafts[dimension]=String(value??'');
  next.updatedAt=now.toISOString();
  return refreshMastery(lesson,next,now);
}

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
    version:1,
    lessonId:lesson.id,
    startedAt:now.toISOString(),
    updatedAt:now.toISOString(),
    completedAt:null,
    completedSections:[],
    responses:{},
    evidenceDrafts:{},
    retentionDue:[]
  };
}

export function normalizeLessonProgress(lesson,value,now=new Date()){
  const base=createLessonProgress(lesson,now);
  if(!value||value.lessonId!==lesson.id) return base;
  const validIds=new Set((lesson.sections||[]).map(section=>section.id));
  const completed=[...new Set((value.completedSections||[]).filter(id=>validIds.has(id)))];
  return {
    ...base,
    ...value,
    version:1,
    lessonId:lesson.id,
    completedSections:completed,
    responses:{...(value.responses||{})},
    evidenceDrafts:{...(value.evidenceDrafts||{})},
    retentionDue:Array.isArray(value.retentionDue)?value.retentionDue:[]
  };
}

export function sectionNeedsResponse(section){
  return RESPONSE_LAYERS.includes(section?.layer);
}

export function responseIsSubstantive(value){
  return typeof value==='string'&&value.trim().length>=20;
}

export function canCompleteSection(section,response=''){
  return !sectionNeedsResponse(section)||responseIsSubstantive(response);
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
    const due=new Date(origin);
    due.setUTCDate(due.getUTCDate()+Number(item.day||0));
    return {day:Number(item.day||0),evidence:item.evidence||'',dueAt:due.toISOString(),status:'pending'};
  });
}

export function completeSection(lesson,progress,sectionId,response='',now=new Date()){
  const section=(lesson.sections||[]).find(item=>item.id===sectionId);
  if(!section) throw new Error(`Unknown section: ${sectionId}`);
  if(!canCompleteSection(section,response)) return {ok:false,reason:'response_required',progress};

  const next=normalizeLessonProgress(lesson,progress,now);
  if(responseIsSubstantive(response)) next.responses[sectionId]=response.trim();
  next.completedSections=[...new Set([...next.completedSections,sectionId])];
  next.updatedAt=now.toISOString();

  if(next.completedSections.length===lesson.sections.length&&!next.completedAt){
    next.completedAt=now.toISOString();
    next.retentionDue=buildRetentionSchedule(lesson,next.completedAt);
  }
  return {ok:true,reason:null,progress:next};
}

export function saveEvidenceDraft(lesson,progress,dimension,value,now=new Date()){
  const allowed=new Set((lesson.mastery_evidence||[]).map(item=>item.dimension));
  if(!allowed.has(dimension)) throw new Error(`Unknown evidence dimension: ${dimension}`);
  const next=normalizeLessonProgress(lesson,progress,now);
  next.evidenceDrafts[dimension]=String(value??'');
  next.updatedAt=now.toISOString();
  return next;
}

export const REQUIRED_LAYERS=Object.freeze([
  'mental_model','worked_example','guided_practice','independent_practice','debugging','transfer','retention'
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

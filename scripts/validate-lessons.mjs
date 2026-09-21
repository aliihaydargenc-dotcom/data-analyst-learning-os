import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
const curriculum=JSON.parse(fs.readFileSync('content/curriculum.json','utf8'));
const sources=JSON.parse(fs.readFileSync('content/sources.json','utf8'));
const modules=new Map(curriculum.tracks.flatMap(track=>track.modules).map(module=>[module.id,module]));
const REQUIRED_LAYERS=['mental_model','worked_example','guided_practice','independent_practice','debugging','transfer','retention'];
const REQUIRED_EVIDENCE=['knowledge','interpretation','production','transfer'];
const errors=[];
const fail=message=>errors.push(message);
const ids=new Set();
const paths=new Set();
const orders=new Set();
const catalogIds=new Set((catalog.production_lessons||[]).map(entry=>entry.id));
const labIds=new Set();
const pythonLabIds=new Set();
const htmlLabIds=new Set();
let previousOrder=0;

for(const entry of catalog.production_lessons||[]){
  if(ids.has(entry.id)) fail(`Duplicate lesson id: ${entry.id}`);
  if(paths.has(entry.path)) fail(`Duplicate lesson path: ${entry.path}`);
  if(!Number.isInteger(entry.order)||entry.order<1) fail(`${entry.id}: positive integer order required`);
  if(orders.has(entry.order)) fail(`Duplicate lesson order: ${entry.order}`);
  if(entry.order<previousOrder) fail(`${entry.id}: catalog order must be ascending`);
  if(entry.runtime!==`lesson.html?id=${entry.id}`) fail(`${entry.id}: runtime URL mismatch`);
  ids.add(entry.id); paths.add(entry.path); orders.add(entry.order); previousOrder=entry.order;

  if(!fs.existsSync(entry.path)){fail(`Missing lesson file: ${entry.path}`);continue;}
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  const module=modules.get(lesson.module_id);

  if(lesson.id!==entry.id) fail(`${entry.id}: catalog/file id mismatch`);
  if(lesson.module_id!==entry.module_id) fail(`${entry.id}: module mismatch`);
  if(!module) fail(`${entry.id}: unknown curriculum module ${lesson.module_id}`);
  if(module&&lesson.track!==module.track) fail(`${entry.id}: lesson/module track mismatch`);
  if(module&&lesson.level!==module.level) fail(`${entry.id}: lesson/module level mismatch`);
  if(lesson.status!=='production-candidate'&&lesson.status!=='production') fail(`${entry.id}: invalid status`);
  for(const prerequisite of lesson.prerequisites||[]){
    if(prerequisite.includes('.001')&&!catalogIds.has(prerequisite)) fail(`${entry.id}: unknown lesson prerequisite ${prerequisite}`);
  }

  if(!lesson.title_tr?.trim()||!lesson.title_en?.trim()) fail(`${entry.id}: bilingual title required`);
  if(!lesson.subtitle_tr?.trim()||!lesson.subtitle_en?.trim()) fail(`${entry.id}: bilingual subtitle required`);
  if(!lesson.why_it_matters_tr?.trim()||lesson.why_it_matters_tr.trim().length<120) fail(`${entry.id}: why_it_matters_tr too shallow`);
  if(!Array.isArray(lesson.estimated_minutes_range)||lesson.estimated_minutes_range.length!==2||lesson.estimated_minutes_range[0]<15||lesson.estimated_minutes_range[1]<lesson.estimated_minutes_range[0]) fail(`${entry.id}: invalid estimated_minutes_range`);
  if(!Array.isArray(lesson.learning_objectives)||lesson.learning_objectives.length<4) fail(`${entry.id}: needs >=4 learning objectives`);
  if(!Array.isArray(lesson.sections)||lesson.sections.length<7) fail(`${entry.id}: needs layered sections`);

  const sectionIds=new Set();
  const layers=new Set((lesson.sections||[]).map(section=>section.layer));
  for(const layer of REQUIRED_LAYERS) if(!layers.has(layer)) fail(`${entry.id}: missing ${layer}`);

  for(const section of lesson.sections||[]){
    if(sectionIds.has(section.id)) fail(`${entry.id}: duplicate section id ${section.id}`);
    sectionIds.add(section.id);
    if(!section.title_tr?.trim()||!section.title_en?.trim()) fail(`${entry.id}/${section.id}: bilingual title required`);
    if(!section.body_tr?.trim()||section.body_tr.trim().length<120) fail(`${entry.id}/${section.id}: body_tr too shallow`);
    if(!section.body_en?.trim()||section.body_en.trim().length<90) fail(`${entry.id}/${section.id}: body_en too shallow`);

    if(section.layer==='guided_practice'&&(!Array.isArray(section.prompts)||section.prompts.length<2)) fail(`${entry.id}/${section.id}: guided practice needs prompts`);
    if(section.layer==='independent_practice'&&(!Array.isArray(section.evidence_required)||section.evidence_required.length<2)) fail(`${entry.id}/${section.id}: independent practice needs evidence_required`);
    if(section.layer==='debugging'&&(!Array.isArray(section.diagnostic_sequence)||section.diagnostic_sequence.length<3)) fail(`${entry.id}/${section.id}: debugging needs diagnostic_sequence`);
    if(section.layer==='transfer'&&(!Array.isArray(section.transfer_tasks)||section.transfer_tasks.length<2)) fail(`${entry.id}/${section.id}: transfer needs >=2 tasks`);
    if(section.layer==='retention'&&(!Array.isArray(section.schedule)||section.schedule.length<3)) fail(`${entry.id}/${section.id}: retention needs >=3 checkpoints`);
  }

  const labRequiredSections=(lesson.sections||[]).filter(section=>section.requires_lab_pass);
  if(lesson.lab){
    if(!lesson.lab.id?.trim()) fail(`${entry.id}: lab id required`);
    else if(labIds.has(lesson.lab.id)) fail(`${entry.id}: duplicate lab id ${lesson.lab.id}`);
    else labIds.add(lesson.lab.id);
    if(!lesson.lab.title_tr?.trim()||!lesson.lab.title_en?.trim()) fail(`${entry.id}: bilingual lab title required`);
    if(!lesson.lab.task_tr?.trim()||lesson.lab.task_tr.trim().length<100) fail(`${entry.id}: lab task_tr too shallow`);
    if(!lesson.lab.task_en?.trim()||lesson.lab.task_en.trim().length<80) fail(`${entry.id}: lab task_en too shallow`);
    if(!lesson.lab.schema?.trim()) fail(`${entry.id}: lab schema required`);
    if(!/^(SELECT|WITH)\b/i.test(lesson.lab.starter_sql?.trim()||'')) fail(`${entry.id}: lab starter_sql must begin with SELECT or WITH`);
    if(!lesson.lab.engine_note_tr?.trim()||!lesson.lab.engine_note_en?.trim()) fail(`${entry.id}: bilingual engine note required`);
    const requiredSection=(lesson.sections||[]).find(section=>section.id===lesson.lab.requires_for_section);
    if(!requiredSection) fail(`${entry.id}: lab requires_for_section not found`);
    else if(requiredSection.requires_lab_pass!==lesson.lab.id) fail(`${entry.id}: section lab gate does not match lesson lab id`);
  }
  for(const section of labRequiredSections){
    if(!lesson.lab||section.requires_lab_pass!==lesson.lab.id) fail(`${entry.id}/${section.id}: invalid requires_lab_pass`);
  }
  const caseLabRequiredSections=(lesson.sections||[]).filter(section=>section.requires_case_lab_pass);
  if(lesson.case_lab){
    if(!lesson.case_lab.id?.trim()) fail(`${entry.id}: case_lab id required`);
    if(!lesson.case_lab.title_tr?.trim()||!lesson.case_lab.title_en?.trim()) fail(`${entry.id}: bilingual case_lab title required`);
    if(!lesson.case_lab.task_tr?.trim()||lesson.case_lab.task_tr.trim().length<80) fail(`${entry.id}: case_lab task_tr too shallow`);
    if(!Array.isArray(lesson.case_lab.cases)||lesson.case_lab.cases.length<3) fail(`${entry.id}: case_lab needs >=3 cases`);
    const requiredSection=(lesson.sections||[]).find(section=>section.id===lesson.case_lab.requires_for_section);
    if(!requiredSection) fail(`${entry.id}: case_lab requires_for_section not found`);
    else if(requiredSection.requires_case_lab_pass!==lesson.case_lab.id) fail(`${entry.id}: section case-lab gate mismatch`);
    const caseIds=new Set();
    for(const item of lesson.case_lab.cases||[]){
      if(!item.id?.trim()||caseIds.has(item.id)) fail(`${entry.id}: invalid/duplicate case id ${item.id}`);
      caseIds.add(item.id);
      if(!item.prompt_tr?.trim()||!item.prompt_en?.trim()) fail(`${entry.id}/${item.id}: bilingual case prompt required`);
      if(!Array.isArray(item.options)||item.options.length<2) fail(`${entry.id}/${item.id}: >=2 options required`);
      const optionIds=new Set((item.options||[]).map(option=>option.id));
      if(!optionIds.has(item.answer)) fail(`${entry.id}/${item.id}: answer must match an option`);
      for(const option of item.options||[]) if(!option.label_tr?.trim()||!option.label_en?.trim()) fail(`${entry.id}/${item.id}: bilingual option required`);
    }
  }
  for(const section of caseLabRequiredSections){
    if(!lesson.case_lab||section.requires_case_lab_pass!==lesson.case_lab.id) fail(`${entry.id}/${section.id}: invalid requires_case_lab_pass`);
  }

  const pythonLabRequiredSections=(lesson.sections||[]).filter(section=>section.requires_python_lab_pass);
  if(lesson.python_lab){
    if(!lesson.python_lab.id?.trim()) fail(`${entry.id}: python_lab id required`);
    else if(pythonLabIds.has(lesson.python_lab.id)) fail(`${entry.id}: duplicate python_lab id ${lesson.python_lab.id}`);
    else pythonLabIds.add(lesson.python_lab.id);
    if(!lesson.python_lab.title_tr?.trim()||!lesson.python_lab.title_en?.trim()) fail(`${entry.id}: bilingual python_lab title required`);
    if(!lesson.python_lab.task_tr?.trim()||lesson.python_lab.task_tr.trim().length<100) fail(`${entry.id}: python_lab task_tr too shallow`);
    if(!lesson.python_lab.task_en?.trim()||lesson.python_lab.task_en.trim().length<80) fail(`${entry.id}: python_lab task_en too shallow`);
    if(!lesson.python_lab.starter_code?.trim()) fail(`${entry.id}: python_lab starter_code required`);
    if(!Array.isArray(lesson.python_lab.packages)) fail(`${entry.id}: python_lab packages must be an array`);
    if(!lesson.python_lab.engine_note_tr?.trim()||!lesson.python_lab.engine_note_en?.trim()) fail(`${entry.id}: bilingual python engine note required`);
    const requiredSection=(lesson.sections||[]).find(section=>section.id===lesson.python_lab.requires_for_section);
    if(!requiredSection) fail(`${entry.id}: python_lab requires_for_section not found`);
    else if(requiredSection.requires_python_lab_pass!==lesson.python_lab.id) fail(`${entry.id}: section python-lab gate mismatch`);
  }
  for(const section of pythonLabRequiredSections){
    if(!lesson.python_lab||section.requires_python_lab_pass!==lesson.python_lab.id) fail(`${entry.id}/${section.id}: invalid requires_python_lab_pass`);
  }

  const htmlLabRequiredSections=(lesson.sections||[]).filter(section=>section.requires_html_lab_pass);
  if(lesson.html_lab){
    if(!lesson.html_lab.id?.trim()) fail(`${entry.id}: html_lab id required`);
    else if(htmlLabIds.has(lesson.html_lab.id)) fail(`${entry.id}: duplicate html_lab id ${lesson.html_lab.id}`);
    else htmlLabIds.add(lesson.html_lab.id);
    if(!lesson.html_lab.title_tr?.trim()||!lesson.html_lab.title_en?.trim()) fail(`${entry.id}: bilingual html_lab title required`);
    if(!lesson.html_lab.task_tr?.trim()||lesson.html_lab.task_tr.trim().length<100) fail(`${entry.id}: html_lab task_tr too shallow`);
    if(!lesson.html_lab.task_en?.trim()||lesson.html_lab.task_en.trim().length<80) fail(`${entry.id}: html_lab task_en too shallow`);
    if(!lesson.html_lab.starter_html?.trim()) fail(`${entry.id}: html_lab starter_html required`);
    if(!lesson.html_lab.engine_note_tr?.trim()||!lesson.html_lab.engine_note_en?.trim()) fail(`${entry.id}: bilingual html engine note required`);
    const requiredSection=(lesson.sections||[]).find(section=>section.id===lesson.html_lab.requires_for_section);
    if(!requiredSection) fail(`${entry.id}: html_lab requires_for_section not found`);
    else if(requiredSection.requires_html_lab_pass!==lesson.html_lab.id) fail(`${entry.id}: section html-lab gate mismatch`);
  }
  for(const section of htmlLabRequiredSections){if(!lesson.html_lab||section.requires_html_lab_pass!==lesson.html_lab.id) fail(`${entry.id}/${section.id}: invalid requires_html_lab_pass`);}

  const evidence=new Set((lesson.mastery_evidence||[]).map(item=>item.dimension));
  for(const dimension of REQUIRED_EVIDENCE) if(!evidence.has(dimension)) fail(`${entry.id}: missing evidence ${dimension}`);
  for(const item of lesson.mastery_evidence||[]){
    if(!item.task_tr?.trim()||item.task_tr.trim().length<40) fail(`${entry.id}: weak mastery task ${item.dimension}`);
  }

  const weightTotal=(lesson.mastery_evidence||[]).reduce((sum,item)=>sum+(item.weight||0),0);
  if(weightTotal!==100) fail(`${entry.id}: evidence weights must total 100, got ${weightTotal}`);

  const lessonSources=(lesson.sources||[]).map(id=>({id,source:sources[id]}));
  for(const {id,source} of lessonSources) if(!source) fail(`${entry.id}: unknown source ${id}`);
  if(!lessonSources.some(item=>item.source?.type==='official')) fail(`${entry.id}: needs at least one official technical source`);
  if(!lessonSources.some(item=>item.source?.type==='academic')) fail(`${entry.id}: needs at least one academic learning source`);
}

if((catalog.production_lessons||[]).length===0) fail('At least one production lesson is required');

if(errors.length){
  console.error('PRODUCTION LESSON VALIDATION FAILED');
  for(const error of errors) console.error(' - '+error);
  process.exit(1);
}
console.log(`production lesson validation: PASS · ${catalog.production_lessons.length} lesson(s)`);

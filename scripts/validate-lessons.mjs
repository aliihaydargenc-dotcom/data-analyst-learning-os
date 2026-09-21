import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('content/lesson-catalog.json','utf8'));
const curriculum=JSON.parse(fs.readFileSync('content/curriculum.json','utf8'));
const sources=JSON.parse(fs.readFileSync('content/sources.json','utf8'));
const modules=new Map(curriculum.tracks.flatMap(track=>track.modules).map(module=>[module.id,module]));
const REQUIRED_LAYERS=['mental_model','worked_example','guided_practice','independent_practice','debugging','transfer','retention'];
const REQUIRED_EVIDENCE=['knowledge','interpretation','production','transfer'];
const errors=[];
const fail=message=>errors.push(message);

for(const entry of catalog.production_lessons||[]){
  if(!fs.existsSync(entry.path)){fail(`Missing lesson file: ${entry.path}`);continue;}
  const lesson=JSON.parse(fs.readFileSync(entry.path,'utf8'));
  if(lesson.id!==entry.id) fail(`${entry.id}: catalog/file id mismatch`);
  if(lesson.module_id!==entry.module_id) fail(`${entry.id}: module mismatch`);
  if(!modules.has(lesson.module_id)) fail(`${entry.id}: unknown curriculum module ${lesson.module_id}`);
  if(lesson.status!=='production-candidate'&&lesson.status!=='production') fail(`${entry.id}: invalid status`);
  if(!Array.isArray(lesson.learning_objectives)||lesson.learning_objectives.length<3) fail(`${entry.id}: needs >=3 learning objectives`);
  if(!Array.isArray(lesson.sections)||lesson.sections.length<7) fail(`${entry.id}: needs layered sections`);

  const layers=new Set((lesson.sections||[]).map(section=>section.layer));
  for(const layer of REQUIRED_LAYERS) if(!layers.has(layer)) fail(`${entry.id}: missing ${layer}`);

  for(const section of lesson.sections||[]){
    if(!section.title_tr?.trim()) fail(`${entry.id}/${section.id}: title_tr required`);
    if(!section.body_tr?.trim()||section.body_tr.trim().length<120) fail(`${entry.id}/${section.id}: body_tr too shallow`);
  }

  const evidence=new Set((lesson.mastery_evidence||[]).map(item=>item.dimension));
  for(const dimension of REQUIRED_EVIDENCE) if(!evidence.has(dimension)) fail(`${entry.id}: missing evidence ${dimension}`);

  const weightTotal=(lesson.mastery_evidence||[]).reduce((sum,item)=>sum+(item.weight||0),0);
  if(weightTotal!==100) fail(`${entry.id}: evidence weights must total 100, got ${weightTotal}`);

  for(const sourceId of lesson.sources||[]) if(!sources[sourceId]) fail(`${entry.id}: unknown source ${sourceId}`);
}

if((catalog.production_lessons||[]).length===0) fail('At least one production lesson is required');

if(errors.length){
  console.error('PRODUCTION LESSON VALIDATION FAILED');
  for(const error of errors) console.error(' - '+error);
  process.exit(1);
}
console.log(`production lesson validation: PASS · ${catalog.production_lessons.length} lesson(s)`);

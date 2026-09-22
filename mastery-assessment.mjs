export const MASTERY_ASSESSMENT_VERSION=1;
export const CORE_ASSESSMENT_DIMENSIONS=Object.freeze(['knowledge','interpretation','transfer']);

const TR_DISTRACTORS=Object.freeze({
  knowledge:[
    'Yalnızca syntax veya arayüz adımlarını ezberlemek yeterlidir.',
    'Çıktı üretildiyse ayrıca doğrulama kanıtına gerek yoktur.',
    'Grain, state, context veya cardinality değişiklikleri sonucu etkilemez.'
  ],
  interpretation:[
    'Semptom görülür görülmez birden fazla katmanı aynı anda değiştir.',
    'Beklenen sonucu tanımlamadan doğrudan syntax değiştir.',
    'Kanıt toplamadan ilk görünen açıklamayı root-cause kabul et.'
  ],
  production:[
    'Çalıştığını görmek yeterlidir; edge-case veya reconciliation gerekmez.',
    'Üretim kanıtı yerine yalnızca uzun bir açıklama yazmak yeterlidir.',
    'Hedef grain ve doğrulama sözleşmesi olmadan çıktıyı kabul et.'
  ],
  transfer:[
    'Kaynak araçtaki syntaxı bağlamı değiştirmeden kopyala.',
    'Hedef aracın grain, state veya context farklarını yok say.',
    'Doğrulama adımını kaldır ve yalnız çıktı biçimini eşleştir.'
  ]
});
const EN_DISTRACTORS=Object.freeze({
  knowledge:[
    'Memorizing syntax or interface steps is sufficient by itself.',
    'Once output is produced, no validation evidence is needed.',
    'Changes in grain, state, context, or cardinality do not affect the result.'
  ],
  interpretation:[
    'Change several layers at once as soon as a symptom appears.',
    'Change syntax before defining the expected result.',
    'Treat the first visible explanation as root cause without evidence.'
  ],
  production:[
    'If it runs, edge cases and reconciliation are unnecessary.',
    'A long written explanation is enough to prove production correctness.',
    'Accept output without an explicit target grain and validation contract.'
  ],
  transfer:[
    'Copy source-tool syntax unchanged into the target context.',
    'Ignore grain, state, and context differences in the target tool.',
    'Remove validation and only match the output format.'
  ]
});

function clean(value){return typeof value==='string'?value.trim():'';}
function unique(values){
  const seen=new Set(),out=[];
  for(const value of values){
    const text=clean(value);
    if(text&&!seen.has(text)){seen.add(text);out.push(text);}
  }
  return out;
}
function stableHash(value){
  let hash=2166136261;
  for(const char of String(value)){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}
function rotate(values,seed){
  if(values.length<2)return values;
  const offset=stableHash(seed)%values.length;
  const rotated=[...values.slice(offset),...values.slice(0,offset)];
  return stableHash(seed+'-reverse')%2?[...rotated].reverse():rotated;
}
function localizedOptions(correctTr,correctEn,distractorsTr,distractorsEn,seed){
  const tr=unique([correctTr,...distractorsTr]).slice(0,4);
  const enByTr=new Map();
  enByTr.set(clean(correctTr),clean(correctEn)||clean(correctTr));
  distractorsTr.forEach((item,index)=>enByTr.set(clean(item),clean(distractorsEn[index])||clean(item)));
  const ordered=rotate(tr,seed);
  return {
    options:ordered.map((label,index)=>({id:`o${index+1}`,label_tr:label,label_en:enByTr.get(label)||label})),
    answerId:`o${ordered.indexOf(clean(correctTr))+1}`
  };
}
function makeQuestion({lesson,id,dimension,prompt_tr,prompt_en,correct_tr,correct_en,distractors_tr,distractors_en}){
  const choice=localizedOptions(correct_tr,correct_en,distractors_tr,distractors_en,`${lesson.id}:${id}`);
  return {id,dimension,prompt_tr,prompt_en,options:choice.options,answerId:choice.answerId};
}
function evidenceTask(lesson,dimension){
  return (lesson.mastery_evidence||[]).find(item=>item.dimension===dimension)||{};
}
function knowledgeItems(lesson){
  const mental=(lesson.sections||[]).filter(section=>section.layer==='mental_model');
  const candidates=unique([
    ...(lesson.learning_objectives||[]).slice(0,2),
    ...mental.flatMap(section=>(section.checks||[]).slice(0,2)),
    evidenceTask(lesson,'knowledge').task_tr
  ]).slice(0,3);
  return candidates.map((correct,index)=>makeQuestion({
    lesson,id:`knowledge-${index+1}`,dimension:'knowledge',
    prompt_tr:'Aşağıdaki ifadelerden hangisi bu dersin doğruladığı temel yaklaşımın parçasıdır?',
    prompt_en:'Which statement is part of the validated approach taught in this lesson?',
    correct_tr:correct,correct_en:correct,
    distractors_tr:TR_DISTRACTORS.knowledge,distractors_en:EN_DISTRACTORS.knowledge
  }));
}
function interpretationItems(lesson){
  const debugging=(lesson.sections||[]).find(section=>section.layer==='debugging')||{};
  const sequence=unique(debugging.diagnostic_sequence||debugging.prompts||[]);
  if(sequence.length>=2){
    const choices=sequence.slice(0,4);
    return sequence.slice(0,Math.min(3,sequence.length)).map((correct,index)=>makeQuestion({
      lesson,id:`interpretation-${index+1}`,dimension:'interpretation',
      prompt_tr:`Dersin kontrollü debug sırasına göre ${index+1}. adım hangisidir?`,
      prompt_en:`According to the lesson's controlled debugging sequence, what is step ${index+1}?`,
      correct_tr:correct,correct_en:correct,
      distractors_tr:[...choices.filter(item=>item!==correct),...TR_DISTRACTORS.interpretation],
      distractors_en:[...choices.filter(item=>item!==correct),...EN_DISTRACTORS.interpretation]
    }));
  }
  const fallback=clean(evidenceTask(lesson,'interpretation').task_tr)||clean(debugging.body_tr);
  return [makeQuestion({
    lesson,id:'interpretation-1',dimension:'interpretation',
    prompt_tr:'Bu dersin yorumlama/teşhis yaklaşımıyla uyumlu görev hangisidir?',
    prompt_en:'Which task matches this lesson\'s interpretation and diagnosis approach?',
    correct_tr:fallback,correct_en:fallback,
    distractors_tr:TR_DISTRACTORS.interpretation,distractors_en:EN_DISTRACTORS.interpretation
  })];
}
function productionItems(lesson){
  const independent=(lesson.sections||[]).find(section=>section.layer==='independent_practice')||{};
  const task=clean(evidenceTask(lesson,'production').task_tr)||clean(independent.body_tr);
  const required=unique(independent.evidence_required||[]);
  const candidates=unique([task,...required]).slice(0,3);
  return candidates.map((correct,index)=>makeQuestion({
    lesson,id:`production-${index+1}`,dimension:'production',
    prompt_tr:index===0?'Bu dersin bağımsız üretim hedefi hangisidir?':'Bağımsız üretim için açıkça beklenen kanıtlardan hangisi doğrudur?',
    prompt_en:index===0?'What is the independent production target for this lesson?':'Which item is explicitly required as independent-production evidence?',
    correct_tr:correct,correct_en:correct,
    distractors_tr:TR_DISTRACTORS.production,distractors_en:EN_DISTRACTORS.production
  }));
}
function transferItems(lesson){
  const transfer=(lesson.sections||[]).find(section=>section.layer==='transfer')||{};
  const tasks=(transfer.transfer_tasks||[]).filter(item=>item&&clean(item.task_tr));
  if(tasks.length){
    const trChoices=tasks.map(item=>clean(item.task_tr));
    const enChoices=tasks.map(item=>clean(item.task_en)||clean(item.task_tr));
    return tasks.slice(0,3).map((item,index)=>makeQuestion({
      lesson,id:`transfer-${index+1}`,dimension:'transfer',
      prompt_tr:`Bu dersi ${clean(item.tool)||'başka bir araç'} bağlamına taşırken tanımlanan görev hangisidir?`,
      prompt_en:`Which task is defined when transferring this lesson to ${clean(item.tool)||'another tool'}?`,
      correct_tr:clean(item.task_tr),correct_en:clean(item.task_en)||clean(item.task_tr),
      distractors_tr:[...trChoices.filter(value=>value!==clean(item.task_tr)),...TR_DISTRACTORS.transfer],
      distractors_en:[...enChoices.filter(value=>value!==(clean(item.task_en)||clean(item.task_tr))),...EN_DISTRACTORS.transfer]
    }));
  }
  const fallback=clean(evidenceTask(lesson,'transfer').task_tr)||clean(transfer.body_tr);
  return [makeQuestion({
    lesson,id:'transfer-1',dimension:'transfer',
    prompt_tr:'Bu dersin transfer hedefiyle uyumlu görev hangisidir?',
    prompt_en:'Which task matches this lesson\'s transfer target?',
    correct_tr:fallback,correct_en:fallback,
    distractors_tr:TR_DISTRACTORS.transfer,distractors_en:EN_DISTRACTORS.transfer
  })];
}
export function hasSemanticProductionLab(lesson){
  return Boolean(lesson?.lab?.id||lesson?.case_lab?.id||lesson?.python_lab?.id||lesson?.html_lab?.id);
}
function allAssessmentDimensions(lesson){
  return [
    {dimension:'knowledge',items:knowledgeItems(lesson)},
    {dimension:'interpretation',items:interpretationItems(lesson)},
    ...(!hasSemanticProductionLab(lesson)?[{dimension:'production',items:productionItems(lesson)}]:[]),
    {dimension:'transfer',items:transferItems(lesson)}
  ];
}
export function buildMasteryAssessment(lesson,requestedDimensions=null){
  if(!lesson?.id)throw new Error('Mastery assessment requires a lesson id');
  const all=allAssessmentDimensions(lesson);
  const allowed=new Set(all.map(group=>group.dimension));
  const requested=Array.isArray(requestedDimensions)&&requestedDimensions.length?[...new Set(requestedDimensions)]:null;
  if(requested){
    const invalid=requested.filter(dimension=>!allowed.has(dimension));
    if(invalid.length)throw new Error(`Unsupported mastery assessment dimensions for ${lesson.id}: ${invalid.join(',')}`);
  }
  const dimensions=requested?all.filter(group=>requested.includes(group.dimension)):all;
  for(const dimension of dimensions){
    if(!dimension.items.length)throw new Error(`No mastery assessment items for ${lesson.id}:${dimension.dimension}`);
  }
  return {version:MASTERY_ASSESSMENT_VERSION,lessonId:lesson.id,dimensions,scope:requested||all.map(group=>group.dimension)};
}
export function evaluateMasteryAssessment(lesson,answers={},requestedDimensions=null){
  const assessment=buildMasteryAssessment(lesson,requestedDimensions);
  let complete=true;
  const dimensions={},items=[];
  for(const group of assessment.dimensions){
    let correct=0,answered=0;
    for(const item of group.items){
      const selected=typeof answers[item.id]==='string'?answers[item.id]:null;
      const isAnswered=Boolean(selected);
      const passed=isAnswered&&selected===item.answerId;
      if(isAnswered)answered++;else complete=false;
      if(passed)correct++;
      items.push({id:item.id,dimension:group.dimension,selected,passed});
    }
    const total=group.items.length;
    dimensions[group.dimension]={
      score:Math.round((correct/total)*1000)/10,
      correct,total,answered
    };
  }
  return {version:assessment.version,lessonId:assessment.lessonId,complete,dimensions,items,scope:assessment.scope};
}

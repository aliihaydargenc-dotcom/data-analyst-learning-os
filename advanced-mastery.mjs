export const ADVANCED_MASTERY_VERSION=1;

const DISTRACTORS=Object.freeze({
  rubric:[
    'Çıktı çalışıyorsa ayrıca contract veya validation kanıtına gerek yoktur.',
    'Tek bir başarı metriği yeterlidir; trade-off ve failure sınırları ayrıca değerlendirilmez.',
    'Kararı hızlandırmak için assumption, evidence ve preference aynı kabul edilebilir.'
  ],
  capstone:[
    'Yalnızca happy-path sonucu göster; edge-case ve rollback kanıtını kapsam dışında bırak.',
    'Kaynak araçtaki çözümü bağlamı değiştirmeden kopyalamak yeterlidir.',
    'Doğruluk kanıtı olmadan daha hızlı veya daha kısa çözümü kabul et.'
  ],
  architectureReview:[
    'Review yalnız syntax ve biçim tercihlerini kontrol eder.',
    'Operational risk, observability ve rollback review kapsamının dışındadır.',
    'Acceptance criteria yerine reviewer preference yeterli karar kapısıdır.'
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
  for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}
function rotate(values,seed){
  if(values.length<2)return values;
  const offset=stableHash(seed)%values.length;
  const rotated=[...values.slice(offset),...values.slice(0,offset)];
  return stableHash(seed+'-reverse')%2?[...rotated].reverse():rotated;
}
function optionSet(correct,distractors,seed){
  const values=unique([correct,...distractors]).slice(0,4);
  if(values.length<2)throw new Error('Advanced mastery item has insufficient options: '+seed);
  const ordered=rotate(values,seed);
  const index=ordered.indexOf(clean(correct));
  if(index<0)throw new Error('Advanced mastery answer could not be resolved: '+seed);
  return {
    options:ordered.map((label,i)=>({id:'o'+(i+1),label_tr:label,label_en:label})),
    answerId:'o'+(index+1)
  };
}
function question(lesson,gate,id,promptTr,promptEn,correct,distractors=[]){
  const choices=optionSet(correct,[...distractors,...DISTRACTORS[gate]],lesson.id+':'+gate+':'+id);
  return {id:gate+'-'+id,gate,prompt_tr:promptTr,prompt_en:promptEn,options:choices.options,answerId:choices.answerId};
}
function evidenceTask(lesson,dimension){
  return clean((lesson.mastery_evidence||[]).find(item=>item.dimension===dimension)?.task_tr);
}
function lessonSignals(lesson){
  const sections=lesson.sections||[];
  const mental=sections.filter(section=>section.layer==='mental_model');
  const independent=sections.find(section=>section.layer==='independent_practice')||{};
  const debugging=sections.find(section=>section.layer==='debugging')||{};
  const transfer=sections.find(section=>section.layer==='transfer')||{};
  const retention=sections.find(section=>section.layer==='retention')||{};
  const objectives=unique(lesson.learning_objectives||[]);
  const checks=unique(mental.flatMap(section=>section.checks||[]));
  const required=unique(independent.evidence_required||[]);
  const diagnostics=unique(debugging.diagnostic_sequence||debugging.prompts||[]);
  const transferTasks=(transfer.transfer_tasks||[]).map(item=>clean(item?.task_tr)).filter(Boolean);
  const retentionSignals=unique([retention.body_tr,...(retention.schedule||[]).map(item=>item?.evidence)]);
  const fallback=clean(lesson.why_it_matters_tr)||clean(lesson.subtitle_tr)||lesson.id;
  return {
    contract:objectives[0]||checks[0]||evidenceTask(lesson,'knowledge')||fallback,
    secondObjective:objectives[1]||checks[1]||evidenceTask(lesson,'knowledge')||fallback,
    evidence:required[0]||evidenceTask(lesson,'production')||clean(independent.body_tr)||fallback,
    evidenceAlt:required[1]||evidenceTask(lesson,'production')||clean(independent.body_tr)||fallback,
    diagnosis:diagnostics[0]||evidenceTask(lesson,'interpretation')||clean(debugging.body_tr)||fallback,
    diagnosisAlt:diagnostics.at(-1)||evidenceTask(lesson,'interpretation')||clean(debugging.body_tr)||fallback,
    transfer:transferTasks[0]||evidenceTask(lesson,'transfer')||clean(transfer.body_tr)||fallback,
    transferAlt:transferTasks[1]||evidenceTask(lesson,'transfer')||clean(transfer.body_tr)||fallback,
    retention:retentionSignals[0]||'Öğrenilen contract kaynaklara bakmadan yeniden üretilmeli ve yeni bağlamda doğrulanmalıdır.'
  };
}
function rubricGate(lesson,signals){
  const correct=[signals.contract,signals.evidence,signals.diagnosis,signals.transfer];
  return {
    gate:'rubric',
    items:[
      question(lesson,'rubric','contract','Rubric · Contract: Bu ders için hangi ifade karar sözleşmesini doğru temsil eder?','Rubric · Contract: Which statement correctly represents the decision contract for this lesson?',correct[0],correct.slice(1)),
      question(lesson,'rubric','evidence','Rubric · Evidence: Hangi kanıt üretim kalitesinin parçasıdır?','Rubric · Evidence: Which evidence belongs to production quality?',correct[1],[correct[0],correct[2],correct[3]]),
      question(lesson,'rubric','diagnosis','Rubric · Validation: Kontrollü teşhis yaklaşımı hangisidir?','Rubric · Validation: Which option matches the controlled diagnosis approach?',correct[2],[correct[0],correct[1],correct[3]]),
      question(lesson,'rubric','transfer','Rubric · Transfer: Aynı sözleşmenin yeni bağlama taşınması hangisidir?','Rubric · Transfer: Which option transfers the same contract into a new context?',correct[3],[correct[0],correct[1],correct[2]])
    ]
  };
}
function capstoneGate(lesson,signals){
  const correct=[
    signals.contract,signals.secondObjective,signals.evidence,evidenceTask(lesson,'interpretation')||signals.diagnosis,
    signals.diagnosisAlt,signals.transfer,signals.retention
  ];
  const prompts=[
    ['Capstone · Contract: Çözümün başlangıç sözleşmesi hangisidir?','Capstone · Contract: What is the starting contract for the solution?'],
    ['Capstone · Scope: İkinci kritik öğrenme/karar hedefi hangisidir?','Capstone · Scope: What is the second critical learning or decision target?'],
    ['Capstone · Production: Hangi kanıt bağımsız üretim sonucunu doğrular?','Capstone · Production: Which evidence validates independent production?'],
    ['Capstone · Interpretation: Hangi görev gözlenen sonucu doğru yorumlama gerektirir?','Capstone · Interpretation: Which task requires correct interpretation of the observed result?'],
    ['Capstone · Failure boundary: Hangi kontrol failure/regression sınırını kapsar?','Capstone · Failure boundary: Which check covers the failure or regression boundary?'],
    ['Capstone · Transfer: Hangi görev aynı analitik sözleşmeyi yeni bağlama taşır?','Capstone · Transfer: Which task transfers the same analytical contract into a new context?'],
    ['Capstone · Retention: Hangi davranış bilgiyi yeniden üretip gecikmeli olarak doğrular?','Capstone · Retention: Which behavior retrieves and validates the knowledge after a delay?']
  ];
  return {
    gate:'capstone',
    items:correct.map((value,index)=>question(
      lesson,'capstone',String(index+1),prompts[index][0],prompts[index][1],value,
      correct.filter((_,other)=>other!==index).slice(0,3)
    ))
  };
}
function architectureGate(lesson,signals){
  const correct=[signals.contract,signals.diagnosis,signals.evidenceAlt,signals.transferAlt];
  const prompts=[
    ['Architecture Review · Contract: Review hangi sözleşmeyi korumalıdır?','Architecture Review · Contract: Which contract must the review preserve?'],
    ['Architecture Review · Risk: Hangi kontrol risk/failure teşhisinin parçasıdır?','Architecture Review · Risk: Which check belongs to risk and failure diagnosis?'],
    ['Architecture Review · Acceptance: Hangi kanıt acceptance gate olarak kullanılmalıdır?','Architecture Review · Acceptance: Which evidence should be used as an acceptance gate?'],
    ['Architecture Review · Operability/transfer: Hangi görev çözümü yeni bağlamda doğrulamaya taşır?','Architecture Review · Operability/transfer: Which task carries validation into a new context?']
  ];
  return {
    gate:'architectureReview',
    items:correct.map((value,index)=>question(
      lesson,'architectureReview',String(index+1),prompts[index][0],prompts[index][1],value,
      correct.filter((_,other)=>other!==index)
    ))
  };
}
export function advancedRequirementsForLevel(level){
  if(level==='L5')return ['rubric'];
  if(level==='Expert')return ['rubric','capstone','architectureReview'];
  return [];
}
export function buildAdvancedMasteryChallenge(lesson){
  const required=advancedRequirementsForLevel(lesson?.level);
  if(required.length===0)return {version:ADVANCED_MASTERY_VERSION,lessonId:lesson?.id||null,level:lesson?.level||null,gates:[]};
  if(!lesson?.id)throw new Error('Advanced mastery challenge requires a lesson id');
  const signals=lessonSignals(lesson);
  const gates=[rubricGate(lesson,signals)];
  if(lesson.level==='Expert')gates.push(capstoneGate(lesson,signals),architectureGate(lesson,signals));
  return {version:ADVANCED_MASTERY_VERSION,lessonId:lesson.id,level:lesson.level,gates};
}
export function evaluateAdvancedMasteryChallenge(lesson,answers={}){
  const challenge=buildAdvancedMasteryChallenge(lesson);
  let complete=true;
  const results={},items=[];
  for(const gate of challenge.gates){
    let correct=0,answered=0;
    for(const item of gate.items){
      const selected=typeof answers[item.id]==='string'?answers[item.id]:null;
      const isAnswered=Boolean(selected);
      const passed=isAnswered&&selected===item.answerId;
      if(isAnswered)answered++;else complete=false;
      if(passed)correct++;
      items.push({id:item.id,gate:gate.gate,selected,passed});
    }
    const total=gate.items.length;
    if(gate.gate==='rubric'){
      results.rubric={correct,total,answered,rating:Math.min(5,1+correct)};
    }else if(gate.gate==='capstone'){
      results.capstone={correct,total,answered,score:Math.round((correct/total)*1000)/10};
    }else if(gate.gate==='architectureReview'){
      results.architectureReview={correct,total,answered,passed:correct===total};
    }
  }
  return {
    version:challenge.version,lessonId:challenge.lessonId,level:challenge.level,complete,results,items,
    inputs:{
      ...(results.rubric?{rubricMin:results.rubric.rating}:{}),
      ...(results.capstone?{capstone:results.capstone.score}:{}),
      ...(results.architectureReview?{architectureReview:results.architectureReview.passed}:{})
    }
  };
}

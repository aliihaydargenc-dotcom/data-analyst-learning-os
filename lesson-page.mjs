import {
  createLessonProgress,normalizeLessonProgress,completeSection,completionPercent,
  sectionNeedsResponse,saveEvidenceDraft,recordLabAttempt,recordCaseLabAttempt,recordPythonLabAttempt,recordHtmlLabAttempt,labPassed
} from './lesson-runtime.mjs';

const $=selector=>document.querySelector(selector);
const params=new URLSearchParams(location.search);
const state={lang:'tr',catalog:null,entry:null,lesson:null,sources:null,progress:null,sectionIndex:0};
let sqlLabModulePromise=null;
let pythonLabModulePromise=null;
let htmlLabModulePromise=null;

const labels={
  tr:{
    loading:'Yükleniyor',progress:'İlerleme',estimate:'Tahmini çalışma',minutes:'dk',
    why:'NEDEN ÖNEMLİ?',objectives:'HEDEFLER',outline:'Ders akışı',
    outlineHint:'Tamamlamak mastery anlamına gelmez.',response:'Yanıt taslağın',
    responsePlaceholder:'Kararını ve gerekçeni yaz.',responseHint:'Bu yanıt yalnızca ilerleme kaydıdır; doğruluk değerlendirmesi değildir.',
    prev:'Önceki',next:'Sonraki',complete:'Bölümü tamamla',completed:'Tamamlandı',
    responseRequired:'Bu bölüm uygulama katmanı. İlerlemeden önce en azından gerekçeli bir yanıt taslağı yaz.',
    saved:'İlerleme tarayıcıda kaydedildi.',evidenceTitle:'Kanıt taslakları',
    evidenceIntro:'Bu alanlar tamamlanma yüzdesini artırmaz. Mastery için üretim ve transfer kanıtı ayrı değerlendirilir.',
    retentionTitle:'Gecikmeli geri çağırma planı',sources:'Kaynaklar',candidate:'Pilot ders',production:'Production',
    noMastery:'Dersin bütün bölümleri tamamlandı. Bu durum mastery verilmiş olduğu anlamına gelmez.',
    due:'Vade',pending:'bekliyor',draftSaved:'Taslak kaydedildi',
    prevLesson:'Önceki production ders',nextLesson:'Sonraki production ders',
    sequenceHint:'Ders sırası mastery yerine geçmez.',sequenceWord:'Ders',
    labIdle:'Çalıştırılmadı',labLoading:'Semantic lab hazırlanıyor…',
    labRun:'Semantik testi çalıştır',labReset:'Sıfırla',
    labPass:'Semantic test geçti: görünür ve edge-case fixture sonuçları referansla eşleşti.',
    labFail:'Semantic test geçmedi.',labRequired:'Bu bağımsız üretim bölümü için önce Semantic SQL Lab’ı geçirmen gerekiyor.',
    labError:'Lab çalıştırılamadı.',labPassed:'Semantik kanıt · geçti',labRows:'satır',
    caseIdle:'Çalıştırılmadı',caseRun:'Senaryoları değerlendir',casePass:'Semantic Case Lab geçti.',caseFail:'Semantic Case Lab geçmedi.',caseRequired:'Bu bağımsız üretim bölümü için önce Semantic Case Lab’ı geçirmen gerekiyor.',caseMissing:'Tüm senaryolarda bir seçenek işaretle.',
    pythonIdle:'Çalıştırılmadı',pythonLoading:'Python runtime hazırlanıyor…',pythonRun:'Python testlerini çalıştır',pythonReset:'Sıfırla',pythonPass:'Semantic Python Lab geçti.',pythonFail:'Semantic Python Lab geçmedi.',pythonRequired:'Bu bağımsız üretim bölümü için önce Semantic Python Lab’ı geçirmen gerekiyor.',pythonError:'Python lab çalıştırılamadı.',pythonPassed:'Python kanıtı · geçti',htmlIdle:'Çalıştırılmadı',htmlRun:'DOM testlerini çalıştır',htmlReset:'Sıfırla',htmlPass:'Semantic HTML DOM Lab geçti.',htmlFail:'Semantic HTML DOM Lab geçmedi.',htmlRequired:'Bu bağımsız üretim bölümü için önce Semantic HTML DOM Lab’ı geçirmen gerekiyor.',htmlError:'HTML DOM lab çalıştırılamadı.',htmlPassed:'HTML DOM kanıtı · geçti'
  },
  en:{
    loading:'Loading',progress:'Progress',estimate:'Estimated study',minutes:'min',
    why:'WHY IT MATTERS',objectives:'OBJECTIVES',outline:'Lesson flow',
    outlineHint:'Completion is not mastery.',response:'Your response draft',
    responsePlaceholder:'Write your decision and reasoning.',responseHint:'This response only records progress; it is not a correctness grade.',
    prev:'Previous',next:'Next',complete:'Complete section',completed:'Completed',
    responseRequired:'This is a practice layer. Write a reasoned response draft before marking it complete.',
    saved:'Progress saved in this browser.',evidenceTitle:'Evidence drafts',
    evidenceIntro:'These drafts do not increase completion. Production and transfer evidence are evaluated separately for mastery.',
    retentionTitle:'Delayed retrieval plan',sources:'Sources',candidate:'Pilot lesson',production:'Production',
    noMastery:'All lesson sections are complete. This does not mean mastery has been awarded.',
    due:'Due',pending:'pending',draftSaved:'Draft saved',
    prevLesson:'Previous production lesson',nextLesson:'Next production lesson',
    sequenceHint:'Sequence order is not mastery.',sequenceWord:'Lesson',
    labIdle:'Not run',labLoading:'Preparing semantic lab…',
    labRun:'Run semantic test',labReset:'Reset',
    labPass:'Semantic test passed: visible and edge-case fixture results match the reference.',
    labFail:'Semantic test did not pass.',labRequired:'Pass the Semantic SQL Lab before completing this independent-production section.',
    labError:'The lab could not be executed.',labPassed:'Semantic evidence · passed',labRows:'rows',
    caseIdle:'Not run',caseRun:'Evaluate scenarios',casePass:'Semantic Case Lab passed.',caseFail:'Semantic Case Lab did not pass.',caseRequired:'Pass the Semantic Case Lab before completing this independent-production section.',caseMissing:'Choose one option for every scenario.',
    pythonIdle:'Not run',pythonLoading:'Preparing Python runtime…',pythonRun:'Run Python tests',pythonReset:'Reset',pythonPass:'Semantic Python Lab passed.',pythonFail:'Semantic Python Lab did not pass.',pythonRequired:'Pass the Semantic Python Lab before completing this independent-production section.',pythonError:'Python lab could not be executed.',pythonPassed:'Python evidence · passed',htmlIdle:'Not run',htmlRun:'Run DOM tests',htmlReset:'Reset',htmlPass:'Semantic HTML DOM Lab passed.',htmlFail:'Semantic HTML DOM Lab did not pass.',htmlRequired:'Pass the Semantic HTML DOM Lab before completing this independent-production section.',htmlError:'HTML DOM lab could not be executed.',htmlPassed:'HTML DOM evidence · passed'
  }
};

function storageKey(){return `da-learning-os:lesson:${state.lesson.id}`;}

function loadProgress(){
  let value=null;
  try{value=JSON.parse(localStorage.getItem(storageKey())||'null')}catch{}
  state.progress=normalizeLessonProgress(state.lesson,value);
}

function persistProgress(){
  localStorage.setItem(storageKey(),JSON.stringify(state.progress));
}

function setLanguage(lang){
  state.lang=lang;
  document.documentElement.lang=lang;
  renderAll();
}

function localText(obj,key){
  return state.lang==='tr'?(obj[`${key}_tr`]??obj[key]??''):(obj[`${key}_en`]??obj[`${key}_tr`]??obj[key]??'');
}

function renderHero(){
  const l=labels[state.lang],lesson=state.lesson;
  $('#lessonStatus').textContent=lesson.status==='production'?l.production:l.candidate;
  $('#lessonMeta').textContent=`${lesson.track.toUpperCase()} · ${lesson.level} · ${lesson.module_id}`;
  $('#lessonTitle').textContent=localText(lesson,'title');
  $('#lessonSubtitle').textContent=localText(lesson,'subtitle');
  $('#progressLabel').textContent=l.progress;
  const percent=completionPercent(lesson,state.progress);
  $('#progressValue').textContent=`${percent}%`;
  $('#progressBar').style.width=`${percent}%`;
  $('#lessonEstimate').textContent=`${l.estimate}: ${lesson.estimated_minutes_range[0]}–${lesson.estimated_minutes_range[1]} ${l.minutes}`;
  $('#whyLabel').textContent=l.why;
  $('#whyText').textContent=localText(lesson,'why_it_matters');
  $('#objectivesLabel').textContent=l.objectives;
  $('#objectiveList').innerHTML=lesson.learning_objectives.map(item=>`<li>${item}</li>`).join('');
  $('#outlineTitle').textContent=l.outline;
  $('#outlineHint').textContent=l.outlineHint;
  $('#lessonLanguage').textContent=state.lang==='tr'?'EN':'TR';
}

function renderOutline(){
  const completed=new Set(state.progress.completedSections);
  $('#lessonOutline').innerHTML=state.lesson.sections.map((section,index)=>{
    const active=index===state.sectionIndex?' active':'';
    const done=completed.has(section.id)?' complete':'';
    return `<button class="outline-item${active}${done}" data-index="${index}"><span class="outline-index">${completed.has(section.id)?'✓':String(index+1).padStart(2,'0')} · ${section.layer.replaceAll('_',' ')}</span><span class="outline-name">${localText(section,'title')}</span></button>`;
  }).join('');
  document.querySelectorAll('.outline-item').forEach(button=>button.addEventListener('click',()=>{
    state.sectionIndex=Number(button.dataset.index);
    renderSection();
    renderOutline();
    window.scrollTo({top:document.querySelector('.lesson-workspace').offsetTop-72,behavior:'smooth'});
  }));
}

function detailBlock(title,items){
  if(!Array.isArray(items)||items.length===0)return '';
  return `<div class="lesson-detail"><strong>${title}</strong><ul>${items.map(item=>`<li>${item}</li>`).join('')}</ul></div>`;
}

function renderSectionDetails(section){
  let html='';
  if(section.code) html+=`<pre class="lesson-code"><code>${escapeHtml(section.code)}</code></pre>`;
  if(section.explanation_tr) html+=`<div class="lesson-detail"><strong>Açıklama</strong><p>${escapeHtml(localText(section,'explanation'))}</p></div>`;
  html+=detailBlock(state.lang==='tr'?'Kontrol noktaları':'Checks',section.checks);
  html+=detailBlock(state.lang==='tr'?'Sorular':'Prompts',section.prompts);
  html+=detailBlock(state.lang==='tr'?'Beklenen kanıt':'Required evidence',section.evidence_required);
  html+=detailBlock(state.lang==='tr'?'Debug sırası':'Debug sequence',section.diagnostic_sequence);
  if(Array.isArray(section.transfer_tasks)){
    html+=`<div class="lesson-detail"><strong>${state.lang==='tr'?'Transfer görevleri':'Transfer tasks'}</strong>${section.transfer_tasks.map(item=>`<div class="transfer-task"><span>${escapeHtml(item.tool)}</span><p>${escapeHtml(item.task_tr)}</p></div>`).join('')}</div>`;
  }
  if(Array.isArray(section.schedule)){
    html+=detailBlock(state.lang==='tr'?'Retention checkpointleri':'Retention checkpoints',section.schedule.map(item=>`D+${item.day} · ${item.evidence}`));
  }
  $('#sectionDetails').innerHTML=html;
}

function renderSection(){
  const l=labels[state.lang],section=state.lesson.sections[state.sectionIndex];
  const completed=state.progress.completedSections.includes(section.id);
  $('#sectionLayer').textContent=section.layer.replaceAll('_',' ');
  $('#sectionPosition').textContent=`${state.sectionIndex+1} / ${state.lesson.sections.length}`;
  $('#sectionTitle').textContent=localText(section,'title');
  $('#sectionBody').textContent=localText(section,'body');
  renderSectionDetails(section);

  const needs=sectionNeedsResponse(section);
  $('#responsePanel').classList.toggle('hidden',!needs);
  $('#responseLabel').textContent=l.response;
  $('#responseHint').textContent=l.responseHint;
  $('#sectionResponse').placeholder=l.responsePlaceholder;
  $('#sectionResponse').value=state.progress.responses[section.id]||'';

  $('#prevSection').textContent=l.prev;
  $('#nextSection').textContent=l.next;
  $('#completeSection').textContent=completed?l.completed:l.complete;
  $('#completeSection').disabled=completed;
  $('#prevSection').disabled=state.sectionIndex===0;
  $('#nextSection').disabled=state.sectionIndex===state.lesson.sections.length-1;
  $('#sectionFeedback').textContent=completed?l.saved:'';
}


function clearLessonSqlTable(){
  $('#lessonSqlTable thead').replaceChildren();
  $('#lessonSqlTable tbody').replaceChildren();
  $('#lessonSqlTable').classList.add('hidden');
  $('#lessonSqlEmpty').classList.remove('hidden');
}

function renderLessonSqlTable(result){
  clearLessonSqlTable();
  const head=$('#lessonSqlTable thead');
  const body=$('#lessonSqlTable tbody');
  const header=document.createElement('tr');
  for(const column of result.columns){
    const th=document.createElement('th');
    th.textContent=column;
    header.appendChild(th);
  }
  head.appendChild(header);

  for(const row of result.rows){
    const tr=document.createElement('tr');
    for(const column of result.columns){
      const td=document.createElement('td');
      const value=row[column];
      td.textContent=value===null?'NULL':String(value);
      if(value===null)td.classList.add('null-value');
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  $('#lessonSqlTable').classList.remove('hidden');
  $('#lessonSqlEmpty').classList.add('hidden');
}

function renderLessonSqlLab(){
  const lab=state.lesson?.lab;
  $('#lessonSqlLab').classList.toggle('hidden',!lab);
  if(!lab)return;
  const l=labels[state.lang];
  $('#lessonSqlLabTitle').textContent=localText(lab,'title');
  $('#lessonSqlLabTask').textContent=localText(lab,'task');
  $('#lessonSqlSchema').textContent=lab.schema;
  $('#lessonSqlEngineNote').textContent=localText(lab,'engine_note');
  $('#runLessonSql').textContent=l.labRun;
  $('#resetLessonSql').textContent=l.labReset;

  const editor=$('#lessonSqlEditor');
  if(editor.dataset.labId!==lab.id){
    editor.dataset.labId=lab.id;
    editor.value=lab.starter_sql||'';
    clearLessonSqlTable();
    $('#lessonSqlFeedback').textContent='';
  }

  $('#lessonSqlLabStatus').textContent=labPassed(state.progress,lab.id)?l.labPassed:l.labIdle;
}

async function getLessonSqlLabModule(){
  if(!sqlLabModulePromise)sqlLabModulePromise=import('./lesson-sql-lab.mjs');
  return sqlLabModulePromise;
}

async function runLessonSqlLab(){
  const lab=state.lesson?.lab;
  if(!lab)return;
  const l=labels[state.lang];
  const button=$('#runLessonSql');
  button.disabled=true;
  $('#lessonSqlLabStatus').textContent=l.labLoading;
  $('#lessonSqlFeedback').textContent='';

  try{
    const module=await getLessonSqlLabModule();
    const info=await module.prepareLessonSqlLab(lab.id);
    const evaluation=await module.evaluateLessonSql(lab.id,$('#lessonSqlEditor').value);
    renderLessonSqlTable(evaluation.result);

    const summary=Object.fromEntries(evaluation.tests.map(test=>[test.variant,test.passed]));
    state.progress=recordLabAttempt(state.lesson,state.progress,lab.id,{passed:evaluation.passed,summary});
    persistProgress();

    const detail=evaluation.tests.map(test=>`${test.variant}: ${test.passed?'PASS':'FAIL'} (${test.actualRows}/${test.expectedRows} ${l.labRows})`).join(' · ');
    $('#lessonSqlFeedback').textContent=`${evaluation.passed?l.labPass:l.labFail} ${detail}`;
    $('#lessonSqlFeedback').style.color=evaluation.passed?'var(--green)':'var(--red)';
    $('#lessonSqlLabStatus').textContent=evaluation.passed
      ?`DuckDB ${info.version} · ${l.labPassed}`
      :`DuckDB ${info.version} · ${l.labFail}`;
  }catch(error){
    $('#lessonSqlFeedback').textContent=`${l.labError} ${error instanceof Error?error.message:String(error)}`;
    $('#lessonSqlFeedback').style.color='var(--red)';
    $('#lessonSqlLabStatus').textContent=l.labError;
  }finally{
    button.disabled=false;
  }
}

function renderLessonPythonLab(){
  const lab=state.lesson?.python_lab;
  $('#lessonPythonLab').classList.toggle('hidden',!lab);
  if(!lab)return;
  const l=labels[state.lang];
  $('#lessonPythonLabTitle').textContent=localText(lab,'title');
  $('#lessonPythonLabTask').textContent=localText(lab,'task');
  $('#lessonPythonEngineNote').textContent=localText(lab,'engine_note');
  $('#lessonPythonPackages').textContent=(lab.packages||[]).length?`packages: ${lab.packages.join(', ')}`:'standard library';
  $('#runLessonPython').textContent=l.pythonRun;
  $('#resetLessonPython').textContent=l.pythonReset;
  const editor=$('#lessonPythonEditor');
  if(editor.dataset.labId!==lab.id){
    editor.dataset.labId=lab.id;
    editor.value=lab.starter_code||'';
    $('#lessonPythonFeedback').textContent='';
    $('#lessonPythonOutput').textContent='';
  }
  $('#lessonPythonLabStatus').textContent=labPassed(state.progress,lab.id)?l.pythonPassed:l.pythonIdle;
}

async function getLessonPythonLabModule(){
  if(!pythonLabModulePromise)pythonLabModulePromise=import('./lesson-python-lab.mjs');
  return pythonLabModulePromise;
}

async function runLessonPythonLab(){
  const lab=state.lesson?.python_lab;
  if(!lab)return;
  const l=labels[state.lang];
  const button=$('#runLessonPython');
  button.disabled=true;
  $('#lessonPythonLabStatus').textContent=l.pythonLoading;
  $('#lessonPythonFeedback').textContent='';
  $('#lessonPythonOutput').textContent='';
  try{
    const module=await getLessonPythonLabModule();
    const info=await module.prepareLessonPythonLab(lab.id);
    const evaluation=await module.evaluateLessonPython(lab.id,$('#lessonPythonEditor').value);
    const summary=Object.fromEntries(evaluation.tests.map(test=>[test.variant,test.passed]));
    state.progress=recordPythonLabAttempt(state.lesson,state.progress,lab.id,{passed:evaluation.passed,summary});
    persistProgress();
    const detail=evaluation.tests.map(test=>`${test.variant}: ${test.passed?'PASS':'FAIL'} · ${test.detail}`).join(' · ');
    $('#lessonPythonFeedback').textContent=`${evaluation.passed?l.pythonPass:l.pythonFail} ${detail}`;
    $('#lessonPythonFeedback').style.color=evaluation.passed?'var(--green)':'var(--red)';
    $('#lessonPythonLabStatus').textContent=evaluation.passed?`Pyodide ${info.version} · ${l.pythonPassed}`:`Pyodide ${info.version} · ${l.pythonFail}`;
    $('#lessonPythonOutput').textContent=evaluation.tests.map(test=>`[${test.variant}] ${test.output||test.detail}`).join('\n');
  }catch(error){
    $('#lessonPythonFeedback').textContent=`${l.pythonError} ${error instanceof Error?error.message:String(error)}`;
    $('#lessonPythonFeedback').style.color='var(--red)';
    $('#lessonPythonLabStatus').textContent=l.pythonError;
  }finally{
    button.disabled=false;
  }
}

function renderLessonHtmlLab(){
  const lab=state.lesson?.html_lab;
  $('#lessonHtmlLab').classList.toggle('hidden',!lab);
  if(!lab)return;
  const l=labels[state.lang];
  $('#lessonHtmlLabTitle').textContent=localText(lab,'title');
  $('#lessonHtmlLabTask').textContent=localText(lab,'task');
  $('#lessonHtmlEngineNote').textContent=localText(lab,'engine_note');
  $('#runLessonHtml').textContent=l.htmlRun;
  $('#resetLessonHtml').textContent=l.htmlReset;
  const editor=$('#lessonHtmlEditor');
  if(editor.dataset.labId!==lab.id){editor.dataset.labId=lab.id;editor.value=lab.starter_html||'';$('#lessonHtmlFeedback').textContent='';$('#lessonHtmlOutput').textContent='';}
  $('#lessonHtmlLabStatus').textContent=labPassed(state.progress,lab.id)?l.htmlPassed:l.htmlIdle;
}

async function getLessonHtmlLabModule(){if(!htmlLabModulePromise)htmlLabModulePromise=import('./lesson-html-lab.mjs');return htmlLabModulePromise;}

async function runLessonHtmlLab(){
  const lab=state.lesson?.html_lab;if(!lab)return;const l=labels[state.lang],button=$('#runLessonHtml');button.disabled=true;$('#lessonHtmlFeedback').textContent='';$('#lessonHtmlOutput').textContent='';
  try{
    const module=await getLessonHtmlLabModule();
    const evaluation=module.evaluateLessonHtml(lab.id,$('#lessonHtmlEditor').value);
    const summary=Object.fromEntries(evaluation.tests.map(test=>[test.variant,test.passed]));
    state.progress=recordHtmlLabAttempt(state.lesson,state.progress,lab.id,{passed:evaluation.passed,summary});persistProgress();
    const detail=evaluation.tests.map(test=>`${test.variant}: ${test.passed?'PASS':'FAIL'} · ${test.detail}`).join(' · ');
    $('#lessonHtmlFeedback').textContent=`${evaluation.passed?l.htmlPass:l.htmlFail} ${detail}`;$('#lessonHtmlFeedback').style.color=evaluation.passed?'var(--green)':'var(--red)';$('#lessonHtmlLabStatus').textContent=evaluation.passed?l.htmlPassed:l.htmlFail;
    $('#lessonHtmlOutput').textContent=evaluation.tests.flatMap(test=>test.checks.map(check=>`[${test.variant}] ${check.name}: ${check.passed?'PASS':'FAIL'} · ${check.detail}`)).join('\n');
  }catch(error){$('#lessonHtmlFeedback').textContent=`${l.htmlError} ${error instanceof Error?error.message:String(error)}`;$('#lessonHtmlFeedback').style.color='var(--red)';$('#lessonHtmlLabStatus').textContent=l.htmlError;}finally{button.disabled=false;}
}

function renderLessonCaseLab(){
  const lab=state.lesson?.case_lab;
  $('#lessonCaseLab').classList.toggle('hidden',!lab);
  if(!lab)return;
  const l=labels[state.lang];
  $('#lessonCaseLabTitle').textContent=localText(lab,'title');
  $('#lessonCaseLabTask').textContent=localText(lab,'task');
  $('#runLessonCase').textContent=l.caseRun;
  $('#lessonCaseLabStatus').textContent=labPassed(state.progress,lab.id)?l.labPassed:l.caseIdle;
  $('#lessonCaseGrid').innerHTML=(lab.cases||[]).map((item,index)=>
    `<fieldset class="case-card" data-case-id="${escapeHtml(item.id)}"><legend>${index+1}. ${escapeHtml(localText(item,'prompt'))}</legend>${(item.options||[]).map(option=>`<label class="case-option"><input type="radio" name="case-${escapeHtml(item.id)}" value="${escapeHtml(option.id)}"><span>${escapeHtml(localText(option,'label'))}</span></label>`).join('')}</fieldset>`
  ).join('');
  $('#lessonCaseFeedback').textContent='';
}

function runLessonCaseLab(){
  const lab=state.lesson?.case_lab;
  if(!lab)return;
  const l=labels[state.lang];
  const answers={};
  for(const item of lab.cases||[]){
    const selected=document.querySelector(`input[name="case-${CSS.escape(item.id)}"]:checked`);
    if(!selected){
      $('#lessonCaseFeedback').textContent=l.caseMissing;
      $('#lessonCaseFeedback').style.color='var(--red)';
      return;
    }
    answers[item.id]=selected.value;
  }
  const results=(lab.cases||[]).map(item=>({id:item.id,passed:answers[item.id]===item.answer}));
  const passed=results.every(item=>item.passed);
  state.progress=recordCaseLabAttempt(state.lesson,state.progress,lab.id,{passed,summary:Object.fromEntries(results.map(item=>[item.id,item.passed]))});
  persistProgress();
  const detail=results.map(item=>`${item.id}: ${item.passed?'PASS':'FAIL'}`).join(' · ');
  $('#lessonCaseFeedback').textContent=`${passed?l.casePass:l.caseFail} ${detail}`;
  $('#lessonCaseFeedback').style.color=passed?'var(--green)':'var(--red)';
  $('#lessonCaseLabStatus').textContent=passed?l.labPassed:l.caseFail;
}

function renderEvidence(){
  const l=labels[state.lang];
  $('#evidenceTitle').textContent=l.evidenceTitle;
  $('#evidenceIntro').textContent=l.evidenceIntro;
  $('#evidenceGrid').innerHTML=state.lesson.mastery_evidence.map(item=>`<article class="evidence-card">
    <header><span>${item.dimension}</span><strong>${item.weight}%</strong></header>
    <p>${escapeHtml(item.task_tr)}</p>
    <textarea data-dimension="${item.dimension}" placeholder="${l.responsePlaceholder}">${escapeHtml(state.progress.evidenceDrafts[item.dimension]||'')}</textarea>
    <small data-evidence-status="${item.dimension}"></small>
  </article>`).join('');

  document.querySelectorAll('.evidence-card textarea').forEach(textarea=>{
    textarea.addEventListener('input',()=>{
      const dimension=textarea.dataset.dimension;
      state.progress=saveEvidenceDraft(state.lesson,state.progress,dimension,textarea.value);
      persistProgress();
      const status=document.querySelector(`[data-evidence-status="${dimension}"]`);
      status.textContent=l.draftSaved;
    });
  });
}

function renderRetention(){
  const l=labels[state.lang];
  $('#retentionTitle').textContent=l.retentionTitle;
  const complete=Boolean(state.progress.completedAt);
  $('#retentionPanel').classList.toggle('hidden',!complete);
  if(!complete)return;
  $('#retentionList').innerHTML=state.progress.retentionDue.map(item=>`<div class="retention-item"><div><strong>D+${item.day}</strong><br><span>${escapeHtml(item.evidence)}</span></div><div><strong>${l.due}</strong><br><span>${new Date(item.dueAt).toLocaleDateString(state.lang==='tr'?'tr-TR':'en-US')} · ${l.pending}</span></div></div>`).join('');
}


function renderSequence(){
  const l=labels[state.lang];
  const entries=[...(state.catalog?.production_lessons||[])].filter(item=>item.track===state.entry?.track).sort((a,b)=>(a.order??999)-(b.order??999));
  const index=entries.findIndex(item=>item.id===state.entry?.id);
  const previous=index>0?entries[index-1]:null;
  const next=index>=0&&index<entries.length-1?entries[index+1]:null;

  $('#lessonSequence').classList.toggle('hidden',entries.length<2);
  if(entries.length<2)return;

  $('#sequencePosition').textContent=`${l.sequenceWord} ${index+1} / ${entries.length}`;
  $('#sequenceHint').textContent=l.sequenceHint;
  $('#previousLessonLabel').textContent=l.prevLesson;
  $('#nextLessonLabel').textContent=l.nextLesson;

  $('#previousLessonLink').classList.toggle('hidden',!previous);
  $('#nextLessonLink').classList.toggle('hidden',!next);

  if(previous){
    $('#previousLessonLink').href=previous.runtime||`lesson.html?id=${encodeURIComponent(previous.id)}`;
    $('#previousLessonName').textContent=previous.module_id;
  }
  if(next){
    $('#nextLessonLink').href=next.runtime||`lesson.html?id=${encodeURIComponent(next.id)}`;
    $('#nextLessonName').textContent=next.module_id;
  }
}

function renderSources(){
  const l=labels[state.lang];
  $('#sourcesTitle').textContent=l.sources;
  $('#sourceList').innerHTML=state.lesson.sources.map(id=>{
    const source=state.sources[id];
    if(!source)return '';
    return `<div class="source-item"><div><a href="${source.url}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a></div><span>${escapeHtml(source.type)}</span></div>`;
  }).join('');
}

function renderAll(){
  if(!state.lesson)return;
  renderHero();renderOutline();renderSection();renderLessonSqlLab();renderLessonPythonLab();renderLessonHtmlLab();renderLessonCaseLab();renderSequence();renderEvidence();renderRetention();renderSources();
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

$('#lessonLanguage').addEventListener('click',()=>setLanguage(state.lang==='tr'?'en':'tr'));
$('#runLessonCase').addEventListener('click',runLessonCaseLab);
$('#runLessonHtml').addEventListener('click',runLessonHtmlLab);
$('#resetLessonHtml').addEventListener('click',()=>{const lab=state.lesson?.html_lab;if(!lab)return;$('#lessonHtmlEditor').value=lab.starter_html||'';$('#lessonHtmlFeedback').textContent='';$('#lessonHtmlOutput').textContent='';renderLessonHtmlLab();});
$('#runLessonPython').addEventListener('click',runLessonPythonLab);
$('#resetLessonPython').addEventListener('click',()=>{
  const lab=state.lesson?.python_lab;
  if(!lab)return;
  $('#lessonPythonEditor').value=lab.starter_code||'';
  $('#lessonPythonFeedback').textContent='';
  $('#lessonPythonOutput').textContent='';
  renderLessonPythonLab();
});
$('#runLessonSql').addEventListener('click',runLessonSqlLab);
$('#resetLessonSql').addEventListener('click',()=>{
  const lab=state.lesson?.lab;
  if(!lab)return;
  $('#lessonSqlEditor').value=lab.starter_sql||'';
  $('#lessonSqlFeedback').textContent='';
  clearLessonSqlTable();
  renderLessonSqlLab();
});
$('#prevSection').addEventListener('click',()=>{if(state.sectionIndex>0){state.sectionIndex--;renderOutline();renderSection();}});
$('#nextSection').addEventListener('click',()=>{if(state.sectionIndex<state.lesson.sections.length-1){state.sectionIndex++;renderOutline();renderSection();}});
$('#completeSection').addEventListener('click',()=>{
  const section=state.lesson.sections[state.sectionIndex];
  const response=$('#sectionResponse').value;
  const result=completeSection(state.lesson,state.progress,section.id,response);
  const l=labels[state.lang];
  if(!result.ok){
    if(result.reason==='lab_required'){
      $('#sectionFeedback').textContent=l.labRequired;
      $('#lessonSqlLab').scrollIntoView({behavior:'smooth',block:'start'});
    }else if(result.reason==='case_lab_required'){
      $('#sectionFeedback').textContent=l.caseRequired;
      $('#lessonCaseLab').scrollIntoView({behavior:'smooth',block:'start'});
    }else if(result.reason==='python_lab_required'){
      $('#sectionFeedback').textContent=l.pythonRequired;
      $('#lessonPythonLab').scrollIntoView({behavior:'smooth',block:'start'});
    }else if(result.reason==='html_lab_required'){
      $('#sectionFeedback').textContent=l.htmlRequired;
      $('#lessonHtmlLab').scrollIntoView({behavior:'smooth',block:'start'});
    }else{
      $('#sectionFeedback').textContent=l.responseRequired;
      $('#sectionResponse').focus();
    }
    return;
  }
  state.progress=result.progress;
  persistProgress();
  renderHero();renderOutline();renderSection();renderRetention();
  $('#sectionFeedback').textContent=state.progress.completedAt?l.noMastery:l.saved;
});

async function init(){
  try{
    const [catalogResponse,sourcesResponse]=await Promise.all([
      fetch('./content/lesson-catalog.json'),
      fetch('./content/sources.json')
    ]);
    if(!catalogResponse.ok||!sourcesResponse.ok) throw new Error('Lesson catalog could not be loaded.');
    state.catalog=await catalogResponse.json();
    state.sources=await sourcesResponse.json();

    const requested=params.get('id');
    const entry=state.catalog.production_lessons.find(item=>item.id===requested)||state.catalog.production_lessons[0];
    if(!entry) throw new Error('No production lesson is available.');
    state.entry=entry;

    const lessonResponse=await fetch('./'+entry.path);
    if(!lessonResponse.ok) throw new Error('Lesson content could not be loaded.');
    state.lesson=await lessonResponse.json();
    loadProgress();

    $('#lessonHero').classList.remove('hidden');
    $('#lessonContext').classList.remove('hidden');
    $('#lessonWorkspace').classList.remove('hidden');
    $('#lessonSequence').classList.remove('hidden');
    $('#masteryEvidence').classList.remove('hidden');
    $('#lessonSources').classList.remove('hidden');
    renderAll();
  }catch(error){
    console.error(error);
    $('#lessonError').textContent=error instanceof Error?error.message:String(error);
    $('#lessonError').classList.remove('hidden');
    $('#lessonStatus').textContent='Error';
  }
}
init();

import {createAdaptiveAssessment,nextAdaptiveQuestion,submitAdaptiveAnswer,summarizeAdaptiveAssessment} from './adaptive-assessment.mjs';
import {SQL_CHALLENGES,evaluateSqlChallenge} from './sql-challenges.mjs';
import {renderLearningHome} from './learning-home.mjs';
import {installPageTransitions} from './page-transition.mjs';

const SQL_VALIDATION_MAX_ROWS=2000;


const state={lang:'tr',questions:[],assessment:null,currentQuestion:null,selectedAnswer:null,roadmap:null,curriculum:null,catalog:null,duckdbReady:false,duckdbInfo:null,sqlChallengeIndex:0,sqlChallengePassed:false};
const $=s=>document.querySelector(s);
const setText=(selector,value)=>{const element=$(selector);if(element)element.textContent=value;};
let sqlLabModulePromise=null;
installPageTransitions({label:()=>state.lang==='en'?'Loading…':'Yükleniyor…'});

const copy={
  tr:{
    heroTitle:'Kurs izlemek değil, seviye ölçmek ve uygulamak.',
    heroText:'Altı alan tek mastery sisteminde ilerler. Bildiğin konular kanıtla sıkıştırılır; açıklar konu bazında derinleşir ve gerçek görevlerle kapanır.',
    tracksTitle:'Altı kümülatif uzmanlık yolu',diagTitle:'Adaptif Seviye Tespiti',
    diagIntro:'Her alan L3 seviyesinden başlar. Doğru yanıtta daha zor, yanlış yanıtta daha temel soruya geçilir; alan başına 2–3 soruda başlangıç seviyesi belirlenir. Bu sonuç mastery kanıtı değildir.',
    start:'Adaptif Taramayı Başlat',topStart:'Seviyemi Belirle',next:'Yanıtla',finish:'Sonucu Gör',
    academyTitle:'Temelden Expert seviyesine, kanıtla ilerleyen müfredat',academyIntro:'Hafta doldurmak değil; kavramı açıklamak, üretmek, hata ayıklamak, başka probleme taşımak ve daha sonra yeniden hatırlamak gerekiyor.',
    roadmap:'24 haftalık referans tempo planı',ready:'Hazır',
    sqlTask:'Görev: Her otel için günlük REVENUE_EUR değerini ve bir önceki günün gelirini döndür. BUSINESS_DATE sırasını kullan.',
    runSql:"SQL'i Çalıştır",reset:'Sıfırla',completed:'Tamamlandı',
    duckIdle:'DuckDB · hazır',duckLoading:'DuckDB yükleniyor…',
    sandbox:'Bu aşamada tek bir SELECT / WITH / EXPLAIN sorgusu çalıştırılır. Dataset tarayıcı belleğinde açılır.',
    outputTitle:'Sorgu Sonucu',empty:'Sorguyu çalıştırdığında gerçek DuckDB sonucu burada görünecek.',
    challengeOk:'Challenge geçti.',challengeMissing:'Challenge tamamlanmadı.',nextChallenge:'Sonraki Challenge',challengeDone:'SQL challenge seti tamamlandı.',
    rows:'satır',shown:'gösteriliyor',queryFailed:'Sorgu çalıştırılamadı.'
  },
  en:{
    heroTitle:'Do not just watch courses. Measure, practice, and prove skill.',
    heroText:'Six domains progress inside one mastery system. Proven strengths are compressed; gaps deepen by objective and close through authentic work.',
    tracksTitle:'Six cumulative specialization tracks',diagTitle:'Adaptive Placement',
    diagIntro:'Each domain starts at L3. Correct answers move up and incorrect answers move down; placement is calibrated in 2–3 questions per domain. This result is not mastery evidence.',
    start:'Start Adaptive Screening',topStart:'Assess My Level',next:'Submit',finish:'View Results',
    academyTitle:'From foundations to Expert, progress by evidence',academyIntro:'Progress requires explanation, production, debugging, transfer and delayed retention — not simply finishing weeks.',
    roadmap:'24-week reference pace plan',ready:'Ready',
    sqlTask:'Task: For each hotel, return daily REVENUE_EUR and previous-day revenue ordered by BUSINESS_DATE.',
    runSql:'Run SQL',reset:'Reset',completed:'Completed',
    duckIdle:'DuckDB · ready',duckLoading:'Loading DuckDB…',
    sandbox:'This stage runs one SELECT / WITH / EXPLAIN statement at a time. The dataset is loaded into browser memory.',
    outputTitle:'Query Result',empty:'Run a query to see the real DuckDB result here.',
    challengeOk:'Challenge passed.',challengeMissing:'Challenge not complete.',nextChallenge:'Next Challenge',challengeDone:'SQL challenge set completed.',
    rows:'rows',shown:'shown',queryFailed:'Query could not be executed.'
  }
};

const tracks=[
  {name:'SQL Server / T-SQL',tr:'Window functions, execution plans, tuning, data quality ve gerçek analitik sorgular.',en:'Window functions, execution plans, tuning, data quality and real analytical queries.',tags:['CTE','LAG/LEAD','Plans','Tuning']},
  {name:'Qlik Sense',tr:'Load script, veri modeli, Set Analysis, QVD, incremental load ve performans.',en:'Load script, data modeling, Set Analysis, QVD, incremental load and performance.',tags:['Set Analysis','QVD','Model','Performance']},
  {name:'Python',tr:'pandas, otomasyon, SQL bağlantısı, veri kalite kontrolleri ve performans.',en:'pandas, automation, SQL connectivity, data quality checks and performance.',tags:['pandas','IO','Automation','QA']},
  {name:'Advanced Excel',tr:'Dynamic arrays, Power Query, Data Model, Power Pivot, DAX ve performans.',en:'Dynamic arrays, Power Query, Data Model, Power Pivot, DAX and performance.',tags:['LET/LAMBDA','PQ','DAX','Model']},
  {name:'HTML & Web Foundations',tr:'Semantik HTML, data table, form, accessibility, DOM sözleşmeleri ve production analitik rapor yapısı.',en:'Semantic HTML, data tables, forms, accessibility, DOM contracts and production analytical report structure.',tags:['Semantic HTML','Tables','Forms','A11y']},
  {name:'Technical English',tr:'Dokümantasyon okuma, görev yorumlama, hata mesajı ve teknik açıklama pratiği.',en:'Documentation reading, requirement interpretation, error messages and technical explanation.',tags:['Docs','Vocabulary','Errors','Writing']}
];

function renderTracks(){
  const root=$('#trackGrid');
  if(!root)return;
  root.innerHTML=tracks.map((t,i)=>`<article class="track-card">
    <div class="n">TRACK ${String(i+1).padStart(2,'0')}</div>
    <h3>${t.name}</h3><p>${state.lang==='tr'?t.tr:t.en}</p>
    <div class="tags">${t.tags.map(x=>`<span>${x}</span>`).join('')}</div>
  </article>`).join('');
}


function renderMastery(){
  const root=$('#masteryGrid');
  if(!root)return;
  const items=state.lang==='tr'
    ?[['01','Bilgi','Kuralı ve kavramı bil'],['02','Yorum','Kod, model ve çıktıyı oku'],['03','Üretim','Sıfırdan doğru çözüm üret'],['04','Transfer','Aynı prensibi yeni probleme taşı'],['05','Retention','Günler sonra yeniden kanıtla']]
    :[['01','Knowledge','Know the rule and concept'],['02','Interpret','Read code, models and outputs'],['03','Production','Build the solution independently'],['04','Transfer','Apply the principle to a new problem'],['05','Retention','Prove it again after delay']];
  root.innerHTML=items.map(([n,title,desc])=>`<article class="mastery-card"><span>${n}</span><strong>${title}</strong><small>${desc}</small></article>`).join('');
}

function renderCurriculum(){
  const root=$('#curriculumGrid');
  if(!state.curriculum||!root)return;
  const order=['L1','L2','L3','L4','L5','Expert'];
  root.innerHTML=state.curriculum.tracks.map(track=>`<article class="curriculum-card">
    <div class="curriculum-head"><span>${track.name}</span><strong>${track.modules.length} module</strong></div>
    <p>${track.purpose_tr}</p>
    <div class="level-ladder">${order.map(level=>{
      const list=track.modules.filter(m=>m.level===level);
      return `<div class="level-step"><span>${level}</span><small>${list.map(m=>state.lang==='tr'?m.title_tr:m.title_en).join(' · ')}</small></div>`;
    }).join('')}</div>
  </article>`).join('');
}

function updateDuckdbStatus(){
  const c=copy[state.lang];
  if(!state.duckdbReady){
    $('#duckdbStatus').textContent=c.duckIdle;
    return;
  }
  const info=state.duckdbInfo;
  const formatted=new Intl.NumberFormat(state.lang==='tr'?'tr-TR':'en-US').format(info.rowCount);
  $('#duckdbStatus').textContent=`DuckDB ${info.version} · ${formatted} ${c.rows} · ${info.bundle.toUpperCase()}`;
}

function applyLanguage(){
  const c=copy[state.lang];
  document.documentElement.lang=state.lang;
  setText('#languageToggle',state.lang==='tr'?'EN':'TR');
  setText('#heroTitle',c.heroTitle);
  setText('#heroText',c.heroText);
  setText('#tracksTitle',c.tracksTitle);
  setText('#academyTitle',c.academyTitle);
  setText('#academyIntro',c.academyIntro);
  setText('#diagTitle',c.diagTitle);
  setText('#diagIntro',c.diagIntro);
  setText('#startDiagnostic',c.start);
  setText('#startExamTop',c.topStart);
  setText('#roadmapTitle',c.roadmap);
  setText('#runSql',c.runSql);
  setText('#resetSql',c.reset);
  setText('#sandboxNote',c.sandbox);
  setText('#sqlOutputTitle',c.outputTitle);
  const sqlEmpty=$('#sqlEmpty');
  if(sqlEmpty&&!sqlEmpty.classList.contains('hidden'))sqlEmpty.textContent=c.empty;
  updateDuckdbStatus();
  renderSqlChallenge(false);
  const diagCounter=$('#diagCounter');
  if(diagCounter&&!state.assessment)diagCounter.textContent=c.ready;
  renderTracks();
  renderMastery();
  renderCurriculum();
  renderRoadmap();
  if(state.catalog&&state.curriculum)renderLearningHome({root:document,catalog:state.catalog,curriculum:state.curriculum,storage:localStorage,lang:state.lang,now:new Date()});
  if(state.assessment&&state.currentQuestion&&!$('#questionStage').classList.contains('hidden'))renderQuestion();
}

function startExam(){
  state.assessment=createAdaptiveAssessment(state.questions);
  state.currentQuestion=nextAdaptiveQuestion(state.assessment,state.questions);
  state.selectedAnswer=null;
  $('#diagnosticStart').classList.add('hidden');
  $('#resultStage').classList.add('hidden');
  $('#questionStage').classList.remove('hidden');
  if(state.currentQuestion)renderQuestion();
  else showResults();
  $('#diagnostic').scrollIntoView({behavior:'smooth'});
}

function renderQuestion(){
  const q=state.currentQuestion,c=copy[state.lang];
  if(!q||!state.assessment)return;
  const domainIndex=state.assessment.domainOrder.indexOf(q.domain)+1;
  $('#diagCounter').textContent=`${domainIndex} / ${state.assessment.domainOrder.length} · ${q.domain}`;
  $('#questionStage').dataset.questionId=q.id;
  $('#questionStage').dataset.questionLevel=String(q.level);
  $('#questionDomain').textContent=q.domain;
  $('#questionLevel').textContent='L'+q.level;
  $('#questionTopic').textContent=q.topic;
  $('#questionText').textContent=state.lang==='tr'?q.question_tr:q.question_en;
  $('#choiceList').innerHTML=q.choices.map((choice,i)=>`<label class="choice ${state.selectedAnswer===i?'selected':''}">
    <input type="radio" name="answer" value="${i}" ${state.selectedAnswer===i?'checked':''}>
    <span>${choice}</span>
  </label>`).join('');
  $('#nextQuestion').disabled=state.selectedAnswer===null;
  $('#nextQuestion').textContent=c.next;
  document.querySelectorAll('input[name="answer"]').forEach(r=>r.addEventListener('change',e=>{
    state.selectedAnswer=Number(e.target.value);
    renderQuestion();
  }));
}

function advanceExam(){
  if(!state.assessment||!state.currentQuestion||state.selectedAnswer===null)return;
  submitAdaptiveAnswer(state.assessment,state.currentQuestion,state.selectedAnswer);
  state.selectedAnswer=null;
  state.currentQuestion=nextAdaptiveQuestion(state.assessment,state.questions);
  if(state.currentQuestion)renderQuestion();
  else showResults();
}

function showResults(){
  const scores=summarizeAdaptiveAssessment(state.assessment);
  localStorage.setItem('da-learning-os-latest',JSON.stringify({date:new Date().toISOString(),mode:'adaptive-v1',scores}));
  $('#questionStage').classList.add('hidden');
  $('#resultStage').classList.remove('hidden');
  $('#diagCounter').textContent=copy[state.lang].completed;
  const title=state.lang==='tr'?'Adaptif seviye sonucu':'Adaptive placement result';
  const entries=Object.entries(scores);
  const weakest=[...entries].sort((a,b)=>Number(a[1].level.slice(1))-Number(b[1].level.slice(1)))[0];
  const note=state.lang==='tr'
    ?'Bu sonuç yalnızca başlangıç seviyesini seçer. Mastery; yorumlama, üretim, debugging, transfer ve retention kanıtlarıyla ayrıca doğrulanır.'
    :'This result only selects a starting level. Mastery is verified separately through interpretation, production, debugging, transfer and retention evidence.';
  const recommendation=weakest
    ?(state.lang==='tr'
      ?`Önerilen ilk odak: ${weakest[0]} ${weakest[1].level}`
      :`Recommended first focus: ${weakest[0]} ${weakest[1].level}`)
    :'';
  $('#resultStage').innerHTML=`<h3>${title}</h3>
    <div class="result-grid">${entries.map(([d,x])=>`<div class="result-card"><span>${d}</span><strong>${x.level}</strong><span>${x.correct}/${x.total} · ${x.path.map(level=>'L'+level).join(' → ')}</span></div>`).join('')}</div>
    ${recommendation?`<p class="fine"><strong>${recommendation}</strong></p>`:''}
    <p class="fine">${note}</p>
    <button id="restartExam" class="secondary">${state.lang==='tr'?'Tekrar Çöz':'Retake'}</button>`;
  $('#restartExam').addEventListener('click',startExam);
}

function renderRoadmap(){
  const root=$('#roadmapGrid');
  if(!state.roadmap||!root)return;
  root.innerHTML=state.roadmap.phases.filter(p=>p.id!=='P0').map(p=>`<article class="phase">
    <div class="weeks">${state.lang==='tr'?'Hafta':'Weeks'} ${p.weeks[0]}–${p.weeks[p.weeks.length-1]}</div>
    <h3>${state.lang==='tr'?p.name_tr:p.name_en}</h3>
    <p>${p.outcome_tr}</p>
  </article>`).join('');
}

function currentSqlChallenge(){
  return SQL_CHALLENGES[state.sqlChallengeIndex]||SQL_CHALLENGES[0];
}

function challengeCheckLabel(id){
  const tr={columns:'Kolonlar',row_count:'Satır sayısı',values_order:'Değer + sıra',required_sql:'SQL yapısı'};
  const en={columns:'Columns',row_count:'Row count',values_order:'Values + order',required_sql:'SQL structure'};
  return (state.lang==='tr'?tr:en)[id]||id;
}

function renderSqlChallenge(resetEditor=false){
  const challenge=currentSqlChallenge();
  if(!challenge)return;
  const meta=$('#sqlChallengeMeta');
  if(meta)meta.textContent=`${String(state.sqlChallengeIndex+1).padStart(2,'0')}/${String(SQL_CHALLENGES.length).padStart(2,'0')} · ${challenge.difficulty} · ${challenge.skills.join(' · ')}`;
  setText('#sqlTask',state.lang==='tr'?challenge.task_tr:challenge.task_en);
  const next=$('#nextSqlChallenge');
  if(next){
    next.textContent=copy[state.lang].nextChallenge;
    next.hidden=!state.sqlChallengePassed||state.sqlChallengeIndex>=SQL_CHALLENGES.length-1;
  }
  if(resetEditor){
    $('#sqlEditor').value=challenge.starterSql;
    state.sqlChallengePassed=false;
    if(next)next.hidden=true;
  }
}

function resetSqlChallenge(){
  renderSqlChallenge(true);
  $('#sqlResult').textContent='';
  $('#sqlError').textContent='';
  $('#sqlMeta').textContent='';
  clearSqlTable();
  $('#sqlEmpty').classList.remove('hidden');
  $('#sqlEmpty').textContent=copy[state.lang].empty;
}

function nextSqlChallenge(){
  if(!state.sqlChallengePassed||state.sqlChallengeIndex>=SQL_CHALLENGES.length-1)return;
  state.sqlChallengeIndex++;
  resetSqlChallenge();
}

function clearSqlTable(){
  $('#sqlTable thead').replaceChildren();
  $('#sqlTable tbody').replaceChildren();
  $('#sqlTable').classList.add('hidden');
}

function renderSqlTable(result){
  clearSqlTable();
  const thead=$('#sqlTable thead');
  const tbody=$('#sqlTable tbody');

  const headerRow=document.createElement('tr');
  for(const column of result.columns){
    const th=document.createElement('th');
    th.textContent=column;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  for(const row of result.rows){
    const tr=document.createElement('tr');
    for(const column of result.columns){
      const td=document.createElement('td');
      const value=row[column];
      td.textContent=value===null?'NULL':String(value);
      if(value===null)td.classList.add('null-value');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  $('#sqlTable').classList.remove('hidden');
  $('#sqlEmpty').classList.add('hidden');
}

async function getSqlLabModule(){
  if(!sqlLabModulePromise)sqlLabModulePromise=import('./duckdb-lab.mjs');
  return sqlLabModulePromise;
}

async function executeSql(){
  const c=copy[state.lang];
  const button=$('#runSql');
  const error=$('#sqlError');
  const feedback=$('#sqlResult');

  button.disabled=true;
  error.textContent='';
  feedback.textContent='';
  $('#sqlMeta').textContent='';
  $('#duckdbStatus').textContent=c.duckLoading;

  try{
    const lab=await getSqlLabModule();
    const info=await lab.initializeSqlLab('./datasets/hotel_daily.csv');
    state.duckdbReady=true;
    state.duckdbInfo=info;
    updateDuckdbStatus();

    const challenge=currentSqlChallenge();
    const sql=$('#sqlEditor').value;
    const result=await lab.runSql(sql,{maxRows:SQL_VALIDATION_MAX_ROWS});
    const expected=await lab.runSql(challenge.referenceSql,{maxRows:SQL_VALIDATION_MAX_ROWS});
    const evaluation=evaluateSqlChallenge({challenge,sql,actual:result,expected});
    const visibleResult={...result,rows:result.rows.slice(0,100),truncated:result.totalRows>100};
    renderSqlTable(visibleResult);

    const formattedRows=new Intl.NumberFormat(state.lang==='tr'?'tr-TR':'en-US').format(result.totalRows);
    $('#sqlMeta').textContent=`${formattedRows} ${c.rows} · ${result.elapsedMs} ms${result.totalRows>100?' · 100 '+c.shown:''}`;

    const checks=evaluation.checks.map(check=>`${challengeCheckLabel(check.id)} ${check.passed?'✓':'✕'}`).join(' · ');
    state.sqlChallengePassed=evaluation.passed;
    if(evaluation.passed){
      const finalChallenge=state.sqlChallengeIndex===SQL_CHALLENGES.length-1;
      feedback.textContent=`${evaluation.score}/100 · ${finalChallenge?c.challengeDone:c.challengeOk} · ${checks}`;
      feedback.style.color='var(--green)';
    }else{
      const missing=evaluation.missingSql.length
        ?` · ${state.lang==='tr'?'Eksik yapı':'Missing structure'}: ${evaluation.missingSql.join(', ')}`
        :'';
      feedback.textContent=`${evaluation.score}/100 · ${c.challengeMissing} · ${checks}${missing}`;
      feedback.style.color='var(--blue)';
    }
    renderSqlChallenge(false);
  }catch(err){
    console.error(err);
    clearSqlTable();
    $('#sqlEmpty').classList.remove('hidden');
    $('#sqlEmpty').textContent=c.empty;
    $('#duckdbStatus').textContent=state.duckdbReady?copy[state.lang].duckIdle:'DuckDB · error';
    error.textContent=`${c.queryFailed} ${err instanceof Error?err.message:String(err)}`;
  }finally{
    button.disabled=false;
  }
}

$('#languageToggle').addEventListener('click',()=>{state.lang=state.lang==='tr'?'en':'tr';applyLanguage()});
$('#startDiagnostic').addEventListener('click',startExam);
$('#startExamTop')?.addEventListener('click',startExam);
$('#nextQuestion').addEventListener('click',advanceExam);
$('#runSql').addEventListener('click',executeSql);
$('#resetSql').addEventListener('click',resetSqlChallenge);
$('#nextSqlChallenge').addEventListener('click',nextSqlChallenge);

async function init(){
  try{
    const [q,r,c,l]=await Promise.all([fetch('./data/question-bank.json'),fetch('./data/roadmap.json'),fetch('./content/curriculum.json'),fetch('./content/lesson-catalog.json')]);
    state.questions=await q.json();
    state.roadmap=await r.json();
    state.curriculum=await c.json();
    state.catalog=await l.json();
    applyLanguage();
    resetSqlChallenge();
  }catch(err){
    console.error(err);
    $('#diagCounter').textContent='Data load error';
  }
}
init();

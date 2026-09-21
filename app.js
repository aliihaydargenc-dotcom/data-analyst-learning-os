import {checkSqlStructure,computeDomainScores} from './core.mjs';

const state={lang:'tr',questions:[],exam:[],answers:{},index:0,roadmap:null};
const $=s=>document.querySelector(s);

const copy={
  tr:{
    heroTitle:'Kurs izlemek değil, seviye ölçmek ve uygulamak.',
    heroText:'Beş alan tek sistemde ilerler. Bildiğin konular atlanır, açıklar konu bazında görünür ve gerçek analist görevleriyle kapanır.',
    tracksTitle:'Beş paralel uzmanlık yolu',diagTitle:'Seviye Tespit Sınavı',
    diagIntro:'Her alandan 5 soru seçilir. Sonuçlar SQL, Qlik, Python, Excel ve Technical English için ayrı ayrı L1–L5 seviyesine çevrilir.',
    start:'25 Soruluk Tanıyı Başlat',topStart:'Seviye Tespitini Başlat',next:'Sonraki',finish:'Sonucu Gör',
    roadmap:'24 haftalık plan',ready:'Hazır',
    sqlTask:'Görev: Her otel için günlük REVENUE_EUR değerini ve bir önceki günün gelirini döndür. BUSINESS_DATE sırasını kullan.',
    check:'Yapıyı Kontrol Et',completed:'Tamamlandı'
  },
  en:{
    heroTitle:'Do not just watch courses. Measure, practice, and prove skill.',
    heroText:'Five domains move inside one system. Strong topics are skipped, gaps become visible by topic, and real analyst tasks close them.',
    tracksTitle:'Five parallel specialization tracks',diagTitle:'Diagnostic Placement Exam',
    diagIntro:'Five questions are sampled from each domain. SQL, Qlik, Python, Excel and Technical English are scored separately from L1 to L5.',
    start:'Start 25-Question Diagnostic',topStart:'Start Diagnostic',next:'Next',finish:'View Results',
    roadmap:'24-week roadmap',ready:'Ready',
    sqlTask:'Task: For each hotel, return daily REVENUE_EUR and previous-day revenue ordered by BUSINESS_DATE.',
    check:'Check Structure',completed:'Completed'
  }
};

const tracks=[
  {name:'SQL Server / T-SQL',tr:'Window functions, execution plans, tuning, data quality ve gerçek analitik sorgular.',en:'Window functions, execution plans, tuning, data quality and real analytical queries.',tags:['CTE','LAG/LEAD','Plans','Tuning']},
  {name:'Qlik Sense',tr:'Load script, veri modeli, Set Analysis, QVD, incremental load ve performans.',en:'Load script, data modeling, Set Analysis, QVD, incremental load and performance.',tags:['Set Analysis','QVD','Model','Performance']},
  {name:'Python',tr:'pandas, otomasyon, SQL bağlantısı, veri kalite kontrolleri ve performans.',en:'pandas, automation, SQL connectivity, data quality checks and performance.',tags:['pandas','IO','Automation','QA']},
  {name:'Advanced Excel',tr:'Dynamic arrays, Power Query, Data Model, Power Pivot, DAX ve performans.',en:'Dynamic arrays, Power Query, Data Model, Power Pivot, DAX and performance.',tags:['LET/LAMBDA','PQ','DAX','Model']},
  {name:'Technical English',tr:'Dokümantasyon okuma, görev yorumlama, hata mesajı ve teknik açıklama pratiği.',en:'Documentation reading, requirement interpretation, error messages and technical explanation.',tags:['Docs','Vocabulary','Errors','Writing']}
];

function renderTracks(){
  $('#trackGrid').innerHTML=tracks.map((t,i)=>`<article class="track-card">
    <div class="n">TRACK ${String(i+1).padStart(2,'0')}</div>
    <h3>${t.name}</h3><p>${state.lang==='tr'?t.tr:t.en}</p>
    <div class="tags">${t.tags.map(x=>`<span>${x}</span>`).join('')}</div>
  </article>`).join('');
}

function applyLanguage(){
  const c=copy[state.lang];
  document.documentElement.lang=state.lang;
  $('#languageToggle').textContent=state.lang==='tr'?'EN':'TR';
  $('#heroTitle').textContent=c.heroTitle;
  $('#heroText').textContent=c.heroText;
  $('#tracksTitle').textContent=c.tracksTitle;
  $('#diagTitle').textContent=c.diagTitle;
  $('#diagIntro').textContent=c.diagIntro;
  $('#startDiagnostic').textContent=c.start;
  $('#startExamTop').textContent=c.topStart;
  $('#roadmapTitle').textContent=c.roadmap;
  $('#sqlTask').textContent=c.sqlTask;
  $('#checkSql').textContent=c.check;
  if(!state.exam.length)$('#diagCounter').textContent=c.ready;
  renderTracks();
  renderRoadmap();
  if(state.exam.length&&!$('#questionStage').classList.contains('hidden'))renderQuestion();
}

function shuffled(arr){
  return [...arr].sort(()=>Math.random()-.5);
}

function sampleExam(){
  const domains=[...new Set(state.questions.map(q=>q.domain))];
  return shuffled(domains.flatMap(domain=>shuffled(state.questions.filter(q=>q.domain===domain)).slice(0,5)));
}

function startExam(){
  state.exam=sampleExam(); state.answers={}; state.index=0;
  $('#diagnosticStart').classList.add('hidden');
  $('#resultStage').classList.add('hidden');
  $('#questionStage').classList.remove('hidden');
  renderQuestion();
  $('#diagnostic').scrollIntoView({behavior:'smooth'});
}

function renderQuestion(){
  const q=state.exam[state.index],c=copy[state.lang];
  if(!q)return;
  $('#diagCounter').textContent=`${state.index+1} / ${state.exam.length}`;
  $('#questionDomain').textContent=q.domain;
  $('#questionLevel').textContent='L'+q.level;
  $('#questionTopic').textContent=q.topic;
  $('#questionText').textContent=state.lang==='tr'?q.question_tr:q.question_en;
  $('#choiceList').innerHTML=q.choices.map((choice,i)=>`<label class="choice ${state.answers[q.id]===i?'selected':''}">
    <input type="radio" name="answer" value="${i}" ${state.answers[q.id]===i?'checked':''}>
    <span>${choice}</span>
  </label>`).join('');
  $('#nextQuestion').disabled=state.answers[q.id]===undefined;
  $('#nextQuestion').textContent=state.index===state.exam.length-1?c.finish:c.next;
  document.querySelectorAll('input[name="answer"]').forEach(r=>r.addEventListener('change',e=>{
    state.answers[q.id]=Number(e.target.value); renderQuestion();
  }));
}

function showResults(){
  const scores=computeDomainScores(state.exam,state.answers);
  localStorage.setItem('da-learning-os-latest',JSON.stringify({date:new Date().toISOString(),scores}));
  $('#questionStage').classList.add('hidden');
  $('#resultStage').classList.remove('hidden');
  $('#diagCounter').textContent=copy[state.lang].completed;
  const title=state.lang==='tr'?'Tanı sonucu':'Diagnostic result';
  const note=state.lang==='tr'
    ?'Bu skor hızlı MVP tanısıdır. Kod, Qlik expression ve workbook görevleri eklendiğinde yerleştirme daha kesin olacaktır.'
    :'This is a fast MVP diagnostic. Coding, Qlik expression and workbook tasks will make placement more precise.';
  $('#resultStage').innerHTML=`<h3>${title}</h3>
    <div class="result-grid">${Object.entries(scores).map(([d,x])=>`<div class="result-card"><span>${d}</span><strong>${x.score}%</strong><span>${x.level} · ${x.correct}/${x.total}</span></div>`).join('')}</div>
    <p class="fine">${note}</p>
    <button id="restartExam" class="secondary">${state.lang==='tr'?'Tekrar Çöz':'Retake'}</button>`;
  $('#restartExam').addEventListener('click',startExam);
}

function renderRoadmap(){
  if(!state.roadmap)return;
  $('#roadmapGrid').innerHTML=state.roadmap.phases.filter(p=>p.id!=='P0').map(p=>`<article class="phase">
    <div class="weeks">${state.lang==='tr'?'Hafta':'Weeks'} ${p.weeks[0]}–${p.weeks[p.weeks.length-1]}</div>
    <h3>${state.lang==='tr'?p.name_tr:p.name_en}</h3>
    <p>${p.outcome_tr}</p>
  </article>`).join('');
}

$('#languageToggle').addEventListener('click',()=>{state.lang=state.lang==='tr'?'en':'tr';applyLanguage()});
$('#startDiagnostic').addEventListener('click',startExam);
$('#startExamTop').addEventListener('click',startExam);
$('#nextQuestion').addEventListener('click',()=>{
  if(state.index<state.exam.length-1){state.index++;renderQuestion()}else showResults();
});
$('#checkSql').addEventListener('click',()=>{
  const r=checkSqlStructure($('#sqlEditor').value),el=$('#sqlResult');
  if(r.ok){el.textContent=state.lang==='tr'?'Gerekli yapılar mevcut.':'Required structures found.';el.style.color='var(--green)'}
  else{el.textContent=(state.lang==='tr'?'Eksik: ':'Missing: ')+r.missing.join(', ');el.style.color='var(--red)'}
});

async function init(){
  try{
    const [q,r]=await Promise.all([fetch('./data/question-bank.json'),fetch('./data/roadmap.json')]);
    state.questions=await q.json();
    state.roadmap=await r.json();
    applyLanguage();
  }catch(err){
    console.error(err);
    $('#diagCounter').textContent='Data load error';
  }
}
init();

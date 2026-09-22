const TRACK_ORDER=['sql','qlik','python','excel','html','english'];

const TRACK_FALLBACK={
  sql:'SQL Server / T-SQL',qlik:'Qlik Sense',python:'Python',excel:'Advanced Excel',html:'HTML & Web Foundations',english:'Technical English'
};

function safeParse(value){
  if(!value)return null;
  try{return JSON.parse(value)}catch{return null}
}

function hasActivity(progress){
  return Boolean(progress&&(progress.updatedAt||progress.startedAt||progress.completedAt||(progress.completedSections||[]).length||Object.keys(progress.evidenceDrafts||{}).length||Object.keys(progress.labEvidence||{}).length));
}

function dateValue(value){
  const time=new Date(value||0).getTime();
  return Number.isFinite(time)?time:0;
}

function substantiveDraftCount(progress){
  return Object.values(progress?.evidenceDrafts||{}).filter(value=>typeof value==='string'&&value.trim().length>=20).length;
}

function buildModuleMap(curriculum){
  const map=new Map();
  for(const track of curriculum?.tracks||[]){
    for(const module of track.modules||[])map.set(module.id,module);
  }
  return map;
}

function buildTrackMap(curriculum){
  return new Map((curriculum?.tracks||[]).map(track=>[track.id,track]));
}

function titleFor(entry,moduleMap,lang='tr'){
  const module=moduleMap.get(entry?.module_id);
  return lang==='en'?(module?.title_en||module?.title_tr||entry?.module_id||entry?.id||'Lesson'):(module?.title_tr||module?.title_en||entry?.module_id||entry?.id||'Ders');
}

function sortLessons(entries){
  return [...entries].sort((a,b)=>(a.order??999)-(b.order??999));
}

function progressStatus(progress,now){
  const pending=(progress?.retentionDue||[]).filter(item=>item?.status!=='completed');
  const due=pending.filter(item=>dateValue(item.dueAt)<=now.getTime());
  const upcoming=pending.filter(item=>dateValue(item.dueAt)>now.getTime());
  return {pending,due,upcoming};
}

export function buildLearningSnapshot({catalog,curriculum,storage,now=new Date()}){
  const entries=sortLessons(catalog?.production_lessons||[]);
  const moduleMap=buildModuleMap(curriculum);
  const trackMap=buildTrackMap(curriculum);

  const records=entries.map(entry=>{
    const progress=safeParse(storage?.getItem?.(`da-learning-os:lesson:${entry.id}`));
    const retention=progressStatus(progress,now);
    return {
      entry,
      progress,
      activity:hasActivity(progress),
      completed:Boolean(progress?.completedAt),
      updatedAt:progress?.updatedAt||progress?.completedAt||progress?.startedAt||null,
      evidenceDrafts:substantiveDraftCount(progress),
      labPassed:Object.values(progress?.labEvidence||{}).some(item=>item?.passed===true),
      retention
    };
  });

  const activities=records.filter(item=>item.activity).sort((a,b)=>dateValue(b.updatedAt)-dateValue(a.updatedAt));
  const lastWorked=activities[0]||null;
  let continueRecord=null;
  if(lastWorked&&!lastWorked.completed){
    continueRecord=lastWorked;
  }else if(lastWorked){
    const sameTrack=records.filter(item=>item.entry.track===lastWorked.entry.track);
    const currentIndex=sameTrack.findIndex(item=>item.entry.id===lastWorked.entry.id);
    continueRecord=sameTrack.slice(currentIndex+1).find(item=>!item.completed)||sameTrack.find(item=>!item.completed)||null;
  }
  continueRecord=continueRecord||records.find(item=>!item.completed)||records[0]||null;

  const trackIds=[...new Set([...TRACK_ORDER,...records.map(item=>item.entry.track)])].filter(id=>records.some(item=>item.entry.track===id));
  const tracks=trackIds.map(trackId=>{
    const lessons=records.filter(item=>item.entry.track===trackId);
    const completedCount=lessons.filter(item=>item.completed).length;
    const active=lessons.filter(item=>item.activity&&!item.completed).sort((a,b)=>dateValue(b.updatedAt)-dateValue(a.updatedAt))[0]||null;
    const current=active||lessons.find(item=>!item.completed)||lessons.at(-1)||null;
    const dueCount=lessons.reduce((sum,item)=>sum+item.retention.due.length,0);
    const upcomingCount=lessons.reduce((sum,item)=>sum+item.retention.upcoming.length,0);
    const evidenceDrafts=lessons.reduce((sum,item)=>sum+item.evidenceDrafts,0);
    const evaluatedMastery=lessons.filter(item=>item.progress?.mastery?.evaluated===true).length;
    const awardedMastery=lessons.filter(item=>item.progress?.mastery?.passed===true).length;
    return {
      id:trackId,
      name:trackMap.get(trackId)?.name||TRACK_FALLBACK[trackId]||trackId,
      lessons,
      completedCount,
      total:lessons.length,
      progressPercent:lessons.length?Math.round((completedCount/lessons.length)*100):0,
      current,
      level:current?.entry.level||lessons.at(-1)?.entry.level||'L1',
      dueCount,
      upcomingCount,
      evidenceDrafts,
      evaluatedMastery,
      awardedMastery
    };
  });

  const retentionDue=records.flatMap(record=>record.retention.due.map(item=>({record,item}))).sort((a,b)=>dateValue(a.item.dueAt)-dateValue(b.item.dueAt));
  const retentionUpcoming=records.flatMap(record=>record.retention.upcoming.map(item=>({record,item}))).sort((a,b)=>dateValue(a.item.dueAt)-dateValue(b.item.dueAt));
  const completedLessons=records.filter(item=>item.completed).length;
  const activeTracks=tracks.filter(track=>track.lessons.some(item=>item.activity)).length;
  const evidenceDrafts=records.reduce((sum,item)=>sum+item.evidenceDrafts,0);
  const masteryEvaluated=records.some(item=>item.progress?.mastery?.evaluated===true);
  const masteryAwarded=records.filter(item=>item.progress?.mastery?.passed===true).length;

  return {
    entries,records,tracks,moduleMap,
    continueRecord,lastWorked,
    retentionDue,retentionUpcoming,
    completedLessons,totalLessons:records.length,activeTracks,evidenceDrafts,
    masteryEvaluated,masteryAwarded,
    title:(entry,lang='tr')=>titleFor(entry,moduleMap,lang)
  };
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function formatDate(value,lang){
  if(!value)return lang==='tr'?'Henüz çalışma yok':'No study activity yet';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return new Intl.DateTimeFormat(lang==='tr'?'tr-TR':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(date);
}

function labels(lang){
  return lang==='en'?{
    homeEyebrow:'LEARNING HOME',homeTitle:'Continue from where you left off.',homeCopy:'Your course progress, review queue and evidence state are kept in one place on this browser.',
    continue:'Continue',start:'Start learning',last:'Last studied',courseProgress:'Track completion',completed:'lessons complete',due:'reviews due',active:'active tracks',evidence:'evidence drafts',mastery:'Mastery status',notEvaluated:'Not evaluated',awarded:'awarded',
    retention:'Review queue',retentionEmpty:'No review is due now.',upcoming:'Next review',courses:'Course navigation',coursesCopy:'Open a track, see all 12 production lessons, and continue at the right level.',current:'Current',next:'Next',done:'Done',lesson:'Lesson',reviews:'reviews',openCourse:'Open course',local:'Progress is stored locally in this browser.'
  }:{
    homeEyebrow:'ÖĞRENME ANA SAYFASI',homeTitle:'Kaldığın yerden devam et.',homeCopy:'Ders ilerlemen, tekrar sıran ve kanıt durumun bu tarayıcıda tek yerde tutulur.',
    continue:'Devam et',start:'Öğrenmeye başla',last:'Son çalışma',courseProgress:'Track ilerlemesi',completed:'ders tamamlandı',due:'tekrar vadesi',active:'aktif track',evidence:'kanıt taslağı',mastery:'Mastery durumu',notEvaluated:'Değerlendirilmedi',awarded:'verildi',
    retention:'Tekrar sırası',retentionEmpty:'Şu an vadesi gelen tekrar yok.',upcoming:'Sıradaki tekrar',courses:'Ders yolları',coursesCopy:'Track’i aç, 12 production dersi gör ve doğru seviyeden devam et.',current:'Devam',next:'Sırada',done:'Tamamlandı',lesson:'Ders',reviews:'tekrar',openCourse:'Track’e git',local:'İlerleme yalnızca bu tarayıcıda saklanır.'
  };
}

export function renderLearningHome({root=document,catalog,curriculum,storage=localStorage,lang='tr',now=new Date()}){
  const snapshot=buildLearningSnapshot({catalog,curriculum,storage,now});
  const l=labels(lang);
  const continueRecord=snapshot.continueRecord;
  const continueTrack=snapshot.tracks.find(track=>track.id===continueRecord?.entry.track);
  const continueIndex=continueTrack?continueTrack.lessons.findIndex(item=>item.entry.id===continueRecord.entry.id)+1:1;
  const continueTitle=continueRecord?snapshot.title(continueRecord.entry,lang):'';
  const lastText=snapshot.lastWorked?`${snapshot.title(snapshot.lastWorked.entry,lang)} · ${formatDate(snapshot.lastWorked.updatedAt,lang)}`:(lang==='tr'?'Henüz ders çalışılmadı':'No lesson activity yet');

  const homeTitle=root.querySelector('#learningHomeTitle');
  const homeCopy=root.querySelector('#learningHomeCopy');
  const homeEyebrow=root.querySelector('#learningHomeEyebrow');
  if(homeTitle)homeTitle.textContent=l.homeTitle;
  if(homeCopy)homeCopy.textContent=l.homeCopy;
  if(homeEyebrow)homeEyebrow.textContent=l.homeEyebrow;

  const continueRoot=root.querySelector('#learningContinue');
  if(continueRoot&&continueRecord){
    continueRoot.innerHTML=`<article class="continue-card panel">
      <div class="continue-copy">
        <span class="eyebrow">${escapeHtml(l.continue.toUpperCase())}</span>
        <div class="continue-meta"><span>${escapeHtml(continueTrack?.name||continueRecord.entry.track)}</span><span>${escapeHtml(continueRecord.entry.level)}</span><span>${escapeHtml(l.lesson)} ${continueIndex}/${continueTrack?.total||12}</span></div>
        <h2>${escapeHtml(continueTitle)}</h2>
        <p><strong>${escapeHtml(l.last)}:</strong> ${escapeHtml(lastText)}</p>
        <div class="continue-progress" aria-label="${escapeHtml(l.courseProgress)}"><span style="width:${continueTrack?.progressPercent||0}%"></span></div>
        <small>${escapeHtml(l.courseProgress)} · ${continueTrack?.progressPercent||0}% · ${continueTrack?.completedCount||0}/${continueTrack?.total||0} ${escapeHtml(l.completed)}</small>
      </div>
      <a id="continueLearning" class="primary continue-action" href="${escapeHtml(continueRecord.entry.runtime||`lesson.html?id=${encodeURIComponent(continueRecord.entry.id)}`)}">${escapeHtml(continueRecord.activity?l.continue:l.start)}</a>
    </article>`;
  }

  const stats=root.querySelector('#learningStats');
  if(stats){
    const masteryValue=snapshot.masteryEvaluated?`${snapshot.masteryAwarded} ${l.awarded}`:l.notEvaluated;
    stats.innerHTML=`
      <article><span>${escapeHtml(l.completed)}</span><strong>${snapshot.completedLessons}/${snapshot.totalLessons}</strong></article>
      <article><span>${escapeHtml(l.due)}</span><strong>${snapshot.retentionDue.length}</strong></article>
      <article><span>${escapeHtml(l.active)}</span><strong>${snapshot.activeTracks}/6</strong></article>
      <article><span>${escapeHtml(l.mastery)}</span><strong class="stat-word">${escapeHtml(masteryValue)}</strong><small>${snapshot.evidenceDrafts} ${escapeHtml(l.evidence)}</small></article>`;
  }

  const retention=root.querySelector('#retentionSummary');
  if(retention){
    const queue=snapshot.retentionDue.slice(0,3);
    const upcoming=snapshot.retentionUpcoming[0];
    retention.innerHTML=`<div class="retention-summary-head"><div><span class="eyebrow">${escapeHtml(l.retention.toUpperCase())}</span><strong>${snapshot.retentionDue.length} ${escapeHtml(l.reviews)}</strong></div><small>${escapeHtml(l.local)}</small></div>
      ${queue.length?`<div class="retention-queue">${queue.map(({record,item})=>`<a href="${escapeHtml(record.entry.runtime)}"><span>D+${Number(item.day||0)}</span><strong>${escapeHtml(snapshot.title(record.entry,lang))}</strong><small>${escapeHtml(formatDate(item.dueAt,lang))}</small></a>`).join('')}</div>`:`<p>${escapeHtml(l.retentionEmpty)}</p>`}
      ${!queue.length&&upcoming?`<small>${escapeHtml(l.upcoming)}: ${escapeHtml(snapshot.title(upcoming.record.entry,lang))} · ${escapeHtml(formatDate(upcoming.item.dueAt,lang))}</small>`:''}`;
  }

  const courseTitle=root.querySelector('#courseNavigationTitle');
  const courseCopy=root.querySelector('#courseNavigationCopy');
  if(courseTitle)courseTitle.textContent=l.courses;
  if(courseCopy)courseCopy.textContent=l.coursesCopy;

  const courseGrid=root.querySelector('#courseGrid');
  if(courseGrid){
    courseGrid.innerHTML=snapshot.tracks.map(track=>{
      const current=track.current;
      const open=continueTrack?.id===track.id?' open':'';
      const mastery=track.evaluatedMastery?`${track.awardedMastery}/${track.evaluatedMastery}`:l.notEvaluated;
      return `<details class="course-card" data-track="${escapeHtml(track.id)}"${open}>
        <summary>
          <div class="course-summary-main"><span class="course-kicker">${escapeHtml(track.name)}</span><strong>${escapeHtml(track.level)} · ${track.completedCount}/${track.total}</strong><small>${current?escapeHtml(snapshot.title(current.entry,lang)):''}</small></div>
          <div class="course-summary-side"><span>${track.progressPercent}%</span><small>${track.dueCount} ${escapeHtml(l.reviews)}</small></div>
          <div class="course-progress"><span style="width:${track.progressPercent}%"></span></div>
        </summary>
        <div class="course-card-body">
          <div class="course-state-row"><span>${escapeHtml(l.mastery)}: <strong>${escapeHtml(mastery)}</strong></span><span>${track.evidenceDrafts} ${escapeHtml(l.evidence)}</span></div>
          <div class="course-lessons">${track.lessons.map((record,index)=>{
            const status=record.completed?'done':record.entry.id===current?.entry.id?'current':'next';
            const statusText=status==='done'?l.done:status==='current'?l.current:l.next;
            return `<a class="course-lesson ${status}" href="${escapeHtml(record.entry.runtime)}"><span class="course-lesson-index">${String(index+1).padStart(2,'0')}</span><span><strong>${escapeHtml(snapshot.title(record.entry,lang))}</strong><small>${escapeHtml(record.entry.level)} · ${escapeHtml(statusText)}</small></span></a>`;
          }).join('')}</div>
          ${current?`<a class="secondary course-open" href="${escapeHtml(current.entry.runtime)}">${escapeHtml(l.openCourse)}</a>`:''}
        </div>
      </details>`;
    }).join('');
  }

  return snapshot;
}

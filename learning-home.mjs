import {aggregateTrackMastery} from './track-mastery.mjs';
import {buildObjectiveMasteryAnalytics,aggregateObjectiveMastery,prioritizeObjectiveTargets} from './objective-mastery.mjs';

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

function masteryStateFor(progress,retention,activity){
  if(!activity)return'not_started';
  if(retention.due.length)return'retention_due';
  return progress?.mastery?.state||(progress?.completedAt?'awaiting_evidence':'learning');
}

export function buildLearningSnapshot({catalog,curriculum,storage,now=new Date()}){
  const entries=sortLessons(catalog?.production_lessons||[]);
  const moduleMap=buildModuleMap(curriculum);
  const trackMap=buildTrackMap(curriculum);

  const records=entries.map(entry=>{
    const progress=safeParse(storage?.getItem?.(`da-learning-os:lesson:${entry.id}`));
    const retention=progressStatus(progress,now);
    const activity=hasActivity(progress);
    const priorDefinitions=(progress?.objectiveAnalytics?.objectives||[]).map(item=>({
      dimension:item.dimension,task_tr:item.taskTr,task_en:item.taskEn,weight:item.weight
    }));
    const objectiveAnalytics=buildObjectiveMasteryAnalytics({
      lessonId:entry.id,level:entry.level,track:entry.track,topic:titleFor(entry,moduleMap,'tr'),
      verifiedEvidence:progress?.verifiedEvidence||{},masteryEvidence:priorDefinitions
    });
    return {
      entry,
      progress,
      activity,
      masteryState:masteryStateFor(progress,retention,activity),
      completed:Boolean(progress?.completedAt),
      updatedAt:progress?.updatedAt||progress?.completedAt||progress?.startedAt||null,
      evidenceDrafts:substantiveDraftCount(progress),
      labPassed:Object.values(progress?.labEvidence||{}).some(item=>item?.passed===true),
      objectiveAnalytics,
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
    const rollup=aggregateTrackMastery(lessons);
    const objectiveAnalytics=aggregateObjectiveMastery(lessons);
    const objectiveTargets=prioritizeObjectiveTargets(objectiveAnalytics,{limit:4});
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
      awardedMastery,
      masteryState:rollup.state,
      masteredCount:rollup.masteredCount,
      masteryPercent:rollup.masteryPercent,
      masteryBlockingCount:rollup.blockingCount,
      masteryTarget:rollup.blockingRecords[0]||null,
      objectiveAnalytics,
      objectiveTargets
    };
  });

  const retentionDue=records.flatMap(record=>record.retention.due.map(item=>({record,item}))).sort((a,b)=>dateValue(a.item.dueAt)-dateValue(b.item.dueAt));
  const retentionUpcoming=records.flatMap(record=>record.retention.upcoming.map(item=>({record,item}))).sort((a,b)=>dateValue(a.item.dueAt)-dateValue(b.item.dueAt));
  const completedLessons=records.filter(item=>item.completed).length;
  const activeTracks=tracks.filter(track=>track.lessons.some(item=>item.activity)).length;
  const evidenceDrafts=records.reduce((sum,item)=>sum+item.evidenceDrafts,0);
  const masteryEvaluated=records.some(item=>item.progress?.mastery?.evaluated===true);
  const masteryAwarded=records.filter(item=>item.progress?.mastery?.passed===true).length;
  const masteryStates=records.reduce((acc,item)=>{acc[item.masteryState]=(acc[item.masteryState]||0)+1;return acc;},{});
  const trackMasteryStates=tracks.reduce((acc,track)=>{acc[track.masteryState]=(acc[track.masteryState]||0)+1;return acc;},{});
  const masteredTracks=tracks.filter(track=>track.masteryState==='mastered').length;
  const objectiveAnalytics=aggregateObjectiveMastery(records);
  const diagnosticTargets=prioritizeObjectiveTargets(objectiveAnalytics,{limit:12});

  return {
    entries,records,tracks,moduleMap,
    continueRecord,lastWorked,
    retentionDue,retentionUpcoming,
    completedLessons,totalLessons:records.length,activeTracks,evidenceDrafts,
    masteryEvaluated,masteryAwarded,masteryStates,trackMasteryStates,masteredTracks,
    objectiveAnalytics,diagnosticTargets,
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

export function objectiveFocusHref(entry,dimension){
  const runtime=entry?.runtime||`lesson.html?id=${encodeURIComponent(entry?.id||'')}`;
  return `${runtime}${runtime.includes('?')?'&':'?'}focus=${encodeURIComponent(dimension)}`;
}

function labels(lang){
  return lang==='en'?{
    homeTitle:'Continue',continue:'Continue',start:'Start',courseProgress:'Progress',completed:'Lessons',due:'Review',active:'Tracks',mastery:'Mastery',
    notStarted:'Not started',learning:'Learning',awaitingEvidence:'Evidence needed',awaitingAdvanced:'Advanced evidence',readyRetention:'Review pending',retentionDue:'Review due',mastered:'Mastered',needsReview:'Needs review',
    masteredTracks:'tracks',lessonMastery:'lessons mastered',review:'Review',retention:'Reviews',upcoming:'Next',courses:'Courses',current:'Continue',next:'Next',done:'Done',lesson:'Lesson',reviews:'reviews',skills:'Skills',skillCoverage:'Evidence',skillMastery:'Mastery',skillTarget:'Focus',skillPractice:'Practice',skillEvidence:'evidence',focusTitle:'Mastery focus',focusRetry:'Practice',focusGap:'gaps'
  }:{
    homeTitle:'Devam et',continue:'Devam et',start:'Başla',courseProgress:'İlerleme',completed:'Ders',due:'Tekrar',active:'Track',mastery:'Mastery',
    notStarted:'Başlanmadı',learning:'Devam ediyor',awaitingEvidence:'Kanıt gerekli',awaitingAdvanced:'İleri kanıt',readyRetention:'Tekrar bekliyor',retentionDue:'Tekrar zamanı',mastered:'Mastered',needsReview:'Gözden geçir',
    masteredTracks:'track',lessonMastery:'ders mastery',review:'Gözden geçir',retention:'Tekrarlar',upcoming:'Sıradaki',courses:'Dersler',current:'Devam',next:'Sırada',done:'Tamamlandı',lesson:'Ders',reviews:'tekrar',skills:'Beceriler',skillCoverage:'Kanıt',skillMastery:'Mastery',skillTarget:'Odak',skillPractice:'Tekrarla',skillEvidence:'kanıt',focusTitle:'Mastery odağı',focusRetry:'Tekrarla',focusGap:'açık'
  };
}

function masteryLabel(state,l){
  return ({
    not_started:l.notStarted,learning:l.learning,awaiting_evidence:l.awaitingEvidence,awaiting_advanced_evidence:l.awaitingAdvanced,
    ready_for_retention:l.readyRetention,retention_due:l.retentionDue,mastered:l.mastered,needs_review:l.needsReview
  })[state]||l.learning;
}

const SKILL_DIMENSIONS=Object.freeze(['knowledge','interpretation','production','transfer']);
const SKILL_DIMENSION_LABELS=Object.freeze({
  knowledge:{tr:'Bilgi',en:'Knowledge'},
  interpretation:{tr:'Yorum',en:'Interpretation'},
  production:{tr:'Üretim',en:'Production'},
  transfer:{tr:'Transfer',en:'Transfer'}
});

function skillDimensionState(summary){
  if(!summary||summary.evaluatedCount===0)return'unverified';
  if(summary.weakCount>0)return'weak';
  if(summary.strongCount===summary.evaluatedCount)return'strong';
  return'learning';
}

export function buildSkillMatrixRows(snapshot,lang='tr'){
  const records=snapshot?.records||[];
  return (snapshot?.tracks||[]).map(track=>{
    const analytics=track.objectiveAnalytics||{};
    const summaries=analytics.dimensionSummary||{};
    const target=(track.objectiveTargets||[])[0]||null;
    const targetRecord=target?records.find(record=>record.entry.id===target.lessonId):null;
    return {
      id:track.id,
      name:track.name,
      level:track.level,
      masteryState:track.masteryState,
      masteryPercent:analytics.masteryPercent||0,
      coveragePercent:analytics.coveragePercent||0,
      masteredCount:track.masteredCount||0,
      total:track.total||0,
      dimensions:SKILL_DIMENSIONS.map(dimension=>{
        const summary=summaries[dimension]||{total:0,evaluatedCount:0,strongCount:0,weakCount:0,averageScore:null};
        return {
          dimension,
          label:SKILL_DIMENSION_LABELS[dimension][lang==='en'?'en':'tr'],
          score:summary.averageScore,
          total:summary.total||0,
          evaluatedCount:summary.evaluatedCount||0,
          strongCount:summary.strongCount||0,
          weakCount:summary.weakCount||0,
          state:skillDimensionState(summary)
        };
      }),
      target:target&&targetRecord?{
        dimension:target.dimension,
        label:lang==='en'?target.dimension_en:target.dimension_tr,
        score:target.score,
        required:target.required,
        gap:target.gap,
        href:objectiveFocusHref(targetRecord.entry,target.dimension)
      }:null
    };
  });
}

export function renderLearningHome({root=document,catalog,curriculum,storage=localStorage,lang='tr',now=new Date()}){
  const snapshot=buildLearningSnapshot({catalog,curriculum,storage,now});
  const l=labels(lang);
  const continueRecord=snapshot.continueRecord;
  const continueTrack=snapshot.tracks.find(track=>track.id===continueRecord?.entry.track);
  const continueIndex=continueTrack?continueTrack.lessons.findIndex(item=>item.entry.id===continueRecord.entry.id)+1:1;
  const continueTitle=continueRecord?snapshot.title(continueRecord.entry,lang):'';

  const homeTitle=root.querySelector('#learningHomeTitle');
  if(homeTitle)homeTitle.textContent=l.homeTitle;

  const continueRoot=root.querySelector('#learningContinue');
  if(continueRoot&&continueRecord){
    continueRoot.innerHTML=`<article class="continue-card panel">
      <div class="continue-copy">
        <div class="continue-meta"><span>${escapeHtml(continueTrack?.name||continueRecord.entry.track)}</span><span>${escapeHtml(continueRecord.entry.level)}</span><span>${continueIndex}/${continueTrack?.total||12}</span></div>
        <h2>${escapeHtml(continueTitle)}</h2>
        <div class="continue-progress" aria-label="${escapeHtml(l.courseProgress)}"><span style="width:${continueTrack?.progressPercent||0}%"></span></div>
        <small>${continueTrack?.progressPercent||0}% · ${continueTrack?.completedCount||0}/${continueTrack?.total||0}</small>
      </div>
      <a id="continueLearning" class="primary continue-action" href="${escapeHtml(continueRecord.entry.runtime||`lesson.html?id=${encodeURIComponent(continueRecord.entry.id)}`)}">${escapeHtml(continueRecord.activity?l.continue:l.start)}</a>
    </article>`;
  }

  const stats=root.querySelector('#learningStats');
  if(stats){
    const masteryValue=snapshot.masteredTracks?`${snapshot.masteredTracks}/${snapshot.tracks.length} ${l.masteredTracks}`:
      snapshot.trackMasteryStates.retention_due?l.retentionDue:
      snapshot.trackMasteryStates.needs_review?l.needsReview:
      snapshot.trackMasteryStates.awaiting_evidence?l.awaitingEvidence:
      snapshot.trackMasteryStates.awaiting_advanced_evidence?l.awaitingAdvanced:
      snapshot.trackMasteryStates.ready_for_retention?l.readyRetention:
      snapshot.activeTracks?l.learning:l.notStarted;
    stats.innerHTML=`
      <article><span>${escapeHtml(l.completed)}</span><strong>${snapshot.completedLessons}/${snapshot.totalLessons}</strong></article>
      <article><span>${escapeHtml(l.due)}</span><strong>${snapshot.retentionDue.length}</strong></article>
      <article><span>${escapeHtml(l.active)}</span><strong>${snapshot.activeTracks}/6</strong></article>
      <article><span>${escapeHtml(l.mastery)}</span><strong class="stat-word">${escapeHtml(masteryValue)}</strong></article>`;
  }

  const retention=root.querySelector('#retentionSummary');
  if(retention){
    const queue=snapshot.retentionDue.slice(0,3);
    const upcoming=snapshot.retentionUpcoming[0];
    if(!queue.length&&!upcoming){
      retention.hidden=true;
      retention.innerHTML='';
    }else{
      retention.hidden=false;
      retention.innerHTML=`<div class="retention-summary-head"><strong>${escapeHtml(l.retention)}</strong></div>
        ${queue.length?`<div class="retention-queue">${queue.map(({record,item})=>`<a href="${escapeHtml(record.entry.runtime)}"><span>D+${Number(item.day||0)}</span><strong>${escapeHtml(snapshot.title(record.entry,lang))}</strong><small>${escapeHtml(formatDate(item.dueAt,lang))}</small></a>`).join('')}</div>`:`<small>${escapeHtml(l.upcoming)} · ${escapeHtml(snapshot.title(upcoming.record.entry,lang))} · ${escapeHtml(formatDate(upcoming.item.dueAt,lang))}</small>`}`;
    }
  }

  const focusRoot=root.querySelector('#objectiveFocus');
  if(focusRoot){
    const targets=snapshot.diagnosticTargets.slice(0,3).map(target=>({
      target,
      record:snapshot.records.find(record=>record.entry.id===target.lessonId)
    })).filter(item=>item.record);
    if(!targets.length){
      focusRoot.hidden=true;
      focusRoot.innerHTML='';
    }else{
      focusRoot.hidden=false;
      focusRoot.innerHTML=`<div class="objective-focus-head"><strong>${escapeHtml(l.focusTitle)}</strong><small>${targets.length} ${escapeHtml(l.focusGap)}</small></div>
        <div class="objective-focus-list">${targets.map(({target,record})=>`<a class="objective-focus-item" href="${escapeHtml(objectiveFocusHref(record.entry,target.dimension))}">
          <span><strong>${escapeHtml(snapshot.title(record.entry,lang))}</strong><small>${escapeHtml(lang==='en'?target.dimension_en:target.dimension_tr)} · ${target.score}% → ${target.required}%</small></span>
          <b>${escapeHtml(l.focusRetry)}</b>
        </a>`).join('')}</div>`;
    }
  }

  const skillTitle=root.querySelector('#skillMatrixTitle');
  if(skillTitle)skillTitle.textContent=l.skills;

  const skillRoot=root.querySelector('#skillMatrixGrid');
  if(skillRoot){
    const skillRows=buildSkillMatrixRows(snapshot,lang);
    skillRoot.innerHTML=skillRows.map(row=>`<article class="skill-matrix-card" data-skill-track="${escapeHtml(row.id)}">
      <div class="skill-matrix-head">
        <span><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.level)} · ${row.masteredCount}/${row.total} ${escapeHtml(l.lessonMastery)}</small></span>
        <span class="skill-mastery-value"><strong>${row.masteryPercent}%</strong><small>${escapeHtml(l.skillMastery)}</small></span>
      </div>
      <div class="skill-mastery-progress" aria-label="${escapeHtml(l.skillMastery)}"><span style="width:${row.masteryPercent}%"></span></div>
      <div class="skill-dimension-grid">${row.dimensions.map(dimension=>`<div class="skill-dimension ${escapeHtml(dimension.state)}">
        <span>${escapeHtml(dimension.label)}</span>
        <strong>${dimension.score===null?'—':`${dimension.score}%`}</strong>
        <small>${dimension.evaluatedCount}/${dimension.total} ${escapeHtml(l.skillEvidence)}</small>
      </div>`).join('')}</div>
      <div class="skill-matrix-foot">
        <span>${escapeHtml(l.skillCoverage)} · ${row.coveragePercent}%</span>
        ${row.target?`<a href="${escapeHtml(row.target.href)}"><span>${escapeHtml(l.skillTarget)} · ${escapeHtml(row.target.label)}</span><strong>${escapeHtml(l.skillPractice)}</strong></a>`:''}
      </div>
    </article>`).join('');
  }

  const courseTitle=root.querySelector('#courseNavigationTitle');
  if(courseTitle)courseTitle.textContent=l.courses;

  const courseGrid=root.querySelector('#courseGrid');
  if(courseGrid){
    courseGrid.innerHTML=snapshot.tracks.map(track=>{
      const current=track.current;
      const open=continueTrack?.id===track.id?' open':'';
      const mastery=masteryLabel(track.masteryState,l);
      return `<details class="course-card" data-track="${escapeHtml(track.id)}"${open}>
        <summary>
          <div class="course-summary-main"><strong class="course-kicker">${escapeHtml(track.name)}</strong><span>${escapeHtml(track.level)} · ${track.completedCount}/${track.total}</span></div>
          <div class="course-summary-side"><strong>${escapeHtml(mastery)}</strong><small>${track.progressPercent}%</small></div>
          <div class="course-progress"><span style="width:${track.progressPercent}%"></span></div>
        </summary>
        <div class="course-card-body">
          <div class="course-state-row"><span>${escapeHtml(mastery)}</span><span>${track.masteredCount}/${track.total} ${escapeHtml(l.lessonMastery)}</span>${track.dueCount?`<span>${track.dueCount} ${escapeHtml(l.reviews)}</span>`:''}</div>
          <div class="course-lessons">${track.lessons.map((record,index)=>{
            const status=record.masteryState==='mastered'?'mastered':
              ['retention_due','needs_review'].includes(record.masteryState)?'review':
              record.completed?'done':record.entry.id===current?.entry.id?'current':'next';
            const statusText=status==='mastered'?l.mastered:
              status==='review'?l.review:
              status==='done'?l.done:
              status==='current'?l.current:l.next;
            return `<a class="course-lesson ${status}" href="${escapeHtml(record.entry.runtime)}"><span class="course-lesson-index">${String(index+1).padStart(2,'0')}</span><span><strong>${escapeHtml(snapshot.title(record.entry,lang))}</strong><small>${escapeHtml(record.entry.level)} · ${escapeHtml(statusText)}</small></span></a>`;
          }).join('')}</div>
        </div>
      </details>`;
    }).join('');
  }

  return snapshot;
}


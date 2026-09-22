import {MASTERY_PROFILES} from './mastery-engine.mjs';

export const XP_LEDGER_STORAGE_KEY='da-learning-os:xp-ledger:v1';
export const XP_LEDGER_VERSION=1;

export const XP_RULES=Object.freeze({
  lessonCompletion:60,
  verifiedEvidence:25,
  masteryVerified:100
});

const DAILY_REWARD=Object.freeze({
  L1:80,
  L2:100,
  L3:120,
  L4:140,
  L5:160,
  Expert:180
});

const EVIDENCE_DIMENSIONS=Object.freeze(['knowledge','interpretation','production','transfer','retention']);

function safeParse(value){
  if(!value)return null;
  try{return JSON.parse(value)}catch{return null}
}

function finiteXp(value){
  return typeof value==='number'&&Number.isFinite(value)&&value>0?Math.round(value):0;
}

function normalizedEvents(value){
  const seen=new Set();
  const events=[];
  for(const event of Array.isArray(value)?value:[]){
    const id=typeof event?.id==='string'?event.id.trim():'';
    const xp=finiteXp(event?.xp);
    if(!id||!xp||seen.has(id))continue;
    seen.add(id);
    events.push({...event,id,xp});
  }
  return events;
}

export function readXpLedger(storage=localStorage){
  const parsed=safeParse(storage?.getItem?.(XP_LEDGER_STORAGE_KEY));
  const events=normalizedEvents(parsed?.events);
  return {
    version:XP_LEDGER_VERSION,
    totalXp:events.reduce((sum,event)=>sum+event.xp,0),
    events
  };
}

function writeXpLedger(storage,ledger){
  const normalized=readXpLedger({
    getItem:()=>JSON.stringify(ledger)
  });
  storage?.setItem?.(XP_LEDGER_STORAGE_KEY,JSON.stringify(normalized));
  return normalized;
}

export function awardXp(storage,event){
  if(!storage?.getItem||!storage?.setItem)throw new Error('XP storage is required.');
  const id=typeof event?.id==='string'?event.id.trim():'';
  const xp=finiteXp(event?.xp);
  if(!id||!xp)throw new Error('XP event requires a stable id and positive xp.');
  const ledger=readXpLedger(storage);
  if(ledger.events.some(item=>item.id===id)){
    return {awarded:false,xp:0,totalXp:ledger.totalXp,ledger};
  }
  const nextEvent={
    id,
    kind:event.kind||'achievement',
    xp,
    lessonId:event.lessonId||null,
    dimension:event.dimension||null,
    day:event.day||null,
    source:event.source||null,
    awardedAt:event.awardedAt||new Date().toISOString()
  };
  const next=writeXpLedger(storage,{version:XP_LEDGER_VERSION,events:[...ledger.events,nextEvent]});
  return {awarded:true,xp,totalXp:next.totalXp,ledger:next,event:nextEvent};
}

export function dailyChallengeRewardForLevel(level){
  return DAILY_REWARD[level]??DAILY_REWARD.L3;
}

export function dailyChallengeXpEventId({day,lessonId,dimension}){
  return `daily:${day}:${lessonId}:${dimension}`;
}

function evidenceFloor(lesson,dimension){
  const floor=MASTERY_PROFILES[lesson?.level]?.floors?.[dimension];
  return typeof floor==='number'&&Number.isFinite(floor)?floor:80;
}

function qualifiesEvidence(lesson,progress,dimension){
  const evidence=progress?.verifiedEvidence?.[dimension];
  const score=evidence?.score;
  return evidence?.status==='verified'&&typeof score==='number'&&Number.isFinite(score)&&score>=evidenceFloor(lesson,dimension);
}

function evidenceChanged(previousProgress,nextProgress,dimension){
  const previous=previousProgress?.verifiedEvidence?.[dimension]||null;
  const next=nextProgress?.verifiedEvidence?.[dimension]||null;
  if(!next)return false;
  return JSON.stringify({
    status:previous?.status||null,
    score:previous?.score??null,
    source:previous?.source||null,
    observedAt:previous?.observedAt||null
  })!==JSON.stringify({
    status:next?.status||null,
    score:next?.score??null,
    source:next?.source||null,
    observedAt:next?.observedAt||null
  });
}

function award(storage,events,event){
  const result=awardXp(storage,event);
  if(result.awarded)events.push(result.event);
  return result;
}

export function syncLessonXp({
  storage,
  lesson,
  previousProgress=null,
  nextProgress=null,
  context={},
  now=new Date()
}={}){
  if(!lesson?.id||!nextProgress)return {awardedXp:0,events:[],totalXp:readXpLedger(storage).totalXp};
  const awarded=[];
  const awardedAt=now instanceof Date?now.toISOString():new Date(now).toISOString();

  if(!previousProgress?.completedAt&&nextProgress?.completedAt){
    award(storage,awarded,{
      id:`lesson:${lesson.id}:completed`,
      kind:'lesson-completed',
      xp:XP_RULES.lessonCompletion,
      lessonId:lesson.id,
      source:'lesson-runtime',
      awardedAt
    });
  }

  const changedQualified=[];
  for(const dimension of EVIDENCE_DIMENSIONS){
    const nextQualifies=qualifiesEvidence(lesson,nextProgress,dimension);
    if(!nextQualifies)continue;
    if(evidenceChanged(previousProgress,nextProgress,dimension))changedQualified.push(dimension);
    if(!qualifiesEvidence(lesson,previousProgress,dimension)){
      award(storage,awarded,{
        id:`evidence:${lesson.id}:${dimension}`,
        kind:'verified-evidence',
        xp:XP_RULES.verifiedEvidence,
        lessonId:lesson.id,
        dimension,
        source:nextProgress.verifiedEvidence?.[dimension]?.source||'verified-evidence',
        awardedAt
      });
    }
  }

  if(previousProgress?.mastery?.passed!==true&&nextProgress?.mastery?.passed===true){
    award(storage,awarded,{
      id:`mastery:${lesson.id}`,
      kind:'mastery-verified',
      xp:XP_RULES.masteryVerified,
      lessonId:lesson.id,
      source:'mastery-engine',
      awardedAt
    });
  }

  const focus=EVIDENCE_DIMENSIONS.includes(context?.focus)?context.focus:null;
  const validDay=typeof context?.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(context.day);
  if(context?.source==='daily-challenge'&&focus&&validDay&&changedQualified.includes(focus)){
    award(storage,awarded,{
      id:dailyChallengeXpEventId({day:context.day,lessonId:lesson.id,dimension:focus}),
      kind:'daily-challenge',
      xp:dailyChallengeRewardForLevel(lesson.level),
      lessonId:lesson.id,
      dimension:focus,
      day:context.day,
      source:'daily-challenge',
      awardedAt
    });
  }

  const ledger=readXpLedger(storage);
  return {
    awardedXp:awarded.reduce((sum,event)=>sum+event.xp,0),
    events:awarded,
    totalXp:ledger.totalXp
  };
}

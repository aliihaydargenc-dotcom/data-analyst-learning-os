import {DEFAULT_WEIGHTS,MASTERY_PROFILES} from './mastery-engine.mjs';

export const OBJECTIVE_ANALYTICS_VERSION=1;
export const OBJECTIVE_DIMENSIONS=Object.freeze(['knowledge','interpretation','production','transfer']);

const DIMENSION_LABELS=Object.freeze({
  knowledge:{tr:'Bilgi',en:'Knowledge'},
  interpretation:{tr:'Yorum',en:'Interpretation'},
  production:{tr:'Üretim',en:'Production'},
  transfer:{tr:'Transfer',en:'Transfer'}
});

function validScore(value){
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
}

function rounded(value){
  return Math.round(value*10)/10;
}

function definitionMap(masteryEvidence=[]){
  return new Map((Array.isArray(masteryEvidence)?masteryEvidence:[])
    .filter(item=>OBJECTIVE_DIMENSIONS.includes(item?.dimension))
    .map(item=>[item.dimension,item]));
}

function objectiveWeight(definition,dimension){
  const explicit=Number(definition?.weight);
  if(Number.isFinite(explicit)&&explicit>0)return explicit;
  return (DEFAULT_WEIGHTS[dimension]||0)*100;
}

export function buildObjectiveMasteryAnalytics({
  lessonId,
  level,
  track=null,
  topic=null,
  verifiedEvidence={},
  masteryEvidence=[]
}={}){
  if(!lessonId)throw new Error('Objective analytics requires lessonId');
  const profile=MASTERY_PROFILES[level]||null;
  const definitions=definitionMap(masteryEvidence);
  const objectives=OBJECTIVE_DIMENSIONS.map(dimension=>{
    const definition=definitions.get(dimension)||{};
    const evidence=verifiedEvidence?.[dimension]||null;
    const score=validScore(evidence?.score)?evidence.score:null;
    const required=typeof profile?.floors?.[dimension]==='number'?profile.floors[dimension]:null;
    const state=score===null?'unverified':required===null?'verified':score>=required?'strong':'weak';
    return {
      id:`${lessonId}:${dimension}`,
      lessonId,
      track,
      level:level||null,
      topic,
      dimension,
      dimension_tr:DIMENSION_LABELS[dimension].tr,
      dimension_en:DIMENSION_LABELS[dimension].en,
      taskTr:typeof definition.task_tr==='string'?definition.task_tr:null,
      taskEn:typeof definition.task_en==='string'?definition.task_en:null,
      weight:objectiveWeight(definition,dimension),
      required,
      score,
      gap:score===null||required===null?null:Math.max(0,rounded(required-score)),
      state,
      source:evidence?.source||null,
      observedAt:evidence?.observedAt||null
    };
  });
  const evaluated=objectives.filter(item=>item.score!==null);
  const strong=objectives.filter(item=>item.state==='strong');
  const weak=objectives.filter(item=>item.state==='weak');
  const weighted=evaluated.reduce((acc,item)=>({
    sum:acc.sum+(item.score*item.weight),
    weight:acc.weight+item.weight
  }),{sum:0,weight:0});
  return {
    version:OBJECTIVE_ANALYTICS_VERSION,
    lessonId,
    level:level||null,
    track,
    objectives,
    total:objectives.length,
    evaluatedCount:evaluated.length,
    strongCount:strong.length,
    weakCount:weak.length,
    unverifiedCount:objectives.length-evaluated.length,
    coveragePercent:objectives.length?Math.round((evaluated.length/objectives.length)*100):0,
    masteryPercent:objectives.length?Math.round((strong.length/objectives.length)*100):0,
    averageScore:weighted.weight?rounded(weighted.sum/weighted.weight):null
  };
}

export function aggregateObjectiveMastery(records=[]){
  const byId=new Map();
  for(const record of Array.isArray(records)?records:[]){
    const analytics=record?.objectiveAnalytics||record?.progress?.objectiveAnalytics||null;
    for(const objective of analytics?.objectives||[]){
      if(objective?.id)byId.set(objective.id,objective);
    }
  }
  const objectives=[...byId.values()];
  const evaluated=objectives.filter(item=>validScore(item?.score));
  const strong=objectives.filter(item=>item?.state==='strong');
  const weak=objectives.filter(item=>item?.state==='weak');
  const stateCounts=objectives.reduce((acc,item)=>{
    const state=item?.state||'unverified';
    acc[state]=(acc[state]||0)+1;
    return acc;
  },{});
  const dimensionSummary=OBJECTIVE_DIMENSIONS.reduce((acc,dimension)=>{
    const items=objectives.filter(item=>item.dimension===dimension);
    const scored=items.filter(item=>validScore(item.score));
    const strongItems=items.filter(item=>item.state==='strong');
    const weakItems=items.filter(item=>item.state==='weak');
    acc[dimension]={
      total:items.length,
      evaluatedCount:scored.length,
      strongCount:strongItems.length,
      weakCount:weakItems.length,
      averageScore:scored.length?rounded(scored.reduce((sum,item)=>sum+item.score,0)/scored.length):null
    };
    return acc;
  },{});
  return {
    version:OBJECTIVE_ANALYTICS_VERSION,
    objectives,
    total:objectives.length,
    evaluatedCount:evaluated.length,
    strongCount:strong.length,
    weakCount:weak.length,
    unverifiedCount:objectives.length-evaluated.length,
    coveragePercent:objectives.length?Math.round((evaluated.length/objectives.length)*100):0,
    masteryPercent:objectives.length?Math.round((strong.length/objectives.length)*100):0,
    stateCounts,
    dimensionSummary
  };
}

export function prioritizeObjectiveTargets(analyticsOrObjectives,{limit=8,includeUnverified=false}={}){
  const objectives=Array.isArray(analyticsOrObjectives)
    ?analyticsOrObjectives
    :(analyticsOrObjectives?.objectives||[]);
  const weak=objectives
    .filter(item=>item?.state==='weak')
    .sort((a,b)=>(b.gap??0)-(a.gap??0)||(a.score??101)-(b.score??101)||String(a.id).localeCompare(String(b.id)));
  if(!includeUnverified)return weak.slice(0,Math.max(0,limit));
  const unverified=objectives
    .filter(item=>item?.state==='unverified')
    .sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  return [...weak,...unverified].slice(0,Math.max(0,limit));
}

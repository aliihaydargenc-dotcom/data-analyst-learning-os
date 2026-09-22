export const MASTERY_HISTORY_LIMIT=50;

const asArray=value=>Array.isArray(value)?value:[];
const finiteOrNull=value=>typeof value==='number'&&Number.isFinite(value)?value:null;

function failureSnapshot(value){
  return asArray(value).map(item=>({
    dimension:item?.dimension||null,
    required:item?.required??null,
    actual:item?.actual??null
  }));
}

function remediationSnapshot(value){
  if(!value)return null;
  return {
    mode:value.mode||null,
    level:value.level||null,
    weighted:finiteOrNull(value.weighted),
    targets:asArray(value.targets).map(item=>({
      dimension:item?.dimension||null,
      required:item?.required??null,
      actual:item?.actual??null
    }))
  };
}

export function masteryDecisionShape(mastery){
  if(!mastery)return null;
  return {
    state:mastery.state||'learning',
    evaluated:mastery.evaluated===true,
    passed:mastery.passed===true,
    weighted:finiteOrNull(mastery.weighted),
    confidence:finiteOrNull(mastery.confidence)??0,
    failures:failureSnapshot(mastery.failures),
    missingDimensions:[...asArray(mastery.missingDimensions)],
    verifiedDimensions:[...asArray(mastery.verifiedDimensions)],
    missingGates:[...asArray(mastery.missingGates)],
    verifiedGates:[...asArray(mastery.verifiedGates)],
    remediation:remediationSnapshot(mastery.remediation)
  };
}

export function masteryDecisionSignature(mastery){
  return JSON.stringify(masteryDecisionShape(mastery));
}

function evidenceSnapshot(evidence={}){
  return Object.fromEntries(
    Object.entries(evidence||{})
      .filter(([,value])=>value&&typeof value==='object')
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([dimension,value])=>[dimension,{
        status:value.status||null,
        score:finiteOrNull(value.score),
        source:typeof value.source==='string'?value.source:null,
        observedAt:typeof value.observedAt==='string'?value.observedAt:null
      }])
  );
}

function masteryInputsSnapshot(inputs={}){
  return Object.fromEntries(
    Object.entries(inputs||{})
      .filter(([,value])=>typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value)))
      .sort(([a],[b])=>a.localeCompare(b))
  );
}

function observedAtIso(value){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))throw new Error('Invalid mastery decision timestamp');
  return date.toISOString();
}

export function recordMasteryDecision(
  history=[],
  previousMastery=null,
  nextMastery=null,
  {verifiedEvidence={},masteryInputs={},observedAt=new Date()}={}
){
  const current=asArray(history).slice(-MASTERY_HISTORY_LIMIT);
  if(!nextMastery)return current;

  const previous=masteryDecisionShape(previousMastery);
  const next=masteryDecisionShape(nextMastery);
  if(previous?.state==='learning'&&next.state==='learning'&&!previous.evaluated&&!next.evaluated)return current;
  if(JSON.stringify(previous)===JSON.stringify(next))return current;

  const timestamp=observedAtIso(observedAt);
  const event={
    id:`mastery-decision-${timestamp.replace(/[^0-9]/g,'')}-${current.length+1}`,
    observedAt:timestamp,
    kind:previous?.state!==next.state?'state-transition':'decision-update',
    transition:{from:previous?.state||null,to:next.state},
    decision:next,
    evidence:evidenceSnapshot(verifiedEvidence),
    masteryInputs:masteryInputsSnapshot(masteryInputs)
  };
  return [...current,event].slice(-MASTERY_HISTORY_LIMIT);
}

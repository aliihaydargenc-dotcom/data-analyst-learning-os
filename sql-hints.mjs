export function sqlHintStep(challenge,step,lang='tr'){
  if(step===1)return lang==='en'
    ?`Start with the required structure: ${(challenge.requiredSql||[]).map(rule=>rule.label).join(', ')}.`
    :`Gerekli yapıyla başla: ${(challenge.requiredSql||[]).map(rule=>rule.label).join(', ')}.`;
  if(step===2)return lang==='en'
    ?'Check the output grain, partition, ordering, and aliases against the task before running.'
    :'Çalıştırmadan önce çıktı grain’ini, partition, sıralama ve alias alanlarını görevle karşılaştır.';
  return challenge.referenceSql;
}

export function sqlChallengeReward(step){
  return [100,80,60,0][Math.max(0,Math.min(3,step))];
}

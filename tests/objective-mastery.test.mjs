import assert from 'node:assert/strict';
import {buildObjectiveMasteryAnalytics,aggregateObjectiveMastery,prioritizeObjectiveTargets,OBJECTIVE_ANALYTICS_VERSION} from '../objective-mastery.mjs';

const analytics=buildObjectiveMasteryAnalytics({
  lessonId:'sql.test.001',
  level:'L3',
  track:'sql',
  topic:'Test objective',
  masteryEvidence:[
    {dimension:'knowledge',task_tr:'Kuralı açıkla',weight:15},
    {dimension:'interpretation',task_tr:'Çıktıyı yorumla',weight:20},
    {dimension:'production',task_tr:'Çözüm üret',weight:35},
    {dimension:'transfer',task_tr:'Yeni bağlama taşı',weight:30}
  ],
  verifiedEvidence:{
    knowledge:{score:90,source:'assessment'},
    interpretation:{score:70,source:'assessment'},
    production:{score:88,source:'semantic-lab'},
    transfer:{score:75,source:'assessment'}
  }
});

assert.equal(analytics.version,OBJECTIVE_ANALYTICS_VERSION);
assert.equal(analytics.total,4);
assert.equal(analytics.evaluatedCount,4);
assert.equal(analytics.strongCount,2);
assert.equal(analytics.weakCount,2);
assert.equal(analytics.objectives.find(item=>item.dimension==='knowledge').state,'strong');
assert.equal(analytics.objectives.find(item=>item.dimension==='interpretation').required,85);
assert.equal(analytics.objectives.find(item=>item.dimension==='interpretation').gap,15);
assert.equal(analytics.objectives.find(item=>item.dimension==='production').taskTr,'Çözüm üret');
assert.equal(analytics.objectives.find(item=>item.dimension==='transfer').state,'weak');

const second=buildObjectiveMasteryAnalytics({
  lessonId:'sql.test.002',
  level:'L1',
  track:'sql',
  verifiedEvidence:{knowledge:{score:100}}
});
const rollup=aggregateObjectiveMastery([
  {objectiveAnalytics:analytics},
  {objectiveAnalytics:second}
]);
assert.equal(rollup.total,8);
assert.equal(rollup.evaluatedCount,5);
assert.equal(rollup.strongCount,3);
assert.equal(rollup.weakCount,2);
assert.equal(rollup.dimensionSummary.knowledge.evaluatedCount,2);
assert.equal(rollup.dimensionSummary.production.evaluatedCount,1);

const targets=prioritizeObjectiveTargets(rollup,{limit:2});
assert.deepEqual(targets.map(item=>item.dimension),['interpretation','transfer']);
const withUnverified=prioritizeObjectiveTargets(second,{limit:4,includeUnverified:true});
assert.equal(withUnverified.length,3);
assert.ok(withUnverified.every(item=>item.state==='unverified'));

console.log('objective mastery analytics: PASS');

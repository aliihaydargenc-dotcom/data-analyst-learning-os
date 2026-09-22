import assert from 'node:assert/strict';
import {dailyChallengeDateKey,buildDailyChallenge} from '../daily-challenge.mjs';

assert.equal(dailyChallengeDateKey(new Date(2026,8,22,10,0,0)),'2026-09-22');

const entry={id:'sql.window.001',track:'sql',level:'L3',runtime:'lesson.html?id=sql.window.001'};
const snapshot={
  records:[{entry}],
  continueRecord:{entry},
  diagnosticTargets:[],
  tracks:[{id:'sql',name:'SQL Server / T-SQL'}],
  title:()=> 'Window Functions'
};
const challenge=buildDailyChallenge(snapshot,{lang:'tr',now:new Date(2026,8,22,10,0,0)});
assert.equal(challenge.rewardXp,120);
assert.equal(challenge.estimatedMinutes,10);
assert.equal(challenge.difficulty,'Orta');
assert.equal(challenge.dimension,'production');
assert.match(challenge.href,/source=daily-challenge/);
assert.match(challenge.href,/day=2026-09-22/);
assert.match(challenge.href,/focus=production/);
assert.equal(challenge.xpEventId,'daily:2026-09-22:sql.window.001:production');

snapshot.diagnosticTargets=[{lessonId:'sql.window.001',dimension:'transfer'}];
const targeted=buildDailyChallenge(snapshot,{lang:'en',now:new Date(2026,8,22,10,0,0)});
assert.equal(targeted.dimension,'transfer');
assert.equal(targeted.dimensionLabel,'Transfer');
assert.match(targeted.href,/focus=transfer/);
assert.equal(targeted.xpEventId,'daily:2026-09-22:sql.window.001:transfer');
assert.match(targeted.task,/Transfer the/);

console.log('daily challenge: PASS');

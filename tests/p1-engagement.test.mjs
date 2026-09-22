import assert from 'node:assert/strict';
import {studyStreak} from '../streak-system.mjs';
import {sqlChallengeReward,sqlHintStep} from '../sql-hints.mjs';
import {evaluateRevenueCase} from '../case-study.mjs';

const today=new Date(2026,8,22,12);
const events=[
  {kind:'verified-evidence',awardedAt:new Date(2026,8,20,9).toISOString()},
  {kind:'verified-evidence',awardedAt:new Date(2026,8,21,9).toISOString()},
  {kind:'lesson-completed',awardedAt:new Date(2026,8,22,9).toISOString()}
];
assert.deepEqual(studyStreak(events,today),{current:2,activeToday:false});
events.push({kind:'sql-challenge',awardedAt:new Date(2026,8,22,10).toISOString()});
assert.deepEqual(studyStreak(events,today),{current:3,activeToday:true});
assert.deepEqual(studyStreak(events,new Date(2026,8,24,10)),{current:0,activeToday:false});
assert.equal(studyStreak([{kind:'verified-evidence',awardedAt:'invalid'}],today).current,0);
assert.deepEqual([0,1,2,3].map(sqlChallengeReward),[100,80,60,0]);
const challenge={requiredSql:[{label:'LAG()'}],referenceSql:'SELECT 1'};
assert.match(sqlHintStep(challenge,1,'tr'),/LAG/);
assert.equal(sqlHintStep(challenge,3),'SELECT 1');
const rows=[{HOTEL:'A',BUSINESS_DATE:'2025-01-03',REVENUE_CHANGE:-100},{HOTEL:'B',BUSINESS_DATE:'2025-01-04',REVENUE_CHANGE:-50}];
const memo='Her iki otelde düşüş var. Tarih ve tutarlar doğrulandı; neden için rezervasyon ve segment dağılımını kontrol etmek gerekir.';
assert.equal(evaluateRevenueCase({sqlVerified:true,rows,interpretation:'correlation-not-cause',memo}).passed,true);
assert.equal(evaluateRevenueCase({sqlVerified:false,rows,interpretation:'correlation-not-cause',memo}).passed,false);
assert.equal(evaluateRevenueCase({sqlVerified:true,rows,interpretation:'proven-cause',memo}).passed,false);
console.log('P1 engagement: PASS');

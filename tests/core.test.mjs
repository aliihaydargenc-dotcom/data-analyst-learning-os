import assert from 'node:assert/strict';
import {assessLevel,normalizeSQL,checkSqlStructure,computeDomainScores} from '../core.mjs';

assert.equal(assessLevel(39),'L1');
assert.equal(assessLevel(40),'L2');
assert.equal(assessLevel(60),'L3');
assert.equal(assessLevel(75),'L4');
assert.equal(assessLevel(90),'L5');
assert.equal(normalizeSQL('SELECT  *\nFROM T;'),'select * from t;');

const good=`SELECT HOTEL, BUSINESS_DATE, REVENUE_EUR,
LAG(REVENUE_EUR) OVER (PARTITION BY HOTEL ORDER BY BUSINESS_DATE) prev
FROM hotel_daily`;

assert.equal(checkSqlStructure(good).ok,true);
assert.equal(checkSqlStructure('select hotel from hotel_daily').ok,false);

const qs=[
  {id:'1',domain:'SQL',answer:0},
  {id:'2',domain:'SQL',answer:1},
  {id:'3',domain:'Python',answer:0}
];
const scores=computeDomainScores(qs,{'1':0,'2':0,'3':0});
assert.equal(scores.SQL.score,50);
assert.equal(scores.Python.score,100);

console.log('core tests: PASS');

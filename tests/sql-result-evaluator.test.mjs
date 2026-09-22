import assert from 'node:assert/strict';
import {compareResultSets} from '../sql-result-evaluator.mjs';
import {SQL_CHALLENGES,evaluateSqlChallenge} from '../sql-challenges.mjs';

const expected={
  columns:['BOOKING_ID','STATUS'],
  rows:[
    {BOOKING_ID:'B1',STATUS:'Active'},
    {BOOKING_ID:'B2',STATUS:'Pending'}
  ]
};

assert.equal(compareResultSets(expected,expected).passed,true);

const wrongOrder={
  columns:['BOOKING_ID','STATUS'],
  rows:[
    {BOOKING_ID:'B2',STATUS:'Pending'},
    {BOOKING_ID:'B1',STATUS:'Active'}
  ]
};
const orderResult=compareResultSets(wrongOrder,expected);
assert.equal(orderResult.passed,false);
assert.ok(orderResult.errors.some(error=>error.type==='cell'));

const wrongColumns={
  columns:['STATUS','BOOKING_ID'],
  rows:expected.rows
};
assert.equal(compareResultSets(wrongColumns,expected).passed,false);

const wrongCount={
  columns:['BOOKING_ID','STATUS'],
  rows:[expected.rows[0]]
};
const countResult=compareResultSets(wrongCount,expected);
assert.equal(countResult.passed,false);
assert.ok(countResult.errors.some(error=>error.type==='row_count'));

const fullExpected={
  columns:['HOTEL','REVENUE_EUR'],
  rows:[{HOTEL:'A',REVENUE_EUR:100},{HOTEL:'B',REVENUE_EUR:200}],
  totalRows:2
};
const sameRowsWrongTotal={...fullExpected,totalRows:3};
const totalResult=compareResultSets(sameRowsWrongTotal,fullExpected);
assert.equal(totalResult.passed,false);
assert.ok(totalResult.errors.some(error=>error.type==='row_count'));

const challenge=SQL_CHALLENGES[0];
const challengeExpected={
  columns:['HOTEL','BUSINESS_DATE','REVENUE_EUR','PREV_DAY_REVENUE'],
  rows:[
    {HOTEL:'A',BUSINESS_DATE:'2026-01-01',REVENUE_EUR:100,PREV_DAY_REVENUE:null},
    {HOTEL:'A',BUSINESS_DATE:'2026-01-02',REVENUE_EUR:120,PREV_DAY_REVENUE:100}
  ],
  totalRows:2
};
const passedChallenge=evaluateSqlChallenge({
  challenge,
  sql:challenge.referenceSql,
  actual:challengeExpected,
  expected:challengeExpected
});
assert.equal(passedChallenge.passed,true);
assert.equal(passedChallenge.score,100);

const structureOnlyFailure=evaluateSqlChallenge({
  challenge,
  sql:'SELECT HOTEL, BUSINESS_DATE, REVENUE_EUR, NULL AS PREV_DAY_REVENUE FROM hotel_daily ORDER BY HOTEL, BUSINESS_DATE',
  actual:challengeExpected,
  expected:challengeExpected
});
assert.equal(structureOnlyFailure.passed,false);
assert.equal(structureOnlyFailure.score,75);
assert.deepEqual(structureOnlyFailure.checks.find(check=>check.id==='required_sql'),{id:'required_sql',passed:false});

const wrongValue={
  ...challengeExpected,
  rows:[challengeExpected.rows[0],{...challengeExpected.rows[1],PREV_DAY_REVENUE:99}]
};
const semanticFailure=evaluateSqlChallenge({
  challenge,
  sql:challenge.referenceSql,
  actual:wrongValue,
  expected:challengeExpected
});
assert.equal(semanticFailure.passed,false);
assert.equal(semanticFailure.checks.find(check=>check.id==='values_order').passed,false);

console.log('sql result evaluator tests: PASS');

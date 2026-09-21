import assert from 'node:assert/strict';
import {compareResultSets} from '../sql-result-evaluator.mjs';

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

console.log('sql result evaluator tests: PASS');

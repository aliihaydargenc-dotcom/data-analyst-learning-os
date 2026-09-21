import * as duckdb from '@duckdb/duckdb-wasm';
import {DUCKDB_VERSION,DUCKDB_BUNDLES} from './duckdb-config.mjs';
import {compareResultSets} from './sql-result-evaluator.mjs';

const FIXTURES=Object.freeze({
  'sql-aggregation-grain-v1':{
    table:'stay_charge_cases',
    visibleSetup:`
      DROP TABLE IF EXISTS stay_charge_cases;
      CREATE TABLE stay_charge_cases(
        STAY_ID VARCHAR,
        HOTEL VARCHAR,
        BUSINESS_DATE DATE,
        SEGMENT VARCHAR,
        REVENUE_EUR INTEGER,
        ROOM_NIGHTS INTEGER
      );
      INSERT INTO stay_charge_cases VALUES
        ('S08','B',DATE '2026-07-12','Corporate',NULL,1),
        ('S01','A',DATE '2026-07-01','Leisure',1200,1),
        ('S11','C',DATE '2026-07-20','Leisure',NULL,1),
        ('S06','B',DATE '2026-07-07','Leisure',1800,1),
        ('S03','A',DATE '2026-07-03','Leisure',900,1),
        ('S09','B',DATE '2026-07-13','Corporate',2200,1),
        ('S05','A',DATE '2026-07-05','Corporate',900,1),
        ('S07','B',DATE '2026-07-08','Leisure',1200,1),
        ('S02','A',DATE '2026-07-02','Leisure',NULL,1),
        ('S10','C',DATE '2026-07-19','Leisure',NULL,1),
        ('S04','A',DATE '2026-07-04','Corporate',1000,1),
        ('S12','A',DATE '2026-08-01','Leisure',10000,1),
        ('S13','B',DATE '2026-06-30','Corporate',9000,1);
    `,
    edgeSetup:`
      DROP TABLE IF EXISTS stay_charge_cases;
      CREATE TABLE stay_charge_cases(
        STAY_ID VARCHAR,
        HOTEL VARCHAR,
        BUSINESS_DATE DATE,
        SEGMENT VARCHAR,
        REVENUE_EUR INTEGER,
        ROOM_NIGHTS INTEGER
      );
      INSERT INTO stay_charge_cases VALUES
        ('E08','D',DATE '2026-07-11','Business',700,1),
        ('E01','A',DATE '2026-07-01','Corporate',NULL,1),
        ('E11','E',DATE '2026-07-15','Leisure',NULL,1),
        ('E05','C',DATE '2026-07-06','Group',1100,1),
        ('E03','A',DATE '2026-07-03','Leisure',1000,1),
        ('E07','D',DATE '2026-07-10','Business',700,1),
        ('E02','A',DATE '2026-07-02','Corporate',2500,1),
        ('E06','C',DATE '2026-07-07','Group',NULL,1),
        ('E04','C',DATE '2026-07-05','Group',1000,1),
        ('E09','D',DATE '2026-07-12','Business',700,1),
        ('E10','E',DATE '2026-07-14','Leisure',NULL,1),
        ('E12','A',DATE '2026-07-04','Leisure',500,1),
        ('E13','B',DATE '2026-08-03','Leisure',9999,1),
        ('E14','B',DATE '2026-07-20','Leisure',0,1);
    `,
    referenceSql:`
      SELECT
        HOTEL,
        SEGMENT,
        COUNT(*) AS ROWS_IN_GROUP,
        COUNT(REVENUE_EUR) AS PRICED_ROWS,
        SUM(REVENUE_EUR) AS TOTAL_REVENUE
      FROM stay_charge_cases
      WHERE BUSINESS_DATE >= CAST('2026-07-01' AS DATE)
        AND BUSINESS_DATE < CAST('2026-08-01' AS DATE)
      GROUP BY HOTEL, SEGMENT
      HAVING SUM(REVENUE_EUR) >= 2000
      ORDER BY HOTEL, SEGMENT
    `
  },
  'sql-null-filtering-v1':{
    table:'reservation_filter_cases',
    visibleSetup:`
      DROP TABLE IF EXISTS reservation_filter_cases;
      CREATE TABLE reservation_filter_cases(
        BOOKING_ID VARCHAR,
        HOTEL VARCHAR,
        STATUS VARCHAR,
        CANCEL_REASON VARCHAR,
        BOOKING_DATE DATE
      );
      INSERT INTO reservation_filter_cases VALUES
        ('B004','A','Pending',NULL,DATE '2026-07-04'),
        ('B002','A','Cancelled','Guest request',DATE '2026-07-02'),
        ('B001','A','Active',NULL,DATE '2026-07-01'),
        ('B003','A','Pending','',DATE '2026-07-03'),
        ('B005','B','Active',NULL,DATE '2026-07-05'),
        ('B007','A','Pending',NULL,DATE '2026-07-07'),
        ('B006','A','Active','Weather',DATE '2026-07-06'),
        ('B008','A','Cancelled',NULL,DATE '2026-07-08');
    `,
    edgeSetup:`
      DROP TABLE IF EXISTS reservation_filter_cases;
      CREATE TABLE reservation_filter_cases(
        BOOKING_ID VARCHAR,
        HOTEL VARCHAR,
        STATUS VARCHAR,
        CANCEL_REASON VARCHAR,
        BOOKING_DATE DATE
      );
      INSERT INTO reservation_filter_cases VALUES
        ('E3','A','Pending',NULL,DATE '2026-08-03'),
        ('E6','A','Cancelled',NULL,DATE '2026-08-06'),
        ('E1','A','Active',NULL,DATE '2026-08-01'),
        ('E2','A','Pending','',DATE '2026-08-02'),
        ('E5','B','Active',NULL,DATE '2026-08-05'),
        ('E4','A','Pending',NULL,DATE '2026-08-04'),
        ('E7','A','Active','Duplicate test',DATE '2026-08-07');
    `,
    referenceSql:`
      SELECT BOOKING_ID, HOTEL, STATUS, CANCEL_REASON
      FROM reservation_filter_cases
      WHERE CANCEL_REASON IS NULL
        AND (STATUS = 'Active' OR STATUS = 'Pending')
        AND HOTEL = 'A'
      ORDER BY STATUS, BOOKING_ID
    `
  }
});

let sessionPromise=null;

function normalizeCandidateSql(sql){
  const trimmed=String(sql??'').trim();
  if(!trimmed)throw new Error('SQL is empty.');
  const withoutTrailing=trimmed.replace(/;\s*$/,'').trim();
  if(withoutTrailing.includes(';'))throw new Error('Only one SELECT statement can be executed at a time.');
  if(!/^select\b/i.test(withoutTrailing))throw new Error('This lesson lab accepts one SELECT statement.');
  return withoutTrailing;
}

function printable(value){
  if(value===null||value===undefined)return null;
  if(typeof value==='bigint')return value.toString();
  if(value instanceof Date)return value.toISOString();
  if(typeof value==='object'&&typeof value.toJSON==='function'){
    const json=value.toJSON();
    if(typeof json!=='object')return json;
  }
  return value;
}

function tableResult(result,{maxRows=100}={}){
  const columns=result.schema.fields.map(field=>field.name);
  const rows=[];
  const visible=Math.min(result.numRows,maxRows);
  for(let r=0;r<visible;r++){
    const row={};
    for(let c=0;c<columns.length;c++){
      const vector=result.getChildAt(c);
      row[columns[c]]=printable(vector?vector.get(r):null);
    }
    rows.push(row);
  }
  return {columns,rows,totalRows:result.numRows,truncated:result.numRows>maxRows};
}

async function createSession(){
  const bundle=await duckdb.selectBundle(DUCKDB_BUNDLES);
  if(!bundle?.mainWorker||!bundle?.mainModule)throw new Error('No compatible DuckDB-Wasm bundle was found.');

  const workerUrl=URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`],{type:'text/javascript'})
  );

  let db;
  try{
    const worker=new Worker(workerUrl);
    db=new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(),worker);
    await db.instantiate(bundle.mainModule,bundle.pthreadWorker);
  }finally{
    URL.revokeObjectURL(workerUrl);
  }

  const conn=await db.connect();
  return {
    db,
    conn,
    bundle:bundle.mainModule.includes('duckdb-eh.wasm')?'eh':'mvp',
    version:DUCKDB_VERSION
  };
}

async function getSession(){
  if(!sessionPromise)sessionPromise=createSession().catch(error=>{
    sessionPromise=null;
    throw error;
  });
  return sessionPromise;
}

async function setupFixture(conn,fixture,variant){
  const sql=variant==='edge'?fixture.edgeSetup:fixture.visibleSetup;
  const statements=sql.split(';').map(statement=>statement.trim()).filter(Boolean);
  for(const statement of statements)await conn.query(statement);
}

async function runQuery(conn,sql){
  const result=await conn.query(sql);
  return tableResult(result,{maxRows:100});
}

export async function prepareLessonSqlLab(labId){
  const fixture=FIXTURES[labId];
  if(!fixture)throw new Error(`Unknown lesson SQL lab: ${labId}`);
  const session=await getSession();
  await setupFixture(session.conn,fixture,'visible');
  const countResult=await session.conn.query(`SELECT COUNT(*)::INTEGER AS row_count FROM ${fixture.table}`);
  const prepared=tableResult(countResult,{maxRows:1});
  return {
    version:session.version,
    bundle:session.bundle,
    rowCount:Number(prepared.rows[0]?.row_count??0)
  };
}

export async function evaluateLessonSql(labId,sql){
  const fixture=FIXTURES[labId];
  if(!fixture)throw new Error(`Unknown lesson SQL lab: ${labId}`);
  const safeSql=normalizeCandidateSql(sql);
  const session=await getSession();
  const tests=[];
  let visibleResult=null;

  try{
    for(const variant of ['visible','edge']){
      await setupFixture(session.conn,fixture,variant);
      const started=performance.now();
      const candidate=await runQuery(session.conn,safeSql);
      const reference=await runQuery(session.conn,fixture.referenceSql);
      const comparison=compareResultSets(candidate,reference);
      const elapsedMs=Math.round((performance.now()-started)*10)/10;
      tests.push({
        variant,
        passed:comparison.passed,
        errors:comparison.errors,
        expectedRows:reference.totalRows,
        actualRows:candidate.totalRows,
        elapsedMs
      });
      if(variant==='visible')visibleResult=candidate;
    }
  }finally{
    await setupFixture(session.conn,fixture,'visible');
  }

  return {
    passed:tests.every(test=>test.passed),
    tests,
    result:visibleResult,
    engine:{name:'DuckDB-Wasm',version:session.version,bundle:session.bundle}
  };
}

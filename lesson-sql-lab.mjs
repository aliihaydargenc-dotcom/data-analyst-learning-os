import * as duckdb from '@duckdb/duckdb-wasm';
import {DUCKDB_VERSION,DUCKDB_BUNDLES} from './duckdb-config.mjs';
import {compareResultSets} from './sql-result-evaluator.mjs';

const FIXTURES=Object.freeze({
  'sql-analytical-patterns-v1':{
    table:'analytical_pattern_cases',
    visibleSetup:`
      DROP TABLE IF EXISTS analytical_pattern_cases;
      CREATE TABLE analytical_pattern_cases(EVENT_ID VARCHAR, HOTEL VARCHAR, DAY_NO INTEGER, REVENUE_EUR INTEGER);
      INSERT INTO analytical_pattern_cases VALUES
        ('A3','A',4,150),
        ('B2','B',3,120),
        ('A1','A',1,100),
        ('A5','A',5,300),
        ('B1','B',1,80),
        ('A2','A',2,200),
        ('B3','B',4,60),
        ('A4','A',5,300);
    `,
    edgeSetup:`
      DROP TABLE IF EXISTS analytical_pattern_cases;
      CREATE TABLE analytical_pattern_cases(EVENT_ID VARCHAR, HOTEL VARCHAR, DAY_NO INTEGER, REVENUE_EUR INTEGER);
      INSERT INTO analytical_pattern_cases VALUES
        ('C4','C',7,500),
        ('D2','D',12,70),
        ('C2','C',2,400),
        ('C1','C',2,100),
        ('D1','D',10,50),
        ('C3','C',3,200);
    `,
    referenceSql:`
      WITH ordered AS (
        SELECT
          EVENT_ID, HOTEL, DAY_NO, REVENUE_EUR,
          LAG(DAY_NO) OVER (PARTITION BY HOTEL ORDER BY DAY_NO, EVENT_ID) AS PREV_DAY_NO,
          SUM(REVENUE_EUR) OVER (
            PARTITION BY HOTEL ORDER BY DAY_NO, EVENT_ID
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
          ) AS ROLLING_3_REVENUE,
          ROW_NUMBER() OVER (
            PARTITION BY HOTEL ORDER BY REVENUE_EUR DESC, DAY_NO, EVENT_ID
          ) AS HOTEL_REVENUE_RANK
        FROM analytical_pattern_cases
      ),
      flagged AS (
        SELECT *,
          CASE WHEN PREV_DAY_NO IS NULL OR DAY_NO - PREV_DAY_NO > 1 THEN 1 ELSE 0 END AS IS_NEW_ISLAND
        FROM ordered
      )
      SELECT
        EVENT_ID, HOTEL, DAY_NO, REVENUE_EUR, PREV_DAY_NO, IS_NEW_ISLAND,
        SUM(IS_NEW_ISLAND) OVER (
          PARTITION BY HOTEL ORDER BY DAY_NO, EVENT_ID
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS ISLAND_ID,
        ROLLING_3_REVENUE,
        HOTEL_REVENUE_RANK
      FROM flagged
      ORDER BY HOTEL, DAY_NO, EVENT_ID
    `
  },
  'sql-window-semantics-v1':{
    table:'window_metric_cases',
    visibleSetup:`
      DROP TABLE IF EXISTS window_metric_cases;
      CREATE TABLE window_metric_cases(EVENT_ID VARCHAR, HOTEL VARCHAR, BUSINESS_DATE DATE, REVENUE_EUR INTEGER);
      INSERT INTO window_metric_cases VALUES
        ('E03','A',DATE '2026-07-02',150),
        ('E06','B',DATE '2026-07-01',80),
        ('E01','A',DATE '2026-07-01',100),
        ('E07','B',DATE '2026-07-02',100),
        ('E02','A',DATE '2026-07-01',200),
        ('E05','B',DATE '2026-07-01',120),
        ('E04','A',DATE '2026-07-03',50);
    `,
    edgeSetup:`
      DROP TABLE IF EXISTS window_metric_cases;
      CREATE TABLE window_metric_cases(EVENT_ID VARCHAR, HOTEL VARCHAR, BUSINESS_DATE DATE, REVENUE_EUR INTEGER);
      INSERT INTO window_metric_cases VALUES
        ('W4','C',DATE '2026-08-03',200),
        ('W5','D',DATE '2026-08-01',50),
        ('W2','C',DATE '2026-08-01',100),
        ('W1','C',DATE '2026-08-01',300),
        ('W6','D',DATE '2026-08-02',50),
        ('W3','C',DATE '2026-08-02',NULL);
    `,
    referenceSql:`
      SELECT
        EVENT_ID,
        HOTEL,
        BUSINESS_DATE,
        REVENUE_EUR,
        LAG(REVENUE_EUR) OVER (
          PARTITION BY HOTEL ORDER BY BUSINESS_DATE, EVENT_ID
        ) AS PREV_REVENUE,
        SUM(REVENUE_EUR) OVER (
          PARTITION BY HOTEL
          ORDER BY BUSINESS_DATE, EVENT_ID
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS ROW_RUNNING_REVENUE,
        SUM(REVENUE_EUR) OVER (
          PARTITION BY HOTEL
          ORDER BY BUSINESS_DATE
          RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS DATE_RUNNING_REVENUE,
        ROW_NUMBER() OVER (
          PARTITION BY HOTEL ORDER BY BUSINESS_DATE, EVENT_ID
        ) AS HOTEL_ROW_NUMBER
      FROM window_metric_cases
      ORDER BY HOTEL, BUSINESS_DATE, EVENT_ID
    `
  },
  'sql-cte-exists-v1':{
    table:'customer_dim',
    visibleSetup:`
      DROP TABLE IF EXISTS booking_fact;
      DROP TABLE IF EXISTS customer_dim;
      CREATE TABLE customer_dim(CUSTOMER_ID VARCHAR, CUSTOMER_NAME VARCHAR);
      CREATE TABLE booking_fact(BOOKING_ID VARCHAR, CUSTOMER_ID VARCHAR, BUSINESS_DATE DATE, STATUS VARCHAR, REVENUE_EUR INTEGER);
      INSERT INTO customer_dim VALUES ('C3','Cem'),('C1','Ada'),('C5','Ece'),('C2','Bora'),('C4','Deniz');
      INSERT INTO booking_fact VALUES
        ('B08','C5',DATE '2026-07-14','Completed',1000),
        ('B02','C1',DATE '2026-07-03','Completed',500),
        ('B06','C3',DATE '2026-07-07','Completed',300),
        ('B03','C2',DATE '2026-07-04','Completed',1500),
        ('B01','C1',DATE '2026-07-02','Completed',600),
        ('B04','C2',DATE '2026-07-05','Cancelled',200),
        ('B05','C3',DATE '2026-07-06','Completed',400),
        ('B07','C4',DATE '2026-07-08','Cancelled',900),
        ('B09','C1',DATE '2026-08-01','Cancelled',50);
    `,
    edgeSetup:`
      DROP TABLE IF EXISTS booking_fact;
      DROP TABLE IF EXISTS customer_dim;
      CREATE TABLE customer_dim(CUSTOMER_ID VARCHAR, CUSTOMER_NAME VARCHAR);
      CREATE TABLE booking_fact(BOOKING_ID VARCHAR, CUSTOMER_ID VARCHAR, BUSINESS_DATE DATE, STATUS VARCHAR, REVENUE_EUR INTEGER);
      INSERT INTO customer_dim VALUES ('X6','Lina'),('X2','Mert'),('X4','Pelin'),('X1','Iris'),('X5','Rana'),('X3','Nora');
      INSERT INTO booking_fact VALUES
        ('E08','X6',DATE '2026-07-09','Completed',600),
        ('E02','X1',DATE '2026-07-02','Completed',400),
        ('E05','X3',DATE '2026-07-06','Completed',1000),
        ('E03','X2',DATE '2026-07-03','Completed',2000),
        ('E01','X1',DATE '2026-07-01','Completed',700),
        ('E04','X2',DATE '2026-07-04','Cancelled',50),
        ('E06','X4',DATE '2026-07-07','Completed',500),
        ('E07','X4',DATE '2026-08-01','Completed',500),
        ('E09','X6',DATE '2026-07-10','Completed',600),
        ('E10','X6',DATE '2026-08-01','Cancelled',25);
    `,
    referenceSql:`
      WITH completed AS (
        SELECT CUSTOMER_ID, SUM(REVENUE_EUR) AS JULY_COMPLETED_REVENUE
        FROM booking_fact
        WHERE BUSINESS_DATE >= CAST('2026-07-01' AS DATE)
          AND BUSINESS_DATE < CAST('2026-08-01' AS DATE)
          AND STATUS = 'Completed'
        GROUP BY CUSTOMER_ID
        HAVING SUM(REVENUE_EUR) >= 1000
      )
      SELECT c.CUSTOMER_ID, c.CUSTOMER_NAME, x.JULY_COMPLETED_REVENUE
      FROM customer_dim AS c
      JOIN completed AS x ON x.CUSTOMER_ID = c.CUSTOMER_ID
      WHERE NOT EXISTS (
        SELECT 1 FROM booking_fact AS b
        WHERE b.CUSTOMER_ID = c.CUSTOMER_ID
          AND b.BUSINESS_DATE >= CAST('2026-07-01' AS DATE)
          AND b.BUSINESS_DATE < CAST('2026-08-01' AS DATE)
          AND b.STATUS = 'Cancelled'
      )
      ORDER BY c.CUSTOMER_ID
    `
  },
  'sql-join-cardinality-v1':{
    table:'booking_fact',
    visibleSetup:`
      DROP TABLE IF EXISTS booking_guest;
      DROP TABLE IF EXISTS hotel_dim;
      DROP TABLE IF EXISTS booking_fact;
      CREATE TABLE booking_fact(
        BOOKING_ID VARCHAR,
        HOTEL_ID VARCHAR,
        REVENUE_EUR INTEGER
      );
      CREATE TABLE hotel_dim(
        HOTEL_ID VARCHAR,
        HOTEL_NAME VARCHAR
      );
      CREATE TABLE booking_guest(
        BOOKING_ID VARCHAR,
        GUEST_ID VARCHAR
      );
      INSERT INTO hotel_dim VALUES
        ('H2','Boreal'),
        ('H1','Aurora');
      INSERT INTO booking_fact VALUES
        ('B003','H2',900),
        ('B001','H1',500),
        ('B002','H1',700);
      INSERT INTO booking_guest VALUES
        ('B001','G01'),
        ('B003','G03'),
        ('B001','G02');
    `,
    edgeSetup:`
      DROP TABLE IF EXISTS booking_guest;
      DROP TABLE IF EXISTS hotel_dim;
      DROP TABLE IF EXISTS booking_fact;
      CREATE TABLE booking_fact(
        BOOKING_ID VARCHAR,
        HOTEL_ID VARCHAR,
        REVENUE_EUR INTEGER
      );
      CREATE TABLE hotel_dim(
        HOTEL_ID VARCHAR,
        HOTEL_NAME VARCHAR
      );
      CREATE TABLE booking_guest(
        BOOKING_ID VARCHAR,
        GUEST_ID VARCHAR
      );
      INSERT INTO hotel_dim VALUES
        ('H8','Delta'),
        ('H7','Cedar');
      INSERT INTO booking_fact VALUES
        ('E4','H8',600),
        ('E1','H7',1000),
        ('E3','H8',400),
        ('E2','H7',1200);
      INSERT INTO booking_guest VALUES
        ('E1','X1'),
        ('E3','X4'),
        ('E1','X2'),
        ('E4','X6'),
        ('E3','X5'),
        ('E1','X3');
    `,
    referenceSql:`
      SELECT
        b.BOOKING_ID,
        h.HOTEL_NAME,
        COUNT(g.GUEST_ID) AS GUEST_COUNT,
        MAX(b.REVENUE_EUR) AS BOOKING_REVENUE
      FROM booking_fact AS b
      JOIN hotel_dim AS h
        ON h.HOTEL_ID = b.HOTEL_ID
      LEFT JOIN booking_guest AS g
        ON g.BOOKING_ID = b.BOOKING_ID
      GROUP BY b.BOOKING_ID, h.HOTEL_NAME
      ORDER BY b.BOOKING_ID
    `
  },
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
  if(!/^(select|with)\b/i.test(withoutTrailing))throw new Error('This lesson lab accepts one SELECT statement, optionally beginning with WITH.');
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

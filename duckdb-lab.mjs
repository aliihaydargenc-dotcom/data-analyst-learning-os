import * as duckdb from '@duckdb/duckdb-wasm';
import {DUCKDB_VERSION,DUCKDB_BUNDLES} from './duckdb-config.mjs';

let db=null;
let conn=null;
let initPromise=null;

function singleReadOnlyStatement(sql){
  const trimmed=sql.trim();
  if(!trimmed) throw new Error('SQL is empty.');
  const withoutTrailing=trimmed.replace(/;\s*$/,'').trim();
  if(withoutTrailing.includes(';')) throw new Error('Only one SQL statement can be executed at a time.');
  if(!/^(select|with|explain)\b/i.test(withoutTrailing)){
    throw new Error('SQL Lab currently allows only SELECT, WITH, or EXPLAIN statements.');
  }
  return withoutTrailing;
}

function scalar(result,columnIndex=0,rowIndex=0){
  const vector=result.getChildAt(columnIndex);
  return vector?vector.get(rowIndex):null;
}

export function duckdbVersion(){
  return DUCKDB_VERSION;
}

export async function initializeSqlLab(datasetUrl='./datasets/hotel_daily.csv'){
  if(initPromise) return initPromise;

  initPromise=(async()=>{
    const bundle=await duckdb.selectBundle(DUCKDB_BUNDLES);
    if(!bundle?.mainWorker || !bundle?.mainModule) throw new Error('No compatible DuckDB-Wasm bundle was found.');

    const workerUrl=URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`],{type:'text/javascript'})
    );

    try{
      const worker=new Worker(workerUrl);
      db=new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(),worker);
      await db.instantiate(bundle.mainModule,bundle.pthreadWorker);
    }finally{
      URL.revokeObjectURL(workerUrl);
    }

    const response=await fetch(datasetUrl,{cache:'no-store'});
    if(!response.ok) throw new Error(`Dataset could not be loaded (HTTP ${response.status}).`);

    const bytes=new Uint8Array(await response.arrayBuffer());
    await db.registerFileBuffer('hotel_daily.csv',bytes);

    conn=await db.connect();
    await conn.query('DROP TABLE IF EXISTS hotel_daily');
    await conn.insertCSVFromPath('hotel_daily.csv',{
      schema:'main',
      name:'hotel_daily',
      detect:true,
      header:true
    });

    const verification=await conn.query('SELECT COUNT(*)::INTEGER AS row_count FROM hotel_daily');
    const rowCount=Number(scalar(verification) ?? 0);
    if(rowCount!==1460) throw new Error(`Dataset verification failed: expected 1460 rows, received ${rowCount}.`);

    return {rowCount,bundle:bundle.mainModule.includes('duckdb-eh.wasm')?'eh':'mvp',version:DUCKDB_VERSION};
  })().catch(err=>{
    initPromise=null;
    throw err;
  });

  return initPromise;
}

function printable(value){
  if(value===null || value===undefined) return null;
  if(typeof value==='bigint') return value.toString();
  if(value instanceof Date) return value.toISOString();
  if(typeof value==='object' && typeof value.toJSON==='function'){
    const json=value.toJSON();
    if(typeof json!=='object') return json;
  }
  return value;
}

export async function runSql(sql,{maxRows=100}={}){
  await initializeSqlLab();
  const safeSql=singleReadOnlyStatement(sql);
  const started=performance.now();
  const result=await conn.query(safeSql);
  const elapsedMs=Math.round((performance.now()-started)*10)/10;

  const columns=result.schema.fields.map(field=>field.name);
  const rows=[];
  const visibleRows=Math.min(result.numRows,maxRows);

  for(let r=0;r<visibleRows;r++){
    const row={};
    for(let c=0;c<columns.length;c++){
      const vector=result.getChildAt(c);
      row[columns[c]]=printable(vector?vector.get(r):null);
    }
    rows.push(row);
  }

  return {
    columns,
    rows,
    totalRows:result.numRows,
    truncated:result.numRows>maxRows,
    elapsedMs
  };
}

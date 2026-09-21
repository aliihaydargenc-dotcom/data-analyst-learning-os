export const DUCKDB_VERSION='1.33.1-dev57.0';
export const DUCKDB_DIST=`https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${DUCKDB_VERSION}/dist/`;

export const DUCKDB_BUNDLES=Object.freeze({
  mvp:Object.freeze({
    mainModule:`${DUCKDB_DIST}duckdb-mvp.wasm`,
    mainWorker:`${DUCKDB_DIST}duckdb-browser-mvp.worker.js`
  }),
  eh:Object.freeze({
    mainModule:`${DUCKDB_DIST}duckdb-eh.wasm`,
    mainWorker:`${DUCKDB_DIST}duckdb-browser-eh.worker.js`
  })
});

const PYODIDE_VERSION='314.0.7';
const PYODIDE_INDEX=`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
let loaderPromise=null;
let pyodidePromise=null;

const FIXTURES=Object.freeze({
  'python-language-semantics-v1':{
    packages:[],
    visibleTest:`
r=summarize_values([0,1,"","x",[],[1],None,False])
assert r=={"truthy":3,"falsy":5,"mutable":2}, r
__lab_result__=r
`,
    edgeTest:`
r=summarize_values([{},{"a":1},set(),{1},(),(1,),0.0,2.5])
assert r=={"truthy":4,"falsy":4,"mutable":4}, r
__lab_result__=r
`
  },
  'python-functions-errors-files-v1':{
    packages:[],
    visibleTest:`
r=parse_amount_lines("10\\n\\n20.5\\n-3")
assert r==[10.0,20.5,-3.0], r
__lab_result__=r
`,
    edgeTest:`
try:
    parse_amount_lines("10\\noops\\n30")
except ValueError as exc:
    assert "2" in str(exc), str(exc)
else:
    raise AssertionError("invalid line must raise ValueError")
__lab_result__="invalid-line guarded"
`
  },
  'python-numpy-array-thinking-v1':{
    packages:['numpy'],
    visibleTest:`
import numpy as np
a=np.array([[1.0,10.0],[3.0,14.0]])
r=center_columns(a)
assert np.allclose(r,np.array([[-1.0,-2.0],[1.0,2.0]])), r
assert r.shape==a.shape
__lab_result__=r.tolist()
`,
    edgeTest:`
import numpy as np
a=np.array([[4,8,12]],dtype=np.int64)
r=center_columns(a)
assert np.allclose(r,np.zeros((1,3))), r
assert r.shape==(1,3)
__lab_result__=r.tolist()
`
  },
  'python-pandas-dtype-index-v1':{
    packages:['pandas'],
    visibleTest:`
import pandas as pd
df=pd.DataFrame({"BOOKING_ID":["A","B","C"],"BUSINESS_DATE":["2026-01-01","bad",None],"REVENUE":["10.5","oops",None]})
r=clean_reservations(df)
assert list(r.index)==[0,1,2]
assert str(r["BUSINESS_DATE"].dtype).startswith("datetime64"), r.dtypes
assert str(r["REVENUE"].dtype) in {"Float64","float64"}, r.dtypes
assert r.loc[0,"REVENUE"]==10.5
assert pd.isna(r.loc[1,"REVENUE"]) and pd.isna(r.loc[1,"BUSINESS_DATE"])
__lab_result__=str(r.dtypes.to_dict())
`,
    edgeTest:`
import pandas as pd
source=pd.DataFrame({"BOOKING_ID":["X"],"BUSINESS_DATE":["2026-02-03"],"REVENUE":["7"]})
before=source.copy(deep=True)
r=clean_reservations(source)
assert source.equals(before), "input DataFrame mutated"
assert r is not source
__lab_result__="copy-preserved"
`
  },
  'python-groupby-reshape-v1':{
    packages:['pandas'],
    visibleTest:`
import pandas as pd
df=pd.DataFrame({
 "HOTEL":["A","A","A","B"],
 "DATE":["2026-01-01"]*4,
 "BOOKING_ID":["B1","B1","B2","C1"],
 "REVENUE":[10,5,7,3]
})
r=hotel_daily(df)
assert list(r.columns)==["HOTEL","DATE","REVENUE","BOOKINGS"], r.columns
assert r.to_dict("records")==[
 {"HOTEL":"A","DATE":"2026-01-01","REVENUE":22,"BOOKINGS":2},
 {"HOTEL":"B","DATE":"2026-01-01","REVENUE":3,"BOOKINGS":1}
], r
__lab_result__=r.to_dict("records")
`,
    edgeTest:`
import pandas as pd
df=pd.DataFrame({"HOTEL":["B","A","A"],"DATE":["2026-01-02","2026-01-02","2026-01-01"],"BOOKING_ID":["1","2","3"],"REVENUE":[1,2,3]})
r=hotel_daily(df)
assert r[["HOTEL","DATE"]].values.tolist()==[["A","2026-01-01"],["A","2026-01-02"],["B","2026-01-02"]], r
__lab_result__=r.to_dict("records")
`
  },
  'python-merge-window-v1':{
    packages:['pandas'],
    visibleTest:`
import pandas as pd
b=pd.DataFrame({"HOTEL_ID":[1,1,2],"BUSINESS_DATE":["2026-01-01","2026-01-02","2026-01-01"],"REVENUE":[10,15,8]})
h=pd.DataFrame({"HOTEL_ID":[1,2],"HOTEL":["A","B"]})
r=add_hotel_and_lag(b,h)
assert list(r["HOTEL"])==["A","A","B"], r
assert pd.isna(r.iloc[0]["PREV_REVENUE"])
assert r.iloc[1]["PREV_REVENUE"]==10
__lab_result__=r.to_dict("records")
`,
    edgeTest:`
import pandas as pd
b=pd.DataFrame({"HOTEL_ID":[1],"BUSINESS_DATE":["2026-01-01"],"REVENUE":[10]})
h=pd.DataFrame({"HOTEL_ID":[1,1],"HOTEL":["A","A2"]})
try:
    add_hotel_and_lag(b,h)
except Exception as exc:
    assert "Merge" in type(exc).__name__ or "many-to-one" in str(exc).lower() or "not a many-to-one" in str(exc).lower(), (type(exc).__name__,str(exc))
else:
    raise AssertionError("duplicate dimension key must be rejected")
__lab_result__="cardinality-guarded"
`
  },
  'python-stats-eda-v1':{
    packages:['pandas'],
    visibleTest:`
r=eda_summary([1,2,3,4,None])
assert r["n"]==4 and r["missing"]==1, r
assert r["mean"]==2.5 and r["median"]==2.5, r
assert r["q25"]==1.75 and r["q75"]==3.25, r
__lab_result__=r
`,
    edgeTest:`
r=eda_summary([None,float("nan")])
assert r=={"n":0,"missing":2,"mean":None,"median":None,"q25":None,"q75":None}, r
__lab_result__=r
`
  },
  'python-io-api-sql-v1':{
    packages:[],
    visibleTest:`
pages=[{"items":[{"id":2,"v":"b"},{"id":1,"v":"a"}]},{"items":[{"id":2,"v":"b2"},{"id":3,"v":"c"}]}]
r=normalize_api_pages(pages)
assert r==[{"id":1,"v":"a"},{"id":2,"v":"b2"},{"id":3,"v":"c"}], r
__lab_result__=r
`,
    edgeTest:`
for bad in [None,[{}],[{"items":"not-a-list"}],[{"items":[{"v":"missing-id"}]}]]:
    try:
        normalize_api_pages(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"malformed payload accepted: {bad!r}")
__lab_result__="schema-guarded"
`
  },
  'python-testing-typing-logging-v1':{
    packages:[],
    visibleTest:`
class Logger:
    def __init__(self): self.messages=[]
    def warning(self,msg,*args): self.messages.append(msg % args if args else msg)
log=Logger()
assert safe_ratio(10,2,log)==5.0
assert safe_ratio(10,0,log) is None
assert log.messages, "zero denominator should log warning"
assert safe_ratio.__annotations__, "type annotations required"
__lab_result__=log.messages
`,
    edgeTest:`
assert safe_ratio(-3,2)==-1.5
assert safe_ratio(0,5)==0.0
__lab_result__="edge-ratios-pass"
`
  },
  'python-performance-pipelines-v1':{
    packages:['pandas'],
    visibleTest:`
import pandas as pd
chunks=[
 pd.DataFrame({"HOTEL":["A","B"],"REVENUE":[10,3]}),
 pd.DataFrame({"HOTEL":["A","B"],"REVENUE":[5,7]})
]
before=[x.copy(deep=True) for x in chunks]
r1=aggregate_chunks(chunks)
r2=aggregate_chunks(chunks)
assert r1.equals(r2), "function must be idempotent"
assert r1.to_dict("records")==[{"HOTEL":"A","REVENUE":15},{"HOTEL":"B","REVENUE":10}],r1
assert all(a.equals(b) for a,b in zip(chunks,before)), "input chunks mutated"
__lab_result__=r1.to_dict("records")
`,
    edgeTest:`
r=aggregate_chunks([])
assert list(r.columns)==["HOTEL","REVENUE"] and len(r)==0, r
__lab_result__="empty-input-pass"
`
  },
  'python-repro-architecture-v1':{
    packages:[],
    visibleTest:`
a=build_run_manifest({"b":2,"a":1},"data123","gitabc")
b=build_run_manifest({"a":1,"b":2},"data123","gitabc")
assert a==b, (a,b)
assert len(a["manifest_id"])==64
assert a["data_hash"]=="data123" and a["code_version"]=="gitabc"
__lab_result__=a["manifest_id"]
`,
    edgeTest:`
a=build_run_manifest({"a":1},"data123","gitabc")
b=build_run_manifest({"a":1},"data999","gitabc")
assert a["manifest_id"]!=b["manifest_id"]
__lab_result__="change-detected"
`
  },
  'python-peer-review-v1':{
    packages:[],
    visibleTest:`
m={"result_valid":True,"tests_passed":True,"p95_ms":320,"memory_mb":700,"idempotent":True,"rollback_ready":True}
assert review_pipeline(m)==[], review_pipeline(m)
__lab_result__="accepted"
`,
    edgeTest:`
m={"result_valid":False,"tests_passed":False,"p95_ms":800,"memory_mb":1500,"idempotent":False,"rollback_ready":False}
assert review_pipeline(m)==["correctness","tests","latency","memory","idempotency","rollback"], review_pipeline(m)
__lab_result__=review_pipeline(m)
`
  }
});

export const PYTHON_LAB_IDS=Object.freeze(Object.keys(FIXTURES));

async function ensureLoader(){
  if(typeof globalThis.loadPyodide==='function') return;
  if(!loaderPromise){
    loaderPromise=new Promise((resolve,reject)=>{
      if(typeof document==='undefined') return reject(new Error('Pyodide browser loader requires a document.'));
      const script=document.createElement('script');
      script.src=`${PYODIDE_INDEX}pyodide.js`;
      script.async=true;
      script.onload=()=>resolve();
      script.onerror=()=>reject(new Error('Pyodide loader could not be downloaded.'));
      document.head.appendChild(script);
    });
  }
  await loaderPromise;
}

async function getPyodide(){
  if(!pyodidePromise){
    pyodidePromise=(async()=>{
      await ensureLoader();
      return globalThis.loadPyodide({indexURL:PYODIDE_INDEX});
    })();
  }
  return pyodidePromise;
}

function fixtureFor(id){
  const fixture=FIXTURES[id];
  if(!fixture) throw new Error(`Unknown Python lab: ${id}`);
  return fixture;
}

async function runVariant(pyodide,userCode,testCode){
  const script=`
import json, io, contextlib
_user_code=${JSON.stringify(userCode)}
_test_code=${JSON.stringify(testCode)}
_ns={}
_buf=io.StringIO()
try:
    with contextlib.redirect_stdout(_buf):
        exec(_user_code,_ns)
        exec(_test_code,_ns)
    _payload={"passed":True,"detail":str(_ns.get("__lab_result__","PASS")),"output":_buf.getvalue()}
except Exception as exc:
    _payload={"passed":False,"detail":f"{type(exc).__name__}: {exc}","output":_buf.getvalue()}
json.dumps(_payload)
`;
  return JSON.parse(await pyodide.runPythonAsync(script));
}

export async function prepareLessonPythonLab(id){
  const fixture=fixtureFor(id);
  const pyodide=await getPyodide();
  if(fixture.packages.length) await pyodide.loadPackage(fixture.packages);
  return {version:PYODIDE_VERSION,packages:[...fixture.packages]};
}

export async function evaluateLessonPython(id,userCode){
  const fixture=fixtureFor(id);
  const pyodide=await getPyodide();
  if(fixture.packages.length) await pyodide.loadPackage(fixture.packages);
  const tests=[];
  for(const [variant,testCode] of [['visible',fixture.visibleTest],['edge',fixture.edgeTest]]){
    const result=await runVariant(pyodide,userCode,testCode);
    tests.push({variant,...result});
  }
  return {passed:tests.every(test=>test.passed),tests};
}

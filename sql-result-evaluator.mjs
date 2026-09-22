function stableValue(value){
  if(value===null||value===undefined)return null;
  if(typeof value==='bigint')return value.toString();
  if(value instanceof Date)return value.toISOString();
  return value;
}

export function compareResultSets(actual,expected){
  const errors=[];
  const actualColumns=actual?.columns||[];
  const expectedColumns=expected?.columns||[];

  if(JSON.stringify(actualColumns)!==JSON.stringify(expectedColumns)){
    errors.push({
      type:'columns',
      expected:expectedColumns,
      actual:actualColumns
    });
  }

  const actualRows=actual?.rows||[];
  const expectedRows=expected?.rows||[];
  const actualTotal=Number.isFinite(actual?.totalRows)?actual.totalRows:null;
  const expectedTotal=Number.isFinite(expected?.totalRows)?expected.totalRows:null;
  const actualCount=actualTotal??actualRows.length;
  const expectedCount=expectedTotal??expectedRows.length;
  if(actualCount!==expectedCount){
    errors.push({
      type:'row_count',
      expected:expectedCount,
      actual:actualCount
    });
  }

  const rowCount=Math.min(actualRows.length,expectedRows.length);
  const columns=expectedColumns;
  for(let r=0;r<rowCount;r++){
    for(const column of columns){
      const actualValue=stableValue(actualRows[r]?.[column]);
      const expectedValue=stableValue(expectedRows[r]?.[column]);
      if(JSON.stringify(actualValue)!==JSON.stringify(expectedValue)){
        errors.push({
          type:'cell',
          row:r,
          column,
          expected:expectedValue,
          actual:actualValue
        });
        if(errors.length>=12)return {passed:false,errors};
      }
    }
  }

  return {passed:errors.length===0,errors};
}

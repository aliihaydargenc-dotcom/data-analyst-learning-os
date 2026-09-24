export const CASE_STUDY_KEY='da-learning-os:case-study:revenue-drop:v1';

function normalizeCaseRows(rows){
  if(!Array.isArray(rows)||rows.length!==2)return null;
  const normalized=rows.map(row=>({
    hotel:typeof row.HOTEL==='string'?row.HOTEL.trim():'',
    businessDate:row.BUSINESS_DATE==null?'':String(row.BUSINESS_DATE),
    revenue:Number(row.REVENUE_EUR),
    previousRevenue:Number(row.PREV_DAY_REVENUE),
    revenueChange:Number(row.REVENUE_CHANGE)
  }));
  if(normalized.some(row=>!row.hotel||!row.businessDate||!Number.isFinite(row.revenueChange)||row.revenueChange>=0))return null;
  return normalized;
}

export function buildRevenueCaseArtifacts(rows){
  const normalized=normalizeCaseRows(rows);
  if(!normalized)return {validRows:false,rowCount:0,kpi:null,chart:[]};
  const ranked=[...normalized].sort((a,b)=>a.revenueChange-b.revenueChange||a.hotel.localeCompare(b.hotel));
  const largest=ranked[0];
  return {
    validRows:true,
    rowCount:normalized.length,
    kpi:{
      id:'largest-revenue-drop',
      hotel:largest.hotel,
      businessDate:largest.businessDate,
      value:largest.revenueChange,
      magnitude:Math.abs(largest.revenueChange)
    },
    chart:normalized.map(row=>({
      hotel:row.hotel,
      businessDate:row.businessDate,
      value:row.revenueChange,
      magnitude:Math.abs(row.revenueChange)
    }))
  };
}

export function evaluateRevenueCase({sqlVerified,rows,selectedKpi,interpretation,memo}){
  const artifacts=buildRevenueCaseArtifacts(rows);
  const evidence={
    sql:Boolean(sqlVerified&&artifacts.validRows),
    kpi:Boolean(artifacts.validRows&&selectedKpi==='largest-revenue-drop'),
    chart:Boolean(artifacts.validRows&&artifacts.chart.length===artifacts.rowCount&&artifacts.chart.every(point=>point.value<0)),
    interpretation:interpretation==='correlation-not-cause',
    summary:typeof memo==='string'&&memo.trim().length>=40
  };
  const reviewReady=Object.values(evidence).every(Boolean);
  return {passed:reviewReady,reviewReady,validRows:artifacts.validRows,artifacts,evidence,summaryVerified:false};
}

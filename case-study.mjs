export const CASE_STUDY_KEY='da-learning-os:case-study:revenue-drop:v1';
export function evaluateRevenueCase({sqlVerified,rows,interpretation,memo}){
  const validRows=Array.isArray(rows)&&rows.length===2&&rows.every(row=>
    typeof row.HOTEL==='string'&&Number(row.REVENUE_CHANGE)<0&&row.BUSINESS_DATE!=null
  );
  const evidence=typeof memo==='string'&&memo.trim().length>=60;
  return {passed:Boolean(sqlVerified&&validRows&&interpretation==='correlation-not-cause'&&evidence),validRows,evidence};
}

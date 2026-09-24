export const REVIEW_DECISIONS=Object.freeze(['approved','changes_requested']);
export const REVIEW_RUBRIC_IDS=Object.freeze(['sql','kpi','chart','interpretation','executive-communication']);

export function normalizeRubricComments(input={}){
  return Object.fromEntries(REVIEW_RUBRIC_IDS.map(id=>[id,String(input?.[id]||'').trim()]).filter(([,value])=>value));
}

export function validateReviewDecision({decision,rubricComments={},comment=''}={}){
  if(!REVIEW_DECISIONS.includes(decision))return {ok:false,reason:'invalid_decision'};
  const comments=normalizeRubricComments(rubricComments);
  const decisionComment=String(comment||'').trim();
  if(decision==='changes_requested'&&!decisionComment&&!Object.keys(comments).length)return {ok:false,reason:'feedback_required'};
  return {ok:true,decision,rubricComments:comments,comment:decisionComment};
}

export function reviewCanContributeToAdvancedMastery(review={}){
  return review.status==='approved'&&Boolean(review.reviewer_id)&&Boolean(review.reviewed_at);
}

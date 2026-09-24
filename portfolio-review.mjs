export const PORTFOLIO_REVIEW_KEY='da-learning-os:portfolio:revenue-drop:v1';

const RUBRIC=Object.freeze([
  Object.freeze({id:'sql',mode:'automatic'}),
  Object.freeze({id:'kpi',mode:'automatic'}),
  Object.freeze({id:'chart',mode:'automatic'}),
  Object.freeze({id:'interpretation',mode:'automatic'}),
  Object.freeze({id:'executive-communication',mode:'human'})
]);

export function buildPortfolioReview({caseData,reviewState}={}){
  const evidence=caseData?.evidence&&typeof caseData.evidence==='object'?caseData.evidence:{};
  const rubric=RUBRIC.map(item=>{
    if(item.id==='executive-communication'){
      const hasDraft=Boolean(evidence.summary&&String(caseData?.memo||'').trim());
      const reviewerDecision=reviewState?.reviewerDecision;
      const status=reviewerDecision==='approved'?'approved':reviewerDecision==='changes_requested'?'changes_requested':hasDraft?'review_pending':'missing';
      return {...item,status,verified:reviewerDecision==='approved',hasDraft};
    }
    const verified=Boolean(evidence[item.id]);
    return {...item,status:verified?'verified':'missing',verified};
  });
  const automatic=rubric.filter(item=>item.mode==='automatic');
  const automaticVerified=automatic.filter(item=>item.verified).length;
  const communication=rubric.find(item=>item.id==='executive-communication');
  const reviewReady=automaticVerified===automatic.length&&Boolean(communication?.hasDraft);
  const submitted=Boolean(reviewState?.submittedAt&&reviewReady);
  const reviewed=communication?.status==='approved'||communication?.status==='changes_requested';
  const status=reviewed?'reviewed':submitted?'review_pending':reviewReady?'ready_for_review':'draft';

  return {
    projectId:'hotel-revenue-decline',
    title:'Hotel Revenue Decline Investigation',
    status,
    reviewReady,
    submitted,
    submittedAt:submitted?reviewState.submittedAt:null,
    rubric,
    automaticVerified,
    automaticTotal:automatic.length,
    humanReviewStatus:communication?.status||'missing',
    masteryImpact:'none_until_review'
  };
}

export function createPortfolioSubmission({caseData,now=new Date()}={}){
  const review=buildPortfolioReview({caseData});
  if(!review.reviewReady)return {ok:false,reason:'evidence_incomplete',review};
  return {
    ok:true,
    state:{
      version:1,
      projectId:review.projectId,
      status:'review_pending',
      submittedAt:now.toISOString(),
      reviewerDecision:null,
      reviewedAt:null
    }
  };
}

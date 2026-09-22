function transitionLabel(label){
  return typeof label==='function'?label():label;
}

function isInternalNavigation(anchor,event,currentHref){
  if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return false;
  if(anchor.hasAttribute('download')||anchor.target==='_blank')return false;
  const raw=anchor.getAttribute('href')||'';
  if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))return false;
  let next,current;
  try{
    current=new URL(currentHref);
    next=new URL(anchor.href,current);
  }catch{return false}
  if(next.origin!==current.origin)return false;
  if(next.href===current.href)return false;
  if(next.pathname===current.pathname&&next.search===current.search&&next.hash)return false;
  return true;
}

export function installPageTransitions({root=document,label=()=>document.documentElement.lang==='en'?'Loading…':'Yükleniyor…'}={}){
  if(!root?.body)return null;
  let overlay=root.querySelector('[data-page-transition]');
  if(!overlay){
    overlay=root.createElement('div');
    overlay.className='page-transition';
    overlay.dataset.pageTransition='';
    overlay.hidden=true;
    overlay.setAttribute('role','status');
    overlay.setAttribute('aria-live','polite');
    overlay.innerHTML='<div class="page-transition-card"><span class="page-transition-spinner" aria-hidden="true"></span><strong data-page-transition-label></strong></div>';
    root.body.appendChild(overlay);
  }
  const labelNode=overlay.querySelector('[data-page-transition-label]');
  const show=()=>{
    if(labelNode)labelNode.textContent=transitionLabel(label)||'Yükleniyor…';
    overlay.hidden=false;
    requestAnimationFrame(()=>overlay.classList.add('is-visible'));
  };
  const hide=()=>{
    overlay.classList.remove('is-visible');
    overlay.hidden=true;
  };
  root.addEventListener('click',event=>{
    const anchor=event.target instanceof Element?event.target.closest('a[href]'):null;
    if(isInternalNavigation(anchor,event,location.href))show();
  });
  window.addEventListener('pageshow',hide);
  window.addEventListener('beforeunload',show);
  return {show,hide,element:overlay};
}

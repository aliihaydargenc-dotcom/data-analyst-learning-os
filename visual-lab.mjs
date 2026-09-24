import {
  VISUAL_TOOL_VERSIONS,
  resolveVisualSpec,
  buildEChartsOption,
  buildMermaidFlow,
  evaluateChartChoice,
  buildFallbackSeries
} from './visual-tools.mjs';

const CDN=Object.freeze({
  echarts:`https://cdn.jsdelivr.net/npm/echarts@${VISUAL_TOOL_VERSIONS.echarts}/+esm`,
  mermaid:`https://cdn.jsdelivr.net/npm/mermaid@${VISUAL_TOOL_VERSIONS.mermaid}/+esm`,
  roughjs:`https://cdn.jsdelivr.net/npm/roughjs@${VISUAL_TOOL_VERSIONS.roughjs}/bundled/rough.esm.js`
});

const modules={};
function loadModule(name){
  modules[name]??=import(CDN[name]);
  return modules[name];
}

const copy={
  tr:{
    title:'Görsel Lab',
    heading:'Veriden doğru görsele',
    intro:'Analiz amacını seç, uygun grafiği üret, veri akışını gör ve seçimini gerekçelendir.',
    status:'Hafif önizleme · hazır',
    loading:'Görsel motor yükleniyor…',
    interactive:'ECharts · etkileşimli',
    fallback:'CDN erişilemedi · hafif önizleme',
    intent:'Analiz amacı',
    type:'Grafik tipi',
    recommendation:'Öneri',
    guardrail:'Grafik seçimi mastery kanıtı değildir; burada amaç görsel muhakemeyi çalıştırmaktır.',
    render:'Etkileşimli grafiği üret',
    flow:'Veri akışını göster',
    annotate:'Önemli alanı vurgula',
    check:'Seçimi değerlendir',
    choose:'Seç',
    intentOptions:['Zaman içindeki değişim','Kategorileri karşılaştırma','İki ölçü arasındaki ilişki','Bütün içindeki pay'],
    recommended:'Önerileni kullan'
  },
  en:{
    title:'Visual Lab',
    heading:'From data to the right visual',
    intro:'Choose an analytical intent, build a suitable chart, inspect the data flow, and justify the decision.',
    status:'Light preview · ready',
    loading:'Loading visual engine…',
    interactive:'ECharts · interactive',
    fallback:'CDN unavailable · light preview',
    intent:'Analytical intent',
    type:'Chart type',
    recommendation:'Recommendation',
    guardrail:'A chart choice is not mastery evidence; this lab practices visual reasoning.',
    render:'Build interactive chart',
    flow:'Show data flow',
    annotate:'Highlight key area',
    check:'Evaluate choice',
    choose:'Choose',
    intentOptions:['Change over time','Compare categories','Relationship between two measures','Share of a whole'],
    recommended:'Use recommendation'
  }
};

function safeLang(value){
  return value==='en'?'en':'tr';
}

function renderFallback(root,spec,lang){
  const target=root.querySelector('#visualChart');
  const rows=buildFallbackSeries(spec);
  target.replaceChildren();
  const head=document.createElement('div');
  head.className='visual-fallback-head';
  head.innerHTML=`<strong>${spec.title?.[lang]||spec.title?.tr||''}</strong><small>${spec.chartType.toUpperCase()}</small>`;
  target.appendChild(head);
  const list=document.createElement('div');
  list.className='visual-fallback-list';
  for(const item of rows){
    const row=document.createElement('div');
    row.className='visual-fallback-row';
    const label=document.createElement('span');
    label.textContent=item.label;
    const track=document.createElement('i');
    track.style.setProperty('--visual-width',item.percent+'%');
    const value=document.createElement('strong');
    value.textContent=String(item.value);
    row.append(label,track,value);
    list.appendChild(row);
  }
  target.appendChild(list);
}

function clearAnnotation(root){
  root.querySelector('#visualAnnotation')?.replaceChildren();
}

export function installVisualLab({root=document,lang=()=>document.documentElement.lang}={}){
  const host=root.querySelector('[data-visual-lab]');
  if(!host)return {setLanguage(){}};

  const intent=root.querySelector('#visualIntent');
  const chartType=root.querySelector('#visualChartType');
  const chartRoot=root.querySelector('#visualChart');
  const diagram=root.querySelector('#visualDiagram');
  const status=root.querySelector('#visualEngineStatus');
  const practiceChoice=root.querySelector('#visualPracticeChoice');
  const practiceFeedback=root.querySelector('#visualPracticeFeedback');
  let chartInstance=null;
  let currentLang=safeLang(lang());
  let disposed=false;

  function spec(){
    return resolveVisualSpec(intent.value,chartType.value);
  }

  function updateInspector(){
    const active=spec();
    root.querySelector('#visualRecommendation').textContent=active.recommended.toUpperCase();
    root.querySelector('#visualReason').textContent=active.reason[currentLang];
    root.querySelector('#visualPracticeQuestion').textContent=active.question[currentLang];
    practiceFeedback.textContent='';
  }

  function renderCopy(){
    const c=copy[currentLang];
    root.querySelector('#visualLabTitle').textContent=c.title;
    root.querySelector('#visualLabHeading').textContent=c.heading;
    root.querySelector('#visualLabIntro').textContent=c.intro;
    root.querySelector('#visualIntentLabel').textContent=c.intent;
    root.querySelector('#visualTypeLabel').textContent=c.type;
    root.querySelector('#visualRecommendationLabel').textContent=c.recommendation;
    root.querySelector('#visualGuardrail').textContent=c.guardrail;
    root.querySelector('#renderVisualChart').textContent=c.render;
    root.querySelector('#renderVisualFlow').textContent=c.flow;
    root.querySelector('#annotateVisual').textContent=c.annotate;
    root.querySelector('#checkVisualChoice').textContent=c.check;
    chartType.options[0].text=c.recommended;
    practiceChoice.options[0].text=c.choose;
    [...intent.options].forEach((option,index)=>{option.text=c.intentOptions[index]||option.text;});
    if(!chartInstance)status.textContent=c.status;
    updateInspector();
  }

  function resetPreview(){
    if(chartInstance){
      chartInstance.dispose();
      chartInstance=null;
    }
    clearAnnotation(root);
    renderFallback(root,spec(),currentLang);
    diagram.hidden=true;
    diagram.replaceChildren();
    status.textContent=copy[currentLang].status;
    updateInspector();
  }

  async function renderInteractive(){
    const c=copy[currentLang];
    status.textContent=c.loading;
    clearAnnotation(root);
    try{
      const mod=await loadModule('echarts');
      const echarts=mod?.init?mod:mod?.default;
      if(!echarts?.init)throw new Error('ECharts module unavailable');
      chartInstance?.dispose();
      chartInstance=echarts.init(chartRoot,null,{renderer:'svg'});
      chartInstance.setOption(buildEChartsOption(spec(),{lang:currentLang}),true);
      status.textContent=c.interactive;
    }catch{
      chartInstance?.dispose?.();
      chartInstance=null;
      renderFallback(root,spec(),currentLang);
      status.textContent=c.fallback;
    }
  }

  async function renderFlow(){
    const definition=buildMermaidFlow(intent.value,currentLang);
    diagram.hidden=false;
    diagram.textContent=currentLang==='en'?'Loading diagram…':'Diyagram yükleniyor…';
    try{
      const mod=await loadModule('mermaid');
      const mermaid=mod.default||mod;
      mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base'});
      const id='visual-flow-'+Date.now();
      const rendered=await mermaid.render(id,definition);
      diagram.innerHTML=rendered.svg;
    }catch{
      diagram.replaceChildren();
      const fallback=document.createElement('pre');
      fallback.className='visual-flow-fallback';
      fallback.textContent=definition
        .replace(/^flowchart LR\n/,'')
        .replaceAll('-->','→')
        .replace(/\["|"]|\[|\]/g,'');
      diagram.appendChild(fallback);
    }
  }

  async function annotate(){
    const svg=root.querySelector('#visualAnnotation');
    svg.replaceChildren();
    const box=chartRoot.getBoundingClientRect();
    const width=Math.max(260,Math.round(box.width));
    const height=Math.max(220,Math.round(box.height));
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('width',String(width));
    svg.setAttribute('height',String(height));
    try{
      const mod=await loadModule('roughjs');
      const rough=mod.default||mod;
      const renderer=rough.svg(svg);
      const mark=renderer.rectangle(10,10,width-20,height-20,{roughness:1.3,strokeWidth:2.2});
      svg.appendChild(mark);
    }catch{
      const mark=document.createElementNS('http://www.w3.org/2000/svg','rect');
      mark.setAttribute('x','10');
      mark.setAttribute('y','10');
      mark.setAttribute('width',String(width-20));
      mark.setAttribute('height',String(height-20));
      mark.setAttribute('rx','16');
      mark.setAttribute('class','visual-annotation-fallback');
      svg.appendChild(mark);
    }
  }

  intent.addEventListener('change',()=>{
    chartType.value='recommended';
    practiceChoice.value='';
    resetPreview();
  });
  chartType.addEventListener('change',resetPreview);
  root.querySelector('#renderVisualChart').addEventListener('click',renderInteractive);
  root.querySelector('#renderVisualFlow').addEventListener('click',renderFlow);
  root.querySelector('#annotateVisual').addEventListener('click',annotate);
  root.querySelector('#checkVisualChoice').addEventListener('click',()=>{
    const result=evaluateChartChoice(intent.value,practiceChoice.value,{lang:currentLang});
    practiceFeedback.textContent=result.message;
    practiceFeedback.dataset.result=result.ok?'correct':'review';
  });

  const onResize=()=>chartInstance?.resize();
  window.addEventListener('resize',onResize,{passive:true});
  renderFallback(root,spec(),currentLang);
  renderCopy();

  return {
    setLanguage(next){
      currentLang=safeLang(next);
      renderCopy();
      if(chartInstance)chartInstance.setOption(buildEChartsOption(spec(),{lang:currentLang}),true);
      else renderFallback(root,spec(),currentLang);
    },
    destroy(){
      if(disposed)return;
      disposed=true;
      window.removeEventListener('resize',onResize);
      chartInstance?.dispose();
    }
  };
}

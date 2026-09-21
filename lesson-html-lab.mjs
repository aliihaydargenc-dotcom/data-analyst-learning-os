function parseMarkup(markup){
  if(typeof DOMParser==='undefined') throw new Error('DOMParser requires a browser runtime.');
  return new DOMParser().parseFromString(String(markup||''),'text/html');
}
function meaningfulText(node){return (node?.textContent||'').replace(/\s+/g,' ').trim();}
function uniqueIds(doc){
  const ids=[...doc.querySelectorAll('[id]')].map(el=>el.id).filter(Boolean);
  return ids.length===new Set(ids).size;
}
function noInlineHandlers(doc){
  return [...doc.querySelectorAll('*')].every(el=>el.getAttributeNames().every(name=>!/^on/i.test(name)));
}
function noJavascriptUrls(doc){
  return [...doc.querySelectorAll('[href],[src],[action]')].every(el=>
    ['href','src','action'].every(name=>!/^[\s\u0000-\u001f]*javascript:/i.test(el.getAttribute(name)||''))
  );
}
function result(name,passed,detail){return {name,passed:Boolean(passed),detail};}
function all(testResults){return {passed:testResults.every(item=>item.passed),checks:testResults};}
function hasAccessibleName(el){
  if(!el)return false;
  const aria=el.getAttribute('aria-label')||el.getAttribute('aria-labelledby');
  return Boolean((aria||'').trim()||meaningfulText(el));
}
function labelsInput(doc,input){
  if(!input)return false;
  const id=input.id;
  return Boolean(
    (id&&doc.querySelector(`label[for="${CSS.escape(id)}"]`))||
    input.closest('label')||
    input.getAttribute('aria-label')||
    input.getAttribute('aria-labelledby')
  );
}
function headingLevels(doc){
  return [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(el=>Number(el.tagName.slice(1)));
}
function noHeadingSkip(doc){
  const levels=headingLevels(doc);
  if(!levels.length)return false;
  for(let i=1;i<levels.length;i++) if(levels[i]>levels[i-1]+1)return false;
  return true;
}
function tableHeadersValid(table){
  if(!table)return false;
  const colHeaders=[...table.querySelectorAll('thead th')];
  if(!colHeaders.length||!colHeaders.every(th=>th.getAttribute('scope')==='col')) return false;
  const bodyRows=[...table.querySelectorAll('tbody tr')];
  return bodyRows.length>0&&bodyRows.every(row=>{
    const first=row.firstElementChild;
    return first?.tagName==='TH'&&first.getAttribute('scope')==='row';
  });
}
function imgAltValid(img){
  return img?.hasAttribute('alt')&&((img.getAttribute('alt')||'').trim().length>=4||img.getAttribute('alt')==='');
}
function scriptLoadingValid(doc){
  return [...doc.querySelectorAll('script[src]')].every(script=>
    script.type==='module'||script.hasAttribute('defer')||script.hasAttribute('async')
  );
}
function blockingImageCount(doc){
  return [...doc.images].filter(img=>!img.hasAttribute('width')||!img.hasAttribute('height')).length;
}

const FIXTURES=Object.freeze({
  'html-document-semantics-v1':{
    visible:doc=>all([
      result('doctype',doc.doctype?.name?.toLowerCase()==='html','HTML doctype present'),
      result('language',Boolean(doc.documentElement.getAttribute('lang')),'html lang is declared'),
      result('title',meaningfulText(doc.querySelector('title')).length>=4,'document has a meaningful title'),
      result('main',doc.querySelectorAll('main').length===1,'exactly one main landmark'),
      result('h1',doc.querySelectorAll('h1').length===1,'exactly one primary h1')
    ]),
    edge:doc=>all([
      result('heading-order',noHeadingSkip(doc),'heading levels do not skip forward'),
      result('section-heading',[...doc.querySelectorAll('section')].every(s=>s.querySelector('h2,h3,h4,h5,h6')),'sections have headings'),
      result('unique-ids',uniqueIds(doc),'ids are unique')
    ])
  },
  'html-text-links-media-v1':{
    visible:doc=>all([
      result('nav-list',Boolean(doc.querySelector('nav ul li a[href]')),'navigation uses a list of links'),
      result('meaningful-link',[...doc.querySelectorAll('a[href]')].every(a=>meaningfulText(a).length>=3),'links have meaningful text'),
      result('native-button',Boolean(doc.querySelector('button[type]')),'action uses a native button with type'),
      result('image-alt',[...doc.images].length>0&&[...doc.images].every(imgAltValid),'images declare alt text')
    ]),
    edge:doc=>all([
      result('no-empty-href',[...doc.querySelectorAll('a')].every(a=>(a.getAttribute('href')||'').trim().length>0),'links have destinations'),
      result('no-div-button',![...doc.querySelectorAll('div[role="button"],span[role="button"]')].some(el=>!el.hasAttribute('tabindex')),'no unfocusable faux buttons'),
      result('safe-urls',noJavascriptUrls(doc),'no javascript: URL')
    ])
  },
  'html-data-tables-v1':{
    visible:doc=>{
      const table=doc.querySelector('table');
      return all([
        result('table',Boolean(table),'data table exists'),
        result('caption',meaningfulText(table?.querySelector('caption')).length>=4,'table has caption'),
        result('thead-tbody',Boolean(table?.querySelector('thead'))&&Boolean(table?.querySelector('tbody')),'thead and tbody are explicit'),
        result('scopes',tableHeadersValid(table),'column and row headers expose scope')
      ]);
    },
    edge:doc=>all([
      result('no-layout-role',![...doc.querySelectorAll('table')].some(t=>/presentation|none/.test(t.getAttribute('role')||'')),'data table is not hidden as layout'),
      result('no-empty-th',[...doc.querySelectorAll('th')].every(th=>meaningfulText(th).length>0),'header cells are named'),
      result('unique-ids',uniqueIds(doc),'ids are unique')
    ])
  },
  'html-forms-native-validation-v1':{
    visible:doc=>{
      const controls=[...doc.querySelectorAll('input:not([type="hidden"]),select,textarea')];
      const email=doc.querySelector('input[type="email"]');
      return all([
        result('form',Boolean(doc.querySelector('form')),'form exists'),
        result('labels',controls.length>0&&controls.every(input=>labelsInput(doc,input)),'every control has an accessible label'),
        result('fieldset',Boolean(doc.querySelector('fieldset > legend')),'related controls use fieldset/legend'),
        result('native-validation',Boolean(email?.required),'email control uses native required validation'),
        result('submit',Boolean(doc.querySelector('button[type="submit"],input[type="submit"]')),'explicit submit control exists')
      ]);
    },
    edge:doc=>all([
      result('unique-ids',uniqueIds(doc),'form ids are unique'),
      result('no-placeholder-label',[...doc.querySelectorAll('input[placeholder]')].every(input=>labelsInput(doc,input)),'placeholder is not the only label'),
      result('no-inline-handlers',noInlineHandlers(doc),'no inline event handlers')
    ])
  },
  'html-semantic-layout-accessibility-v1':{
    visible:doc=>all([
      result('landmarks',Boolean(doc.querySelector('header'))&&Boolean(doc.querySelector('nav'))&&doc.querySelectorAll('main').length===1&&Boolean(doc.querySelector('footer')),'header/nav/main/footer landmarks exist'),
      result('nav-name',[...doc.querySelectorAll('nav')].every(hasAccessibleName),'nav landmarks have accessible names'),
      result('source-order',(()=>{const b=doc.body.querySelectorAll('nav,main');return b.length>=2&&b[0].tagName==='NAV'&&b[1].tagName==='MAIN';})(),'navigation precedes main in source order'),
      result('native-interaction',doc.querySelectorAll('[role="button"]').length===0,'buttons use native semantics')
    ]),
    edge:doc=>all([
      result('one-main',doc.querySelectorAll('main').length===1,'only one main landmark'),
      result('headings',noHeadingSkip(doc),'heading hierarchy does not skip'),
      result('no-positive-tabindex',![...doc.querySelectorAll('[tabindex]')].some(el=>Number(el.getAttribute('tabindex'))>0),'no positive tabindex reordering')
    ])
  },
  'html-dom-data-attributes-v1':{
    visible:doc=>all([
      result('unique-ids',uniqueIds(doc),'ids are unique'),
      result('class-group',doc.querySelectorAll('.kpi').length>=2,'repeated styling/behavior hook uses class'),
      result('data-contract',[...doc.querySelectorAll('.kpi')].every(el=>el.hasAttribute('data-metric')),'KPI nodes expose data-metric contract'),
      result('id-anchor',Boolean(doc.querySelector('#report-summary')),'unique report summary uses id')
    ]),
    edge:doc=>all([
      result('data-values',[...doc.querySelectorAll('[data-metric]')].every(el=>(el.dataset.metric||'').trim().length>0),'data-* values are non-empty'),
      result('no-style-selectors',![...doc.querySelectorAll('[class]')].some(el=>(el.className||'').toString().includes('red-text-17px')),'classes describe role instead of presentation details'),
      result('safe-urls',noJavascriptUrls(doc),'no javascript: URL')
    ])
  },
  'html-data-report-structure-v1':{
    visible:doc=>all([
      result('main',doc.querySelectorAll('main').length===1,'report has one main'),
      result('kpi-group',Boolean(doc.querySelector('section[aria-labelledby] dl')),'KPI group uses a named section and description list'),
      result('table',Boolean(doc.querySelector('table caption')),'detail data table has caption'),
      result('figure',Boolean(doc.querySelector('figure > figcaption')),'visual has figure/figcaption'),
      result('narrative',meaningfulText(doc.querySelector('main p')).length>=20,'report contains explanatory narrative')
    ]),
    edge:doc=>all([
      result('section-names',[...doc.querySelectorAll('main section')].every(s=>Boolean(s.querySelector('h2,h3'))),'report sections have headings'),
      result('table-scope',tableHeadersValid(doc.querySelector('table')),'data table exposes row/column headers'),
      result('unique-ids',uniqueIds(doc),'ids are unique')
    ])
  },
  'html-embedded-visualization-v1':{
    visible:doc=>{
      const figure=doc.querySelector('figure');
      const embedded=figure?.querySelector('svg,canvas,iframe');
      return all([
        result('figure',Boolean(figure),'visual is grouped in figure'),
        result('caption',meaningfulText(figure?.querySelector('figcaption')).length>=8,'figure has explanatory caption'),
        result('embedded',Boolean(embedded),'figure contains svg/canvas/iframe'),
        result('fallback',Boolean(figure?.querySelector('table,.visual-fallback,p[data-fallback]')),'data or narrative fallback exists')
      ]);
    },
    edge:doc=>all([
      result('iframe-title',[...doc.querySelectorAll('iframe')].every(frame=>(frame.getAttribute('title')||'').trim().length>=4),'iframes have titles'),
      result('svg-name',[...doc.querySelectorAll('svg')].every(svg=>svg.querySelector('title')||svg.getAttribute('aria-label')||svg.getAttribute('aria-labelledby')),'SVG visuals have accessible names'),
      result('canvas-fallback',[...doc.querySelectorAll('canvas')].every(canvas=>meaningfulText(canvas).length>=4||canvas.getAttribute('aria-label')),'canvas exposes fallback/name')
    ])
  },
  'html-validation-security-boundaries-v1':{
    visible:doc=>all([
      result('native-constraints',Boolean(doc.querySelector('input[required],input[pattern],input[min],input[max]')),'form declares native constraints'),
      result('server-note',Boolean(doc.querySelector('[data-server-validation]')),'markup documents server-side validation boundary'),
      result('output-slot',Boolean(doc.querySelector('[data-safe-output]')),'untrusted output has an explicit safe-output slot')
    ]),
    edge:doc=>all([
      result('no-inline-handlers',noInlineHandlers(doc),'no inline event handlers'),
      result('safe-urls',noJavascriptUrls(doc),'no javascript: URLs'),
      result('no-dangerous-dom-api',[...doc.scripts].every(s=>!/\.innerHTML\s*=|document\.write\s*\(/.test(s.textContent||'')),'scripts avoid raw innerHTML/document.write sinks')
    ])
  },
  'html-performance-delivery-v1':{
    visible:doc=>all([
      result('viewport',Boolean(doc.querySelector('meta[name="viewport"]')),'viewport metadata exists'),
      result('script-loading',scriptLoadingValid(doc),'external scripts are module/defer/async'),
      result('image-dimensions',blockingImageCount(doc)===0,'images declare width and height'),
      result('lazy-secondary',[...doc.images].slice(1).every(img=>img.loading==='lazy'),'secondary images use lazy loading')
    ]),
    edge:doc=>all([
      result('unique-ids',uniqueIds(doc),'ids are unique'),
      result('bounded-dom',doc.querySelectorAll('*').length<=80,'exercise DOM remains intentionally small'),
      result('no-inline-handlers',noInlineHandlers(doc),'no inline event handlers')
    ])
  },
  'html-report-architecture-v1':{
    visible:doc=>all([
      result('main',doc.querySelectorAll('main').length===1,'one main report root'),
      result('template',Boolean(doc.querySelector('template[id]')),'reusable presentation template exists'),
      result('data-payload',Boolean(doc.querySelector('script[type="application/json"][id]')),'data payload is separated from presentation'),
      result('status-region',Boolean(doc.querySelector('[role="status"],[aria-live]')),'render status/failure surface exists')
    ]),
    edge:doc=>all([
      result('no-inline-handlers',noInlineHandlers(doc),'behavior is not coupled through inline handlers'),
      result('unique-ids',uniqueIds(doc),'contract ids are unique'),
      result('safe-urls',noJavascriptUrls(doc),'no javascript: URLs')
    ])
  },
  'html-accessibility-peer-review-v1':{
    visible:doc=>{
      const table=doc.querySelector('table');
      const controls=[...doc.querySelectorAll('input:not([type="hidden"]),select,textarea')];
      return all([
        result('lang',Boolean(doc.documentElement.getAttribute('lang')),'document language declared'),
        result('main',doc.querySelectorAll('main').length===1,'one main landmark'),
        result('heading',doc.querySelectorAll('h1').length===1&&noHeadingSkip(doc),'heading structure is coherent'),
        result('nav',Boolean(doc.querySelector('nav'))&&[...doc.querySelectorAll('nav')].every(hasAccessibleName),'navigation is semantically named'),
        result('images',[...doc.images].every(imgAltValid),'images expose alt contract'),
        result('forms',controls.every(input=>labelsInput(doc,input)),'form controls are labelled'),
        result('tables',!table||Boolean(table.querySelector('caption'))&&tableHeadersValid(table),'data table exposes caption and headers')
      ]);
    },
    edge:doc=>all([
      result('unique-ids',uniqueIds(doc),'ids are unique'),
      result('no-positive-tabindex',![...doc.querySelectorAll('[tabindex]')].some(el=>Number(el.getAttribute('tabindex'))>0),'no positive tabindex'),
      result('no-inline-handlers',noInlineHandlers(doc),'no inline handlers'),
      result('native-buttons',doc.querySelectorAll('div[role="button"],span[role="button"]').length===0,'native buttons preferred')
    ])
  }
});

export const HTML_LAB_IDS=Object.freeze(Object.keys(FIXTURES));

export function evaluateLessonHtml(id,markup){
  const fixture=FIXTURES[id];
  if(!fixture) throw new Error(`Unknown HTML lab: ${id}`);
  const doc=parseMarkup(markup);
  const visible=fixture.visible(doc);
  const edge=fixture.edge(doc);
  return {
    passed:visible.passed&&edge.passed,
    tests:[
      {variant:'visible',passed:visible.passed,detail:visible.checks.map(c=>`${c.name}=${c.passed?'PASS':'FAIL'}`).join(', '),checks:visible.checks},
      {variant:'edge',passed:edge.passed,detail:edge.checks.map(c=>`${c.name}=${c.passed?'PASS':'FAIL'}`).join(', '),checks:edge.checks}
    ]
  };
}

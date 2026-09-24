export const VISUAL_TOOL_VERSIONS=Object.freeze({
  echarts:'6.1.0',
  mermaid:'12.0.0',
  roughjs:'4.6.6'
});

export const VISUAL_CHART_TYPES=Object.freeze(['line','bar','area','scatter','pie']);

const scenarios={
  trend:{
    id:'trend',
    recommended:'line',
    xKey:'period',
    yKeys:['revenue'],
    labelKey:'period',
    title:{tr:'Aylık gelir eğilimi',en:'Monthly revenue trend'},
    reason:{
      tr:'Zaman eksenindeki değişimi, yönü ve kırılma noktalarını okumak için çizgi grafik uygundur.',
      en:'A line chart is suited to reading direction, change and turning points across time.'
    },
    question:{
      tr:'Aylık gelirin yönünü ve kırılma noktalarını göstermek için hangi grafik daha uygundur?',
      en:'Which chart is more suitable for showing monthly revenue direction and turning points?'
    },
    data:[
      {period:'Nis',revenue:3.2},
      {period:'May',revenue:3.7},
      {period:'Haz',revenue:4.4},
      {period:'Tem',revenue:4.1},
      {period:'Ağu',revenue:4.8},
      {period:'Eyl',revenue:4.5}
    ]
  },
  compare:{
    id:'compare',
    recommended:'bar',
    xKey:'hotel',
    yKeys:['revenue'],
    labelKey:'hotel',
    title:{tr:'Otel gelir karşılaştırması',en:'Hotel revenue comparison'},
    reason:{
      tr:'Aynı ölçüyü ayrık kategoriler arasında karşılaştırmak için çubuk grafik daha okunaklıdır.',
      en:'A bar chart is clearer for comparing the same measure across discrete categories.'
    },
    question:{
      tr:'Dört otelin aynı dönem gelirini yan yana karşılaştırmak için hangi grafik daha uygundur?',
      en:'Which chart is more suitable for comparing four hotels in the same period?'
    },
    data:[
      {hotel:'Carya',revenue:4.8},
      {hotel:'Crown',revenue:4.2},
      {hotel:'Pearl',revenue:3.5},
      {hotel:'Vista',revenue:3.9}
    ]
  },
  relationship:{
    id:'relationship',
    recommended:'scatter',
    xKey:'occupancy',
    yKeys:['adr'],
    labelKey:'hotel',
    title:{tr:'Doluluk ve ADR ilişkisi',en:'Occupancy and ADR relationship'},
    reason:{
      tr:'İki sayısal ölçünün birlikte nasıl hareket ettiğini incelemek için scatter plot uygundur.',
      en:'A scatter plot is suited to examining how two numeric measures move together.'
    },
    question:{
      tr:'Doluluk ile ADR arasında ilişki olup olmadığını incelemek için hangi grafik daha uygundur?',
      en:'Which chart is more suitable for examining the relationship between occupancy and ADR?'
    },
    data:[
      {hotel:'Carya',occupancy:74,adr:242},
      {hotel:'Crown',occupancy:82,adr:268},
      {hotel:'Pearl',occupancy:68,adr:218},
      {hotel:'Vista',occupancy:88,adr:281},
      {hotel:'Park',occupancy:79,adr:254}
    ]
  },
  share:{
    id:'share',
    recommended:'pie',
    xKey:'segment',
    yKeys:['share'],
    labelKey:'segment',
    title:{tr:'Segment gelir payı',en:'Segment revenue share'},
    reason:{
      tr:'Az sayıda kategorinin tek bir toplam içindeki payını göstermek için pie kullanılabilir; kategori sayısı büyürse bar tercih edilmelidir.',
      en:'Pie can show the share of a small number of categories within one whole; prefer bar when category count grows.'
    },
    question:{
      tr:'Dört segmentin toplam gelir içindeki payını göstermek için hangi grafik kullanılabilir?',
      en:'Which chart can show the share of four segments within total revenue?'
    },
    data:[
      {segment:'Leisure',share:44},
      {segment:'Corporate',share:26},
      {segment:'Group',share:18},
      {segment:'Other',share:12}
    ]
  }
};

export const VISUAL_SCENARIOS=Object.freeze(scenarios);

function cloneScenario(scenario){
  return {
    ...scenario,
    title:{...scenario.title},
    reason:{...scenario.reason},
    question:{...scenario.question},
    yKeys:[...scenario.yKeys],
    data:scenario.data.map(row=>({...row}))
  };
}

export function getVisualScenario(intent='trend'){
  return cloneScenario(scenarios[intent]||scenarios.trend);
}

export function recommendChart(intent='trend'){
  return (scenarios[intent]||scenarios.trend).recommended;
}

export function resolveVisualSpec(intent='trend',selectedType='recommended'){
  const scenario=getVisualScenario(intent);
  const chartType=selectedType==='recommended'?scenario.recommended:selectedType;
  return {...scenario,chartType};
}

export function validateVisualSpec(spec){
  const errors=[];
  if(!spec||typeof spec!=='object')return {ok:false,errors:['spec']};
  if(!VISUAL_CHART_TYPES.includes(spec.chartType))errors.push('chartType');
  if(!Array.isArray(spec.data)||spec.data.length<2)errors.push('data');
  if(!spec.xKey)errors.push('xKey');
  if(!Array.isArray(spec.yKeys)||spec.yKeys.length===0)errors.push('yKeys');
  if(Array.isArray(spec.data)&&spec.data.length&&spec.xKey){
    if(spec.data.some(row=>!(spec.xKey in row)))errors.push('xValues');
    for(const key of spec.yKeys||[]){
      if(spec.data.some(row=>!Number.isFinite(Number(row[key]))))errors.push('numeric:'+key);
    }
  }
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}

function metricName(key,lang){
  const labels={
    revenue:{tr:'Gelir (M€)',en:'Revenue (M€)'},
    occupancy:{tr:'Doluluk (%)',en:'Occupancy (%)'},
    adr:{tr:'ADR (€)',en:'ADR (€)'},
    share:{tr:'Pay (%)',en:'Share (%)'}
  };
  return labels[key]?.[lang]||key;
}

export function buildEChartsOption(spec,{lang='tr'}={}){
  const validation=validateVisualSpec(spec);
  if(!validation.ok)throw new Error('Invalid visual spec: '+validation.errors.join(', '));
  const title=spec.title?.[lang]||spec.title?.tr||'Visual';
  const yKey=spec.yKeys[0];

  if(spec.chartType==='pie'){
    return {
      animationDuration:450,
      title:{text:title,left:'left'},
      tooltip:{trigger:'item'},
      series:[{
        type:'pie',
        radius:['42%','70%'],
        avoidLabelOverlap:true,
        data:spec.data.map(row=>({name:String(row[spec.xKey]),value:Number(row[yKey])}))
      }]
    };
  }

  if(spec.chartType==='scatter'){
    return {
      animationDuration:450,
      title:{text:title,left:'left'},
      tooltip:{
        trigger:'item',
        formatter:params=>{
          const value=params?.value||[];
          return String(value[2]||'')+'<br>'+metricName(spec.xKey,lang)+': '+value[0]+'<br>'+metricName(yKey,lang)+': '+value[1];
        }
      },
      xAxis:{type:'value',name:metricName(spec.xKey,lang),nameLocation:'middle',nameGap:28},
      yAxis:{type:'value',name:metricName(yKey,lang)},
      series:[{
        type:'scatter',
        symbolSize:14,
        data:spec.data.map(row=>[Number(row[spec.xKey]),Number(row[yKey]),String(row[spec.labelKey]||'')])
      }]
    };
  }

  const categoryData=spec.data.map(row=>String(row[spec.xKey]));
  const series=spec.yKeys.map(key=>({
    name:metricName(key,lang),
    type:spec.chartType==='area'?'line':spec.chartType,
    smooth:spec.chartType==='line'||spec.chartType==='area',
    areaStyle:spec.chartType==='area'?{}:undefined,
    data:spec.data.map(row=>Number(row[key]))
  }));
  return {
    animationDuration:450,
    title:{text:title,left:'left'},
    tooltip:{trigger:'axis'},
    grid:{left:46,right:20,top:58,bottom:42,containLabel:true},
    xAxis:{type:'category',data:categoryData,boundaryGap:spec.chartType==='bar'},
    yAxis:{type:'value',name:metricName(yKey,lang)},
    series
  };
}

export function buildMermaidFlow(intent='trend',lang='tr'){
  const copy=lang==='en'
    ?['Raw data','Question','Visual choice','Chart','Interpretation']
    :['Ham veri','Analiz sorusu','Görsel seçimi','Grafik','Yorum'];
  const chart=recommendChart(intent);
  return [
    'flowchart LR',
    `A["${copy[0]}"] --> B["${copy[1]}"]`,
    `B --> C["${copy[2]} · ${chart}"]`,
    `C --> D["${copy[3]}"]`,
    `D --> E["${copy[4]}"]`
  ].join('\n');
}

export function evaluateChartChoice(intent,choice,{lang='tr'}={}){
  const expected=recommendChart(intent);
  if(!choice){
    return {
      ok:false,
      expected,
      message:lang==='en'?'Choose a chart type first.':'Önce bir grafik tipi seç.'
    };
  }
  if(choice===expected){
    return {
      ok:true,
      expected,
      message:lang==='en'
        ?'Good choice. The chart matches the analytical intent; now justify what the visual does and does not prove.'
        :'Doğru seçim. Grafik analiz amacıyla uyumlu; şimdi görselin neyi gösterdiğini ve neyi kanıtlamadığını gerekçelendir.'
    };
  }
  return {
    ok:false,
    expected,
    message:lang==='en'
      ?`Not the clearest choice for this intent. Compare it with ${expected} and focus on the analytical question.`
      :`Bu amaç için en açık seçim değil. ${expected} ile karşılaştır ve analiz sorusuna odaklan.`
  };
}

export function buildFallbackSeries(spec){
  const validation=validateVisualSpec(spec);
  if(!validation.ok)throw new Error('Invalid visual spec: '+validation.errors.join(', '));
  const key=spec.yKeys[0];
  const values=spec.data.map(row=>Number(row[key]));
  const max=Math.max(...values.map(value=>Math.abs(value)),1);
  return spec.data.map((row,index)=>({
    label:String(row[spec.labelKey]??row[spec.xKey]??index+1),
    value:values[index],
    percent:Math.max(4,Math.round((Math.abs(values[index])/max)*100))
  }));
}

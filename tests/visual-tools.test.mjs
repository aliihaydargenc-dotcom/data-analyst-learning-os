import assert from 'node:assert/strict';
import {
  VISUAL_TOOL_VERSIONS,
  getVisualScenario,
  recommendChart,
  resolveVisualSpec,
  validateVisualSpec,
  buildEChartsOption,
  buildMermaidFlow,
  evaluateChartChoice,
  buildFallbackSeries
} from '../visual-tools.mjs';

assert.deepEqual(VISUAL_TOOL_VERSIONS,{echarts:'6.1.0',mermaid:'12.0.0',roughjs:'4.6.6'});

assert.equal(recommendChart('trend'),'line');
assert.equal(recommendChart('compare'),'bar');
assert.equal(recommendChart('relationship'),'scatter');
assert.equal(recommendChart('share'),'pie');

const trend=resolveVisualSpec('trend','recommended');
assert.equal(trend.chartType,'line');
assert.equal(validateVisualSpec(trend).ok,true);
assert.equal(trend.data.length,6);

const clone=getVisualScenario('trend');
clone.data[0].revenue=999;
assert.notEqual(getVisualScenario('trend').data[0].revenue,999,'scenario reads must be isolated');

const lineOption=buildEChartsOption(trend,{lang:'tr'});
assert.equal(lineOption.series[0].type,'line');
assert.equal(lineOption.xAxis.type,'category');
assert.equal(lineOption.series[0].data.length,6);

const relationship=resolveVisualSpec('relationship','recommended');
const scatterOption=buildEChartsOption(relationship,{lang:'en'});
assert.equal(scatterOption.series[0].type,'scatter');
assert.deepEqual(scatterOption.series[0].data[0],[74,242,'Carya']);

const share=resolveVisualSpec('share','recommended');
const pieOption=buildEChartsOption(share,{lang:'tr'});
assert.equal(pieOption.series[0].type,'pie');
assert.equal(pieOption.series[0].data.reduce((sum,item)=>sum+item.value,0),100);

const invalid=validateVisualSpec({chartType:'line',data:[{x:'A'}],xKey:'x',yKeys:['value']});
assert.equal(invalid.ok,false);
assert.ok(invalid.errors.includes('data'));

const flow=buildMermaidFlow('compare','tr');
assert.match(flow,/^flowchart LR/);
assert.match(flow,/bar/);
assert.match(flow,/Ham veri/);

assert.equal(evaluateChartChoice('trend','line',{lang:'tr'}).ok,true);
assert.equal(evaluateChartChoice('trend','pie',{lang:'tr'}).ok,false);
assert.equal(evaluateChartChoice('trend','',{lang:'tr'}).expected,'line');

const fallback=buildFallbackSeries(resolveVisualSpec('compare','bar'));
assert.equal(fallback.length,4);
assert.ok(fallback.every(item=>item.percent>=4&&item.percent<=100));

console.log('visual tools: PASS');

import test from 'node:test';
import assert from 'node:assert/strict';
import { badgeModel } from '../lib/usage.js';
import { createBadge } from '../lib/badge.js';
import { iconRgba } from '../lib/icon-raster.js';
const window = (remainingPercent, durationSeconds) => ({ remainingPercent, durationSeconds, resetsAt: null, label: durationSeconds === 18000 ? '5 horas' : 'Semanal' });
const state = (short, weekly) => ({ data: { primary: window(short,18000), secondary: window(weekly,604800) } });

for (const [short,weekly,wanted] of [[0,0,'0|0'],[8,100,'8|100'],[100,8,'100|8'],[100,100,'100|100'],[100,58,'100|58'],[null,42,'42'],[91,null,'91'],[null,null,'']]) test(`indicador ${short} e ${weekly}: ${wanted || 'ícone original'}`,()=>{
  assert.equal(badgeModel(state(short,weekly)).text,wanted);
});
test('ordem 5 horas | semanal independe da posição na resposta',()=>{
  const value=state(80,20); [value.data.primary,value.data.secondary]=[value.data.secondary,value.data.primary];
  const result=badgeModel(value); assert.equal(result.text,'80|20'); assert.match(result.title,/5 horas: 80% restante \| Semanal: 20% restante/);
});
test('tipos inválidos e valores fora de faixa não são convertidos nem limitados silenciosamente',()=>{
  for (const invalid of [-1,101,NaN,Infinity,'42',false,undefined]) assert.equal(badgeModel(state(invalid,42)).text,'42');
});
test('esgotamento preserva os dois valores e diferencia espera de 5h de limite semanal',()=>{
  const wait=badgeModel(state(0,58)), weekly=badgeModel(state(100,0));
  assert.equal(wait.text,'0|58'); assert.equal(wait.color,'#795100'); assert.match(wait.title,/Aguarde/);
  assert.equal(weekly.text,'100|0'); assert.equal(weekly.color,'#a32121'); assert.match(weekly.title,/semanal esgotado/);
});
test('leitura desatualizada não reapresenta números como atuais',()=>{
  assert.equal(badgeModel({...state(100,58),stale:true}).text,'~');
});
test('todos os pares de inteiros de 0 a 100 preservam os dois números e geram pixels',()=>{
  for(let short=0;short<=100;short++) for(let weekly=0;weekly<=100;weekly++) {
    const label=`${short}|${weekly}`;
    assert.equal(badgeModel(state(short,weekly)).text,label);
    const image=iconRgba(label,'#08624a',16);
    assert.equal(image.data.length,1024);
    for (const y of [7,8]) for (let x=0;x<16;x++) assert.notEqual(image.data[(y*16+x)*4],255); // Space between rows.
  }
});
test('seis resoluções mantêm texto, fundo e transparência sem depender de fontes do sistema',()=>{
  for(const size of [16,20,24,32,40,48]) for(const label of ['0','1','8','9','10','42','88','99','100','0|0','8|100','100|8','100|100','!','~','…','—']) {
    const {data}=iconRgba(label,'#08624a',size); let white=0;
    for(let i=0;i<data.length;i+=4) { assert.ok(data[i+3]===0 || data[i+3]===255); if(data[i]===255) white++; }
    assert.ok(white>0,label);
  }
});
test('100 mantém um pixel livre entre cada dígito nas duas linhas',()=>{
  const {data}=iconRgba('100|100','#08624a',16);
  for(let y=0;y<16;y++) for(const x of [5,10]) assert.notEqual(data[(y*16+x)*4],255);
});
test('a linha superior representa só 5 horas e a inferior só o semanal',()=>{
  const a=iconRgba('100|58','#08624a',16).data;
  const b=iconRgba('100|0','#08624a',16).data;
  const c=iconRgba('0|58','#08624a',16).data;
  assert.deepEqual(a.slice(0,7*16*4),b.slice(0,7*16*4));
  assert.notDeepEqual(a.slice(0,7*16*4),c.slice(0,7*16*4));
  assert.deepEqual(a.slice(9*16*4),c.slice(9*16*4));
  assert.notDeepEqual(a.slice(9*16*4),b.slice(9*16*4));
});
test('transições duplo, simples e indisponível limpam badge e restauram ícone sem redesenho repetido',async()=>{
  const calls=[]; let tabs=[{id:1,incognito:false}];
  const api={ tabs:{query:async()=>tabs}, action:Object.fromEntries(['setIcon','setBadgeText','setTitle'].map(name=>[name,async args=>calls.push([name,args])])) };
  const draw=createBadge(api,false,{pixels:(label,color,size)=>({label,color,size})});
  await draw(state(100,58)); const first=calls.length; await draw(state(100,58)); assert.equal(calls.length,first);
  tabs.push({id:2,incognito:false}); await draw(state(100,58)); assert.ok(calls.slice(first).every(c=>c[1].tabId===2));
  await draw(state(null,42)); await draw(state(null,null));
  assert.ok(calls.filter(c=>c[0]==='setBadgeText').every(c=>c[1].text===''));
  const images=calls.filter(c=>c[0]==='setIcon').map(c=>c[1]);
  assert.equal(images[0].imageData[16].label,'100|58'); assert.equal(images[2].imageData[16].label,'42'); assert.ok(images.at(-1).path);
});

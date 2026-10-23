"use strict";
// Feature pack: tasks, search/filter, export, deterministic AI fallback. No DB migration; in-memory per-process store.
const FEATURES = ["load-outlook", "outage-risk", "renewable-mix"];
const LABELS = {"load-outlook": "Load outlook", "outage-risk": "Outage risk", "renewable-mix": "Renewable mix"};
function hasProvider(env){ const e=env||process.env; return Boolean(e.OPENROUTER_API_KEY||e.OPENAI_API_KEY); }
let seq=0;
function createTaskStore(){
  const byId=new Map();
  return {
    create(ownerId,input){
      const data=input||{};
      if(data.title==null||String(data.title).trim()==="") throw Object.assign(new Error("title is required"),{status:400});
      const task={id:++seq, ownerId: ownerId??null, title:String(data.title), description: data.description??"", status: data.status??"todo", priority: data.priority??"medium", score: data.score??0, flagged: data.flagged??false, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()};
      byId.set(task.id,task); return {...task};
    },
    list(ownerId,opts){ return filterRecords([...byId.values()].filter(t=>String(t.ownerId)===String(ownerId)), opts||{}); },
    update(ownerId,id,patch){
      const t=byId.get(Number(id)); if(!t||String(t.ownerId)!==String(ownerId)) return null;
      const p=patch||{}; for(const k of ["title","description","status","priority","score","flagged"]) if(Object.prototype.hasOwnProperty.call(p,k)) t[k]=p[k];
      t.updatedAt=new Date().toISOString(); return {...t};
    },
    all(ownerId){ return [...byId.values()].filter(t=>String(t.ownerId)===String(ownerId)).map(t=>({...t})); },
    _clear(){ byId.clear(); }
  };
}
function filterRecords(records,opts){
  const o=opts||{}; const q=(o.q??o.search??""); const needle=String(q).toLowerCase();
  return (records||[]).filter(r=>{
    if(needle && !`${r.title??""} ${r.description??""} ${r.name??""}`.toLowerCase().includes(needle)) return false;
    if(o.status!=null && o.status!=="" && String(r.status) !== String(o.status)) return false;
    if(o.priority!=null && o.priority!=="" && String(r.priority) !== String(o.priority)) return false;
    return true;
  }).map(r=>({...r}));
}
function esc(v){ const s=v==null?"":String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function toCSV(records){
  const rows=records||[]; const headers=["id","title","description","status","priority","score","flagged"];
  return [headers.join(","), ...rows.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n");
}
function exportRecords(records,format){
  if(format==="csv") return {contentType:"text/csv", body:toCSV(records)};
  return {contentType:"application/json", body:JSON.stringify(records??[],null,2)};
}
function analyze(feature,records,env){
  if(!FEATURES.includes(feature)) throw Object.assign(new Error("unknown feature: "+feature),{status:400});
  const rows=records||[]; const count=rows.length;
  const scores=rows.map(r=>Number(r.score)).filter(n=>Number.isFinite(n)); const avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0;
  const flagged=rows.filter(r=>r.flagged===true).length; const emptyTitle=rows.filter(r=>!r.title).length;
  // Labelled sections preserve false/0/empty exactly (no || defaults).
  return { feature, label:LABELS[feature], aiGenerated:false, provider:hasProvider(env), source: hasProvider(env)?"provider-configured-deterministic-summary":"deterministic-fallback",
    sections:[{label:"Summary",content:`${LABELS[feature]} over ${count} record(s).`},{label:"Records analysed",content:count},{label:"Average score",content:avg},{label:"Flagged count",content:flagged},{label:"Records with empty title",content:emptyTitle}],
    metrics:{count, averageScore:avg, flagged, emptyTitle, hasRecords: count>0} };
}
const defaultStore=createTaskStore();
module.exports={FEATURES,LABELS,hasProvider,createTaskStore,filterRecords,toCSV,exportRecords,analyze,defaultStore};

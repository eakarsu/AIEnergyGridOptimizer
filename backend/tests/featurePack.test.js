"use strict";
const test=require("node:test"); const assert=require("node:assert/strict");
const svc=require("../services/featurePack");
test("tasks create/list/update preserves false/0/empty",()=>{
  const s=svc.createTaskStore(); const t=s.create("u1",{title:"Alpha",description:"",score:0,flagged:false});
  assert.equal(t.score,0); assert.equal(t.flagged,false); assert.equal(t.description,"");
  const u=s.update("u1",t.id,{status:"done",score:0,flagged:false,description:""}); assert.equal(u.status,"done"); assert.equal(u.score,0);
  assert.equal(s.list("u1",{}).length,1); assert.equal(s.list("other",{}).length,0); assert.equal(s.update("u1",9999,{status:"x"}),null);
});
test("search/filter on main list",()=>{
  const s=svc.createTaskStore(); s.create("u1",{title:"Needle one",status:"todo"}); s.create("u1",{title:"Other",status:"done"});
  assert.equal(s.list("u1",{q:"needle"}).length,1); assert.equal(s.list("u1",{status:"done"}).length,1); assert.equal(s.list("u1",{q:"missing"}).length,0);
});
test("CSV/JSON export",()=>{
  const s=svc.createTaskStore(); s.create("u1",{title:"A,B",score:0});
  const csv=svc.exportRecords(s.all("u1"),"csv"); assert.match(csv.contentType,/csv/); assert.ok(csv.body.includes('"A,B"')); assert.ok(csv.body.startsWith("id,title"));
  const json=svc.exportRecords(s.all("u1"),"json"); assert.equal(JSON.parse(json.body)[0].title,"A,B"); assert.equal(svc.exportRecords([],"csv").body.startsWith("id,title"),true);
});
test("domain AI fallback labelled and preserves values",()=>{
  for(const f of svc.FEATURES){ const r=svc.analyze(f,[],{}); assert.equal(r.aiGenerated,false); assert.equal(r.provider,false); assert.ok(Array.isArray(r.sections)); assert.equal(r.metrics.count,0); assert.equal(r.metrics.hasRecords,false); assert.equal(r.sections.find(x=>x.label==="Records analysed").content,0); }
  assert.throws(()=>svc.analyze("nope",[],{}),/unknown feature/);
  assert.equal(svc.hasProvider({OPENAI_API_KEY:"x"}),true); assert.equal(svc.hasProvider({}),false);
});

"use strict";
const express=require("express");
const svc=require("../services/featurePack");
function createRouter(authMw, store){
  const router=express.Router(); const tasks=store||svc.defaultStore;
  const auth = typeof authMw==="function" ? authMw : (req,res,next)=>next();
  const owner=(req)=> (req.user&&(req.user.id??req.user.userId??req.user.email)) ?? "anon";
  router.get("/tasks",auth,(req,res)=>{ res.json({data:tasks.list(owner(req),req.query), total: tasks.list(owner(req),req.query).length}); });
  router.post("/tasks",auth,(req,res)=>{ try{ res.status(201).json(tasks.create(owner(req),req.body||{})); }catch(e){ res.status(e.status||500).json({error:e.message}); } });
  router.put("/tasks/:id",auth,(req,res)=>{ const u=tasks.update(owner(req),req.params.id,req.body||{}); if(!u) return res.status(404).json({error:"Task not found"}); res.json(u); });
  router.patch("/tasks/:id",auth,(req,res)=>{ const u=tasks.update(owner(req),req.params.id,req.body||{}); if(!u) return res.status(404).json({error:"Task not found"}); res.json(u); });
  router.get("/tasks/export",auth,(req,res)=>{ const fmt=(req.query.format||"json").toLowerCase(); const out=svc.exportRecords(tasks.list(owner(req),req.query),fmt); res.setHeader("Content-Type",out.contentType); res.setHeader("Content-Disposition",`attachment; filename="tasks.${fmt==="csv"?"csv":"json"}"`); res.send(out.body); });
  router.get("/ai/features",auth,(req,res)=>res.json({features:svc.FEATURES, aiGenerated:false, provider:svc.hasProvider()}));
  router.post("/ai/:feature",auth,async(req,res)=>{
    try{
      const records=Array.isArray(req.body?.records)?req.body.records:tasks.all(owner(req));
      // Provider only when a key is configured; never called in deterministic path.
      if(svc.hasProvider() && typeof fetch==="function"){
        try{
          const key=process.env.OPENROUTER_API_KEY||process.env.OPENAI_API_KEY; const isOR=Boolean(process.env.OPENROUTER_API_KEY);
          const r=await fetch(isOR?"https://openrouter.ai/api/v1/chat/completions":"https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENROUTER_MODEL||process.env.OPENAI_MODEL||(isOR?"anthropic/claude-3-5-sonnet-20241022":"gpt-4o-mini"),messages:[{role:"user",content:`Feature ${req.params.feature} over records: ${JSON.stringify(records).slice(0,4000)}`}],max_tokens:600})});
          if(r.ok){ const d=await r.json(); const text=d?.choices?.[0]?.message?.content??""; return res.json({feature:req.params.feature, aiGenerated:true, provider:true, sections:[{label:"AI summary",content:text},{label:"Records analysed",content:records.length}]}); }
        }catch(_e){ /* fall through to deterministic fallback */ }
      }
      res.json(svc.analyze(req.params.feature,records));
    }catch(e){ res.status(e.status||500).json({error:e.message}); }
  });
  return router;
}
module.exports=createRouter; module.exports.createRouter=createRouter; module.exports.default=createRouter(null);

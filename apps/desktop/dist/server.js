#!/usr/bin/env node
import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { IdeEngine } from "../../../packages/core/dist/index.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = Number(process.env.UAIDE_PORT) || 3847;
const HOST = process.env.UAIDE_HOST || "127.0.0.1";
const WORKSPACE = process.env.UAIDE_WORKSPACE || process.cwd();
const engine = new IdeEngine({ defaultWorkspace: WORKSPACE });
const MIME = {".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json"};
function sendJson(res, status, body) { res.writeHead(status, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}); res.end(JSON.stringify(body)); }
async function readBody(req) { const chunks=[]; for await (const c of req) chunks.push(c); const raw=Buffer.concat(chunks).toString("utf8"); return raw?JSON.parse(raw):{}; }
async function serveStatic(req, res, urlPath) { let rel = urlPath==="/"?"/index.html":urlPath; rel=rel.replace(/\.\./g,""); const filePath=join(PUBLIC, rel); if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end("Forbidden"); } try { const data=await readFile(filePath); res.writeHead(200,{"Content-Type":MIME[extname(filePath)]||"application/octet-stream"}); res.end(data); } catch { res.writeHead(404); res.end("Not found"); } }
async function handleApi(req, res, pathname) {
  try {
    if (req.method==="OPTIONS") { res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}); return res.end(); }
    if (req.method==="GET" && pathname==="/api/health") return sendJson(res,200,{ok:true,workspace:engine.defaultWorkspace});
    if (req.method==="GET" && pathname==="/api/status") return sendJson(res,200,{statuses:await engine.status(),workspace:engine.defaultWorkspace});
    if (req.method==="GET" && pathname==="/api/modes") return sendJson(res,200,{modes:engine.listModes()});
    if (req.method==="GET" && pathname==="/api/sessions") { const list=await engine.listSessions(40); return sendJson(res,200,{sessions:list.map(s=>({id:s.session.id,mode:s.session.mode,title:s.session.title,updatedAt:s.session.updatedAt,messageCount:s.messages?.length||0}))}); }
    if (req.method==="GET" && pathname.startsWith("/api/sessions/")) { const id=pathname.slice(14); const store=await engine.getSession(id); if(!store) return sendJson(res,404,{error:"Session not found"}); return sendJson(res,200,store); }
    if (req.method==="GET" && pathname==="/api/workspace") { const u=new URL(req.url,`http://${HOST}`); return sendJson(res,200,await engine.listWorkspace(u.searchParams.get("path")||".")); }
    if (req.method==="GET" && pathname==="/api/workspace/file") { const u=new URL(req.url,`http://${HOST}`); const path=u.searchParams.get("path"); if(!path) return sendJson(res,400,{error:"path required"}); return sendJson(res,200,await engine.readWorkspaceFile(path)); }
    if (req.method==="POST" && pathname==="/api/run") { const body=await readBody(req); if(!body.mode||!(body.prompt||"").trim()) return sendJson(res,400,{error:"mode and prompt are required"}); const result=await engine.run(body.mode,(body.prompt||"").trim(),{sessionId:body.sessionId,confirmRisk:!!body.confirmRisk,workspacePath:body.workspacePath||engine.defaultWorkspace,model:body.model,options:body.options}); return sendJson(res,200,result); }
    return sendJson(res,404,{error:"Unknown API route"});
  } catch (err) { return sendJson(res,500,{error:err instanceof Error?err.message:String(err)}); }
}
const server=http.createServer(async (req,res)=>{ const url=new URL(req.url||"/",`http://${HOST}`); if(url.pathname.startsWith("/api/")) return handleApi(req,res,url.pathname); return serveStatic(req,res,url.pathname); });
server.listen(PORT,HOST,()=>{ console.log(`Unified AI IDE  http://${HOST}:${PORT}`); console.log(`workspace: ${WORKSPACE}`); });

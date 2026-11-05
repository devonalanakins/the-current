// SPDX-License-Identifier: AGPL-3.0-only
import { createServer, type IncomingMessage } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Store, hash, token, now, verifyPassword, password } from './store.js';
import { Current, Fault, requireThat, type Actor, type Briefing, type Role } from './domain.js';
import { layout, intro, esc, invitationView, briefingHome, runner, studio, desk } from './views.js';
export interface Config {origin:string;secure:boolean;}
function cookies(req:IncomingMessage){return Object.fromEntries((req.headers.cookie??'').split(';').map(p=>p.trim().split('=')).filter(p=>p.length===2));}
async function body(req:IncomingMessage){
 if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')throw new Fault(415,'Use a supported form.');
 let bytes=0;const chunks:Buffer[]=[];for await(const part of req){const data=Buffer.from(part as Uint8Array);bytes+=data.length;if(bytes>60000)throw new Fault(413,'This request is too large.');chunks.push(data);}
 const entries=new URLSearchParams(Buffer.concat(chunks).toString('utf8'));const out:Record<string,string>={};
 for(const [k,v] of entries){if(k in out||k.length>100||v.length>50000)throw new Fault(400);out[k]=v;}return out;
}
export function application(store:Store,config:Config){
 const app=new Current(store);const dummy=password(token());
 const cookie=(name:string,value:string,age:number)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${config.secure?'; Secure':''}`;
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store, private, max-age=0');res.setHeader('Pragma','no-cache');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(config.secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
  const send=(content:string,status=200,type='text/html; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(content);};
  const redirect=(path:string)=>{res.writeHead(303,{Location:path});res.end();};
  let actor:Actor|undefined;
  try{
   const url=new URL(req.url??'/',config.origin);requireThat(url.origin===config.origin,400);const path=url.pathname;
   const c=cookies(req);
   if(c.current){const login=store.get<{user_id:string;csrf:string}>('SELECT user_id,csrf FROM logins WHERE token_hash=? AND expires>?',hash(c.current),now());if(login)actor={id:login.user_id,csrf:login.csrf};}
   const needActor=()=>{if(!actor)throw new Fault(401,'Sign in to continue.');return actor;};
   if(req.method==='POST'){
    requireThat(req.headers.origin===config.origin,403,'The request could not be verified. Reload and try again.');
    const data=await body(req);
    if(path==='/login'||path==='/open'){
     requireThat(data.csrf&&data.csrf===c.preflight,403,'Reload this page before continuing.');
     if(path==='/open'){
      requireThat(data.token&&/^[A-Za-z0-9_-]{43}$/.test(data.token),410,'This invitation is unavailable. Ask your organizer for a replacement.');
      const {inv}=app.invitation(data.token);res.setHeader('Set-Cookie',[cookie('invitation',data.token,Math.min(86400,Math.floor((inv.expires-now())/1000))),cookie('preflight','',0)]);return redirect(inv.audience==='presentation'?'/presentation':'/invitation');
     }
     const address=req.socket.remoteAddress??'local';let attempt=store.get<{count:number;reset:number}>('SELECT count,reset FROM login_attempts WHERE address=?',address);
     if(!attempt||attempt.reset<now()){store.run('INSERT OR REPLACE INTO login_attempts VALUES(?,0,?)',address,now()+900000);attempt={count:0,reset:now()+900000};}
     requireThat(attempt.count<20,429,'Too many sign-in attempts. Try again in 15 minutes.');store.run('UPDATE login_attempts SET count=count+1 WHERE address=?',address);
     const user=store.get<{id:string;password:string}>('SELECT id,password FROM users WHERE username=?',(data.username??'').slice(0,100));
     const valid=verifyPassword((data.password??'').slice(0,256),user?.password??dummy);requireThat(user&&valid,401,'Sign-in details were not recognized.');
     store.run('DELETE FROM login_attempts WHERE address=?',address);const raw=token(),csrf=token();store.run('INSERT INTO logins VALUES(?,?,?,?)',hash(raw),user.id,csrf,now()+8*3600000);
     res.setHeader('Set-Cookie',[cookie('current',raw,8*3600),cookie('preflight','',0)]);return redirect('/workspace');
    }
    const a=needActor();requireThat(data.csrf===a.csrf,403,'Reload this page before continuing.');
    if(path==='/logout'){store.run('DELETE FROM logins WHERE token_hash=?',hash(c.current??''));res.setHeader('Set-Cookie',cookie('current','',0));return redirect('/login');}
    if(path==='/action'){
     requireThat(data.action&&data.id&&data.key&&/^\d+$/.test(data.revision??''),400);
     const result=app.command(a,data.action,data.id,Number(data.revision),data.key,{...(data.action==='edit'?{content:data.content??JSON.stringify({title:data.title,premise:data.premise,teaser:data.teaser,clue:data.clue,evidence:data.evidence,resolution:data.resolution,prompts:Array.from({length:6},(_,i)=>data['prompt'+i])})}:{}),...(data.confirm?{confirm:data.confirm}:{}),...(data.audience?{audience:data.audience}:{})});
     if(result.issued){return send(layout('Your limited invitation',intro('LINK CREATED · NOT SENT','A small door into the story.','This credential is shown once, expires in 24 hours, and can be withdrawn from the briefing.')+`<section class="letter"><label>Limited invitation URL<input readonly value="${esc(config.origin+'/open#'+result.issued)}"></label><a class="button" href="/open#${esc(result.issued)}" target="_blank" rel="noreferrer">Open this invitation</a><p>Use a separate browser context for the participant-safe display. Share only that view, never this private workspace.</p><a href="/briefings">Return to briefings</a></section>`,a));}
     return redirect(['start','pause','resume','next','previous','reveal','complete','abort','revoke-invites'].includes(data.action)?'/run/'+encodeURIComponent(data.id):'/workspace');
    }
    throw new Fault(404);
   }
   if(req.method!=='GET')throw new Fault(405);
   if(path==='/style.css')return send(readFileSync('public/style.css','utf8'),200,'text/css; charset=utf-8');
   if(path==='/app.js')return send(readFileSync('public/app.js','utf8'),200,'text/javascript; charset=utf-8');
   if(path==='/health')return send('{"status":"ok"}',200,'application/json');
   if(path==='/favicon.ico'){res.writeHead(204);return res.end();}
   if(path==='/')return send(layout('A story worth opening',`<section class="welcome">${intro('THE QUIET BUOY · DEMO 000','Every conversation has a current.','An original coastal mystery. A little space to listen. A deliberate way to reveal what comes next.')}<a class="button" href="/login">Sign in to your workspace</a><p>Invited? Open the limited link provided by your organizer.</p><div class="tide-lines" aria-hidden="true"></div></section>`));
   if(path==='/login'||path==='/open'){
    const csrf=token();res.setHeader('Set-Cookie',cookie('preflight',csrf,900));
    return send(layout(path==='/login'?'Sign in':'Open invitation',intro(path==='/login'?'YOUR PRIVATE WORKSPACE':'YOUR INVITATION',path==='/login'?'Welcome back.':'Your story begins here.',path==='/login'?'Use your assigned account. Each workspace has its own permissions.':'This limited link opens only your approved invitation.')+`<section class="login card"><form method="post" action="${path}" ${path==='/open'?'id="invitation-exchange"':''}><input type="hidden" name="csrf" value="${csrf}">${path==='/login'?'<label>Username<input name="username" autocomplete="username" maxlength="100" required></label><label>Password<input name="password" type="password" autocomplete="current-password" maxlength="256" required></label><button>Sign in</button>':'<label>Invitation credential<input name="token" id="invitation-token" autocomplete="off" required></label><button>Open my invitation</button><p class="fine">If JavaScript is unavailable, paste the credential after the # in your link.</p>'}</form></section>`));
   }
   if(path==='/invitation'||path==='/presentation'||path==='/api/invitation'){
    const data=app.participant(c.invitation??'',path==='/presentation');return send(path==='/api/invitation'?JSON.stringify(data):layout(path==='/presentation'?'Participant-safe display':'Your invitation',invitationView(data,path==='/presentation')),200,path.startsWith('/api/')?'application/json':'text/html; charset=utf-8');
   }
   const media=path.match(/^\/media\/(\d+)\/(shore|clue)$/);if(media)return send(app.media(actor,c.invitation,Number(media[1]),media[2]!),200,'image/svg+xml');
   const a=needActor();const campaign=url.searchParams.get('campaign')??'quiet-buoy';
   if(path==='/workspace'){
    const grants=store.all<{campaign:string;role:Role}>('SELECT campaign,role FROM grants WHERE user_id=? AND revoked=0 AND expires>?',a.id,now());
    if(grants.length===1){const g=grants[0]!;return redirect((g.role==='facilitator'?'/briefings':g.role==='producer'?'/studio':g.role==='approver'?'/review':'/desk')+'?campaign='+encodeURIComponent(g.campaign));}
    return send(layout('Workspace',intro('YOUR ACCESS','Choose your workspace.','Access is checked on every request.')+`<div class="cards">${grants.map(g=>`<a class="card" href="${g.role==='facilitator'?'/briefings':g.role==='producer'?'/studio':g.role==='approver'?'/review':'/desk'}?campaign=${esc(g.campaign)}">${esc(g.role)} · ${esc(g.campaign)}</a>`).join('')||'<p>No current grants. Contact your organizer.</p>'}</div>`,a));
   }
   if(path==='/briefings'){
    app.allow(a,campaign,['facilitator']);const bs=store.all<Briefing>('SELECT * FROM briefings WHERE campaign=? AND facilitator=? ORDER BY CASE WHEN state=\'COMPLETED\' THEN 1 ELSE 0 END,id',campaign,a.id);
    return send(layout('Your briefings',briefingHome(app,a,bs),a));
   }
   const run=path.match(/^\/(run|api\/briefings)\/([A-Za-z0-9_-]+)$/);if(run){const b=app.briefing(run[2]!);app.assigned(a,b);app.approved(app.version(b.version));return send(run[1]==='run'?layout('Briefing runner',runner(app,a,b),a):JSON.stringify({briefing:b,story:app.story(app.version(b.version))}),200,run[1]==='run'?'text/html; charset=utf-8':'application/json');}
   if(path==='/studio'||path==='/review'){app.allow(a,campaign,path==='/studio'?['producer']:['approver']);return send(layout(path==='/studio'?'Campaign studio':'Version review',studio(app,a,campaign,path==='/review'),a));}
   const preview=path.match(/^\/preview\/(\d+)\/(participant|facilitator|investigator)$/);if(preview){
    const v=app.version(Number(preview[1]));app.allow(a,v.campaign,['producer','approver']);const s=app.story(v);const kind=preview[2];
    const safe=kind==='participant'?invitationView({title:s.title,premise:s.premise,teaser:s.teaser,scheduled:null,version:v.number,asset:`/media/${v.id}/shore`}):kind==='facilitator'?`<section class="letter"><h2>Private facilitation script</h2>${s.prompts.map((p,i)=>`<h3>Stage ${i+1}</h3><p>${esc(p)}</p>`).join('')}<p>${esc(s.clue)}</p></section>`:`<section class="letter"><h2>${esc(s.title)}</h2><p>${esc(s.evidence)}</p><p>${esc(s.resolution)}</p><img src="/media/${v.id}/clue" alt="Original fictional maintenance slate"></section>`;
    return send(layout('Audience preview',`<aside class="preview-banner">PRODUCTION PREVIEW · ${esc(kind)} ONLY · VERSION ${v.number} · ${esc(v.status)} · NOT A RELEASE</aside>`+safe,a));
   }
   if(path==='/desk'||path==='/api/evidence'){const items=app.investigator(a,campaign);return send(path==='/desk'?layout('Evidence desk',desk(app,a,campaign),a):JSON.stringify(items),200,path==='/desk'?'text/html; charset=utf-8':'application/json');}
   const exp=path.match(/^\/export\/(\d+)$/);if(exp){const release=store.get<{campaign:string;id:number}>('SELECT campaign,id FROM releases WHERE id=?',Number(exp[1]));if(!release)throw new Fault(404);const r=app.investigator(a,release.campaign).find(x=>x.id===release.id);if(!r||r.withdrawn)throw new Fault(404);return send(layout('Fictional evidence export',`<article class="letter print"><p class="eyebrow">FICTIONAL EVIDENCE ONLY · RELEASE ${r.id} · VERSION ${r.version}</p><h1>${esc(r.title)}</h1><p>${esc(r.evidence)}</p><h2>Resolution</h2><p>${esc(r.resolution)}</p><p>Released ${esc(new Date(r.created).toISOString())}</p><button data-print>Print or save as PDF</button></article>`,a));}
   throw new Fault(404);
  }catch(error){
   const fault=error instanceof Fault?error:new Fault(500,'This action could not be completed. Your last confirmed progress is safe.');
   if(!(error instanceof Fault))console.error('request_failed',error instanceof SyntaxError?'invalid_input':'internal');
   send(layout('Unable to continue',intro('PLEASE CHECK','Let’s find the way back.',fault.message)+`<section class="letter"><p>Status ${fault.status}. No successful action is implied.</p><a class="button" href="${actor?'/workspace':'/login'}">${actor?'Return to workspace':'Sign in'}</a><p>For an invitation, reopen the link provided by your organizer. Do not share private workspace screens.</p></section>`,actor),fault.status);
  }
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const origin=process.env.CURRENT_ORIGIN??'http://127.0.0.1:3000';const secure=new URL(origin).protocol==='https:';const host=process.env.CURRENT_HOST??'127.0.0.1';
 if(process.env.NODE_ENV==='production'&&!secure)throw new Error('Production requires a configured HTTPS origin and reverse proxy.');
 if(!secure&&!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('Plain HTTP is limited to localhost.');
 const store=new Store(process.env.CURRENT_DB??'data/current.sqlite');
 if(process.env.NODE_ENV==='production'&&store.get("SELECT id FROM organizations WHERE id='demo-org'"))throw new Error('Synthetic demonstration is blocked in production mode.');
 const server=application(store,{origin,secure});server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=50;
 server.listen(Number(process.env.PORT??3000),host,()=>console.log(`The Current local listener: ${origin}. Synthetic preview; no messages are sent.`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
}

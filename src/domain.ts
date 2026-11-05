// SPDX-License-Identifier: AGPL-3.0-only
import { Store, hash, now, token } from './store.js';
import { illustration, type Story, validateStory } from './content.js';
export type Role='producer'|'approver'|'facilitator'|'investigator';
export interface Actor {id:string; csrf:string;}
export interface Version { id:number; campaign:string; number:number; status:string; content:string; author:string; revision:number; }
export interface Briefing {id:string; campaign:string; version:number; facilitator:string; scheduled:string|null; state:string; stage:number; elapsed:number; running_since:number|null; revealed:number; revision:number;}
export interface Evidence {briefing:string; version:number; state:string; revision:number;}
export interface Invitation {id:string; briefing:string; version:number; audience:'participant'|'presentation'; expires:number; revoked:number;}
export class Fault extends Error { constructor(public status:number, message='This material is not available to this account.') { super(message); } }
export function requireThat(condition:unknown,status=409,message='This changed or is not ready. Reload and try again.'):asserts condition {if(!condition) throw new Fault(status,message);}
export class Current {
 constructor(readonly store:Store){}
 roles(actor:Actor,campaign:string):Role[] {return this.store.all<{role:Role}>('SELECT role FROM grants WHERE user_id=? AND campaign=? AND revoked=0 AND expires>?',actor.id,campaign,now()).map(x=>x.role);}
 allow(actor:Actor,campaign:string,roles:Role[]){if(!this.roles(actor,campaign).some(r=>roles.includes(r))) throw new Fault(404);}
 version(id:number):Version { const v=this.store.get<Version>('SELECT * FROM versions WHERE id=?',id); if(!v) throw new Fault(404); return v; }
 briefing(id:string):Briefing { const b=this.store.get<Briefing>('SELECT * FROM briefings WHERE id=?',id); if(!b) throw new Fault(404); return b; }
 assigned(actor:Actor,b:Briefing){this.allow(actor,b.campaign,['facilitator']);if(b.facilitator!==actor.id) throw new Fault(404);}
 approved(v:Version){requireThat(v.status==='PUBLISHED',403,'This story version is not available.');}
 event(actor:Actor,v:Version,action:string){this.store.run('INSERT INTO audit(campaign,actor,action,version,created) VALUES(?,?,?,?,?)',v.campaign,actor.id,action,v.id,now());}
 story(v:Version):Story{return JSON.parse(v.content) as Story;}
 invitation(raw:string,audience?:string){
  const inv=this.store.get<Invitation>('SELECT * FROM invitations WHERE token_hash=? AND revoked=0 AND expires>?',hash(raw),now());
  if(!inv || (audience&&inv.audience!==audience)) throw new Fault(410,'This invitation is unavailable, expired, or withdrawn. Ask your organizer for a replacement.');
  const b=this.briefing(inv.briefing);const v=this.version(inv.version);
  if(b.version!==inv.version||['CANCELLED','ABORTED'].includes(b.state)) throw new Fault(410,'This invitation is unavailable. Ask your organizer for a replacement.');
  this.approved(v);return {inv,b,v};
 }
 participant(raw:string,presentation=false){const {b,v}=this.invitation(raw,presentation?'presentation':'participant');const s=this.story(v);return {title:s.title,premise:s.premise,teaser:s.teaser,scheduled:b.scheduled,version:v.number,asset:`/media/${v.id}/shore`, ...(presentation&&b.revealed?{clue:s.clue,clueAsset:`/media/${v.id}/clue`}:{})};}
 media(actor:Actor|undefined,raw:string|undefined,id:number,kind:string){
  const v=this.version(id);if(kind!=='shore'&&kind!=='clue') throw new Fault(404);
  if(actor){
   const roles=this.roles(actor,v.campaign);
   const assigned=this.store.get<Briefing>('SELECT * FROM briefings WHERE version=? AND facilitator=?',id,actor.id);
   const released=this.store.get('SELECT id FROM releases WHERE version=?',id);
   const permitted=roles.includes('producer')||roles.includes('approver') || (roles.includes('facilitator')&&assigned&&v.status==='PUBLISHED') || (roles.includes('investigator')&&released&&v.status!=='REVOKED'&&kind==='clue');
   if(!permitted) throw new Fault(404);
  }else if(raw){const {inv,b}=this.invitation(raw);if(v.id!==inv.version || (kind==='clue'&&(inv.audience!=='presentation'||!b.revealed))) throw new Fault(404);}
  else throw new Fault(404);
  return illustration(kind);
 }
 investigator(actor:Actor,campaign:string){this.allow(actor,campaign,['investigator']);return this.store.all<{id:number;version:number;created:number;supersedes:number|null}>('SELECT id,version,created,supersedes FROM releases WHERE campaign=? ORDER BY id',campaign).map(r=>{const v=this.version(r.version);return {id:r.id,version:v.number,created:r.created,supersedes:r.supersedes,withdrawn:v.status==='REVOKED',...(v.status!=='REVOKED'?{title:this.story(v).title,evidence:this.story(v).evidence,resolution:this.story(v).resolution,asset:`/media/${v.id}/clue`}:{})};});}
 command(actor:Actor,action:string,id:string,revision:number,key:string,input:Record<string,string>={}){
  requireThat(key.length>=16&&key.length<=128,400);
  const sessionAction=['start','pause','resume','next','previous','reveal','complete','abort','invite','revoke-invites','prepare','approve-evidence','release'].includes(action);
  const b=sessionAction?this.briefing(id):undefined;
  const v=b?this.version(b.version):this.version(Number(id));
  const roles:Role[]= ['start','pause','resume','next','previous','reveal','complete','abort','invite','revoke-invites'].includes(action)?['facilitator']:['approve','publish','changes','revoke','approve-evidence','release'].includes(action)?['approver']:['producer'];
  this.allow(actor,v.campaign,roles);if(roles[0]==='facilitator'&&b) this.assigned(actor,b);
  const target=hash(JSON.stringify({action,id,revision,input}));
  return this.store.transaction(()=>{
   const receipt=this.store.get<{target:string}>('SELECT target FROM receipts WHERE actor=? AND key=?',actor.id,key);
   if(receipt){requireThat(receipt.target===target);return {repeated:true};}
   let issued:string|undefined;
   if(!sessionAction){
    requireThat(v.revision===revision);
    let state=v.status;
    if(action==='edit'){
     let value:unknown;try{value=JSON.parse(input.content??'null');}catch{throw new Fault(400,'The story content is invalid.');}requireThat(validateStory(value),400,'Complete all original story fields and six prompts.');
     requireThat(['DRAFT','CHANGES_REQUESTED'].includes(v.status));
     this.store.run('UPDATE versions SET content=?,revision=revision+1 WHERE id=?',JSON.stringify(value),v.id);
     this.updateAssets(v.id);
    }else if(action==='fork'){
     const number=this.store.get<{n:number}>('SELECT max(number)+1 n FROM versions WHERE campaign=?',v.campaign)!.n;
     const result=this.store.run("INSERT INTO versions(campaign,number,status,content,author) VALUES(?,?,'DRAFT',?,?)",v.campaign,number,v.content,actor.id);this.updateAssets(Number(result.lastInsertRowid));
     this.store.run('UPDATE versions SET revision=revision+1 WHERE id=?',v.id);
    }else{
     if(action==='review'){requireThat(['DRAFT','CHANGES_REQUESTED'].includes(state));requireThat(validateStory(this.story(v)),400);state='IN_REVIEW';}
     else if(action==='changes'){requireThat(state==='IN_REVIEW');state='CHANGES_REQUESTED';}
     else if(action==='approve'){requireThat(state==='IN_REVIEW');requireThat(v.author!==actor.id,403);state='APPROVED';this.approval(actor,v,'content');}
     else if(action==='publish'){requireThat(state==='APPROVED');requireThat(this.store.get('SELECT id FROM approvals WHERE version=? AND scope=?',v.id,'content'));state='PUBLISHED';this.store.run("UPDATE briefings SET state='READY',revision=revision+1 WHERE version=? AND state='SCHEDULED'",v.id);}
     else if(action==='revoke'){requireThat(['APPROVED','PUBLISHED'].includes(state));state='REVOKED';this.store.run('UPDATE invitations SET revoked=1 WHERE version=?',v.id);}
     else throw new Fault(400);
     this.store.run('UPDATE versions SET status=?,revision=revision+1 WHERE id=?',state,v.id);
    }
   }else if(b){
    this.approved(v);
    const e=this.store.get<Evidence>('SELECT * FROM evidence WHERE briefing=?',b.id);
    const evidenceAction=['approve-evidence','release'].includes(action);
    requireThat((evidenceAction?e?.revision:b.revision)===revision);
    if(['prepare','approve-evidence','release'].includes(action)){
     requireThat(b.state==='COMPLETED'&&b.revealed===1,409,'Complete the briefing and deliberately reveal its fictional clue first.');
     if(action==='prepare'){requireThat(!e);this.store.run("INSERT INTO evidence(briefing,version,state) VALUES(?,?,'READY_FOR_REVIEW')",b.id,v.id);this.store.run('UPDATE briefings SET revision=revision+1 WHERE id=?',b.id);}
     if(action==='approve-evidence'){requireThat(e?.state==='READY_FOR_REVIEW');requireThat(v.author!==actor.id,403);this.approval(actor,v,'evidence');this.store.run("UPDATE evidence SET state='APPROVED_FOR_RELEASE',revision=revision+1 WHERE briefing=?",b.id);}
     if(action==='release'){
      requireThat(e?.state==='APPROVED_FOR_RELEASE');requireThat(e.version===v.id);
      requireThat(this.store.get('SELECT id FROM approvals WHERE version=? AND scope=?',v.id,'evidence'));
      const prior=this.store.get<{id:number}>('SELECT id FROM releases WHERE campaign=? ORDER BY id DESC LIMIT 1',v.campaign);
      this.store.run('INSERT INTO releases(campaign,version,briefing,actor,created,supersedes) VALUES(?,?,?,?,?,?)',v.campaign,v.id,b.id,actor.id,now(),prior?.id??null);
      this.store.run("UPDATE evidence SET state='RELEASED',revision=revision+1 WHERE briefing=?",b.id);
     }
    }else if(action==='invite'){
     requireThat(['READY','ACTIVE','PAUSED'].includes(b.state));
     issued=token();const audience=input.audience==='presentation'?'presentation':'participant';
     this.store.run('INSERT INTO invitations(id,token_hash,briefing,version,audience,expires) VALUES(?,?,?,?,?,?)',token(),hash(issued),b.id,v.id,audience,now()+86400000);
     this.store.run('UPDATE briefings SET revision=revision+1 WHERE id=?',b.id);
    }else if(action==='revoke-invites'){
     this.store.run('UPDATE invitations SET revoked=1 WHERE briefing=?',b.id);this.store.run('UPDATE briefings SET revision=revision+1 WHERE id=?',b.id);
    }else{
     let state=b.state, stage=b.stage, elapsed=b.elapsed, running=b.running_since, revealed=b.revealed;
     if(action==='start'){requireThat(state==='READY');state='ACTIVE';running=now();}
     else if(action==='pause'){requireThat(state==='ACTIVE');elapsed+=Math.max(0,now()-(running??now()));running=null;state='PAUSED';}
     else if(action==='resume'){requireThat(state==='PAUSED');state='ACTIVE';running=now();}
     else if(action==='next'||action==='previous'){requireThat(['ACTIVE','PAUSED'].includes(state));stage=Math.max(0,Math.min(5,stage+(action==='next'?1:-1)));}
     else if(action==='reveal'){requireThat(state==='ACTIVE'&&stage===4&&input.confirm==='yes'&&!revealed);revealed=1;}
     else if(action==='complete'){requireThat(['ACTIVE','PAUSED'].includes(state)&&stage===5);if(running)elapsed+=Math.max(0,now()-running);running=null;state='COMPLETED';}
     else if(action==='abort'){requireThat(['ACTIVE','PAUSED','READY'].includes(state)&&input.confirm==='yes');state='ABORTED';running=null;this.store.run('UPDATE invitations SET revoked=1 WHERE briefing=?',b.id);}
     else throw new Fault(400);
     this.store.run('UPDATE briefings SET state=?,stage=?,elapsed=?,running_since=?,revealed=?,revision=revision+1 WHERE id=?',state,stage,elapsed,running,revealed,b.id);
    }
   }
   this.event(actor,v,action);this.store.run('INSERT INTO receipts(actor,key,target) VALUES(?,?,?)',actor.id,key,target);return {repeated:false,issued};
  });
 }
 approval(actor:Actor,v:Version,scope:string){this.store.run('INSERT INTO approvals(campaign,version,actor,scope,created) VALUES(?,?,?,?,?)',v.campaign,v.id,actor.id,scope,now());}
 updateAssets(version:number){for(const kind of ['shore','clue'] as const){const bytes=illustration(kind);this.store.run('INSERT OR REPLACE INTO assets(id,version,classification,provenance,rights,hash,bytes) VALUES(?,?,?,?,?,?,?)',`${version}-${kind}`,version,kind==='shore'?'approved invitation':'restricted fictional evidence','Original geometric SVG created for The Current','AGPL-3.0-only',hash(bytes),Buffer.byteLength(bytes));}}
}

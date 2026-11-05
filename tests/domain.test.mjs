import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,hash,token,now} from '../dist/store.js';
import {fixture,actor,command,publish,complete,release} from './helpers.mjs';

test('complete persisted lifecycle requires distinct manual events and exact version',()=>{
 const dir=mkdtempSync(join(tmpdir(),'current-'));const path=join(dir,'state.sqlite');const f=fixture(path);
 assert.throws(()=>command(f,'mira','start','demo-briefing'));
 assert.throws(()=>command(f,'rowan','approve'));
 publish(f);const link=command(f,'mira','invite','demo-briefing',{audience:'participant'}).issued;
 assert.equal(f.store.get('SELECT token_hash FROM invitations').token_hash,hash(link));
 const invitation=f.app.participant(link);assert.ok(!('clue' in invitation));assert.ok(!JSON.stringify(invitation).includes('Mara'));
 command(f,'mira','start','demo-briefing');command(f,'mira','next','demo-briefing');command(f,'mira','pause','demo-briefing');
 f.store.close();const resumed=new Store(path);f.store=resumed;f.app.store=resumed;
 assert.equal(f.app.briefing('demo-briefing').stage,1);assert.equal(f.app.briefing('demo-briefing').state,'PAUSED');
 command(f,'mira','resume','demo-briefing');for(let i=1;i<4;i++)command(f,'mira','next','demo-briefing');
 assert.equal(f.app.briefing('demo-briefing').revealed,0);assert.throws(()=>command(f,'mira','reveal','demo-briefing'));
 command(f,'mira','reveal','demo-briefing',{confirm:'yes'});assert.equal(f.app.investigator(actor('oren'),'quiet-buoy').length,0);
 command(f,'mira','next','demo-briefing');command(f,'mira','complete','demo-briefing');
 assert.equal(f.app.investigator(actor('oren'),'quiet-buoy').length,0);
 assert.throws(()=>command(f,'ellis','release','demo-briefing'));
 release(f);const records=f.app.investigator(actor('oren'),'quiet-buoy');assert.equal(records.length,1);assert.equal(records[0].version,1);assert.match(records[0].resolution,/not sabotage/);
 assert.throws(()=>command(f,'rowan','edit','1',{content:JSON.stringify({...f.app.story(f.app.version(1)),title:'A silently swapped version'})}));
 command(f,'rowan','fork');assert.equal(f.app.version(3).status,'DRAFT');assert.equal(f.app.briefing('demo-briefing').version,1);assert.equal(f.app.investigator(actor('oren'),'quiet-buoy')[0].version,1);
 for(const table of ['audit','approvals','releases']){assert.throws(()=>f.store.run(`DELETE FROM ${table}`));}
 f.store.close();rmSync(dir,{recursive:true});
});
test('all audience and tenant boundaries deny direct media, draft previews and guessed scope',()=>{
 const f=fixture();publish(f);const raw=command(f,'mira','invite','demo-briefing').issued;
 assert.throws(()=>f.app.media(undefined,raw,1,'clue'));
 assert.throws(()=>f.app.media(actor('oren'),undefined,1,'clue'));
 assert.throws(()=>f.app.media(actor('outsider'),undefined,1,'clue'));
 assert.throws(()=>f.app.media(actor('mira'),undefined,2,'shore'));
 assert.throws(()=>f.app.investigator(actor('oren'),'other-campaign'));
 assert.throws(()=>command(f,'rowan','publish','2'));
 assert.throws(()=>command(f,'rowan','start','demo-briefing'));
 assert.throws(()=>f.app.participant(token()));
 command(f,'mira','revoke-invites','demo-briefing');assert.throws(()=>f.app.media(undefined,raw,1,'shore'));
 f.store.close();
});
test('version-bound states, stale transitions, revocation, expiry and idempotency',()=>{
 const f=fixture();publish(f);
 const rev=f.app.briefing('demo-briefing').revision,key=token();command(f,'mira','start','demo-briefing',{},key,rev);
 assert.equal(command(f,'mira','start','demo-briefing',{},key,rev).repeated,true);
 assert.throws(()=>command(f,'mira','next','demo-briefing',{},key,rev));
 assert.throws(()=>command(f,'mira','pause','demo-briefing',{},token(),rev));
 f.store.run("UPDATE grants SET revoked=1 WHERE user_id='mira'");assert.throws(()=>command(f,'mira','pause','demo-briefing'));
 f.store.run("UPDATE grants SET revoked=0,expires=? WHERE user_id='mira'",now()-1);assert.throws(()=>command(f,'mira','pause','demo-briefing'));
 f.store.close();
});
test('double release is idempotent, different concurrent keys cannot create two records',async()=>{
 const f=fixture();publish(f);complete(f);command(f,'rowan','prepare','demo-briefing');command(f,'ellis','approve-evidence','demo-briefing');
 const rev=f.store.get('SELECT revision FROM evidence').revision;const key=token();
 const results=await Promise.allSettled([Promise.resolve().then(()=>command(f,'ellis','release','demo-briefing',{},key,rev)),Promise.resolve().then(()=>command(f,'ellis','release','demo-briefing',{},key,rev)),Promise.resolve().then(()=>command(f,'ellis','release','demo-briefing',{},token(),rev))]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'fulfilled');assert.equal(results[2].status,'rejected');assert.equal(f.store.get('SELECT count(*) n FROM releases').n,1);f.store.close();
});
test('reviewed content is immutable; invalid content rolls back; timer never reveals',()=>{
 const f=fixture();assert.throws(()=>command(f,'rowan','edit','1',{content:'{'}));assert.equal(f.app.version(1).revision,0);
 command(f,'rowan','review');assert.throws(()=>f.store.run('UPDATE versions SET content=? WHERE id=1','{}'));
 command(f,'ellis','changes');command(f,'rowan','edit','1',{content:JSON.stringify(f.app.story(f.app.version(1)))});command(f,'rowan','review');command(f,'ellis','approve');command(f,'ellis','publish');
 command(f,'mira','start','demo-briefing');f.store.run('UPDATE briefings SET running_since=?',now()-4*3600000);assert.equal(f.app.briefing('demo-briefing').revealed,0);assert.equal(f.app.briefing('demo-briefing').stage,0);assert.throws(()=>command(f,'mira','complete','demo-briefing'));
 command(f,'ellis','revoke');assert.throws(()=>command(f,'mira','next','demo-briefing'));f.store.close();
});

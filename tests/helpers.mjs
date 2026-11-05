import {Store, token} from '../dist/store.js';
import {seed} from '../dist/seed.js';
import {Current} from '../dist/domain.js';
import {application} from '../dist/server.js';
export const actor=id=>({id,csrf:'test-csrf'});
export function fixture(path=':memory:') {const store=new Store(path);const credentials=seed(store);return {store,credentials,app:new Current(store)};}
export function command(f,id,action,subject='1',input={},key=token(),revision) {
 const session=['start','pause','resume','next','previous','reveal','complete','abort','invite','revoke-invites','prepare','approve-evidence','release'].includes(action);
 const rev=revision??(['approve-evidence','release'].includes(action)?f.store.get('SELECT revision FROM evidence WHERE briefing=?',subject)?.revision:session?f.app.briefing(subject).revision:f.app.version(Number(subject)).revision);
 return f.app.command(actor(id),action,subject,rev,key,input);
}
export function publish(f){command(f,'rowan','review');command(f,'ellis','approve');command(f,'ellis','publish');}
export function complete(f){command(f,'mira','start','demo-briefing');for(let i=0;i<4;i++)command(f,'mira','next','demo-briefing');command(f,'mira','reveal','demo-briefing',{confirm:'yes'});command(f,'mira','next','demo-briefing');command(f,'mira','complete','demo-briefing');}
export function release(f){command(f,'rowan','prepare','demo-briefing');command(f,'ellis','approve-evidence','demo-briefing');command(f,'ellis','release','demo-briefing');}
export async function listen(f){const server=application(f.store,{origin:'http://127.0.0.1:3000',secure:false});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;return {server,origin,close:()=>new Promise(resolve=>server.close(resolve))};}
export class Client {
 constructor(origin){this.origin=origin;this.cookies={};}
 async request(path,options={}){const response=await fetch(this.origin+path,{redirect:'manual',...options,headers:{Cookie:Object.entries(this.cookies).map(([k,v])=>k+'='+v).join('; '),...options.headers}});for(const c of response.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');this.cookies[k]=v;}return response;}
 async login(user,password){const html=await (await this.request('/login')).text();const csrf=html.match(/name="csrf" value="([^"]+)"/)[1];const r=await this.post('/login',{username:user,password,csrf});return r;}
 post(path,data){return this.request(path,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(data)});}
 async invite(raw){const html=await (await this.request('/open')).text();const csrf=html.match(/name="csrf" value="([^"]+)"/)[1];return this.post('/open',{token:raw,csrf});}
}

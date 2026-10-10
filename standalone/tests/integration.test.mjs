import test,{after,before} from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'k791-integration-'))
const db=path.join(dir,'separate-791.db')
const ADMIN_PASSWORD='Owner791Test_Password_A!9'
let processHandle,base
const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))})})
base='http://127.0.0.1:'+port

before(async()=>{
 processHandle=spawn(process.execPath,['server/index.cjs'],{cwd:root,env:{...process.env,PORT:String(port),DB_PATH:db,ADMIN_PASSWORD,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']})
 let output='';processHandle.stderr.on('data',d=>{output+=d.toString()})
 for(let i=0;i<70;i++){if(processHandle.exitCode!==null)throw Error('Server exited: '+output);try{const r=await fetch(base+'/api/health');if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,150))}
 throw Error('Server did not start: '+output)
})
after(()=>{processHandle?.kill();fs.rmSync(dir,{recursive:true,force:true})})
async function req(url,{cookie,method='GET',body}={}){const headers={};if(cookie)headers.Cookie=cookie;if(body)headers['Content-Type']='application/json';const r=await fetch(base+url,{method,headers,body:body?JSON.stringify(body):undefined});const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
async function login(username,password){return req('/api/login',{method:'POST',body:{username,password}})}

test('five clients and exactly one independent owner, without private credentials exposed',async()=>{
 const unauth=await req('/api/admin/users')
 assert.equal(unauth.status,401)
 const owner=await login('spartan',ADMIN_PASSWORD)
 assert.equal(owner.status,200)
 assert.equal(owner.data.user.role,'admin')
 const users=await req('/api/admin/users',{cookie:owner.cookie})
 assert.equal(users.status,200)
 assert.deepEqual(users.data.users.map(x=>x.username).sort(),['charles','erika','jakey','polar','poofy','spartan'])
 assert.ok(!JSON.stringify(users.data).includes('hash'))
 assert.ok(!JSON.stringify(users.data).includes('salt'))
 assert.ok(!JSON.stringify(users.data).includes(ADMIN_PASSWORD))
 const initial=await req('/api/war-room/roster',{cookie:owner.cookie})
 assert.equal(initial.status,200)
 assert.deepEqual(initial.data.groups,[])
 assert.equal(initial.data.version,0)
})

test('five accounts receive private passwords and share only their own room',async()=>{
 const admin=(await login('spartan',ADMIN_PASSWORD)).cookie
 const credentials={poofy:'Poo_791_Client_Secure_01!',charles:'Cha_791_Client_Secure_02!',jakey:'Jak_791_Client_Secure_03!',polar:'Pol_791_Client_Secure_04!',erika:'Eri_791_Client_Secure_05!'}
 for(const [username,password] of Object.entries(credentials)){
  const r=await req('/api/admin/reset-password',{cookie:admin,method:'POST',body:{username,password}})
  assert.equal(r.status,200,username)
 }
 const accounts={}
 for(const [name,pw] of Object.entries(credentials)){const r=await login(name,pw);assert.equal(r.status,200,name);accounts[name]=r.cookie}
 const forbidden=await req('/api/admin/users',{cookie:accounts.poofy})
 assert.equal(forbidden.status,403)
 const userAlliance=await req('/api/me/alliance',{cookie:accounts.poofy,method:'POST',body:{alliance:'CUSTOM791'}})
 assert.equal(userAlliance.status,200)
 const profile=await req('/api/me',{cookie:accounts.poofy})
 assert.equal(profile.data.user.alliance,'CUSTOM791')
 const saved=await req('/api/war-room/roster',{cookie:accounts.poofy,method:'PUT',body:{version:0,groups:[{id:'r1',name:'Main rally',whales:[{id:'w1',name:'Poofy',march:'1:09',status:'Castle Garrison'}]}]}})
 assert.equal(saved.status,200)
 assert.equal(saved.data.version,1)
 const synced=await req('/api/war-room/roster',{cookie:accounts.erika})
 assert.equal(synced.status,200)
 assert.equal(synced.data.groups[0].whales[0].name,'Poofy')
 const conflict=await req('/api/war-room/roster',{cookie:accounts.charles,method:'PUT',body:{version:0,groups:[]}})
 assert.equal(conflict.status,409)
 assert.equal(conflict.data.version,1)
 const missing=await req('/api/war-room/roster')
 assert.equal(missing.status,401)
 const changed=await req('/api/me/password',{cookie:accounts.poofy,method:'POST',body:{currentPassword:credentials.poofy,newPassword:'Poofy_791_New_Password_A9!'}})
 assert.equal(changed.status,200)
 assert.equal((await login('poofy',credentials.poofy)).status,401)
 assert.equal((await login('poofy','Poofy_791_New_Password_A9!')).status,200)
 assert.equal((await login('shoni','any-password')).status,401)
 assert.equal((await login('panini','any-password')).status,401)
 assert.ok(fs.existsSync(db))
 assert.equal(path.basename(db),'separate-791.db')
})

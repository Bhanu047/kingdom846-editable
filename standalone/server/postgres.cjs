'use strict'
const express=require('express')
const compression=require('compression')
const crypto=require('crypto')
const path=require('path')
const {Pool}=require('pg')
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required in PostgreSQL mode')
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:5,connectionTimeoutMillis:12000,idleTimeoutMillis:30000})
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);app.use(compression());app.use(express.json({limit:'350kb'}))
const cookieName='k791_session',secure=process.env.NODE_ENV==='production',PORT=Number(process.env.PORT||10000)
const bootOk=p=>typeof p==='string'&&p.length>=9&&p.length<=256
const pwOk=p=>typeof p==='string'&&p.length>=9&&p.length<=256
const hash=(pw,salt)=>crypto.scryptSync(pw,salt,64).toString('hex')
const fp=p=>crypto.createHash('sha256').update(p).digest('hex')
const names=['Poofy','Charles','Jakey','Polar','Erika']
const parseCookie=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(c=>c.trim().split('=').slice(0,2)).filter(x=>x[0]&&x[1]))
const asyncHandler=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next)
async function setPassword(client,username,password){const salt=crypto.randomBytes(24).toString('hex');await client.query('UPDATE users SET salt=$1,hash=$2 WHERE username=$3',[salt,hash(password,salt),username])}
async function init(){
 await pool.query('SELECT 1')
 const c=await pool.connect()
 try{
  await c.query('BEGIN')
  await c.query("CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY, display_name TEXT NOT NULL, role TEXT NOT NULL, alliance TEXT NOT NULL DEFAULT '', salt TEXT NOT NULL, hash TEXT NOT NULL)")
  await c.query("CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,username TEXT NOT NULL REFERENCES users(username),expires BIGINT NOT NULL)")
  await c.query("CREATE TABLE IF NOT EXISTS war_room_state(id INTEGER PRIMARY KEY CHECK(id=1),data JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ, updated_by TEXT)")
  await c.query("CREATE TABLE IF NOT EXISTS app_settings(name TEXT PRIMARY KEY, value TEXT NOT NULL)")
  for(const name of names){const pw=crypto.randomBytes(32).toString('hex'),salt=crypto.randomBytes(24).toString('hex');await c.query('INSERT INTO users(username,display_name,role,alliance,salt,hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(username) DO NOTHING',[name.toLowerCase(),name,'member','',salt,hash(pw,salt)])}
  const exists=(await c.query("SELECT 1 FROM users WHERE username='spartan'")).rowCount>0
  const secret=process.env.ADMIN_PASSWORD
  if(!exists&&!bootOk(secret))throw Error('ADMIN_PASSWORD must be 9+ characters on initial PostgreSQL setup')
  if(!exists){const salt=crypto.randomBytes(24).toString('hex');await c.query('INSERT INTO users(username,display_name,role,alliance,salt,hash) VALUES($1,$2,$3,$4,$5,$6)',['spartan','Spartan','admin','',salt,hash(secret,salt)])}
  if(bootOk(secret)){
   const old=(await c.query("SELECT value FROM app_settings WHERE name='admin_bootstrap_fingerprint'")).rows[0]?.value
   const fingerprint=fp(secret)
   if(exists&&old!==fingerprint){await setPassword(c,'spartan',secret);await c.query("DELETE FROM sessions WHERE username='spartan'")}
   await c.query("INSERT INTO app_settings(name,value) VALUES('admin_bootstrap_fingerprint',$1) ON CONFLICT(name) DO UPDATE SET value=EXCLUDED.value",[fingerprint])
  }
  await c.query('COMMIT')
 }catch(err){await c.query('ROLLBACK');throw err}finally{c.release()}
}
const attempts=new Map()
function throttle(req,res,next){const key=(req.ip||'unknown')+':'+String(req.body?.username||'').toLowerCase();const now=Date.now();let x=attempts.get(key);if(!x||x.until<now)x={count:0,until:now+900000};if(x.count>=8)return res.status(429).json({error:'Too many attempts; try later'});x.count++;attempts.set(key,x);next()}
const auth=asyncHandler(async(req,res,next)=>{const token=parseCookie(req)[cookieName];if(!token)return res.status(401).json({error:'Please log in'});const rows=await pool.query('SELECT username FROM sessions WHERE token_hash=$1 AND expires>$2',[fp(token),Date.now()]);if(!rows.rowCount)return res.status(401).json({error:'Session expired'});const user=await pool.query('SELECT username,display_name,role,alliance FROM users WHERE username=$1',[rows.rows[0].username]);if(!user.rowCount)return res.status(401).json({error:'Account not found'});req.user=user.rows[0];req.sessionHash=fp(token);next()})
function owner(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Owner access required'});next()}
app.post('/api/login',throttle,asyncHandler(async(req,res)=>{const username=String(req.body?.username||'').toLowerCase().trim(),password=String(req.body?.password||'');const u=(await pool.query('SELECT * FROM users WHERE username=$1',[username])).rows[0];const actual=hash(password,u?.salt||'0'.repeat(48));if(!u||!crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(u.hash,'hex')))return res.status(401).json({error:'Invalid username or password'});const token=crypto.randomBytes(32).toString('hex');await pool.query('INSERT INTO sessions(token_hash,username,expires) VALUES($1,$2,$3)',[fp(token),u.username,Date.now()+7*86400000]);res.setHeader('Set-Cookie',cookieName+'='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800'+(secure?'; Secure':''));res.json({user:{username:u.username,display_name:u.display_name,role:u.role,alliance:u.alliance}})}))
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}))
app.post('/api/logout',auth,asyncHandler(async(req,res)=>{await pool.query('DELETE FROM sessions WHERE token_hash=$1',[req.sessionHash]);res.setHeader('Set-Cookie',cookieName+'=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(secure?'; Secure':''));res.json({ok:true})}))
app.get('/api/admin/users',auth,owner,asyncHandler(async(req,res)=>res.json({users:(await pool.query('SELECT username,display_name,role,alliance FROM users ORDER BY role,display_name')).rows})))
app.post('/api/admin/alliance',auth,owner,asyncHandler(async(req,res)=>{const u=String(req.body?.username||'').toLowerCase(),a=String(req.body?.alliance||'').trim().slice(0,60);const r=await pool.query('UPDATE users SET alliance=$1 WHERE username=$2',[a,u]);if(!r.rowCount)return res.status(404).json({error:'Unknown user'});res.json({ok:true})}))
app.post('/api/admin/reset-password',auth,owner,asyncHandler(async(req,res)=>{const u=String(req.body?.username||'').toLowerCase(),pw=req.body?.password;if(u==='spartan')return res.status(400).json({error:'Use change my password'});const found=await pool.query('SELECT 1 FROM users WHERE username=$1 AND role=$2',[u,'member']);if(!found.rowCount)return res.status(404).json({error:'Unknown member'});if(!pwOk(pw))return res.status(400).json({error:'Password must be 9–256 characters long'});const c=await pool.connect();try{await c.query('BEGIN');await setPassword(c,u,pw);await c.query('DELETE FROM sessions WHERE username=$1',[u]);await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}res.json({ok:true})}))
app.post('/api/me/alliance',auth,asyncHandler(async(req,res)=>{const a=String(req.body?.alliance||'').trim().slice(0,60);await pool.query('UPDATE users SET alliance=$1 WHERE username=$2',[a,req.user.username]);res.json({ok:true})}))
app.post('/api/me/password',auth,asyncHandler(async(req,res)=>{const u=(await pool.query('SELECT * FROM users WHERE username=$1',[req.user.username])).rows[0];if(!crypto.timingSafeEqual(Buffer.from(hash(String(req.body?.currentPassword||''),u.salt),'hex'),Buffer.from(u.hash,'hex')))return res.status(403).json({error:'Current password incorrect'});if(!pwOk(req.body?.newPassword))return res.status(400).json({error:'Password must be 9–256 characters long'});await setPassword(pool,u.username,req.body.newPassword);res.json({ok:true})}))
function cleanGroups(raw){if(!Array.isArray(raw))return [];return raw.slice(0,30).map((g,i)=>({id:String(g?.id||'group'+i).slice(0,64),name:String(g?.name||'Rally').slice(0,48),whales:(Array.isArray(g?.whales)?g.whales:[]).slice(0,250).map((w,j)=>({id:String(w?.id||j).slice(0,64),name:String(w?.name??'').slice(0,64),march:String(w?.march??'').slice(0,16),status:String(w?.status||'Undeployed').slice(0,60),alliance:String(w?.alliance??'').slice(0,60)}))}))}
const encode=r=>({groups:r?cleanGroups(r.data):[],version:r?.version||0,updated_at:r?.updated_at||null,updated_by:r?.updated_by||null})
async function read(client=pool){const r=(await client.query('SELECT data,version,updated_at,updated_by FROM war_room_state WHERE id=1')).rows[0];return encode(r)}
app.get('/api/war-room/roster',auth,asyncHandler(async(req,res)=>res.json(await read())))
app.put('/api/war-room/roster',auth,asyncHandler(async(req,res)=>{const groups=cleanGroups(req.body?.groups),c=await pool.connect();let conflict=false;try{await c.query('BEGIN');await c.query("INSERT INTO war_room_state(id,data,version) VALUES(1,'[]'::jsonb,0) ON CONFLICT(id) DO NOTHING");const current=(await c.query('SELECT version FROM war_room_state WHERE id=1 FOR UPDATE')).rows[0];if(req.body?.version!=null&&Number(req.body.version)!==current.version){conflict=true;await c.query('ROLLBACK')}else{await c.query('UPDATE war_room_state SET data=$1::jsonb,version=version+1,updated_at=NOW(),updated_by=$2 WHERE id=1',[JSON.stringify(groups),req.user.display_name]);await c.query('COMMIT')}}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}if(conflict)return res.status(409).json({error:'Someone else saved first',...await read()});res.json(await read())}))
setInterval(()=>pool.query('DELETE FROM sessions WHERE expires<$1',[Date.now()]).catch(()=>{}),3600000).unref()
app.get('/api/health',asyncHandler(async(req,res)=>{await pool.query('SELECT 1');res.json({ok:true,kingdom:791,database:'postgres'})}))
const dist=path.join(__dirname,'../dist');app.use(express.static(dist,{index:false}));app.get('/{*path}',(req,res)=>res.sendFile(path.join(dist,'index.html')))
app.use((err,req,res,next)=>{console.error('Kingdom791 PostgreSQL error:',err.message);if(!res.headersSent)res.status(503).json({error:'Database temporarily unavailable'})})
if(require.main===module || process.env.K791_BOOT==='1'){init().then(()=>app.listen(PORT,'0.0.0.0',()=>console.log('Kingdom791 persistent PostgreSQL War Room online'))).catch(err=>{console.error('PostgreSQL startup failed:',err.message);process.exit(1)})}
module.exports={app,pool,init}

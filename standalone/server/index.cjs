'use strict';
const express=require('express'),compression=require('compression'),Database=require('better-sqlite3'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const app=express();app.disable('x-powered-by');app.use(compression());app.use(express.json({limit:'350kb'}));
const PORT=Number(process.env.PORT||10000),dbPath=path.resolve(process.env.DB_PATH||path.join(__dirname,'../data/kingdom791.db'));fs.mkdirSync(path.dirname(dbPath),{recursive:true});const db=new Database(dbPath);db.pragma('journal_mode = WAL');db.pragma('busy_timeout = 5000');
db.exec("CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY,display_name TEXT NOT NULL,role TEXT NOT NULL,alliance TEXT DEFAULT '',salt TEXT NOT NULL,hash TEXT NOT NULL);CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,username TEXT NOT NULL,expires INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS war_room_state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,version INTEGER NOT NULL,updated_at TEXT,updated_by TEXT);");
const names=['Poofy','Charles','Jakey','Polar','Erika'];const validPw=p=>typeof p==='string'&&p.length>=11&&p.length<=256;
function digest(p,s){return crypto.scryptSync(p,s,64).toString('hex')}function setPassword(username,p){const salt=crypto.randomBytes(24).toString('hex');db.prepare('UPDATE users SET salt=?, hash=? WHERE username=?').run(salt,digest(p,salt),username)}
const insert=db.prepare('INSERT OR IGNORE INTO users(username,display_name,role,alliance,salt,hash) VALUES(?,?,?,?,?,?)');
for(const name of names){const p=crypto.randomBytes(32).toString('hex'),salt=crypto.randomBytes(24).toString('hex');insert.run(name.toLowerCase(),name,'member','',salt,digest(p,salt))}
// ADMIN_PASSWORD is a bootstrap/reset secret. Only apply it when it changes,
// so normal in-app password changes persist across process restarts.
db.exec("CREATE TABLE IF NOT EXISTS app_settings (name TEXT PRIMARY KEY, value TEXT NOT NULL)");
const bootPassword=process.env.ADMIN_PASSWORD;
const adminExists=db.prepare("SELECT 1 FROM users WHERE username='spartan'").get();
if(!adminExists && (!validPw(bootPassword)||bootPassword==='CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD')) throw Error('ADMIN_PASSWORD (11+ chars) required for initial owner creation');
if(!adminExists){
 const salt=crypto.randomBytes(24).toString('hex');
 insert.run('spartan','Spartan','admin','',salt,digest(bootPassword,salt));
}
if(validPw(bootPassword)){
 const fingerprint=crypto.createHash('sha256').update(bootPassword).digest('hex');
 const prior=db.prepare("SELECT value FROM app_settings WHERE name='admin_bootstrap_fingerprint'").get();
 if(!prior){
   // Fresh DB: the initial password was already installed above. An existing DB
   // upgraded from earlier code is also reset to the currently configured secret.
   if(adminExists) setPassword('spartan',bootPassword);
 } else if(prior.value!==fingerprint){
   setPassword('spartan',bootPassword);
   db.prepare("DELETE FROM sessions WHERE username='spartan'").run();
 }
 db.prepare("INSERT INTO app_settings(name,value) VALUES('admin_bootstrap_fingerprint',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").run(fingerprint);
}
const secure=process.env.NODE_ENV==='production',cookieName='k791_session';
function cookies(req){const c={};for(const seg of (req.headers.cookie||'').split(';')){const n=seg.indexOf('=');if(n>0)c[seg.slice(0,n).trim()]=seg.slice(n+1).trim()}return c}
function auth(req,res,next){const token=cookies(req)[cookieName];if(!token)return res.status(401).json({error:'Please log in'});const hash=crypto.createHash('sha256').update(token).digest('hex');const session=db.prepare('SELECT username FROM sessions WHERE token_hash=? AND expires>?').get(hash,Date.now());if(!session)return res.status(401).json({error:'Session expired'});const user=db.prepare('SELECT username,display_name,role,alliance FROM users WHERE username=?').get(session.username);if(!user)return res.status(401).json({error:'Account not found'});req.user=user;req.sessionHash=hash;next()}
function owner(req,res,next){if(req.user.role!=='admin')return res.status(403).json({error:'Owner access required'});next()}
const attempts=new Map();function throttle(req,res,next){const key=(req.ip||'unknown')+':'+String(req.body?.username||'').toLowerCase();const now=Date.now(),record=attempts.get(key)||{count:0,until:now+900000};if(record.until<now){record.count=0;record.until=now+900000}if(record.count>=8)return res.status(429).json({error:'Too many attempts; try later'});record.count++;attempts.set(key,record);next()}
app.post('/api/login',throttle,(req,res)=>{const username=String(req.body?.username||'').toLowerCase().trim(),password=req.body?.password;const u=db.prepare('SELECT * FROM users WHERE username=?').get(username);const placeholder='0'.repeat(128);const expected=u?.hash||placeholder,got=digest(String(password||''),u?.salt||'0'.repeat(48));if(!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(got,'hex'))||!u)return res.status(401).json({error:'Invalid username or password'});const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'),u.username,Date.now()+7*86400000);res.setHeader('Set-Cookie',cookieName+'='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800'+(secure?'; Secure':''));res.json({user:{username:u.username,display_name:u.display_name,role:u.role,alliance:u.alliance}})});
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));
app.post('/api/logout',auth,(req,res)=>{db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.sessionHash);res.setHeader('Set-Cookie',cookieName+'=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'+(secure?'; Secure':''));res.json({ok:true})});
app.get('/api/admin/users',auth,owner,(_req,res)=>res.json({users:db.prepare('SELECT username,display_name,role,alliance FROM users ORDER BY role,display_name').all()}));
app.post('/api/admin/alliance',auth,owner,(req,res)=>{const username=String(req.body?.username||'').toLowerCase();const alliance=String(req.body?.alliance||'').trim().slice(0,60);const result=db.prepare('UPDATE users SET alliance=? WHERE username=?').run(alliance,username);if(!result.changes)return res.status(404).json({error:'Unknown user'});res.json({ok:true})});
app.post('/api/admin/reset-password',auth,owner,(req,res)=>{const username=String(req.body?.username||'').toLowerCase();if(username==='spartan')return res.status(400).json({error:'Use change my password'});if(!db.prepare('SELECT 1 FROM users WHERE username=? AND role=?').get(username,'member'))return res.status(404).json({error:'Unknown member'});if(!validPw(req.body?.password))return res.status(400).json({error:'Use a password 11–256 characters long'});setPassword(username,req.body.password);db.prepare('DELETE FROM sessions WHERE username=?').run(username);res.json({ok:true})});
app.post('/api/me/alliance',auth,(req,res)=>{const alliance=String(req.body?.alliance||'').trim().slice(0,60);db.prepare('UPDATE users SET alliance=? WHERE username=?').run(alliance,req.user.username);res.json({ok:true})});
app.post('/api/me/password',auth,(req,res)=>{const u=db.prepare('SELECT * FROM users WHERE username=?').get(req.user.username);const got=digest(String(req.body?.currentPassword||''),u.salt);if(!crypto.timingSafeEqual(Buffer.from(got,'hex'),Buffer.from(u.hash,'hex')))return res.status(403).json({error:'Current password incorrect'});if(!validPw(req.body?.newPassword))return res.status(400).json({error:'Password must contain 11–256 characters'});setPassword(u.username,req.body.newPassword);res.json({ok:true})});
function cleanGroups(raw){if(!Array.isArray(raw))return [];return raw.slice(0,30).map((g,i)=>({id:String(g?.id||'group'+i).slice(0,64),name:String(g?.name||'Rally').slice(0,48),whales:(Array.isArray(g?.whales)?g.whales:[]).slice(0,250).map((w,j)=>({id:String(w?.id||j).slice(0,64),name:String(w?.name||'Player').slice(0,64),march:String(w?.march||'0:00').slice(0,16),status:String(w?.status||'Undeployed').slice(0,60)}))}))}
function read(){const r=db.prepare('SELECT * FROM war_room_state WHERE id=1').get();return {groups:r?cleanGroups(JSON.parse(r.data)):[],version:r?.version||0,updated_at:r?.updated_at||null,updated_by:r?.updated_by||null}}
app.get('/api/war-room/roster',auth,(_req,res)=>res.json(read()));
app.put('/api/war-room/roster',auth,(req,res)=>{const groups=cleanGroups(req.body?.groups);const saved=db.transaction(()=>{const current=read();if(req.body?.version!=null&&Number(req.body.version)!==current.version)return false;const updated_by=req.user.display_name;db.prepare("INSERT INTO war_room_state(id,data,version,updated_at,updated_by) VALUES(1,?,?,datetime('now'),?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,updated_by=excluded.updated_by").run(JSON.stringify(groups),current.version+1,updated_by);return true})();if(!saved)return res.status(409).json({error:'Someone else saved first',...read()});res.json(read())});
app.get('/api/health',(_req,res)=>res.json({ok:true,kingdom:791}));const dist=path.join(__dirname,'../dist');app.use(express.static(dist,{index:false}));app.get('/{*path}',(req,res)=>res.sendFile(path.join(dist,'index.html')));
if(require.main===module || process.env.K791_BOOT==='1')app.listen(PORT,'0.0.0.0',()=>console.log('Kingdom 791 private War Room listening on '+PORT));module.exports={app,db};

// ArtMarks check-in backend: Google Sheet (in your Drive) = database
const P=PropertiesService.getScriptProperties();
const SS=()=>SpreadsheetApp.getActive();
const NAME=/^[\p{L}\p{M}'.\-]+( [\p{L}\p{M}'.\-]+)+$/u;
const BAD=['mailinator.com','tempmail.com','10minutemail.com','guerrillamail.com','yopmail.com','trashmail.com','sharklasers.com','fakeinbox.com','throwaway.email'];
const okName=n=>NAME.test(n)&&n.length>=5&&n.length<=60&&n.split(' ').every(w=>w.length>=2)&&!/(.)\1{3,}/u.test(n);
const okPhone=p=>{const d=p.replace(/\D/g,'');return /^\+?\d{8,15}$/.test(p)&&!/^(\d)\1+$/.test(d)&&!/(0123|1234|2345|3456|4567|5678|6789)/.test(d)&&!(/^05/.test(p)&&p.length!=10)};
const okMail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)&&e.length<=80&&!BAD.includes(e.split('@')[1]);
const rnd=n=>Utilities.getUuid().replace(/-/g,'').slice(0,n);

function setup(){
  const s=SS();
  let ev=s.getSheetByName('Events')||s.insertSheet('Events');
  if(ev.getLastRow()==0)ev.appendRow(['id','name_ar','name_en','event_date','active','seq']);
  let vi=s.getSheetByName('Visitors')||s.insertSheet('Visitors');
  if(vi.getLastRow()==0)vi.appendRow(['event_id','serial','name','phone','email','ticket','created_at','checked_in_at']);
  ev.getRange('A:D').setNumberFormat('@');vi.getRange('A:A').setNumberFormat('@');vi.getRange('C:F').setNumberFormat('@');
  s.getSheets().forEach(x=>{if(!['Events','Visitors'].includes(x.getName())&&s.getSheets().length>2)s.deleteSheet(x)});
  if(!P.getProperty('ADMIN_PASS'))P.setProperty('ADMIN_PASS',rnd(10));
  if(!P.getProperty('GATE_PIN'))P.setProperty('GATE_PIN',String(100000+parseInt(rnd(6),16)%900000));
  Logger.log('ADMIN_PASS (كلمة مرور الإدارة): '+P.getProperty('ADMIN_PASS')+'\nGATE_PIN (رمز فريق البوابة): '+P.getProperty('GATE_PIN'));
  MailApp.getRemainingDailyQuota();
}
function doGet(){return ContentService.createTextOutput('ArtMarks check-in API')}
function doPost(e){let o;try{o=route(JSON.parse(e.postData.contents))}catch(x){o={ok:false,err:'server'}}
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
const fd=v=>v instanceof Date?Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd'):String(v);
function activeEvent(){const v=SS().getSheetByName('Events').getDataRange().getValues();
  for(let i=1;i<v.length;i++)if(v[i][4]===true||String(v[i][4]).toUpperCase()==='TRUE')return{row:i+1,id:String(v[i][0]),name_ar:v[i][1],name_en:v[i][2],event_date:fd(v[i][3]),seq:Number(v[i][5])||0};
  return null}
function route(d){
  const a=d.a,c=CacheService.getScriptCache();
  if(a==='event'){const ev=activeEvent();return{ok:true,ev:ev&&{name_ar:ev.name_ar,name_en:ev.name_en,event_date:ev.event_date}}}
  if(a==='send_code')return sendCode(d);
  if(a==='verify')return verify(d);
  if((+c.get('fail')||0)>30)return{ok:false,err:'locked'};
  const admin=!!d.pass&&d.pass===P.getProperty('ADMIN_PASS'),gate=admin||(!!d.pin&&d.pin===P.getProperty('GATE_PIN'));
  if(!gate){c.put('fail',(+c.get('fail')||0)+1,300);return{ok:false,err:'auth'}}
  if(a==='login')return{ok:true,role:admin?'admin':'gate'};
  if(a==='checkin')return checkin(String(d.ticket||''));
  if(a==='stats')return stats();
  if(!admin)return{ok:false,err:'auth'};
  const sh=SS().getSheetByName('Events');
  if(a==='events'){const v=sh.getDataRange().getValues().slice(1).map(r=>({id:String(r[0]),name_ar:r[1],name_en:r[2],event_date:fd(r[3]),active:r[4]===true||String(r[4]).toUpperCase()==='TRUE',seq:r[5]}));
    return{ok:true,events:v.reverse(),quota:MailApp.getRemainingDailyQuota(),brevo:!!P.getProperty('BREVO_KEY')}}
  if(a==='save_event'){const n1=String(d.name_ar||'').trim(),n2=String(d.name_en||'').trim(),dt=String(d.date||'');
    if(!n1||!n2||!/^\d{4}-\d{2}-\d{2}$/.test(dt))return{ok:false,err:'bad'};
    const n=sh.getLastRow();if(n>1)sh.getRange(2,5,n-1,1).setValue(false);
    sh.appendRow([Utilities.getUuid(),n1,n2,dt,true,0]);return{ok:true}}
  if(a==='activate'){const v=sh.getDataRange().getValues();let f=false;
    for(let i=1;i<v.length;i++){const m=String(v[i][0])===String(d.id);if(m)f=true;sh.getRange(i+1,5).setValue(m)}
    return{ok:f}}
  if(a==='visitors'){const ev=activeEvent();if(!ev)return{ok:true,rows:[]};
    const rows=SS().getSheetByName('Visitors').getDataRange().getValues().slice(1).filter(r=>String(r[0])===ev.id).map(r=>({serial:r[1],name:r[2],phone:r[3],email:r[4],registered:r[6],checked_in:r[7]}));
    return{ok:true,rows}}
  return{ok:false,err:'auth'}}
function mail(to,subject,body){
  const k=P.getProperty('BREVO_KEY');
  if(k){const r=UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email',{method:'post',contentType:'application/json',headers:{'api-key':k},muteHttpExceptions:true,
    payload:JSON.stringify({sender:{name:P.getProperty('SENDER_NAME')||'ArtMarks',email:P.getProperty('SENDER_EMAIL')},to:[{email:to}],subject:subject,textContent:body})});return r.getResponseCode()<300}
  MailApp.sendEmail({to:to,subject:subject,body:body,name:'ArtMarks | بصمات فن'});return true}
function sendCode(d){
  const ev=activeEvent();if(!ev)return{ok:false,err:'closed'};
  const name=String(d.name||'').trim().replace(/\s+/g,' '),phone=String(d.phone||'').replace(/[\s-]/g,''),email=String(d.email||'').trim().toLowerCase();
  if(!okName(name)||!okPhone(phone)||!okMail(email))return{ok:false,err:'bad'};
  const c=CacheService.getScriptCache(),mk='g'+Math.floor(Date.now()/60000),g=+c.get(mk)||0;
  if(g>40)return{ok:false,err:'busy'};c.put(mk,g+1,120);
  const rk='r'+email,r=+c.get(rk)||0;if(r>=5)return{ok:false,err:'rate'};c.put(rk,r+1,3600);
  if(!P.getProperty('BREVO_KEY')&&MailApp.getRemainingDailyQuota()<1)return{ok:false,err:'quota'};
  const code=String(100000+parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,8),16)%900000);
  c.put('c'+email,JSON.stringify({code:code,name:name,phone:phone,t:0}),600);
  const ok=mail(email,'ArtMarks | '+code,'رمز التحقق الخاص بك في بصمات فن: '+code+'\nصالح لمدة 10 دقائق.\n\nYour ArtMarks verification code: '+code+'\nValid for 10 minutes.');
  return ok?{ok:true}:{ok:false,err:'mail'}}
function verify(d){
  const email=String(d.email||'').trim().toLowerCase(),c=CacheService.getScriptCache(),k='c'+email,raw=c.get(k);
  if(!raw)return{ok:false,err:'code'};const o=JSON.parse(raw);
  if(o.t>=5){c.remove(k);return{ok:false,err:'code'}}
  if(String(d.code||'').trim()!==o.code){o.t++;c.put(k,JSON.stringify(o),600);return{ok:false,err:'code'}}
  c.remove(k);
  const L=LockService.getScriptLock();L.waitLock(20000);
  try{const ev=activeEvent();if(!ev)return{ok:false,err:'closed'};
    const sh=SS().getSheetByName('Visitors'),v=sh.getDataRange().getValues();let row=null;
    for(let i=1;i<v.length;i++)if(String(v[i][0])===ev.id&&String(v[i][4]).toLowerCase()===email){row=v[i];break}
    if(!row){const serial=ev.seq+1;SS().getSheetByName('Events').getRange(ev.row,6).setValue(serial);
      row=[ev.id,serial,o.name,o.phone,email,Utilities.getUuid(),new Date().toISOString(),''];sh.appendRow(row)}
    return{ok:true,card:{name:row[2],serial:row[1],ticket:String(row[5]),name_ar:ev.name_ar,name_en:ev.name_en,event_date:ev.event_date}}
  }finally{L.releaseLock()}}
function checkin(t){
  const L=LockService.getScriptLock();L.waitLock(10000);
  try{const ev=activeEvent();if(!ev)return{ok:true,status:'invalid'};
    const sh=SS().getSheetByName('Visitors'),v=sh.getDataRange().getValues();
    for(let i=1;i<v.length;i++)if(String(v[i][5])===t&&String(v[i][0])===ev.id){
      if(v[i][7])return{ok:true,status:'duplicate',name:v[i][2],serial:v[i][1]};
      sh.getRange(i+1,8).setValue(new Date().toISOString());return{ok:true,status:'ok',name:v[i][2],serial:v[i][1]}}
    return{ok:true,status:'invalid'}
  }finally{L.releaseLock()}}
function stats(){const ev=activeEvent();if(!ev)return{ok:true,total:0,inside:0};
  const v=SS().getSheetByName('Visitors').getDataRange().getValues().slice(1).filter(r=>String(r[0])===ev.id);
  return{ok:true,total:v.length,inside:v.filter(r=>r[7]).length}}

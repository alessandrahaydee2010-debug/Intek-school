const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000, KEY=process.env.DEVICE_KEY||'CAMBIAR_CLAVE_ANTES_DE_PUBLICAR';
const dbfile=path.join(__dirname,'data','registros.json');
let db={estudiantes:[],asistencias:[],energia:[],buses:{}};
try{db=JSON.parse(fs.readFileSync(dbfile,'utf8'))}catch{}
function save(){fs.writeFileSync(dbfile,JSON.stringify(db,null,2))}
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function body(req){return new Promise((ok,bad)=>{let s='';req.on('data',x=>{s+=x;if(s.length>20000){bad(Error('Demasiados datos'));req.destroy()}});req.on('end',()=>{try{ok(JSON.parse(s))}catch{bad(Error('JSON inválido'))}})})}
http.createServer(async(req,res)=>{let u=new URL(req.url,'http://localhost');
if(req.method==='GET'&&u.pathname==='/api/datos')return reply(res,200,db);
if(req.method==='POST'&&u.pathname.startsWith('/api/')){
 if(req.headers['x-device-key']!==KEY)return reply(res,401,{error:'Clave de dispositivo incorrecta'});
 try{const d=await body(req),fecha=new Date().toISOString();
 if(u.pathname==='/api/asistencia'){
  if(typeof d.codigo!=='string'||!d.codigo.trim())return reply(res,400,{error:'Falta codigo'});
  const alumno=db.estudiantes.find(x=>x.codigo===d.codigo.trim());
  const item={id:crypto.randomUUID(),codigo:d.codigo.trim(),estudiante:alumno?.nombre||'Código no registrado',grado:alumno?.grado||'',fecha,estado:alumno?'Registrado':'No identificado'};
  db.asistencias.unshift(item);db.asistencias=db.asistencias.slice(0,500);save();return reply(res,201,item)
 }
 if(u.pathname==='/api/energia'){
  const porcentaje=Number(d.porcentaje);
  if(!Number.isFinite(porcentaje)||porcentaje<0||porcentaje>100)return reply(res,400,{error:'Porcentaje entre 0 y 100'});
  const item={porcentaje,fecha};db.energia.unshift(item);db.energia=db.energia.slice(0,500);save();return reply(res,201,item)
 }
 if(u.pathname==='/api/bus'){
  if(!['bus1','bus2','bus3'].includes(d.bus)||typeof d.ubicacion!=='string')return reply(res,400,{error:'Bus o ubicación inválidos'});
  db.buses[d.bus]={ubicacion:d.ubicacion.slice(0,150),fecha};save();return reply(res,201,db.buses[d.bus])
 }
 if(u.pathname==='/api/estudiante'){
  if(typeof d.codigo!=='string'||typeof d.nombre!=='string'||!d.codigo.trim()||!d.nombre.trim())return reply(res,400,{error:'Nombre y código requeridos'});
  if(db.estudiantes.some(x=>x.codigo===d.codigo.trim()))return reply(res,409,{error:'Código repetido'});
  const item={codigo:d.codigo.trim().slice(0,40),nombre:d.nombre.trim().slice(0,100),grado:String(d.grado||'').slice(0,50)};db.estudiantes.push(item);save();return reply(res,201,item)
 }
 return reply(res,404,{error:'Ruta no encontrada'})
 }catch(e){return reply(res,400,{error:e.message})}
 }
 if(req.method!=='GET')return reply(res,405,{error:'Método no permitido'});
 const file=path.resolve(__dirname,'public','.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
 if(!file.startsWith(path.join(__dirname,'public')+path.sep))return reply(res,403,{error:'Acceso denegado'});
 fs.readFile(file,(err,content)=>{if(err)return reply(res,404,{error:'No encontrado'});const ext=path.extname(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript; charset=utf-8'})[ext]||'application/octet-stream'});res.end(content)})
}).listen(PORT,()=>console.log(`INTEK SCHOOL: http://localhost:${PORT}`));

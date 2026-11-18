/* Almacén de datos local (localStorage). Preparado para cambiar a un backend: todo pasa por Store. */
const TYPES={
  maq:{n:'Maquinaria pesada',ic:'🚜',u:'h',ruedas:true},
  volq:{n:'Volquete',ic:'🚛',u:'km',ruedas:true},
  cam:{n:'Camioneta',ic:'🛻',u:'km',ruedas:true},
  mini:{n:'Minibús',ic:'🚐',u:'km',ruedas:true},
  cagua:{n:'Cisterna de agua',ic:'💧',u:'km',ruedas:true},
  ccomb:{n:'Cisterna de combustible',ic:'⛽',u:'km',ruedas:true},
  gen:{n:'Generador',ic:'⚡',u:'h',ruedas:false},
  lum:{n:'Luminaria',ic:'💡',u:'h',ruedas:false}
};
const ROLES={operario:'Operario',supervisor:'Supervisor',admin:'Administrador'};
const KEY='mantoflota.v1';
let _mem=null;
const dstr=(d=new Date())=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return dstr(d)};
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);

const Store={
  d:null,
  load(){
    let raw=null;try{raw=localStorage.getItem(KEY)}catch(e){}
    try{this.d=raw?JSON.parse(raw):(_mem||null)}catch(e){this.d=null}
    if(!this.d||!this.d.equipos)this.d=this.seed();
    this.save();
  },
  save(){_mem=this.d;try{localStorage.setItem(KEY,JSON.stringify(this.d))}catch(e){}},
  id(p){return p+Math.random().toString(36).slice(2,9)},
  reset(demo){this.d=demo?this.seed():this.empty();this.save()},
  empty(){return{ver:1,session:'u1',users:[{id:'u1',nombre:'Administrador',rol:'admin'}],equipos:[],backlogs:[],planes:[],registros:[],neumaticos:[],lecturas:[]}},
  seed(){
    const t=dstr(),d=this.empty();
    d.users=[{id:'u1',nombre:'Admin',rol:'admin'},{id:'u2',nombre:'Carla (Supervisora)',rol:'supervisor'},{id:'u3',nombre:'Luis (Operario)',rol:'operario'}];
    const E=(id,cod,tipo,marca,modelo,placa,lec)=>({id,codigo:cod,tipo,marca,modelo,serie:'',placa,lectura:lec,lecFecha:t,estado:'ACTIVO'});
    d.equipos=[
      E('e1','EXC-01','maq','Caterpillar','336D','',8420),E('e2','CAR-02','maq','Komatsu','WA470','',5310),
      E('e3','VOL-01','volq','Volvo','FMX 440','ABC-123',184500),E('e4','VOL-02','volq','Mercedes','Actros 4144','BCD-234',221300),
      E('e5','CAM-01','cam','Toyota','Hilux 4x4','CDE-345',96400),E('e6','MIN-01','mini','Hyundai','H1 Minibus','DEF-456',142800),
      E('e7','CAG-01','cagua','Hino','FM 8000 · 10 m³','EFG-567',118900),E('e8','CCO-01','ccomb','Freightliner','M2 · 3000 gal','FGH-678',87600),
      E('e9','GEN-01','gen','Cummins','C150D5',' ',3980),E('e10','LUM-01','lum','Allmand','Night-Lite Pro','',2110)];
    const P=(id,eq,cat,nombre,cl,cd,ul,ud)=>({id,equipoId:eq,cat,nombre,cadaLec:cl,cadaDias:cd,ultLec:ul,ultFecha:ud,pend:null});
    d.planes=[
      P('p1','e1','PM','PM 250 h',250,90,8200,addDays(t,-40)),P('p2','e2','PM','PM 250 h',250,90,5030,addDays(t,-70)),
      P('p3','e3','PM','Servicio 10 000 km',10000,180,175000,addDays(t,-95)),P('p4','e4','PM','Servicio 10 000 km',10000,180,210000,addDays(t,-120)),
      P('p5','e5','PM','Servicio 5 000 km',5000,150,91700,addDays(t,-60)),P('p6','e6','PM','Servicio 5 000 km',5000,150,137000,addDays(t,-110)),
      P('p7','e9','PM','PM 250 h',250,120,3760,addDays(t,-45)),P('p8','e10','PM','PM 500 h',500,180,1700,addDays(t,-150)),
      P('p9','e1','GR','Engrase 10 h',10,2,8415,addDays(t,-1)),P('p10','e2','GR','Engrase 10 h',10,2,5290,addDays(t,-4)),
      P('p11','e3','GR','Engrase 1 000 km',1000,30,183900,addDays(t,-10)),P('p12','e4','GR','Engrase 1 000 km',1000,30,219900,addDays(t,-35)),
      P('p13','e7','GR','Engrase 1 000 km',1000,30,118200,addDays(t,-8)),P('p14','e8','GR','Engrase 1 000 km',1000,30,null,null)];
    const B=(id,eq,comp,desc,crit,est,dias)=>({id,codigo:'BK-'+id.slice(1).padStart(3,'0'),equipoId:eq,componente:comp,descripcion:desc,criticidad:crit,estado:est,fecha:addDays(t,-dias),resp:'',obs:''});
    d.backlogs=[
      B('b1','e1','Sistema hidráulico','Fuga de aceite en cilindro de brazo','ALTA','EN_PROCESO',6),
      B('b2','e3','Frenos','Cambio de pastillas eje delantero','ALTA','PENDIENTE',3),
      B('b3','e4','Suspensión','Ruido en muelle trasero izquierdo','MEDIA','PENDIENTE',12),
      B('b4','e6','Eléctrico','Luz de cabina intermitente','BAJA','PENDIENTE',20),
      B('b5','e7','Bomba de agua','Cambio de sello de bomba','MEDIA','PENDIENTE_VALIDACION',5),
      B('b6','e9','Panel de control','Alarma de temperatura sin lectura','MEDIA','PENDIENTE',2),
      B('b7','e5','Neumáticos','Rotación y alineamiento','BAJA','COMPLETADO',15)];
    const N=(id,cod,marca,med,est,eq,pos,mm)=>({id,codigo:cod,marca,medida:med,estado:est,equipoId:eq,posicion:pos,profundidad:mm});
    d.neumaticos=[
      N('n1','NEU-001','Michelin','295/80R22.5','MONTADO','e3','Del. izquierdo',11),N('n2','NEU-002','Michelin','295/80R22.5','MONTADO','e3','Del. derecho',6),
      N('n3','NEU-003','Bridgestone','265/70R16','MONTADO','e5','Del. izquierdo',8),N('n4','NEU-004','Goodyear','295/80R22.5','STOCK','',' ',16),
      N('n5','NEU-005','Pirelli','23.5R25','STOCK','','',22),N('n6','NEU-006','Michelin','295/80R22.5','RECAPADO','','',4),N('n7','NEU-007','Firestone','11R22.5','DESCARTADO','','',2)];
    return d;
  },
  eq(id){return this.d.equipos.find(e=>e.id===id)},
  user(){return this.d.users.find(u=>u.id===this.d.session)||this.d.users[0]},
  eqName(id){const e=this.eq(id);return e?e.codigo+' · '+e.marca+' '+e.modelo:'—'},
  /* Estado de un plan (preventivo o engrase) según lectura y días */
  planState(p){
    const e=this.eq(p.equipoId);if(!e)return{s:'SINREG',txt:'Equipo no existe'};
    if(p.pend)return{s:'POR_VALIDAR',txt:'Pendiente de validación'};
    if(!p.ultFecha)return{s:'SINREG',txt:'Sin registro'};
    const u=TYPES[e.tipo].u,t=dstr();
    let remL=p.cadaLec?p.ultLec+p.cadaLec-e.lectura:null;
    let remD=p.cadaDias?daysBetween(t,addDays(p.ultFecha,p.cadaDias)):null;
    const lowL=remL!==null&&p.cadaLec&&remL<=p.cadaLec*0.1,lowD=remD!==null&&remD<=Math.min(7,Math.ceil(p.cadaDias*0.15));
    let s='AL_DIA';
    if((remL!==null&&remL<=0)||(remD!==null&&remD<0))s='VENCIDO';else if(lowL||lowD)s='PROXIMO';
    const parts=[];
    if(remL!==null)parts.push(remL<=0?`vencido por ${fmt(-remL)} ${u}`:`faltan ${fmt(remL)} ${u}`);
    if(remD!==null)parts.push(remD<0?`${-remD} d de retraso`:`${remD} d`);
    const pct=Math.max(0,Math.min(100,Math.max(remL!==null&&p.cadaLec?100-remL/p.cadaLec*100:0,remD!==null&&p.cadaDias?100-remD/p.cadaDias*100:0)));
    return{s,txt:parts.join(' · '),pct,remL,remD};
  }
};
const fmt=n=>(n==null||n==='')?'—':Number(n).toLocaleString('es-PE');

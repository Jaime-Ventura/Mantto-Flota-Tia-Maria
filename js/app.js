/* MantoFlota · lógica y vistas */
const TABS=[['dash','📊','Inicio'],['back','🔧','Backlogs'],['pm','🗓️','Preventivos'],['gr','🛢️','Engrase'],['tr','🛞','Neumáticos'],['fleet','🚜','Equipos'],['rep','📝','Reportes'],['sup','🛡️','Supervisor'],['adm','⚙️','Admin']];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const filt={back:{q:'',e:'',c:''},pm:{q:'',e:''},gr:{q:'',e:''},tr:{q:'',e:''},fleet:{q:'',t:''},rep:{k:'flota'}};
let cur='dash';

const can={
  validate:()=>Store.user().rol!=='operario',
  del:()=>Store.user().rol!=='operario',
  admin:()=>Store.user().rol==='admin'
};
const uName=e=>TYPES[e.tipo].u;
const tipoOpts=()=>Object.entries(TYPES).map(([k,v])=>[k,v.ic+' '+v.n]);
const eqOpts=(filter=()=>true)=>Store.d.equipos.filter(filter).map(e=>[e.id,Store.eqName(e.id)]);
const match=(q,...f)=>!q||f.some(x=>norm(x).includes(norm(q)));
const sortBy=(a,f)=>a.slice().sort((x,y)=>f(x)<f(y)?-1:f(x)>f(y)?1:0);
const rank={VENCIDO:0,PROXIMO:1,SINREG:2,POR_VALIDAR:3,AL_DIA:4};

const A={
  go(t){
    if((t==='sup'&&!can.validate())||(t==='adm'&&!can.admin()))t='dash';
    cur=t;try{history.replaceState(null,'','#'+t)}catch(e){}render();window.scrollTo(0,0);
  },
  setF(view,k,v){filt[view][k]=v;renderView(true)},
  /* ---------- Lecturas ---------- */
  reading(eid){
    const eqs=Store.d.equipos.filter(e=>e.estado!=='BAJA_EQ');if(!eqs.length)return UI.toast('Primero registra un equipo');
    const sel=eid||eqs[0].id;
    UI.form('Registrar lectura (horómetro / odómetro)',[
      {k:'eq',l:'Equipo',t:'select',opts:eqOpts(e=>e.estado!=='BAJA_EQ'),v:sel,req:true},
      {k:'lec',l:'Lectura actual (km u horas según el equipo)',t:'number',req:true,v:Store.eq(sel).lectura},
      {k:'fecha',l:'Fecha',t:'date',v:dstr(),req:true}],o=>{
      const e=Store.eq(o.eq);if(o.lec<e.lectura){UI.toast(`La lectura no puede bajar de ${fmt(e.lectura)} ${uName(e)}`);return false}
      e.lectura=o.lec;e.lecFecha=o.fecha;Store.d.lecturas.push({id:Store.id('l'),equipoId:e.id,lectura:o.lec,fecha:o.fecha,por:Store.user().nombre});
      Store.save();UI.toast('Lectura guardada');render()});
    const s=$('f_eq');s.onchange=()=>{$('f_lec').value=Store.eq(s.value).lectura};
  },
  quick(){
    UI.open(`<h3>Registro rápido</h3><div class="stack" style="margin-top:.75rem">
      <button class="btn" style="width:100%;text-align:left" onclick="UI.close();A.reading()">⏱️ Registrar lectura (horómetro/odómetro)</button>
      <button class="btn" style="width:100%;text-align:left" onclick="UI.close();A.backForm()">🔧 Nuevo backlog (falla / pendiente)</button>
      <button class="btn" style="width:100%;text-align:left" onclick="UI.close();A.planPick('GR')">🛢️ Registrar engrase realizado</button>
      <button class="btn" style="width:100%;text-align:left" onclick="UI.close();A.planPick('PM')">🗓️ Registrar mantenimiento preventivo realizado</button>
      <button class="btn" style="width:100%;margin-top:.5rem" onclick="UI.close()">Cerrar</button></div>`);
  },
  /* ---------- Equipos ---------- */
  fleetForm(id){
    const e=id?Store.eq(id):{tipo:'maq',estado:'ACTIVO',lectura:0};
    UI.form(id?'Editar equipo':'Nuevo equipo',[
      {k:'codigo',l:'Código interno',req:true,v:e.codigo,ph:'EXC-01'},{k:'tipo',l:'Tipo',t:'select',opts:tipoOpts(),v:e.tipo,req:true},
      {k:'marca',l:'Marca',v:e.marca,req:true},{k:'modelo',l:'Modelo',v:e.modelo},{k:'serie',l:'N° de serie',v:e.serie},{k:'placa',l:'Placa',v:e.placa},
      {k:'lectura',l:'Lectura actual (km u horas)',t:'number',v:e.lectura,req:true},
      {k:'estado',l:'Estado',t:'select',opts:[['ACTIVO','Activo'],['TALLER','En taller'],['BAJA_EQ','De baja']],v:e.estado}],o=>{
      if(Store.d.equipos.some(x=>x.id!==id&&norm(x.codigo)===norm(o.codigo))){UI.toast('Ya existe ese código');return false}
      if(id)Object.assign(e,o);else Store.d.equipos.push({id:Store.id('e'),lecFecha:dstr(),...o});
      Store.save();render();UI.toast('Equipo guardado')});
  },
  fleetDel(id){UI.confirm('¿Eliminar el equipo y todo su historial (backlogs, planes, neumáticos montados)?',()=>{
    const d=Store.d;d.equipos=d.equipos.filter(e=>e.id!==id);d.backlogs=d.backlogs.filter(b=>b.equipoId!==id);d.planes=d.planes.filter(p=>p.equipoId!==id);
    d.registros=d.registros.filter(r=>r.equipoId!==id);d.neumaticos.forEach(n=>{if(n.equipoId===id){n.equipoId='';n.estado='STOCK'}});Store.save();render()},'Eliminar')},
  detail(id){
    const e=Store.eq(id);if(!e)return;const T=TYPES[e.tipo],pl=Store.d.planes.filter(p=>p.equipoId===id),bk=Store.d.backlogs.filter(b=>b.equipoId===id&&b.estado!=='COMPLETADO'),tr=Store.d.neumaticos.filter(n=>n.equipoId===id);
    UI.open(`<div class="row"><h3>${T.ic} ${esc(e.codigo)}</h3>${UI.pill(e.estado)}</div>
      <p class="mut" style="margin:.25rem 0">${esc(T.n)} · ${esc(e.marca)} ${esc(e.modelo)}${e.placa.trim()?' · Placa '+esc(e.placa):''}${e.serie?' · Serie '+esc(e.serie):''}</p>
      <p><b>${fmt(e.lectura)} ${uName(e)}</b> <small>(actualizado ${esc(e.lecFecha)})</small></p>
      <h3 style="margin-top:.8rem">Planes</h3>${pl.length?pl.map(p=>{const s=Store.planState(p);return `<div class="row" style="padding:.25rem 0"><span>${p.cat==='GR'?'🛢️':'🗓️'} ${esc(p.nombre)}</span><span>${UI.pill(s.s)} <small>${esc(s.txt)}</small></span></div>`}).join(''):'<p class="mut">Sin planes.</p>'}
      <h3 style="margin-top:.8rem">Backlogs abiertos</h3>${bk.length?bk.map(b=>`<div class="row" style="padding:.25rem 0"><span>${esc(b.codigo)} · ${esc(b.componente)}</span>${UI.pill(b.criticidad)}</div>`).join(''):'<p class="mut">Ninguno.</p>'}
      ${T.ruedas?`<h3 style="margin-top:.8rem">Neumáticos montados</h3>${tr.length?tr.map(n=>`<div class="row" style="padding:.25rem 0"><span>${esc(n.codigo)} · ${esc(n.posicion)}</span><small>${n.profundidad??'—'} mm</small></div>`).join(''):'<p class="mut">Ninguno.</p>'}`:''}
      <div class="row" style="margin-top:1rem"><span><button class="btn sm" onclick="UI.close();A.reading('${e.id}')">⏱️ Lectura</button> <button class="btn sm" onclick="UI.close();A.planForm('PM','','${e.id}')">+ Plan</button></span>
      <span><button class="btn sm" onclick="UI.close();A.fleetForm('${e.id}')">Editar</button> ${can.del()?`<button class="btn sm bad" onclick="UI.close();A.fleetDel('${e.id}')">Eliminar</button>`:''} <button class="btn sm" onclick="UI.close()">Cerrar</button></span></div>`);
  },
  importForm(){
    UI.open(`<h3>Importar equipos (CSV)</h3><p class="mut">Columnas: <code>codigo, tipo, marca, modelo, serie, placa, lectura</code>. Tipos válidos: ${Object.entries(TYPES).map(([k,v])=>`<code>${k}</code> (${esc(v.n)})`).join(', ')}. En Excel, guarda como "CSV".</p>
      <div class="fld"><input type="file" id="csvf" accept=".csv,text/csv,text/plain"></div>
      <div class="row" style="margin-top:1rem"><button class="btn" onclick="A.csvTemplate()">Descargar plantilla</button><span><button class="btn" onclick="UI.close()">Cancelar</button> <button class="btn pri" id="csv-go">Importar</button></span></div>`);
    $('csv-go').onclick=async()=>{
      const f=$('csvf').files[0];if(!f)return UI.toast('Elige un archivo');
      const rows=UI.parseCsv(await f.text());if(rows.length<2)return UI.toast('El archivo está vacío');
      const h=rows[0].map(norm),ix=k=>h.indexOf(k);if(ix('codigo')<0)return UI.toast('Falta la columna "codigo"');
      const byName={};Object.entries(TYPES).forEach(([k,v])=>{byName[norm(k)]=k;byName[norm(v.n)]=k});
      let ok=0,skip=0;
      rows.slice(1).forEach(r=>{const g=k=>ix(k)<0?'':(r[ix(k)]||'').trim(),cod=g('codigo'),tipo=byName[norm(g('tipo'))];
        if(!cod||!tipo||Store.d.equipos.some(e=>norm(e.codigo)===norm(cod))){skip++;return}
        Store.d.equipos.push({id:Store.id('e'),codigo:cod,tipo,marca:g('marca'),modelo:g('modelo'),serie:g('serie'),placa:g('placa'),lectura:Number(g('lectura').replace(',','.'))||0,lecFecha:dstr(),estado:'ACTIVO'});ok++});
      Store.save();UI.close();render();UI.toast(`Importados: ${ok}. Omitidos: ${skip}`)};
  },
  csvTemplate(){UI.download('plantilla_equipos.csv',UI.csv([['codigo','tipo','marca','modelo','serie','placa','lectura'],['EXC-05','maq','Caterpillar','320D','CAT123','','1500'],['CAM-09','cam','Toyota','Hilux','','XYZ-123','45000']]),'text/csv')},
  /* ---------- Backlogs ---------- */
  backForm(id){
    if(!Store.d.equipos.length)return UI.toast('Primero registra un equipo');
    const b=id?Store.d.backlogs.find(x=>x.id===id):{criticidad:'MEDIA',estado:'PENDIENTE',fecha:dstr(),equipoId:Store.d.equipos[0].id};
    UI.form(id?'Editar backlog':'Nuevo backlog',[
      {k:'equipoId',l:'Equipo',t:'select',opts:eqOpts(),v:b.equipoId,req:true},{k:'componente',l:'Componente / sistema',v:b.componente,req:true,ph:'Frenos, hidráulico, eléctrico…'},
      {k:'descripcion',l:'Descripción de la falla o trabajo',t:'textarea',v:b.descripcion,req:true},
      {k:'criticidad',l:'Criticidad',t:'select',opts:[['ALTA','Alta'],['MEDIA','Media'],['BAJA','Baja']],v:b.criticidad},
      {k:'fecha',l:'Fecha detectado',t:'date',v:b.fecha,req:true},{k:'resp',l:'Responsable',v:b.resp},{k:'obs',l:'Observaciones',t:'textarea',v:b.obs}],o=>{
      if(id)Object.assign(b,o);else{const n=Store.d.backlogs.reduce((m,x)=>Math.max(m,parseInt(x.codigo.slice(3))||0),0)+1;Store.d.backlogs.push({id:Store.id('b'),codigo:'BK-'+String(n).padStart(3,'0'),estado:'PENDIENTE',...o})}
      Store.save();render();UI.toast('Backlog guardado')});
  },
  backState(id,est){
    const b=Store.d.backlogs.find(x=>x.id===id);if(!b)return;
    if(est==='COMPLETADO'&&!can.validate())est='PENDIENTE_VALIDACION';
    b.estado=est;if(est==='COMPLETADO'||est==='PENDIENTE_VALIDACION')b.cierre=dstr();Store.save();render();
    UI.toast(est==='PENDIENTE_VALIDACION'?'Enviado al supervisor para validar':'Estado actualizado');
  },
  backDel(id){UI.confirm('¿Eliminar este backlog?',()=>{Store.d.backlogs=Store.d.backlogs.filter(b=>b.id!==id);Store.save();render()},'Eliminar')},
  /* ---------- Planes (preventivos / engrase) ---------- */
  planForm(cat,id,eid){
    if(!Store.d.equipos.length)return UI.toast('Primero registra un equipo');
    const p=id?Store.d.planes.find(x=>x.id===id):{cat,equipoId:eid||Store.d.equipos[0].id,nombre:'',cadaLec:null,cadaDias:null,ultLec:null,ultFecha:''};
    UI.form((id?'Editar plan ':'Nuevo plan ')+(p.cat==='GR'?'de engrase':'preventivo'),[
      {k:'equipoId',l:'Equipo',t:'select',opts:eqOpts(),v:p.equipoId,req:true},{k:'cat',l:'Tipo de plan',t:'select',opts:[['PM','Mantenimiento preventivo'],['GR','Engrase']],v:p.cat},
      {k:'nombre',l:'Nombre del plan',v:p.nombre,req:true,ph:'PM 250 h / Servicio 10 000 km'},
      {k:'cadaLec',l:'Cada (km u horas) — opcional',t:'number',v:p.cadaLec},{k:'cadaDias',l:'Cada (días) — opcional',t:'number',v:p.cadaDias},
      {k:'ultLec',l:'Última lectura en que se hizo',t:'number',v:p.ultLec},{k:'ultFecha',l:'Fecha del último servicio',t:'date',v:p.ultFecha}],o=>{
      if(!o.cadaLec&&!o.cadaDias){UI.toast('Indica un intervalo por uso o por días');return false}
      if(o.ultFecha&&o.ultLec==null)o.ultLec=Store.eq(o.equipoId).lectura;
      if(id)Object.assign(p,o);else Store.d.planes.push({id:Store.id('p'),pend:null,...o});
      Store.save();render();UI.toast('Plan guardado')});
  },
  planPick(cat){
    const pl=Store.d.planes.filter(p=>p.cat===cat&&Store.eq(p.equipoId));if(!pl.length)return UI.toast('No hay planes de este tipo. Crea uno primero.');
    UI.form(cat==='GR'?'Registrar engrase':'Registrar mantenimiento',[{k:'p',l:'Plan / equipo',t:'select',opts:pl.map(p=>[p.id,Store.eqName(p.equipoId)+' — '+p.nombre]),req:true}],o=>{setTimeout(()=>A.planDone(o.p),0)},'Continuar');
  },
  planDone(id){
    const p=Store.d.planes.find(x=>x.id===id),e=Store.eq(p.equipoId);
    UI.form(`Registrar: ${p.nombre} · ${e.codigo}`,[
      {k:'fecha',l:'Fecha de realización',t:'date',v:dstr(),req:true},{k:'lec',l:`Lectura (${uName(e)})`,t:'number',v:e.lectura,req:true},{k:'obs',l:'Trabajo realizado / observaciones',t:'textarea'}],o=>{
      const r={id:Store.id('r'),planId:p.id,equipoId:e.id,cat:p.cat,nombre:p.nombre,fecha:o.fecha,lectura:o.lec,obs:o.obs,por:Store.user().nombre,estado:'COMPLETADO'};
      if(o.lec>e.lectura){e.lectura=o.lec;e.lecFecha=o.fecha}
      if(can.validate()){p.ultLec=o.lec;p.ultFecha=o.fecha;p.pend=null}else{r.estado='PENDIENTE_VALIDACION';p.pend=r.id}
      Store.d.registros.push(r);Store.save();render();UI.toast(r.estado==='COMPLETADO'?'Registrado':'Enviado al supervisor para validar')});
  },
  planDel(id){UI.confirm('¿Eliminar este plan?',()=>{Store.d.planes=Store.d.planes.filter(p=>p.id!==id);Store.save();render()},'Eliminar')},
  /* ---------- Validación ---------- */
  regOk(id){const r=Store.d.registros.find(x=>x.id===id),p=Store.d.planes.find(x=>x.id===r.planId);r.estado='COMPLETADO';r.valida=Store.user().nombre;if(p){p.ultLec=r.lectura;p.ultFecha=r.fecha;p.pend=null}Store.save();render();UI.toast('Validado')},
  regNo(id){const r=Store.d.registros.find(x=>x.id===id),p=Store.d.planes.find(x=>x.id===r.planId);r.estado='RECHAZADO';if(p)p.pend=null;Store.save();render();UI.toast('Rechazado')},
  /* ---------- Neumáticos ---------- */
  tireForm(id){
    const n=id?Store.d.neumaticos.find(x=>x.id===id):{estado:'STOCK',equipoId:'',posicion:''};
    UI.form(id?'Editar neumático':'Nuevo neumático',[
      {k:'codigo',l:'Código / serie',v:n.codigo,req:true},{k:'marca',l:'Marca',v:n.marca,req:true},{k:'medida',l:'Medida',v:n.medida,ph:'295/80R22.5'},
      {k:'estado',l:'Estado',t:'select',opts:[['STOCK','En stock'],['MONTADO','Montado'],['RECAPADO','En recapado'],['DESCARTADO','Descartado']],v:n.estado},
      {k:'equipoId',l:'Equipo (si está montado)',t:'select',opts:[['','— ninguno —'],...eqOpts(e=>TYPES[e.tipo].ruedas)],v:n.equipoId},
      {k:'posicion',l:'Posición',v:n.posicion,ph:'Del. izquierdo, Tras. 2…'},{k:'profundidad',l:'Profundidad de labrado (mm)',t:'number',v:n.profundidad}],o=>{
      if(o.estado==='MONTADO'&&!o.equipoId){UI.toast('Elige el equipo donde está montado');return false}
      if(o.estado!=='MONTADO'){o.equipoId='';o.posicion=''}
      if(id)Object.assign(n,o);else Store.d.neumaticos.push({id:Store.id('n'),...o});Store.save();render();UI.toast('Neumático guardado')});
  },
  tireDel(id){UI.confirm('¿Eliminar este neumático?',()=>{Store.d.neumaticos=Store.d.neumaticos.filter(n=>n.id!==id);Store.save();render()},'Eliminar')},
  /* ---------- Admin ---------- */
  userForm(id){
    const u=id?Store.d.users.find(x=>x.id===id):{rol:'operario'};
    UI.form(id?'Editar usuario':'Nuevo usuario',[{k:'nombre',l:'Nombre',v:u.nombre,req:true},{k:'rol',l:'Rol',t:'select',opts:Object.entries(ROLES),v:u.rol}],o=>{
      if(id&&u.rol==='admin'&&o.rol!=='admin'&&Store.d.users.filter(x=>x.rol==='admin').length<2){UI.toast('Debe quedar al menos un administrador');return false}
      if(id)Object.assign(u,o);else Store.d.users.push({id:Store.id('u'),...o});Store.save();render()});
  },
  userDel(id){const adm=Store.d.users.filter(x=>x.rol==='admin');const u=Store.d.users.find(x=>x.id===id);
    if(u.rol==='admin'&&adm.length<2)return UI.toast('Debe quedar al menos un administrador');
    UI.confirm('¿Eliminar a '+u.nombre+'?',()=>{Store.d.users=Store.d.users.filter(x=>x.id!==id);if(Store.d.session===id)Store.d.session=adm.find(x=>x.id!==id).id;Store.save();render()},'Eliminar')},
  session(id){Store.d.session=id;Store.save();if(!can.validate()&&(cur==='sup'||cur==='adm'))cur='dash';else if(!can.admin()&&cur==='adm')cur='dash';render()},
  theme(){const r=document.documentElement,n=r.dataset.theme==='light'?'dark':'light';r.dataset.theme=n;try{localStorage.setItem('mantoflota.theme',n)}catch(e){}$('thm').textContent=n==='light'?'🌙':'☀️'},
  backup(){UI.download('mantoflota_respaldo_'+dstr()+'.json',JSON.stringify(Store.d,null,1),'application/json')},
  restore(){
    UI.open(`<h3>Restaurar respaldo</h3><p class="mut">Se reemplazarán todos los datos actuales.</p><div class="fld"><input type="file" id="jf" accept=".json,application/json"></div><div class="row" style="margin-top:1rem;justify-content:flex-end"><button class="btn" onclick="UI.close()">Cancelar</button><button class="btn pri" id="jgo">Restaurar</button></div>`);
    $('jgo').onclick=async()=>{const f=$('jf').files[0];if(!f)return UI.toast('Elige un archivo');
      try{const d=JSON.parse(await f.text());if(!Array.isArray(d.equipos)||!Array.isArray(d.users)||!d.users.length)throw 0;
        ['backlogs','planes','registros','neumaticos','lecturas'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});if(!d.users.find(u=>u.id===d.session))d.session=d.users[0].id;
        Store.d=d;Store.save();UI.close();render();UI.toast('Respaldo restaurado')}catch(e){UI.toast('Archivo no válido')}};
  },
  resetData(demo){UI.confirm(demo?'¿Reemplazar todo por los datos de ejemplo?':'¿Borrar TODOS los datos y empezar vacío?',()=>{Store.reset(demo);cur='dash';render()},demo?'Cargar ejemplo':'Borrar todo')},
  print(){window.print()},
  repCsv(){const r=repData();UI.download('reporte_'+filt.rep.k+'_'+dstr()+'.csv',UI.csv([r.head,...r.rows]),'text/csv')}
};

/* ====================== Vistas ====================== */
const V={};
const bar=(view,ph,extra='')=>`<div class="bar"><input type="search" placeholder="${ph}" value="${esc(filt[view].q)}" oninput="A.setF('${view}','q',this.value)" aria-label="Buscar">${extra}</div>`;
const eqSel=view=>`<select onchange="A.setF('${view}','e',this.value)" aria-label="Equipo"><option value="">Todos los equipos</option>${opt(eqOpts(),filt[view].e)}</select>`;

V.dash=()=>{
  const d=Store.d,open=d.backlogs.filter(b=>b.estado!=='COMPLETADO'),act=d.equipos.filter(e=>e.estado==='ACTIVO');
  const ps=d.planes.map(p=>({p,s:Store.planState(p)})),ven=c=>ps.filter(x=>x.p.cat===c&&x.s.s==='VENCIDO').length,pro=c=>ps.filter(x=>x.p.cat===c&&x.s.s==='PROXIMO').length;
  const val=d.backlogs.filter(b=>b.estado==='PENDIENTE_VALIDACION').length+d.registros.filter(r=>r.estado==='PENDIENTE_VALIDACION').length;
  const K=(n,l,c,go)=>`<div class="card kpi ${c} click" onclick="A.go('${go}')"><b>${n}</b><span>${l}</span></div>`;
  const hb=(l,n,max,col)=>`<div class="hb"><span>${l}</span><div class="meter"><i style="width:${max?n/max*100:0}%;${col?'background:'+col:''}"></i></div><b>${n}</b></div>`;
  const byT=Object.entries(TYPES).map(([k,v])=>[v.ic+' '+v.n,d.equipos.filter(e=>e.tipo===k).length]).filter(x=>x[1]),mx=Math.max(1,...byT.map(x=>x[1]));
  const crit=['ALTA','MEDIA','BAJA'].map(c=>[c,open.filter(b=>b.criticidad===c).length]);
  const att=sortBy(ps.filter(x=>x.s.s==='VENCIDO'||x.s.s==='PROXIMO'),x=>rank[x.s.s]*1e3-(x.s.pct||0)).slice(0,8);
  return `<div class="stack"><div class="grid g4">
    ${K(act.length,'Equipos activos','info','fleet')}${K(open.length,'Backlogs abiertos','warn','back')}${K(open.filter(b=>b.criticidad==='ALTA').length,'Backlogs críticos','bad','back')}
    ${K(ven('PM'),'Preventivos vencidos','bad','pm')}${K(pro('PM'),'Preventivos por vencer','warn','pm')}${K(ven('GR'),'Engrases vencidos','bad','gr')}${K(pro('GR'),'Engrases por vencer','warn','gr')}
    ${K(val,'Por validar','info',can.validate()?'sup':'back')}</div>
    <div class="grid g2"><div class="card"><h3>Flota por tipo</h3><div style="margin-top:.5rem">${byT.length?byT.map(([l,n])=>hb(esc(l),n,mx)).join(''):'<p class="mut">Sin equipos.</p>'}</div></div>
    <div class="card"><h3>Backlogs abiertos por criticidad</h3><div style="margin-top:.5rem">${crit.map(([c,n])=>hb(c[0]+c.slice(1).toLowerCase(),n,Math.max(1,open.length),{ALTA:'var(--bad)',MEDIA:'var(--warn)',BAJA:'var(--ok)'}[c])).join('')}</div></div></div>
    <div class="card"><h3>Requiere atención</h3>${att.length?att.map(x=>`<div class="row" style="padding:.4rem 0;border-bottom:1px solid var(--line)"><span>${x.p.cat==='GR'?'🛢️':'🗓️'} <b>${esc(Store.eq(x.p.equipoId)?.codigo||'?')}</b> · ${esc(x.p.nombre)}</span><span>${UI.pill(x.s.s)} <small>${esc(x.s.txt)}</small></span></div>`).join(''):'<p class="mut">Todo al día. 👌</p>'}</div></div>`;
};

V.back=()=>{
  const f=filt.back,list=sortBy(Store.d.backlogs.filter(b=>(!f.e||b.equipoId===f.e)&&(!f.c||b.estado===f.c)&&match(f.q,b.codigo,b.componente,b.descripcion,Store.eqName(b.equipoId),b.resp)),b=>({ALTA:0,MEDIA:1,BAJA:2}[b.criticidad])+(b.estado==='COMPLETADO'?5:0)+b.fecha);
  const st=[['','Todos los estados'],['PENDIENTE','Pendiente'],['EN_PROCESO','En proceso'],['PENDIENTE_VALIDACION','Por validar'],['COMPLETADO','Completado']];
  return `<div class="stack">${bar('back','Buscar código, equipo o componente…',`${eqSel('back')}<select onchange="A.setF('back','c',this.value)" aria-label="Estado">${opt(st,f.c)}</select><button class="btn pri" onclick="A.backForm()">+ Nuevo</button>`)}
    ${list.length?`<div class="grid g2">${list.map(b=>`<div class="card sig ${b.criticidad}"><div class="row"><b>${esc(b.codigo)}</b><span>${UI.pill(b.criticidad)} ${UI.pill(b.estado)}</span></div>
      <p style="margin:.3rem 0 0"><b>${esc(b.componente)}</b> — ${esc(b.descripcion)}</p><small>${esc(Store.eqName(b.equipoId))} · ${esc(b.fecha)}${b.resp?' · '+esc(b.resp):''}</small>${b.obs?`<br><small>📝 ${esc(b.obs)}</small>`:''}
      <div class="row" style="margin-top:.6rem"><span>${b.estado==='PENDIENTE'?`<button class="btn sm" onclick="A.backState('${b.id}','EN_PROCESO')">▶ Iniciar</button>`:''}${b.estado==='EN_PROCESO'?`<button class="btn sm pri" onclick="A.backState('${b.id}','COMPLETADO')">✔ Terminar</button>`:''}${b.estado==='PENDIENTE_VALIDACION'&&can.validate()?`<button class="btn sm pri" onclick="A.backState('${b.id}','COMPLETADO')">✔ Validar</button> <button class="btn sm" onclick="A.backState('${b.id}','EN_PROCESO')">↩ Devolver</button>`:''}${b.estado==='COMPLETADO'&&can.validate()?`<button class="btn sm" onclick="A.backState('${b.id}','PENDIENTE')">Reabrir</button>`:''}</span>
      <span><button class="btn sm" onclick="A.backForm('${b.id}')">Editar</button>${can.del()?` <button class="btn sm bad" onclick="A.backDel('${b.id}')">✕</button>`:''}</span></div></div>`).join('')}</div>`:'<div class="card empty">No hay backlogs con ese filtro.</div>'}</div>`;
};

V.plans=cat=>{
  const view=cat==='PM'?'pm':'gr',f=filt[view];
  const rows=Store.d.planes.filter(p=>p.cat===cat&&(!f.e||p.equipoId===f.e)&&match(f.q,p.nombre,Store.eqName(p.equipoId))).map(p=>({p,s:Store.planState(p),e:Store.eq(p.equipoId)})).sort((a,b)=>rank[a.s.s]-rank[b.s.s]||(b.s.pct||0)-(a.s.pct||0));
  return `<div class="stack">${bar(view,'Buscar equipo o plan…',`${eqSel(view)}<button class="btn pri" onclick="A.planForm('${cat}')">+ Plan</button><button class="btn" onclick="A.planPick('${cat}')">${cat==='GR'?'🛢️ Registrar engrase':'✔ Registrar servicio'}</button>`)}
    ${rows.length?`<div class="grid g2">${rows.map(({p,s,e})=>`<div class="card sig ${s.s}"><div class="row"><b>${esc(e?e.codigo:'?')}</b>${UI.pill(s.s)}</div>
      <small>${e?esc(TYPES[e.tipo].n)+' · '+fmt(e.lectura)+' '+uName(e):''}</small><p style="margin:.3rem 0 0">${esc(p.nombre)} <small>(cada ${[p.cadaLec?fmt(p.cadaLec)+' '+(e?uName(e):''):'',p.cadaDias?p.cadaDias+' d':''].filter(Boolean).join(' / ')})</small></p>
      <div class="meter"><i style="width:${s.pct??0}%;background:var(--${{VENCIDO:'bad',PROXIMO:'warn',AL_DIA:'ok'}[s.s]||'acc'})"></i></div>
      <small>${esc(s.txt)}${p.ultFecha?' · último: '+esc(p.ultFecha):''}</small>
      <div class="row" style="margin-top:.6rem"><button class="btn sm pri" onclick="A.planDone('${p.id}')"${p.pend?' disabled':''}>✔ Registrar</button><span><button class="btn sm" onclick="A.planForm('${cat}','${p.id}')">Editar</button>${can.del()?` <button class="btn sm bad" onclick="A.planDel('${p.id}')">✕</button>`:''}</span></div></div>`).join('')}</div>`:'<div class="card empty">No hay planes. Crea el primero con "+ Plan".</div>'}</div>`;
};
V.pm=()=>V.plans('PM');V.gr=()=>V.plans('GR');

V.tr=()=>{
  const f=filt.tr,st=[['','Todos'],['MONTADO','Montados'],['STOCK','En stock'],['RECAPADO','En recapado'],['DESCARTADO','Descartados']];
  const list=Store.d.neumaticos.filter(n=>(!f.e||n.estado===f.e)&&match(f.q,n.codigo,n.marca,n.medida,n.posicion,Store.eqName(n.equipoId)));
  const cnt=k=>Store.d.neumaticos.filter(n=>n.estado===k).length;
  return `<div class="stack"><div class="grid g4"><div class="card kpi info"><b>${cnt('MONTADO')}</b><span>Montados</span></div><div class="card kpi ok"><b>${cnt('STOCK')}</b><span>En stock</span></div><div class="card kpi warn"><b>${cnt('RECAPADO')}</b><span>En recapado</span></div><div class="card kpi bad"><b>${Store.d.neumaticos.filter(n=>n.estado==='MONTADO'&&n.profundidad!=null&&n.profundidad<=5).length}</b><span>Montados con ≤ 5 mm</span></div></div>
    ${bar('tr','Buscar código, marca, medida o equipo…',`<select onchange="A.setF('tr','e',this.value)" aria-label="Estado">${opt(st,f.e)}</select><button class="btn pri" onclick="A.tireForm()">+ Neumático</button>`)}
    ${list.length?`<div class="card scroll"><table><thead><tr><th>Código</th><th>Marca / medida</th><th>Estado</th><th>Equipo · posición</th><th>Labrado</th><th></th></tr></thead><tbody>${list.map(n=>`<tr><td><b>${esc(n.codigo)}</b></td><td>${esc(n.marca)}<br><small>${esc(n.medida)}</small></td><td>${UI.pill(n.estado)}</td><td>${n.equipoId?esc(Store.eqName(n.equipoId))+'<br><small>'+esc(n.posicion)+'</small>':'—'}</td><td>${n.profundidad==null?'—':`<span class="${n.profundidad<=5?'p-bad':''}">${n.profundidad} mm</span>`}</td><td style="white-space:nowrap"><button class="btn sm" onclick="A.tireForm('${n.id}')">Editar</button>${can.del()?` <button class="btn sm bad" onclick="A.tireDel('${n.id}')">✕</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="card empty">Sin neumáticos con ese filtro.</div>'}</div>`;
};

V.fleet=()=>{
  const f=filt.fleet,list=sortBy(Store.d.equipos.filter(e=>(!f.t||e.tipo===f.t)&&match(f.q,e.codigo,e.marca,e.modelo,e.serie,e.placa,TYPES[e.tipo].n)),e=>e.codigo);
  return `<div class="stack">${bar('fleet','Buscar código, marca, modelo, serie o placa…',`<select onchange="A.setF('fleet','t',this.value)" aria-label="Tipo"><option value="">Todos los tipos</option>${opt(tipoOpts(),f.t)}</select><button class="btn pri" onclick="A.fleetForm()">+ Equipo</button><button class="btn" onclick="A.importForm()">📥 Importar</button>`)}
    ${list.length?`<div class="grid g2">${list.map(e=>{const T=TYPES[e.tipo],pl=Store.d.planes.filter(p=>p.equipoId===e.id).map(p=>Store.planState(p).s),bk=Store.d.backlogs.filter(b=>b.equipoId===e.id&&b.estado!=='COMPLETADO').length;
      return `<div class="card click" onclick="A.detail('${e.id}')" tabindex="0" onkeydown="if(event.key==='Enter')A.detail('${e.id}')"><div class="row"><b>${T.ic} ${esc(e.codigo)}</b>${UI.pill(e.estado)}</div>
      <small>${esc(T.n)} · ${esc(e.marca)} ${esc(e.modelo)}${e.placa.trim()?' · '+esc(e.placa):''}</small><p style="margin:.3rem 0"><b>${fmt(e.lectura)} ${uName(e)}</b></p>
      <small>${pl.includes('VENCIDO')?'<span class="p-bad">● Plan vencido</span> ':''}${pl.includes('PROXIMO')?'<span class="p-warn">● Por vencer</span> ':''}${bk?`🔧 ${bk} backlog(s)`:''}${!pl.includes('VENCIDO')&&!pl.includes('PROXIMO')&&!bk?'<span class="p-ok">● Sin alertas</span>':''}</small></div>`}).join('')}</div>`:'<div class="card empty">No hay equipos. Usa "+ Equipo" o "Importar".</div>'}</div>`;
};

function repData(){
  const k=filt.rep.k,d=Store.d;
  if(k==='flota')return{t:'Inventario de flota',head:['Código','Tipo','Marca','Modelo','Placa','Lectura','Unidad','Estado'],rows:sortBy(d.equipos,e=>e.codigo).map(e=>[e.codigo,TYPES[e.tipo].n,e.marca,e.modelo,e.placa.trim(),e.lectura,uName(e),e.estado])};
  if(k==='back')return{t:'Backlogs abiertos',head:['Código','Equipo','Componente','Descripción','Criticidad','Estado','Fecha'],rows:d.backlogs.filter(b=>b.estado!=='COMPLETADO').map(b=>[b.codigo,Store.eqName(b.equipoId),b.componente,b.descripcion,b.criticidad,b.estado,b.fecha])};
  if(k==='pm'||k==='gr'){const c=k==='pm'?'PM':'GR';return{t:c==='PM'?'Estado de preventivos':'Estado de engrase',head:['Equipo','Plan','Estado','Detalle','Último servicio'],rows:d.planes.filter(p=>p.cat===c).map(p=>({p,s:Store.planState(p)})).sort((a,b)=>rank[a.s.s]-rank[b.s.s]).map(({p,s})=>[Store.eqName(p.equipoId),p.nombre,s.s,s.txt,p.ultFecha||''])}}
  return{t:'Neumáticos',head:['Código','Marca','Medida','Estado','Equipo','Posición','Labrado (mm)'],rows:d.neumaticos.map(n=>[n.codigo,n.marca,n.medida,n.estado,n.equipoId?Store.eqName(n.equipoId):'',n.posicion,n.profundidad??''])};
}
V.rep=()=>{
  const tabs=[['flota','Flota'],['back','Backlogs'],['pm','Preventivos'],['gr','Engrase'],['tr','Neumáticos']],r=repData();
  return `<div class="stack"><div class="row noprint"><div class="tabs">${tabs.map(([k,l])=>`<button class="${filt.rep.k===k?'on':''}" onclick="A.setF('rep','k','${k}')">${l}</button>`).join('')}</div><span><button class="btn" onclick="A.repCsv()">⬇ CSV (Excel)</button> <button class="btn pri" onclick="A.print()">🖨 Imprimir / PDF</button></span></div>
    <div class="card"><h2>${esc(r.t)}</h2><small>MantoFlota · ${dstr()} · ${r.rows.length} registro(s)</small>
    <div class="scroll" style="margin-top:.6rem"><table><thead><tr>${r.head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${r.rows.length?r.rows.map(x=>`<tr>${x.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${r.head.length}" class="empty">Sin datos</td></tr>`}</tbody></table></div></div></div>`;
};

V.sup=()=>{
  const bk=Store.d.backlogs.filter(b=>b.estado==='PENDIENTE_VALIDACION'),rg=Store.d.registros.filter(r=>r.estado==='PENDIENTE_VALIDACION');
  return `<div class="stack"><h2>Pendientes de validación</h2>
    ${bk.length+rg.length?'':'<div class="card empty">Nada por validar. ✅</div>'}
    ${bk.map(b=>`<div class="card"><div class="row"><b>🔧 ${esc(b.codigo)} · ${esc(b.componente)}</b>${UI.pill(b.criticidad)}</div><small>${esc(Store.eqName(b.equipoId))}</small><p style="margin:.3rem 0">${esc(b.descripcion)}</p><div class="row" style="justify-content:flex-end"><button class="btn sm" onclick="A.backState('${b.id}','EN_PROCESO')">↩ Devolver</button><button class="btn sm pri" onclick="A.backState('${b.id}','COMPLETADO')">✔ Validar</button></div></div>`).join('')}
    ${rg.map(r=>`<div class="card"><div class="row"><b>${r.cat==='GR'?'🛢️':'🗓️'} ${esc(r.nombre)}</b><small>${esc(r.fecha)}</small></div><small>${esc(Store.eqName(r.equipoId))} · lectura ${fmt(r.lectura)} · por ${esc(r.por)}</small>${r.obs?`<p style="margin:.3rem 0">${esc(r.obs)}</p>`:''}<div class="row" style="justify-content:flex-end;margin-top:.4rem"><button class="btn sm bad" onclick="A.regNo('${r.id}')">Rechazar</button><button class="btn sm pri" onclick="A.regOk('${r.id}')">✔ Aprobar</button></div></div>`).join('')}</div>`;
};

V.adm=()=>`<div class="stack"><div class="card"><div class="row"><h3>Usuarios</h3><button class="btn pri sm" onclick="A.userForm()">+ Usuario</button></div>
  <p class="mut" style="margin:.3rem 0">Modo local: los roles controlan qué puede hacer cada perfil en este dispositivo. Para login real y datos compartidos entre dispositivos hay que conectar un servidor (ver README).</p>
  ${Store.d.users.map(u=>`<div class="row" style="padding:.4rem 0;border-top:1px solid var(--line)"><span><b>${esc(u.nombre)}</b> <small>${esc(ROLES[u.rol])}</small></span><span><button class="btn sm" onclick="A.userForm('${u.id}')">Editar</button> <button class="btn sm bad" onclick="A.userDel('${u.id}')">✕</button></span></div>`).join('')}</div>
  <div class="card"><h3>Datos</h3><div class="row" style="margin-top:.5rem;justify-content:flex-start"><button class="btn" onclick="A.backup()">⬇ Descargar respaldo</button><button class="btn" onclick="A.restore()">⬆ Restaurar respaldo</button><button class="btn" onclick="A.resetData(true)">Cargar datos de ejemplo</button><button class="btn bad" onclick="A.resetData(false)">Borrar todo</button></div>
  <p class="mut" style="margin-top:.5rem">Los datos viven en este navegador. Descarga respaldos con frecuencia.</p></div></div>`;

/* ====================== Render ====================== */
function renderView(keepFocus){
  const a=document.activeElement,id=a&&a.matches&&a.matches('input[type=search]')?a.placeholder:null,pos=id?a.selectionStart:0;
  $('view').innerHTML=(V[cur]||V.dash)();
  if(id){const n=[...$('view').querySelectorAll('input[type=search]')].find(x=>x.placeholder===id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}
}
function render(){
  const u=Store.user();
  $('nav').innerHTML=TABS.filter(([k])=>k==='sup'?can.validate():k==='adm'?can.admin():true).map(([k,i,l])=>`<button class="${k===cur?'on':''}" onclick="A.go('${k}')"${k===cur?' aria-current="page"':''}>${i} ${l}</button>`).join('');
  $('userbox').innerHTML=`<select onchange="A.session(this.value)" aria-label="Usuario activo" title="${esc(ROLES[u.rol])}">${opt(Store.d.users.map(x=>[x.id,x.nombre+' · '+ROLES[x.rol]]),u.id)}</select><button class="btn sm" id="thm" onclick="A.theme()" aria-label="Cambiar tema">${document.documentElement.dataset.theme==='light'?'🌙':'☀️'}</button>`;
  renderView();
}
(function init(){
  try{const t=localStorage.getItem('mantoflota.theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
  Store.load();const h=location.hash.slice(1);if(TABS.some(t=>t[0]===h))cur=h;
  if((cur==='sup'&&!can.validate())||(cur==='adm'&&!can.admin()))cur='dash';
  render();
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();

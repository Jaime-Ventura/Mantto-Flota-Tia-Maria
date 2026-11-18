/* Utilidades de interfaz */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt=(items,sel)=>items.map(([v,l])=>`<option value="${esc(v)}"${String(v)===String(sel)?' selected':''}>${esc(l)}</option>`).join('');

const UI={
  toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(UI._t);UI._t=setTimeout(()=>t.hidden=true,2600)},
  open(html){const m=$('modal');m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;m.onclick=e=>{if(e.target===m)UI.close()};const f=m.querySelector('input:not([type=hidden]),select,textarea');if(f&&matchMedia('(min-width:640px)').matches)f.focus()},
  close(){$('modal').hidden=true;$('modal').innerHTML=''},
  confirm(msg,fn,label='Confirmar'){
    UI.open(`<h3>${esc(msg)}</h3><div class="row" style="margin-top:1rem;justify-content:flex-end"><button class="btn" onclick="UI.close()">Cancelar</button><button class="btn pri" id="cf-ok">${esc(label)}</button></div>`);
    $('cf-ok').onclick=()=>{UI.close();fn()};
  },
  /* Formulario genérico. fields: [{k,l,t,opts,req,v,half,ph}] */
  form(title,fields,onSubmit,okLabel='Guardar'){
    const f=fields.map(x=>{
      const id='f_'+x.k,v=x.v??'';let inp;
      if(x.t==='select')inp=`<select id="${id}"${x.req?' required':''}>${opt(x.opts,v)}</select>`;
      else if(x.t==='textarea')inp=`<textarea id="${id}" rows="3" placeholder="${esc(x.ph||'')}">${esc(v)}</textarea>`;
      else inp=`<input id="${id}" type="${x.t||'text'}" value="${esc(v)}" placeholder="${esc(x.ph||'')}"${x.req?' required':''}${x.t==='number'?' step="any" inputmode="decimal"':''}>`;
      return `<div class="fld"><label for="${id}">${esc(x.l)}${x.req?' *':''}</label>${inp}</div>`;
    }).join('');
    UI.open(`<form id="uform" novalidate><h3>${esc(title)}</h3>${f}<div class="row" style="margin-top:1rem;justify-content:flex-end"><button type="button" class="btn" onclick="UI.close()">Cancelar</button><button class="btn pri">${esc(okLabel)}</button></div></form>`);
    $('uform').onsubmit=e=>{
      e.preventDefault();const out={};let bad=null;
      fields.forEach(x=>{const el=$('f_'+x.k);let val=el.value.trim();
        if(x.t==='number')val=val===''?null:Number(val.replace(',','.'));
        if(x.req&&(val===''||val===null||Number.isNaN(val))&&!bad)bad=x;out[x.k]=val});
      if(bad){UI.toast('Completa: '+bad.l);$('f_'+bad.k).focus();return}
      if(onSubmit(out)!==false)UI.close();
    };
  },
  pill(s){
    const m={VENCIDO:['Vencido','bad'],PROXIMO:['Por vencer','warn'],AL_DIA:['Al día','ok'],SINREG:['Sin registro','mut'],POR_VALIDAR:['Por validar','info'],
      PENDIENTE:['Pendiente','warn'],EN_PROCESO:['En proceso','info'],PENDIENTE_VALIDACION:['Por validar','info'],COMPLETADO:['Completado','ok'],
      ALTA:['Alta','bad'],MEDIA:['Media','warn'],BAJA:['Baja','ok'],
      STOCK:['En stock','ok'],MONTADO:['Montado','info'],RECAPADO:['En recapado','warn'],DESCARTADO:['Descartado','mut'],
      ACTIVO:['Activo','ok'],TALLER:['En taller','warn'],BAJA_EQ:['De baja','mut']};
    const [t,c]=m[s]||[s,'mut'];return `<span class="pill p-${c}">${esc(t)}</span>`;
  },
  download(name,text,mime='text/plain'){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime+';charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  },
  csv(rows){return '﻿'+rows.map(r=>r.map(c=>{c=String(c??'');return /[",;\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')).join('\r\n')},
  parseCsv(txt){
    txt=txt.replace(/^﻿/,'');const first=txt.split(/\r?\n/)[0]||'';const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
    const rows=[];let row=[],cur='',q=false;
    for(let i=0;i<txt.length;i++){const c=txt[i];
      if(q){if(c==='"'){if(txt[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
      else if(c==='"')q=true;else if(c===sep){row.push(cur);cur=''}
      else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[]}
      else cur+=c}
    row.push(cur);if(row.some(x=>x.trim()!==''))rows.push(row);return rows;
  }
};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').hidden)UI.close()});

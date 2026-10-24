/* =================== MIRA PERSONALIZABLE =================== */
const XH_STYLES=['cruz','cruzgap','cruzpunto','punto','circulo','circulopunto','anillo','fina','t','mas','x','cortes'];
const XH_NAMES={cruz:'Cruz',cruzgap:'Cruz chica',cruzpunto:'Cruz con punto',punto:'Punto',circulo:'Círculo',circulopunto:'Círculo con punto',anillo:'Anillo punteado',fina:'Horizontal',t:'T',mas:'Cruz hueca',x:'Equis',cortes:'Paréntesis'};
const XH_COLS=['#ffffff','#00ff66','#ffe14a','#ff3b3b','#3fd2ff','#ff4fd8','#ff9a1f','#111111'];
function xhSVG(st,col,z){
  // cada forma se dibuja dos veces: un borde oscuro para que se vea sobre cualquier fondo y el color encima
  const L=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"/>',dot='<circle r="1.6" stroke="none" fill="C"/>';
  let p='',w=2;
  switch(st){
    case 'cruz':p=L(-9,0,-3,0)+L(3,0,9,0)+L(0,-9,0,-3)+L(0,3,0,9);break;
    case 'cruzgap':p=L(-7,0,-3.5,0)+L(3.5,0,7,0)+L(0,-7,0,-3.5)+L(0,3.5,0,7);w=1.6;break;
    case 'cruzpunto':p=L(-9,0,-4,0)+L(4,0,9,0)+L(0,-9,0,-4)+L(0,4,0,9)+dot;break;
    case 'punto':p='<circle r="2.2" stroke="none" fill="C"/>';break;
    case 'circulo':p='<circle r="6" fill="none"/>';w=1.6;break;
    case 'circulopunto':p='<circle r="7" fill="none"/>'+dot;w=1.4;break;
    case 'anillo':p='<circle r="7.5" fill="none" stroke-dasharray="3.1 2.8"/>';w=1.6;break;
    case 'fina':p=L(-12,0,-3,0)+L(3,0,12,0)+L(0,3,0,6);w=1.3;break;
    case 't':p=L(-9,0,-3,0)+L(3,0,9,0)+L(0,3,0,9);break;
    case 'mas':p='<path d="M-2.5 -9 H2.5 V-2.5 H9 V2.5 H2.5 V9 H-2.5 V2.5 H-9 V-2.5 H-2.5Z" fill="none" stroke-linejoin="round"/>';w=1.4;break;
    case 'x':p=L(-7,-7,7,7)+L(-7,7,7,-7);w=1.8;break;
    case 'cortes':p='<path d="M-5 -6 Q-9 0 -5 6" fill="none"/><path d="M5 -6 Q9 0 5 6" fill="none"/>'+dot;w=1.6;break;
  }
  const g=(c,ww,o)=>'<g stroke="'+c+'" stroke-width="'+ww+'" stroke-linecap="round" opacity="'+o+'">'+p.replace(/fill="C"/g,'fill="'+c+'"')+'</g>';
  return '<svg viewBox="-16 -16 32 32" aria-hidden="true"><g transform="scale('+z+')">'+g('#000',w+2,.55)+g(col,w,1)+'</g></svg>';
}
function applyCrosshair(){const m=S.mira;$('xh').innerHTML=xhSVG(m.s,m.c,m.z);$('xhPrevIn').innerHTML=xhSVG(m.s,m.c,m.z);
  [...$('xhGrid').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s===m.s)));
  [...$('xhCols').querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===m.c)));
  $('sXz').value=m.z;$('oXz').textContent=Math.round(m.z*100)+'%';const ci=$('xhColC');if(ci)ci.value=m.c;}
function setMira(p){Object.assign(S.mira,p);saveS();applyCrosshair();acctSave();}
(function(){
  $('xhGrid').innerHTML=XH_STYLES.map(st=>'<button type="button" data-s="'+st+'" title="'+XH_NAMES[st]+'" aria-label="'+XH_NAMES[st]+'">'+xhSVG(st,'#ffffff',1)+'</button>').join('');
  $('xhGrid').addEventListener('click',e=>{const b=e.target.closest('button');if(b){setMira({s:b.dataset.s});SFX.ui();}});
  XH_COLS.forEach(c=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.dataset.c=c;b.setAttribute('aria-label','Color '+c);b.addEventListener('click',()=>setMira({c}));$('xhCols').appendChild(b);});
  const ci=document.createElement('input');ci.type='color';ci.id='xhColC';ci.setAttribute('aria-label','Color de la mira a elección');ci.addEventListener('input',e=>setMira({c:e.target.value}));$('xhCols').appendChild(ci);
  $('sXz').addEventListener('input',e=>setMira({z:+e.target.value}));
  applyCrosshair();
})();

/* =================== CUENTA (Google) Y MEDALLAS =================== */
var ACC=null,ACCTOK=null,GCID="";
try{ACCTOK=localStorage.getItem('cuenk_tok');}catch(e){}
var medalN=0;
/* ---------- pantalla de fin de partida: podio, tabla con daño y tarjeta de experiencia animada ---------- */
// tarjetas para votar el próximo mapa (cada una con los colores de su mapa)
const MAP_LOOK={represa:['#ff8a3a','#3a1810','industrial · lava'],panymanteca:['#ff3fd2','#1a0a2a','boliche · pista LED'],lacuenca:['#5fb0ff','#0e1a2a','la universidad'],puente:['#7fe0a0','#0e2a1e','sobre el río']};
function renderMapVote(v){
  const box=$('mapVote');if(!v||!v.o){box.hidden=true;return;}box.hidden=false;
  const tot=Object.values(v.c).reduce((a,b)=>a+b,0),best=Math.max(0,...Object.values(v.c));
  $('mvRow').innerHTML=v.o.map(([id,name],i)=>{const L=MAP_LOOK[id]||['#ffb53a','#1a120a',''],n=v.c[id]||0,mine=G.myMapVote===id;
    return '<button type="button" class="mvC'+(mine?' mine':'')+(n&&n===best?' lead':'')+'" data-id="'+id+'" style="--mc:'+L[0]+';--mb:'+L[1]+'"><kbd>'+(i+1)+'</kbd>'
      +'<span class="mvN">'+esc(name.split(' · ')[1]||name)+'</span><span class="mvD">'+esc((name.split(' · ')[0]||'')+' · '+L[2])+'</span>'
      +'<span class="mvImg"><img src="maps/'+id+'.jpg" alt="Vista de '+esc(name.split(' · ')[1]||name)+'" loading="eager" onerror="this.parentNode.remove()"></span>'
      +'<span class="mvB"><i style="width:'+(tot?n/tot*100:0)+'%"></i></span><span class="mvV">'+n+' voto'+(n===1?'':'s')+(mine?' · el tuyo':'')+'</span></button>';}).join('');
  $('mvRow').querySelectorAll('.mvC').forEach(b=>b.onclick=()=>castMapVote(b.dataset.id));
  G.mvOpts=v.o.map(o=>o[0]);
}
function castMapVote(id){if(!net||matchState!=='inter')return;net.send({t:'mapvote',m:id});SFX.ui();}
addEventListener('keydown',e=>{if($('inter').hidden||$('mapVote').hidden||chatOpen)return;const d=/^(?:Digit|Numpad)([1-9])$/.exec(e.code);if(d&&G.mvOpts&&G.mvOpts[d[1]-1]){e.preventDefault();castMapVote(G.mvOpts[d[1]-1]);}});
function renderEnd(m){
  const l=m.l||scores,gg=MODE==='gungame',ctf=MODE==='ctf',tm=teamsMode();
  const pod=l.slice(0,3);
  $('interPod').innerHTML=tm?'':pod.map((s,i)=>'<div class="pod p'+(i+1)+'"><div class="pn">'+(s[11]>0?medalSVG(s[11],18)+' ':'')+esc(s[1])+'</div><div class="pb">'+(i+1)+'</div><div class="ps">'+(gg?'nivel '+Math.min(GG.length,(s[8]||0)+1):s[2]+' bajas')+'</div></div>').join('');
  const bestD=Math.max(1,...l.map(s=>s[12]||0)),bestK=Math.max(1,...l.map(s=>s[2]));
  const xh=gg?'NIVEL':ctf?'CAPTURAS':'';
  $('interTab').innerHTML='<thead><tr><th>#</th><th>JUGADOR</th><th>BAJAS</th><th>MUERTES</th><th>DAÑO</th><th>K/D</th>'+(xh?'<th>'+xh+'</th>':'')+'</tr></thead><tbody></tbody>';
  let k=0;const row=(s,i)=>'<tr class="r'+(s[0]===myId?' me':'')+'" style="animation-delay:'+(.05*k++)+'s"><td>'+(i+1)+'</td><td>'+(s[11]>0?medalSVG(s[11],18)+' ':'')+'<span class="sw" style="background:'+esc(s[6])+'"></span>'+esc(s[1])+(s[5]?'<span class="tag">bot</span>':'')+'</td>'
    +'<td'+(s[2]===bestK&&s[2]>0?' class="best"':'')+'>'+s[2]+'</td><td>'+s[3]+'</td><td class="dm'+((s[12]||0)===bestD?' best':'')+'">'+(s[12]||0)+'</td><td>'+(s[3]?(s[2]/s[3]).toFixed(2):s[2].toFixed(2))+'</td>'
    +(gg?'<td>'+Math.min(GG.length,(s[8]||0)+1)+'</td>':ctf?'<td>'+(s[10]||0)+'</td>':'')+'</tr>';
  const body=$('interTab').querySelector('tbody');
  if(tm)body.innerHTML=[0,1].map(t=>'<tr class="team"><td></td><td colspan="'+(xh?6:5)+'" style="color:'+TEAMS[t].c+'">Equipo '+TEAMS[t].name+' · '+(TS[t]||0)+(m.wt===t?' · GANADOR':'')+'</td></tr>'+l.filter(s=>s[9]===t).map(row).join('')).join('');
  else body.innerHTML=l.map(row).join('');
}
let xpAnim=0;
function xpCard(pf){
  const L=pf.nivel||1,md=C.medalOf(L),pct=pf.falta?pf.en/pf.falta*100:100;
  $('interXP').innerHTML='<div class="xpCard"><div class="xpM">'+medalSVG(L,64)+'</div><div class="xpI"><div class="xpL">Nivel <b class="xL">'+L+'</b><small class="xMd">'+esc(md.name)+'</small></div>'
    +'<div class="xpBar"><i style="width:'+pct+'%"></i></div><div class="xpN">'+(pf.falta?pf.en+' / '+pf.falta+' XP':'Nivel máximo')+' · sumando experiencia…</div></div><div class="xpG">+0</div><div class="xpUp">¡SUBISTE DE NIVEL!</div></div>';
}
// la barra se llena desde la XP que tenías hasta la nueva, pasando por cada nivel que subas
function animXP(m){
  const card=$('interXP').querySelector('.xpCard');if(!card)return;
  const total=m.perfil.xp|0,gain=m.gain|0,from=Math.max(0,total-gain),t0=performance.now(),dur=Math.min(2600,900+gain*4);
  let lastL=C.levelInfo(from).level;cancelAnimationFrame(xpAnim);
  const bar=card.querySelector('.xpBar i'),nT=card.querySelector('.xpN'),gT=card.querySelector('.xpG'),lT=card.querySelector('.xL'),mT=card.querySelector('.xMd'),mI=card.querySelector('.xpM');
  let tick=0;
  const step=now=>{
    const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3),v=Math.round(from+gain*e),li=C.levelInfo(v);
    bar.style.width=(li.need?li.into/li.need*100:100)+'%';
    nT.textContent=(li.need?li.into+' / '+li.need+' XP para el nivel '+(li.level+1):'Nivel máximo');
    gT.textContent='+'+Math.round(gain*e);
    if(li.level!==lastL){lastL=li.level;lT.textContent=li.level;mT.textContent=C.medalOf(li.level).name;mI.innerHTML=medalSVG(li.level,64);card.classList.remove('lvup');void card.offsetWidth;card.classList.add('lvup');card.querySelector('.xpUp').textContent='¡NIVEL '+li.level+'!';SFX.hunt();}
    if(++tick%4===0&&k<1)tn({type:'triangle',f0:900+600*e,f1:900+600*e,dur:.03,vol:.04});
    if(k<1)xpAnim=requestAnimationFrame(step);else SFX.cash();
  };
  xpAnim=requestAnimationFrame(step);
  // detalle: de dónde salió la experiencia
  if(m.parts){const N={partida:'Partida',minutos:'Minutos jugados',bajas:'Bajas',aguante:'Aguante (vida más larga)',victoria:'Victoria',capturas:'Capturas'};
    const rows=Object.keys(N).filter(k=>m.parts[k]>0).map((k,i)=>'<span style="animation-delay:'+(.15+i*.12)+'s">'+N[k]+' <b>+'+m.parts[k]+'</b></span>').join('');
    let d=card.parentElement.querySelector('.xpParts');if(!d){d=document.createElement('div');d.className='xpParts';card.after(d);}d.innerHTML=rows;}
}
function medalSVG(L,size){
  // medalla estilo "Tour of Duty" de TF2: cinta, disco con el color del rango y el nivel en el centro
  const m=C.medalOf(L),id='md'+(medalN++),pts=[];for(let k=0;k<10;k++){const r=k%2?5.5:12.5,a=k/10*Math.PI*2-Math.PI/2;pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2));}
  return '<svg class="medal" width="'+size+'" height="'+size+'" viewBox="-20 -26 40 46" role="img" aria-label="Nivel '+L+' · '+m.name+'"><title>Nivel '+L+' · '+m.name+'</title>'+
    '<defs><radialGradient id="'+id+'" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".35" stop-color="'+m.c[0]+'"/><stop offset="1" stop-color="'+m.c[1]+'"/></radialGradient></defs>'+
    '<path d="M-9 -26 L-2 -26 L4 -10 L-3 -10Z" fill="#7a1e1e"/><path d="M9 -26 L2 -26 L-4 -10 L3 -10Z" fill="#b8322a"/>'+
    '<circle r="16" fill="'+m.c[1]+'" stroke="#000" stroke-width="1.4"/><circle r="13.5" fill="url(#'+id+')"/>'+
    (L>=20?'<polygon points="'+pts.join(' ')+'" fill="'+m.c[0]+'" opacity=".35"/>':'')+
    '<circle r="13.5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>'+
    '<text y="'+(L>99?4.2:5)+'" text-anchor="middle" font-family="Black Ops One, Impact, sans-serif" font-size="'+(L>99?11:14)+'" fill="#1a1208" stroke="rgba(255,255,255,.35)" stroke-width=".5">'+L+'</text></svg>';
}
function renderAcct(){
  const box=$('acctBox');
  if(!GCID){box.hidden=true;return;}
  box.hidden=false;
  if(ACC){
    const pct=ACC.falta?Math.round(ACC.en/ACC.falta*100):100,md=C.medalOf(ACC.nivel);
    box.innerHTML=medalSVG(ACC.nivel,56)+'<div><div class="an">'+esc(ACC.nombre)+'</div><div class="al">Nivel '+ACC.nivel+' · '+md.name+'</div><div class="xpbar"><i style="width:'+pct+'%"></i></div><div class="ax">'+(ACC.falta?ACC.en+' / '+ACC.falta+' XP para el nivel '+(ACC.nivel+1):'Nivel máximo')+' · '+ACC.kills+' bajas · '+ACC.partidas+' partidas</div></div><button type="button" class="linkbtn" id="bLogout">Cerrar sesión</button>';
    $('bLogout').addEventListener('click',logout);
  }else{
    box.innerHTML='<div id="gBtn"></div><p class="note">Iniciá sesión con Google para guardar tu personaje, tu mira y tu nivel. La experiencia se gana en las partidas online.</p>';
    if(window.google&&google.accounts&&google.accounts.id)google.accounts.id.renderButton($('gBtn'),{theme:'filled_black',size:'large',text:'signin_with',shape:'rectangular',locale:'es'});
  }
}
function applyProfile(pf,fresh){
  const isNew=fresh&&!pf.xp&&!pf.partidas;ACC=pf;
  if(isNew){acctSave(true);}               // cuenta nueva: se lleva el personaje y la mira que ya tenías
  else{
    if(pf.nombre){S.name=pf.nombre;$('pName').value=S.name;}
    if(pf.skin&&pf.skin.c){S.skin=Object.assign({c:S.skin.c,v:'#ffffff',a:0},pf.skin);}
    if(pf.mira&&pf.mira.s){S.mira=Object.assign({},S.mira,pf.mira);}
    saveS();syncLocker&&syncLocker();rebuildLockModel&&rebuildLockModel();applyCrosshair();syncChest();
  }
  renderAcct();
}
var acctT=0;
function acctSave(now){
  if(!ACC||!ACCTOK)return;clearTimeout(acctT);
  acctT=setTimeout(()=>{fetch('/me',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ACCTOK},body:JSON.stringify({nombre:S.name,skin:S.skin,mira:S.mira})}).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.perfil){ACC=j.perfil;renderAcct();}}).catch(()=>{});},now?0:700);
}
function logout(){ACC=null;ACCTOK=null;try{localStorage.removeItem('cuenk_tok');}catch(e){}if(window.google&&google.accounts&&google.accounts.id)google.accounts.id.disableAutoSelect();renderAcct();}
function onGoogleCredential(resp){
  fetch('/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:resp.credential})}).then(r=>r.json()).then(j=>{
    if(!j.token){$('netTxt').textContent='No se pudo iniciar sesión: '+(j.error||'error');return;}
    ACCTOK=j.token;try{localStorage.setItem('cuenk_tok',ACCTOK);}catch(e){}applyProfile(j.perfil,true);SFX.ui();
  }).catch(()=>{$('netTxt').textContent='No se pudo iniciar sesión';});
}
function initAccounts(){
  if(!/^https?:$/.test(location.protocol))return;
  fetch('/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(cfg=>{
    if(!cfg||!cfg.googleClientId)return;
    GCID=cfg.googleClientId;renderAcct();
    if(ACCTOK)fetch('/me',{headers:{Authorization:'Bearer '+ACCTOK}}).then(r=>r.ok?r.json():Promise.reject(r.status)).then(j=>applyProfile(j.perfil,false)).catch(st=>{if(st===401){ACCTOK=null;try{localStorage.removeItem('cuenk_tok');}catch(e){}renderAcct();}});
    // el script de Google se baja solo si el inicio de sesión está configurado
    const sc=document.createElement('script');sc.src='https://accounts.google.com/gsi/client';sc.async=true;
    sc.onload=()=>{if(!(window.google&&google.accounts&&google.accounts.id))return;google.accounts.id.initialize({client_id:GCID,callback:onGoogleCredential,auto_select:true,cancel_on_tap_outside:true});renderAcct();};
    document.head.appendChild(sc);
  }).catch(()=>{});
}


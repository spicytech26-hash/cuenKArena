/* =================== TIENDA ===================
   El Mercader del Umbral (SVG liviano, sin segundo contexto WebGL). Las tarjetas se arman una sola vez; renderShop() solo actualiza
   estados (créditos, equipada, comprada, sin plata), así abrir la tienda o recibir un 'you' no vuelve a decodificar los íconos.
   Mientras está abierta no se dibuja la escena 3D (la tienda la tapa) y la resolución dinámica no mide esos cuadros. */
let iconCache=null,iconR=null,iconSc=null,iconCam=null,iconI=0;
function iconInit(){
  if(iconCache)return;
  iconCache={};
  try{
    iconR=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});iconR.setSize(256,112,false);
    iconSc=new THREE.Scene();iconSc.add(new THREE.AmbientLight(0xffffff,.65));const dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(1,2,2);iconSc.add(dl);
    iconCam=new THREE.OrthographicCamera(-.6,.6,.26,-.26,.01,10);iconCam.position.set(-3,.4,0);iconCam.lookAt(0,0,0);
  }catch(e){iconR=null;iconI=WEAPONS.length;}
  const draw=(fn)=>cv(256,112,fn).toDataURL();
  const shield=(g,col,n)=>{g.translate(128,56);for(let k=0;k<n;k++){g.save();g.translate((k-(n-1)/2)*44,0);g.fillStyle=col;g.beginPath();g.moveTo(0,-40);g.lineTo(32,-28);g.lineTo(28,12);g.lineTo(0,42);g.lineTo(-28,12);g.lineTo(-32,-28);g.closePath();g.fill();g.strokeStyle='#0b0907';g.lineWidth=4;g.stroke();g.restore();}};
  iconCache.a1=draw(g=>shield(g,'#cfd8c8',1));iconCache.a2=draw(g=>shield(g,'#ffb06a',2));
  iconCache.am=draw(g=>{g.fillStyle='#c9a227';for(let k=0;k<6;k++){g.fillRect(60+k*24,36,14,48);g.beginPath();g.arc(67+k*24,36,7,Math.PI,0);g.fill();}});
  iconCache.rf=draw(g=>{g.strokeStyle='#cfd8c8';g.lineWidth=8;g.beginPath();g.arc(128,56,32,.3,5.6);g.stroke();g.fillStyle='#cfd8c8';g.beginPath();g.moveTo(160,22);g.lineTo(172,50);g.lineTo(144,46);g.fill();});
}
// un ícono de arma por vuelta (así no hay un tirón largo); devuelve true si quedan
function iconStep(){
  iconInit();
  if(!iconR||iconI>=WEAPONS.length){if(iconR){iconR.dispose();if(iconR.forceContextLoss)iconR.forceContextLoss();iconR=null;}return false;}
  try{
    const g=buildGun(iconI),bb=new THREE.Box3().setFromObject(g),c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3());
    const k=1/Math.max(sz.z,sz.y*2.2,.01);g.scale.setScalar(k);g.position.set(-c.x*k,-c.y*k,-c.z*k);iconSc.add(g);iconR.clear();iconR.render(iconSc,iconCam);
    const u=iconR.domElement.toDataURL();if(typeof u==='string'&&u.startsWith('data:'))iconCache['w'+iconI]=u;iconSc.remove(g);
  }catch(e){}
  iconI++;return true;
}
function shopIcons(){while(iconStep());return iconCache;}
// se llama un rato después de cargar la página (en el menú) y, si falta, en el primer spawn: genera los íconos de a uno y arma la tienda, para que B no tenga que hacerlo
let warmBusy=false;
function warmStep(){if(!iconStep()){warmBusy=false;try{buildShop();}catch(e){}return;}setTimeout(warmStep,70);}
function warmIcons(){if(warmBusy)return;warmBusy=true;warmStep();}
const VEND={
  open:['¿Qué buscás, forastero?','Las monedas hablan. Los muertos escuchan.','Elegí rápido: algo te está mirando.','Pasá, pasá. No muerdo… casi nunca.'],
  buy:['Una elección sabia… para quien todavía respira.','El precio ya está pagado. La deuda, no.','Que te sirva antes de que te alcance.','Hmm. Tus manos tiemblan. Tu puntería también.'],
  eq:['Esa ya es tuya. Empuñala.','Cambiá de juguete cuando quieras. El filo no se queja.'],
  poor:['Tus bolsillos están más vacíos que el vacío.','Volvé con más ¤, mortal.','Eso cuesta más que tu alma.'],
  bye:['Volverás. Siempre volvés.','Cuidá la espalda…']
};
let vendLast='';
function vendSay(k){const a=VEND[k];let t;do{t=a[Math.random()*a.length|0];}while(t===vendLast&&a.length>1);vendLast=t;const e=$('vendSay');e.textContent=t;e.classList.remove('say');void e.offsetWidth;e.classList.add('say');}
let shopEls=null,shopDetId=null;
// una sola columna vertical: una fila por categoría, todo a la vista (el detalle de cada objeto va en el panel de la izquierda)
const SHOP_ORDER=['Pistolas','Cuerpo a cuerpo','Escopetas','Ametralladoras','Rifles','Bombas','Misiles','Blindaje','Suministros'];
function shopDetail(id){
  const it=C.SHOP.find(s=>s.id===id),E=shopEls&&shopEls[id];if(!it||!E)return;
  shopDetId=id;setTxt('sdN',it.name);setTxt('sdP',E.pr.textContent);setTxt('sdD',it.desc);
}
function buildShop(){
  if(shopEls)return;shopEls={};
  const ic=shopIcons(),host=$('shopGrid');host.textContent='';
  const cats=[];C.SHOP.forEach(it=>{if(!cats.includes(it.cat))cats.push(it.cat);});
  cats.sort((a,b)=>{const i=SHOP_ORDER.indexOf(a),j=SHOP_ORDER.indexOf(b);return (i<0?99:i)-(j<0?99:j);});
  cats.forEach(cat=>{
    const row=document.createElement('div');row.className='shrow';
    const lb=document.createElement('div');lb.className='slab';lb.textContent=cat;
    const cd=document.createElement('div');cd.className='scards';row.append(lb,cd);host.appendChild(row);
    C.SHOP.filter(it=>it.cat===cat).forEach(it=>{
      const b=document.createElement('button');b.type='button';b.className='card';b.dataset.id=it.id;
      const im=document.createElement('img');im.alt='';im.src=ic[it.id]||ic['w'+it.w]||'';
      const nm=document.createElement('span');nm.className='nm';nm.textContent=it.name;
      const pr=document.createElement('span');pr.className='pr';
      b.append(im,nm,pr);cd.appendChild(b);shopEls[it.id]={b,pr};
    });
  });
}
function openShop(){
  if(!inGame||!liveState())return;
  if(MODE==='gungame'){announce('SIN TIENDA','En Gungame cada baja te da el arma siguiente');SFX.deny();return;}
  if(!C.MODES[MODE].shop){announce('SIN TIENDA','En '+C.MODES[MODE].name+' se juega con lo que hay');SFX.deny();return;}
  closeWheel(false);buildShop();
  $('shop').hidden=false;G.shopOn=true;DR.acc=DR.n=0;mouseDown=false;for(const k in keys)keys[k]=false;
  selfUnlock();
  shopMsg('');renderShop();vendSay('open');SFX.ui();
}
function closeShop(silent){if($('shop').hidden)return;$('shop').hidden=true;G.shopOn=false;DR.acc=DR.n=0;if(!silent&&inGame){lockPointer();SFX.ui();}}
function shopMsg(t,cls){const e=$('shopMsg');e.textContent=t;e.className=cls||'';}
function renderShop(){
  if(!shopEls)return;
  setTxt('shopCr','¤ '+me.cr.toLocaleString('es-AR'));
  const prim=C.primaryOf(me.ow);
  C.SHOP.forEach(it=>{
    const E=shopEls[it.id];if(!E)return;
    const isP=it.w!=null&&C.PRIMARY.includes(it.w);
    // principal: "en manos" si la llevás, "equipar" si ya es tuya; el resto: comprado o precio
    const inHand=isP&&prim===it.w,mine=isP&&!inHand&&(it.free||me.unl[it.w]);
    const own=inHand||(!isP&&(it.free||(it.w!=null&&!it.once&&me.unl[it.w])||(it.armor&&me.perk.ar>=it.armor)||(it.id==='am'&&me.perk.am)));
    const poor=!own&&!mine&&me.cr<it.price;
    const st=inHand?'EN MANOS':mine?'EQUIPAR':own?(it.free?'TUYA':'COMPRADO'):'¤ '+it.price.toLocaleString('es-AR');
    if(E.st!==st){E.st=st;E.pr.textContent=st;}
    const cls='card'+(own?' own':'')+(mine?' mine':'')+(poor?' poor':'');
    if(E.cls!==cls){E.cls=cls;E.b.className=cls;}
    E.b.disabled=own;
  });
  if(shopDetId)shopDetail(shopDetId);
  // inventario: lo que hay en la ruleta (E)
  const inv=wheelList();
  const html=inv.map(w=>'<span class="'+(w===prim?'on':'')+'" title="'+esc(WEAPONS[w].name)+'"><img alt="" src="'+(shopIcons()['w'+w]||'')+'"></span>').join('');
  const iv=$('shopInv');if(iv._h!==html){iv._h=html;iv.innerHTML=html;}
}
$('shopGrid').addEventListener('mouseover',e=>{const b=e.target.closest('.card');if(b&&b.dataset.id!==shopDetId)shopDetail(b.dataset.id);});
$('shopGrid').addEventListener('focusin',e=>{const b=e.target.closest('.card');if(b)shopDetail(b.dataset.id);});
$('shopGrid').addEventListener('click',e=>{const b=e.target.closest('.card');if(!b||b.disabled||!net)return;net.send({t:'buy',id:b.dataset.id});});
$('shop').addEventListener('click',e=>{if(e.target===$('shop')||e.target.classList.contains('shopbox'))closeShop();});

/* =================== TAQUILLA =================== */
const BODY_COLS=['#e8542a','#3fa7ff','#9ccc3c','#ffcc33','#c45cff','#ff5c8a','#38d6c4','#f2efe6','#ff8f1f','#7a8cff','#2a2a2e','#b8ff3a'];
const VISOR_COLS=['#ffffff','#2be6ff','#ff3fd2','#3aff9c','#ffcf3a','#ff3a3a','#8a4bff','#111111'];
let lock=null;
function lockerInit(){
  if(lock)return;
  try{
    const r=new THREE.WebGLRenderer({canvas:$('lockPrev'),alpha:true,antialias:true});r.setPixelRatio(1);r.setSize(440,520,false);
    const sc=new THREE.Scene();sc.add(new THREE.AmbientLight(0xffffff,.55));const dl=new THREE.DirectionalLight(0xffe2c0,.9);dl.position.set(1.5,3,2);sc.add(dl);
    const rim=new THREE.DirectionalLight(0x2bd6ff,1.1);rim.position.set(-2,1.5,-2);sc.add(rim);const fill=new THREE.DirectionalLight(0xffffff,.45);fill.position.set(-2.5,1.2,3);sc.add(fill);
    const cam=new THREE.PerspectiveCamera(32,440/520,.1,20);cam.position.set(0,1.35,4.4);cam.lookAt(0,1.05,0);
    lock={r,sc,cam,model:null,rot:.6,z:1,zt:1,ty:1.3,tyt:1.3};
  }catch(e){lock={r:null};}
  rebuildLockModel();
}
// zoom de la vista previa: z=1 cuerpo entero, z=.36 primer plano de la cabeza y el pecho; la cámara sube hacia la cara al acercarse
const LZ_MIN=.36,LZ_MAX=1.15;
function lockZoom(v){if(lock)lock.zt=Math.max(LZ_MIN,Math.min(LZ_MAX,v));}
function lockCam(){const z=lock.z,w=Math.max(0,Math.min(1,(1-z)/.3)),ty=1.0*(1-w)+(lock.ty||1)*w;lock.cam.position.set(0,ty+.3*z,4.4*z);lock.cam.lookAt(0,ty,0);}
function rebuildLockModel(){if(!lock||!lock.r)return;if(lock.model)lock.sc.remove(lock.model.g);lock.model=buildPlayer(S.skin,S.name,true);lock.sc.add(lock.model.g);}
// girar al personaje arrastrando (mouse o dedo) o con las flechas; la vuelta sola se pausa un rato
(function(){
  const c=$('lockPrev');let drag=false,lx=0,ly=0;
  c.style.touchAction='none';c.style.cursor='grab';c.tabIndex=0;c.setAttribute('aria-label','Vista de tu personaje: arrastrá para girarlo y mirar más arriba o abajo; flechas, rueda, pellizco o + y - para mover y acercar');
  c.addEventListener('pointerdown',e=>{if(!lock)return;drag=true;lx=e.clientX;ly=e.clientY;c.setPointerCapture(e.pointerId);c.style.cursor='grabbing';lock.hold=3;});
  c.addEventListener('pointermove',e=>{if(!drag||!lock)return;lock.rot+=(e.clientX-lx)*.014;lx=e.clientX;lock.tyt=Math.max(.25,Math.min(1.85,(lock.tyt||1.3)+(ly-e.clientY)*.0045*Math.max(.35,lock.z)));ly=e.clientY;lock.hold=3;});   // izquierda/derecha gira; arriba/abajo sube o baja la cámara
  const up=()=>{drag=false;c.style.cursor='grab';};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
  // zoom: rueda del mouse, pellizco con dos dedos, doble clic, botones y teclas + / - / 0
  const pts=new Map();let d0=0,z0=1;
  c.addEventListener('wheel',e=>{if(!lock)return;e.preventDefault();lockZoom(lock.zt*Math.exp(e.deltaY*.0012));lock.hold=3;},{passive:false});
  c.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2&&lock){const [a,b]=[...pts.values()];d0=Math.hypot(a[0]-b[0],a[1]-b[1])||1;z0=lock.zt;drag=false;}});
  c.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2&&lock){const [a,b]=[...pts.values()];lockZoom(z0*d0/(Math.hypot(a[0]-b[0],a[1]-b[1])||1));lock.hold=3;}});
  const soltar=e=>pts.delete(e.pointerId);c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
  c.addEventListener('dblclick',()=>{if(lock)lockZoom(lock.zt>.8?LZ_MIN+.1:1);});
  const zb=(id,fn)=>{const b=$(id);if(b)b.addEventListener('click',fn);};
  zb('lzIn',()=>lockZoom((lock?lock.zt:1)*.78));zb('lzOut',()=>lockZoom((lock?lock.zt:1)/.78));zb('lzReset',()=>{lockZoom(1);if(lock)lock.tyt=1.3;});
  c.addEventListener('keydown',e=>{if(!lock)return;if(e.key==='+'||e.key==='='){e.preventDefault();lockZoom(lock.zt*.82);}else if(e.key==='-'||e.key==='_'){e.preventDefault();lockZoom(lock.zt/.82);}else if(e.key==='0'){e.preventDefault();lockZoom(1);}});
  c.addEventListener('keydown',e=>{if(!lock)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();lock.rot+=(e.key==='ArrowLeft'?-1:1)*.35;lock.hold=3;}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();lock.tyt=Math.max(.25,Math.min(1.85,(lock.tyt||1.3)+(e.key==='ArrowUp'?.1:-.1)));lock.hold=3;}});
})();
function renderLocker(dt){if(!lock||!lock.r||$('lockerPanel').hidden||$('menu').hidden)return;lock.hold=(lock.hold||0)-dt;if(lock.hold<=0)lock.rot+=dt*.8;lock.model.g.rotation.y=lock.rot;rbAnimar(lock.model,lock.model.pT,Math.min(dt,.05),RB_POSE_TAQ);lock.z+=(lock.zt-lock.z)*Math.min(1,dt*10);lock.ty=(lock.ty||1)+((lock.tyt||1)-(lock.ty||1))*Math.min(1,dt*8);lockCam();lock.r.render(lock.sc,lock.cam);}
function syncLocker(){syncLockerTabs();
  [...$('swVisor').querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===S.skin.v)));
  [...$('segAcc').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===S.skin.a)));
  const P=skinParts(S.skin);
  [['swBody','ck'],['swPecho','cp'],['swBrazos','cb'],['swPiernas','cl'],['swBody3','c3'],['swEmb','ce']].forEach(([id,k])=>{
    [...$(id).querySelectorAll('button[data-c]')].forEach(b=>b.setAttribute('aria-pressed',String(!!S.skin[k]&&b.dataset.c===S.skin[k])));
    const au=$(id).querySelector('.auto');if(au)au.setAttribute('aria-pressed',String(!S.skin[k]));
    const ci=$(id).querySelector('input[type=color]');if(ci)ci.value=P[k];
  });
  // cuerpo entero: marcado solo si todas las partes valen lo mismo
  const todo=P.ck===P.c&&P.cp===P.c&&P.cb===P.c&&P.cl===P.c;
  [...$('swCuerpo').querySelectorAll('button[data-c]')].forEach(b=>b.setAttribute('aria-pressed',String(todo&&b.dataset.c.toLowerCase()===P.c.toLowerCase())));
  const cc=$('swCuerpo').querySelector('input[type=color]');if(cc)cc.value=P.c;
  // emblema elegido (si hay foto propia, ninguno)
  const em=S.skin.em||'ancla';[...$('emGrid').children].forEach(b=>b.setAttribute('aria-pressed',String(!S.skin.img&&b.dataset.em===em)));
  $('lockPlate').textContent=S.name||'Jugador';
}
// la foto se recorta cuadrada al centro, se achica a 96×96 y se pasa a JPEG liviano para mandarla por la red
function loadChest(file){
  if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)){$('chestNote').textContent='Elegí una imagen PNG o JPG.';return;}
  if(file.size>15e6){$('chestNote').textContent='La imagen es muy pesada (máximo 15 MB).';return;}
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
    g.fillStyle='#2e2a26';g.fillRect(0,0,128,128);
    const sq=Math.min(im.naturalWidth,im.naturalHeight),sx=(im.naturalWidth-sq)/2,sy=(im.naturalHeight-sq)/2;
    g.imageSmoothingQuality='high';g.drawImage(im,sx,sy,sq,sq,0,0,128,128);URL.revokeObjectURL(url);
    let q=.85,d=c.toDataURL('image/jpeg',q);while(d.length>23000&&q>.3){q-=.15;d=c.toDataURL('image/jpeg',q);}
    if(!C.okChestImg(d)){$('chestNote').textContent='No se pudo usar esa imagen.';return;}
    $('chestNote').textContent='Listo. Los demás la ven en tu pecho.';setSkin({img:d});
  };
  im.onerror=()=>{URL.revokeObjectURL(url);$('chestNote').textContent='No se pudo abrir esa imagen.';};
  im.src=url;
}
$('chestFile').addEventListener('change',e=>{loadChest(e.target.files[0]);e.target.value='';});
$('chestDel').addEventListener('click',()=>{delete S.skin.img;setSkin({});$('chestNote').textContent='PNG o JPG. Se recorta cuadrada al centro y va en el pecho.';});
function syncChest(){const has=!!S.skin.img;$('chestPrev').hidden=!has;$('chestDel').hidden=!has;if(has)$('chestPrev').src=S.skin.img;}
function setSkin(p){for(const k in p){if(p[k]==null)delete S.skin[k];else S.skin[k]=p[k];}saveS();syncLocker();syncChest();rebuildLockModel();acctSave();if(net&&inGame)net.send({t:'skin',s:S.skin});SFX.ui();}
(function(){
  const mk=(host,cols,key)=>{cols.forEach(c=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.dataset.c=c;b.setAttribute('aria-label','Color '+c);b.addEventListener('click',()=>setSkin({[key]:c}));host.appendChild(b);});};
  mk($('swVisor'),VISOR_COLS,'v');
  // cada zona: colores, uno a elección y "Auto" (vuelve al color del cuerpo; en el emblema, negro o claro según el pecho)
  [['swBody','ck'],['swPecho','cp'],['swBrazos','cb'],['swPiernas','cl'],['swBody3','c3'],['swEmb','ce']].forEach(([id,k])=>{
    const host=$(id);mk(host,BODY_COLS,k);
    const au=document.createElement('button');au.type='button';au.className='auto';au.textContent='Auto';au.style.cssText='width:auto;padding:0 8px;font-size:12px';au.setAttribute('aria-label','Color automático');au.addEventListener('click',()=>setSkin({[k]:null}));host.appendChild(au);
    const ic=document.createElement('input');ic.type='color';ic.setAttribute('aria-label','Color personalizado');ic.addEventListener('input',e=>setSkin({[k]:e.target.value}));host.appendChild(ic);
  });
  // cuerpo entero: un solo color para casco, pecho, brazos y piernas (los detalles y el visor no cambian)
  const cuerpo=c=>setSkin({c,ck:null,cp:null,cb:null,cl:null});
  BODY_COLS.forEach(c=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.dataset.c=c;b.setAttribute('aria-label','Cuerpo '+c);b.addEventListener('click',()=>cuerpo(c));$('swCuerpo').appendChild(b);});
  const ci=document.createElement('input');ci.type='color';ci.setAttribute('aria-label','Color personalizado del cuerpo');ci.addEventListener('input',e=>cuerpo(e.target.value));$('swCuerpo').appendChild(ci);
  C.ACCESSORIES.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.textContent=n;b.addEventListener('click',()=>setSkin({a:i}));$('segAcc').appendChild(b);});
  // emblemas del pecho
  const NOM={ancla:'Ancla',flecha:'Flecha',corazon:'Corazón',estrella:'Estrella',calavera:'Calavera',rayo:'Rayo',mira:'Mira',corona:'Corona',escudo:'Escudo',alas:'Alas',espada:'Espada',ninguno:'Sin emblema'};
  C.EMBLEMS.forEach(id=>{
    const b=document.createElement('button');b.type='button';b.dataset.em=id;b.title=NOM[id];b.setAttribute('aria-label','Emblema '+NOM[id]);
    if(id==='ninguno')b.textContent='✕';else{const cvs=document.createElement('canvas');cvs.width=cvs.height=64;cvs.getContext('2d').drawImage(rbEmblemaTex(id).image,0,0,64,64);b.appendChild(cvs);}
    b.addEventListener('click',()=>setSkin({em:id,img:null}));$('emGrid').appendChild(b);
  });
})();
// ---------- Taquilla v2: pestañas por parte (la cámara se acerca sola), looks listos, aleatorio y restablecer ----------
const LK_FOCO={cuerpo:[1,1.0],casco:[.4,1.76],pecho:[.5,1.45],brazos:[.62,1.36],piernas:[.62,.6],detalles:[.85,1.05]};
function lockTab(n,foco){
  [...$('lkTabs').children].forEach(b=>{const on=b.dataset.tab===n;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  ['cuerpo','casco','pecho','brazos','piernas','detalles'].forEach(k=>$('lkP-'+k).hidden=k!==n);
  if(foco&&lock&&LK_FOCO[n]){lockZoom(LK_FOCO[n][0]);lock.tyt=LK_FOCO[n][1];lock.hold=3;}
}
(function(){
  const tabs=$('lkTabs');
  tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b){lockTab(b.dataset.tab,true);SFX.ui();}});
  tabs.addEventListener('keydown',e=>{
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();
    const bs=[...tabs.children],i=bs.findIndex(b=>b.getAttribute('aria-selected')==='true'),n=bs[(i+(e.key==='ArrowRight'?1:bs.length-1))%bs.length];
    lockTab(n.dataset.tab,true);n.focus();
  });
  const alAzar=a=>a[Math.random()*a.length|0];
  $('lkRand').addEventListener('click',()=>{const c=alAzar(BODY_COLS);setSkin({c,ck:alAzar(BODY_COLS),cp:alAzar(BODY_COLS),cb:alAzar(BODY_COLS),cl:alAzar(BODY_COLS),c2:null,c3:alAzar(BODY_COLS),v:alAzar(VISOR_COLS.filter(x=>x!=='#111111')),em:alAzar(C.EMBLEMS.filter(x=>x!=='ninguno')),ce:null,img:null});});
  $('lkReset').addEventListener('click',()=>setSkin({c:C.COLORS[0],ck:null,cp:null,cb:null,cl:null,c2:null,c3:null,ce:null,v:'#2be6ff',a:0,em:null}));
})();
function syncLockerTabs(){
  const P=skinParts(S.skin),col={cuerpo:P.c,casco:P.ck,pecho:P.cp,brazos:P.cb,piernas:P.cl,detalles:P.c3};
  [...$('lkTabs').children].forEach(b=>b.querySelector('i').style.setProperty('--c',col[b.dataset.tab]));
}
// ---------- Mis combinaciones: solo con sesión iniciada; se guardan en este navegador, una lista por cuenta (máximo 8) ----------
const LK_CAMPOS=['c','ck','cp','cb','cl','c3','v','a','em','ce','img'];
let lkAdding=false;
function comboKey(){return ACC?'cuenk_combos_'+(ACC.cid||ACC.nombre):null;}
function comboLeer(){try{const a=JSON.parse(localStorage.getItem(comboKey())||'[]');return Array.isArray(a)?a.slice(0,8):[];}catch(e){return [];}}
function comboGuardar(a){try{localStorage.setItem(comboKey(),JSON.stringify(a));return true;}catch(e){return false;}}
function renderCombos(){
  const box=$('lkCombos');if(!box)return;box.textContent='';
  if(!ACC||!ACCTOK){
    const g=document.createElement('div');g.className='lkgate';
    g.innerHTML='<span>Iniciá sesión con Google para guardar tus combinaciones.</span>';
    const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Iniciar sesión';
    b.addEventListener('click',()=>{const a=$('acctBox');a.scrollIntoView({behavior:'smooth',block:'center'});a.classList.remove('lkpulse');void a.offsetWidth;a.classList.add('lkpulse');});
    g.appendChild(b);box.appendChild(g);return;
  }
  const lista=comboLeer();
  lista.forEach((cb,i)=>{
    const s=cb.s||{},P=skinParts(s),chip=document.createElement('div');chip.className='lkchip';chip.tabIndex=0;chip.setAttribute('role','button');chip.setAttribute('aria-label','Usar la combinación '+cb.n);chip.title='Usar esta combinación';
    chip.innerHTML='<span class="bars"><i style="background:'+P.cp+'"></i><i style="background:'+P.cb+'"></i><i style="background:'+P.cl+'"></i></span>';
    const nm=document.createElement('span');nm.textContent=cb.n;chip.appendChild(nm);
    const usar=()=>{const p={};LK_CAMPOS.forEach(k=>{p[k]=s[k]==null?null:s[k];});if(p.v==null)p.v='#2be6ff';if(p.a==null)p.a=0;p.c2=null;setSkin(p);};
    chip.addEventListener('click',usar);chip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();usar();}});
    const x=document.createElement('button');x.type='button';x.className='x';x.textContent='×';x.title='Borrar';x.setAttribute('aria-label','Borrar la combinación '+cb.n);
    x.addEventListener('click',e=>{e.stopPropagation();const a=comboLeer();a.splice(i,1);comboGuardar(a);renderCombos();});chip.appendChild(x);
    box.appendChild(chip);
  });
  if(lkAdding){
    const f=document.createElement('form');f.className='lkadd';
    const inp=document.createElement('input');inp.maxLength=14;inp.placeholder='Nombre';inp.value='Combinación '+(lista.length+1);inp.setAttribute('aria-label','Nombre de la combinación');
    const ok=document.createElement('button');ok.type='submit';ok.className='btn';ok.textContent='Guardar';
    const no=document.createElement('button');no.type='button';no.className='btn';no.textContent='Cancelar';no.addEventListener('click',()=>{lkAdding=false;renderCombos();});
    f.addEventListener('submit',e=>{e.preventDefault();const n=inp.value.replace(/[<>]/g,'').trim().slice(0,14)||'Combinación '+(lista.length+1),s={};LK_CAMPOS.forEach(k=>{if(S.skin[k]!=null)s[k]=S.skin[k];});
      const a=comboLeer();a.push({n,s});if(!comboGuardar(a)){delete s.img;comboGuardar(a);}lkAdding=false;renderCombos();SFX.ui();});
    f.append(inp,ok,no);box.appendChild(f);setTimeout(()=>{inp.focus();inp.select();},0);
  }else if(lista.length<8){
    const b=document.createElement('button');b.type='button';b.className='btn';b.textContent='+ Guardar esta combinación';b.addEventListener('click',()=>{lkAdding=true;renderCombos();});box.appendChild(b);
  }else{const n=document.createElement('span');n.className='note';n.textContent='Máximo 8: borrá una para guardar otra.';box.appendChild(n);}
}

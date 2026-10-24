/* =================== TIENDA =================== */
let iconCache=null;
function shopIcons(){
  if(iconCache)return iconCache;
  iconCache={};
  try{
    const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(256,112,false);
    const sc=new THREE.Scene();sc.add(new THREE.AmbientLight(0xffffff,.65));const dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(1,2,2);sc.add(dl);
    const cam=new THREE.OrthographicCamera(-.6,.6,.26,-.26,.01,10);cam.position.set(-3,.4,0);cam.lookAt(0,0,0);
    for(let i=0;i<WEAPONS.length;i++){const g=buildGun(i);const bb=new THREE.Box3().setFromObject(g),c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3());const s=1/Math.max(sz.z,sz.y*2.2,.01);g.scale.setScalar(s);g.position.set(-c.x*s,-c.y*s,-c.z*s);sc.add(g);r.clear();r.render(sc,cam);const u=r.domElement.toDataURL();if(typeof u==='string'&&u.startsWith('data:'))iconCache['w'+i]=u;sc.remove(g);}
    r.dispose();
  }catch(e){}
  const draw=(fn)=>cv(256,112,fn).toDataURL();
  const shield=(g,col,n)=>{g.translate(128,56);for(let k=0;k<n;k++){g.save();g.translate((k-(n-1)/2)*44,0);g.fillStyle=col;g.beginPath();g.moveTo(0,-40);g.lineTo(32,-28);g.lineTo(28,12);g.lineTo(0,42);g.lineTo(-28,12);g.lineTo(-32,-28);g.closePath();g.fill();g.strokeStyle='#0b0907';g.lineWidth=4;g.stroke();g.restore();}};
  iconCache.a1=draw(g=>shield(g,'#cfd8c8',1));iconCache.a2=draw(g=>shield(g,'#ffb06a',2));
  iconCache.am=draw(g=>{g.fillStyle='#c9a227';for(let k=0;k<6;k++){g.fillRect(60+k*24,36,14,48);g.beginPath();g.arc(67+k*24,36,7,Math.PI,0);g.fill();}});
  iconCache.rf=draw(g=>{g.strokeStyle='#cfd8c8';g.lineWidth=8;g.beginPath();g.arc(128,56,32,.3,5.6);g.stroke();g.fillStyle='#cfd8c8';g.beginPath();g.moveTo(160,22);g.lineTo(172,50);g.lineTo(144,46);g.fill();});
  return iconCache;
}
function openShop(){
  if(!inGame||!liveState())return;
  if(MODE==='gungame'){announce('SIN TIENDA','En Gungame cada baja te da el arma siguiente');SFX.deny();return;}
  if(!C.MODES[MODE].shop){announce('SIN TIENDA','En '+C.MODES[MODE].name+' se juega con lo que hay');SFX.deny();return;}
  $('shop').hidden=false;mouseDown=false;for(const k in keys)keys[k]=false;
  selfUnlock();
  shopMsg('');renderShop();SFX.ui();
}
function closeShop(silent){if($('shop').hidden)return;$('shop').hidden=true;if(!silent&&inGame){lockPointer();SFX.ui();}}
function shopMsg(t,cls){const e=$('shopMsg');e.textContent=t;e.className=cls||'';}
function renderShop(){
  const ic=shopIcons();
  $('shopCr').textContent='¤ '+me.cr.toLocaleString('es-AR');
  const cats=[];C.SHOP.forEach(it=>{if(!cats.includes(it.cat))cats.push(it.cat);});
  const owned=it=>(it.w!=null&&C.PRIMARY.includes(it.w))?C.primaryOf(me.ow)===it.w:it.free||(it.w!=null&&!it.once&&me.unl[it.w])||(it.armor&&me.perk.ar>=it.armor)||(it.id==='am'&&me.perk.am);
  $('shopGrid').innerHTML=cats.map(cat=>'<div class="scol"><h3>'+cat+'</h3>'+C.SHOP.filter(it=>it.cat===cat).map(it=>{
    const own=owned(it),poor=!own&&me.cr<it.price;
    return '<button type="button" class="card'+(own?' own':'')+(poor?' poor':'')+'" data-id="'+it.id+'"'+(own?' disabled':'')+'>'+
      '<img alt="" src="'+(ic[it.id]||ic['w'+it.w]||'')+'"><span class="nm">'+it.name+'</span>'+
      '<span class="pr">'+(own?'TUYA':'¤ '+it.price.toLocaleString('es-AR'))+'</span><span class="ds">'+it.desc+'</span></button>';
  }).join('')+'</div>').join('');
}
$('shopGrid').addEventListener('click',e=>{const b=e.target.closest('.card');if(!b||b.disabled||!net)return;net.send({t:'buy',id:b.dataset.id});});
$('shop').addEventListener('click',e=>{if(e.target===$('shop'))closeShop();});

/* =================== TAQUILLA =================== */
const BODY_COLS=['#e8542a','#3fa7ff','#9ccc3c','#ffcc33','#c45cff','#ff5c8a','#38d6c4','#f2efe6','#ff8f1f','#7a8cff','#2a2a2e','#b8ff3a'];
const VISOR_COLS=['#ffffff','#2be6ff','#ff3fd2','#3aff9c','#ffcf3a','#ff3a3a','#8a4bff','#111111'];
let lock=null;
function lockerInit(){
  if(lock)return;
  try{
    const r=new THREE.WebGLRenderer({canvas:$('lockPrev'),alpha:true,antialias:true});r.setPixelRatio(1);r.setSize(440,520,false);
    const sc=new THREE.Scene();sc.add(new THREE.AmbientLight(0xffffff,.55));const dl=new THREE.DirectionalLight(0xffe2c0,.9);dl.position.set(1.5,3,2);sc.add(dl);
    const rim=new THREE.DirectionalLight(0xff3fd2,.6);rim.position.set(-2,1.5,-2);sc.add(rim);
    const cam=new THREE.PerspectiveCamera(32,440/520,.1,20);cam.position.set(0,1.35,4.4);cam.lookAt(0,1.05,0);
    lock={r,sc,cam,model:null,rot:.6};
  }catch(e){lock={r:null};}
  rebuildLockModel();
}
function rebuildLockModel(){if(!lock||!lock.r)return;if(lock.model)lock.sc.remove(lock.model.g);lock.model=buildPlayer(S.skin,S.name,true);lock.sc.add(lock.model.g);}
// girar al personaje arrastrando (mouse o dedo) o con las flechas; la vuelta sola se pausa un rato
(function(){
  const c=$('lockPrev');let drag=false,lx=0;
  c.style.touchAction='none';c.style.cursor='grab';c.tabIndex=0;c.setAttribute('aria-label','Vista de tu personaje: arrastrá o usá las flechas para girarlo');
  c.addEventListener('pointerdown',e=>{if(!lock)return;drag=true;lx=e.clientX;c.setPointerCapture(e.pointerId);c.style.cursor='grabbing';lock.hold=3;});
  c.addEventListener('pointermove',e=>{if(!drag||!lock)return;lock.rot+=(e.clientX-lx)*.014;lx=e.clientX;lock.hold=3;});
  const up=()=>{drag=false;c.style.cursor='grab';};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
  c.addEventListener('keydown',e=>{if(!lock)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();lock.rot+=(e.key==='ArrowLeft'?-1:1)*.35;lock.hold=3;}});
})();
function renderLocker(dt){if(!lock||!lock.r||$('lockerPanel').hidden||$('menu').hidden)return;lock.hold=(lock.hold||0)-dt;if(lock.hold<=0)lock.rot+=dt*.8;lock.model.g.rotation.y=lock.rot;lock.model.armR.rotation.x=-.2;lock.r.render(lock.sc,lock.cam);}
function syncLocker(){
  [...$('swBody').querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===S.skin.c)));
  [...$('swVisor').querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===S.skin.v)));
  [...$('segAcc').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===S.skin.a)));
  const ci=$('swBodyCustom');if(ci)ci.value=S.skin.c;
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
$('chestDel').addEventListener('click',()=>{delete S.skin.img;setSkin({});$('chestNote').textContent='PNG o JPG. Se recorta cuadrada al centro y cubre todo el pecho.';});
function syncChest(){const has=!!S.skin.img;$('chestPrev').hidden=!has;$('chestDel').hidden=!has;if(has)$('chestPrev').src=S.skin.img;}
function setSkin(p){Object.assign(S.skin,p);saveS();syncLocker();syncChest();rebuildLockModel();acctSave();if(net&&inGame)net.send({t:'skin',s:S.skin});SFX.ui();}
(function(){
  const mk=(host,cols,key)=>{cols.forEach(c=>{const b=document.createElement('button');b.type='button';b.style.background=c;b.dataset.c=c;b.setAttribute('aria-label','Color '+c);b.addEventListener('click',()=>setSkin({[key]:c}));host.appendChild(b);});};
  mk($('swBody'),BODY_COLS,'c');mk($('swVisor'),VISOR_COLS,'v');
  const ci=document.createElement('input');ci.type='color';ci.id='swBodyCustom';ci.setAttribute('aria-label','Color personalizado');ci.addEventListener('input',e=>setSkin({c:e.target.value}));$('swBody').appendChild(ci);
  C.ACCESSORIES.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.textContent=n;b.addEventListener('click',()=>setSkin({a:i}));$('segAcc').appendChild(b);});
})();


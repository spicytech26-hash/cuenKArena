/* ---------- personaje con piel (armadura, visor y accesorio) ---------- */
const tpCache={};
function tpGun(w){if(!tpCache[w])tpCache[w]=buildGun(w);return tpCache[w].clone();}
const chestGeo=new THREE.PlaneGeometry(.52,.52),chestCache=new Map();
function chestTex(url){
  let t=chestCache.get(url);if(t)return t;
  const img=new Image();t=new THREE.Texture(img);t.minFilter=THREE.LinearFilter;img.onload=()=>{t.needsUpdate=true;};img.src=url;
  chestCache.set(url,t);if(chestCache.size>40)chestCache.delete(chestCache.keys().next().value);
  return t;
}
function buildPlayer(skin,name,noTag){
  const col=new THREE.Color(skin.c),vis=new THREE.Color(skin.v||'#ffffff');
  const mA=new THREE.MeshPhongMaterial({color:col,flatShading:true,shininess:30,specular:0x332a20});
  const mL=new THREE.MeshPhongMaterial({color:0x2e2a26,flatShading:true});
  const mH=new THREE.MeshPhongMaterial({color:col.clone().multiplyScalar(.6),flatShading:true});
  const mV=new THREE.MeshBasicMaterial({color:vis});
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);
  const legs=[-1,1].map(side=>{const l=new THREE.Group();l.position.set(side*.15,.85,0);l.add(bx(.2,.85,.24,mL,0,-.42,0),bx(.24,.13,.33,mA,0,-.8,.04));b.add(l);return l;});
  const hasImg=!!(skin.img&&(noTag||S.showImg));
  b.add(bx(.5,.18,.3,mL,0,.9,0),bx(.6,.62,.38,mA,0,1.26,0),bx(.24,.17,.42,mA,-.4,1.53,0),bx(.24,.17,.42,mA,.4,1.53,0));
  if(!hasImg)b.add(bx(.42,.28,.06,mL,0,1.3,.2),bx(.08,.08,.02,mV,.18,1.42,.23));
  // imagen del pecho: un cuadrado sobre la placa oscura del frente
  if(hasImg){const pl=new THREE.Mesh(chestGeo,new THREE.MeshBasicMaterial({map:chestTex(skin.img)}));pl.position.set(0,1.27,.1925);b.add(pl);}
  const head=new THREE.Group();head.position.y=1.74;head.add(bx(.3,.3,.3,mH,0,0,0),bx(.27,.07,.04,mV,0,.03,.16));b.add(head);
  const a=skin.a|0;
  if(a===1)head.add(bx(.06,.14,.34,mV,0,.2,-.01));
  if(a===2){const ant=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.4,6),mDark);ant.position.set(.1,.32,0);head.add(ant);const tip=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),mV);tip.position.set(.1,.53,0);head.add(tip);}
  if(a===3)for(const sx of [-1,1]){const h=new THREE.Mesh(new THREE.ConeGeometry(.05,.22,6),mV);h.position.set(sx*.13,.22,0);h.rotation.z=-sx*.5;head.add(h);}
  if(a===4)head.add(bx(.32,.08,.32,mA,0,.18,0),bx(.3,.03,.18,mA,0,.15,.22));
  const armL=new THREE.Group();armL.position.set(-.42,1.45,0);armL.add(bx(.15,.62,.17,mL,0,-.3,0));b.add(armL);
  const armR=new THREE.Group();armR.position.set(.42,1.45,0);armR.add(bx(.15,.15,.5,mL,0,-.12,.2));b.add(armR);
  // el arma que tiene en la mano (se cambia sola cuando cambia de arma)
  const gun=new THREE.Group();gun.position.set(0,-.13,.36);gun.rotation.y=Math.PI;gun.scale.setScalar(1.25);armR.add(gun);
  if(noTag){gun.add(tpGun(1));gun.userData.w=1;}
  let tag=null;if(!noTag){tag=nameSprite(name,skin.c);g.add(tag);}
  return {g,b,legs,armL,armR,head,gun,tag,mats:[mA,mH]};
}

/* ---------- ítems ---------- */
const healthTex=new THREE.CanvasTexture(cv(32,32,g=>{g.fillStyle='#d9d2c4';g.fillRect(0,0,32,32);g.fillStyle='#a9a092';g.fillRect(0,30,32,2);g.fillRect(30,0,2,32);g.fillStyle='#c41a12';g.fillRect(12,5,8,22);g.fillRect(5,12,22,8);}));healthTex.magFilter=THREE.NearestFilter;
// un arma tirada puede cambiar (al agarrar con E queda la tuya en su lugar): se rearma el modelo
function setItemType(o,ty){if(!ty||o.ty===ty)return;const par=o.g.parent,ng=buildItem(ty);ng.position.copy(o.g.position);ng.rotation.copy(o.g.rotation);ng.visible=o.g.visible;
  if(par){par.remove(o.g);par.add(ng);}o.g=ng;o.ty=ty;}
function syncItems(m){m.items.forEach((u,i)=>{const o=level.items[i];if(!o)return;if(m.ity)setItemType(o,m.ity[i]);o.g.visible=!!u;});}
// escudo heráldico (forma de escudo de verdad) para el blindaje y los mini escudos del sifón
function shieldShape(k){const s=new THREE.Shape();s.moveTo(0,.5*k);s.quadraticCurveTo(.2*k,.4*k,.42*k,.47*k);s.lineTo(.41*k,.06*k);s.quadraticCurveTo(.36*k,-.33*k,0,-.56*k);s.quadraticCurveTo(-.36*k,-.33*k,-.41*k,.06*k);s.lineTo(-.42*k,.47*k);s.quadraticCurveTo(-.2*k,.4*k,0,.5*k);return s;}
const SHIELD_GEO=new THREE.ExtrudeGeometry(shieldShape(1),{depth:.08,bevelEnabled:true,bevelThickness:.04,bevelSize:.035,bevelSegments:2,curveSegments:10});SHIELD_GEO.center();
const SHIELD_IN=new THREE.ExtrudeGeometry(shieldShape(.68),{depth:.06,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:1,curveSegments:8});SHIELD_IN.center();
function buildShield(outer,inner,emo,emi,big){const g=new THREE.Group();
  const a=new THREE.Mesh(SHIELD_GEO,new THREE.MeshPhongMaterial({color:outer,emissive:emo,shininess:90,specular:0x666666}));
  const b=new THREE.Mesh(SHIELD_IN,new THREE.MeshPhongMaterial({color:inner,emissive:emi,shininess:60}));b.position.z=.07;const b2=b.clone();b2.position.z=-.07;
  const bar=new THREE.Mesh(new THREE.BoxGeometry(.07,.52,.03),new THREE.MeshPhongMaterial({color:outer,emissive:emo}));bar.position.z=.11;const bar2=bar.clone();bar2.position.z=-.11;
  g.add(a,b,b2,bar,bar2);if(big){const t=new THREE.Mesh(new THREE.BoxGeometry(.4,.07,.03),bar.material);t.position.set(0,.08,.11);const t2=t.clone();t2.position.z=-.11;g.add(t,t2);}
  return g;}
// botiquín: valija blanca con cruz roja y manija; la megasalud es una valija azul más grande que brilla
function buildMedkit(mega){const g=new THREE.Group(),w=mega?.8:.62,h=mega?.58:.44,d=mega?.4:.3;
  const body=new THREE.MeshPhongMaterial({color:mega?0x3a8cff:0xe9e4da,emissive:mega?0x0a2a6a:0x221d18,shininess:50}),cross=new THREE.MeshPhongMaterial({color:mega?0xffffff:0xd01e14,emissive:mega?0x7aa8ff:0x400806});
  g.add(bx(w,h,d,body,0,0,0),bx(w+.03,.05,d+.03,new THREE.MeshPhongMaterial({color:mega?0x1a4aa0:0xb8b0a2}),0,h*.18,0));
  for(const z of [d/2+.012,-d/2-.012]){g.add(bx(h*.24,h*.66,.025,cross,0,-h*.02,z),bx(h*.66,h*.24,.025,cross,0,-h*.02,z));}
  g.add(bx(.06,.12,.06,mDark,-w*.22,h/2+.06,0),bx(.06,.12,.06,mDark,w*.22,h/2+.06,0),bx(w*.5,.05,.07,mDark,0,h/2+.12,0));
  if(mega){const r=new THREE.Mesh(new THREE.TorusGeometry(.62,.03,6,32),new THREE.MeshBasicMaterial({color:0x7ab8ff,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));r.rotation.x=Math.PI/2;r.position.y=-.38;g.add(r);}
  return g;}
function buildItem(t){const g=new THREE.Group();
  if(GLB.items[t]){g.add(GLB.items[t].obj.clone(true));return g;}
  if(t==='health')g.add(buildMedkit(false));
  if(t==='mega')g.add(buildMedkit(true));
  if(t==='armor'){const s=buildShield(0x7fc23a,0x3f6a1a,0x2a4a0a,0x0e1e04,false);s.scale.setScalar(1.05);g.add(s);}
  if(t==='armorH'){const s=buildShield(0xffc23a,0xc8281e,0x6a4208,0x3a0804,true);s.scale.setScalar(1.3);g.add(s);}
  if(t==='quad'){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,0),new THREE.MeshPhongMaterial({color:0xb46cff,emissive:0x5a1aa0,flatShading:true,shininess:100}));g.add(m);}
  if(t==='shells')g.add(bx(.55,.32,.36,mRed,0,0,0),bx(.56,.08,.37,mBrass,0,.05,0));
  if(t==='bullets')g.add(bx(.6,.36,.4,new THREE.MeshPhongMaterial({color:0x6b6a3a,flatShading:true}),0,0,0),bx(.2,.06,.3,mDark,0,.2,0));
  if(t==='rockets')[-.15,0,.15].forEach(x=>g.add(cy(.06,.55,mGun,x,0,0),cy(.065,.08,mRed,x,0,-.3)));
  if(t==='grenades')[[-.14,0],[.14,0],[0,.2]].forEach(([x,y])=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,0),mOlive);m.position.set(x,y-.05,0);g.add(m);});
  if(t==='caza')g.add(bx(.5,.26,.32,woodRifle,0,0,0),bx(.4,.06,.2,mBrass,0,.15,0));
  if(t==='slugs')g.add(bx(.55,.3,.3,mDark,0,0,0),bx(.56,.06,.31,mRail,0,.04,0));
  const inf=C.ITEMS[t];if(inf&&inf.weapon!=null){const m=buildGun(inf.weapon);m.scale.setScalar(1.55);g.add(m);}
  return g;}

/* ---------- sifón: mini escudos que suelta el que muere (los junta el que pasa por encima) ---------- */
const shards=new Map();
const SHARD_MAT=new THREE.MeshPhongMaterial({color:0xd8ff4a,emissive:0x6a9a08,shininess:120,specular:0xffffff});
const SHARD_GLOW=new THREE.MeshBasicMaterial({color:0xc8ff40,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false});
function addShard(id,ox,oy,oz,x,y,z,left){
  if(shards.has(id))return;const g=new THREE.Group(),m=new THREE.Mesh(SHIELD_GEO,SHARD_MAT);m.scale.setScalar(.45);g.add(m);
  const gl=new THREE.Mesh(SHIELD_GEO,SHARD_GLOW);gl.scale.setScalar(.62);g.add(gl);
  g.position.set(ox,oy,oz);scene.add(g);const landed=ox===x&&oy===y&&oz===z;
  // edad en el piso: 0 al caer; si llega en la bienvenida, se calcula con lo que le queda
  shards.set(id,{g,ox,oy,oz,x,y,z,t:landed?1:0,ph:Math.random()*6,age:left!=null?Math.max(0,10-left):0});
}
function removeShard(id,by){const s=shards.get(id);if(!s)return;scene.remove(s.g);shards.delete(id);
  if(by&&by===myId){SFX.shard();G.pick=.25;$('pick').textContent='+5 de escudo';$('pick').classList.remove('show');void $('pick').offsetWidth;$('pick').classList.add('show');}
  else if(by){const v=vAt(s.x,s.y,s.z);if(v>.3)tn({type:'sine',f0:1500,f1:2100,dur:.06,vol:.04*v});}}
function clearShards(){for(const s of shards.values())scene.remove(s.g);shards.clear();}
function updShards(dt){for(const s of shards.values()){
  if(s.t<1){s.t=Math.min(1,s.t+dt/.45);const u=s.t;s.g.position.set(s.ox+(s.x-s.ox)*u,s.oy+(s.y+.45-s.oy)*u+Math.sin(u*Math.PI)*1.1,s.oz+(s.z-s.oz)*u);s.g.rotation.y+=dt*9;continue;}
  s.ph+=dt;s.age+=dt;s.g.rotation.y+=dt*2.4;s.g.position.set(s.x,s.y+.45+Math.sin(s.ph*3)*.08,s.z);
  // a los 8 s empieza a parpadear, cada vez más rápido, y a los 10 s el servidor lo saca
  s.g.visible=s.age<8||Math.sin((s.age-8)*(10+(s.age-8)*14))>-.2;}}


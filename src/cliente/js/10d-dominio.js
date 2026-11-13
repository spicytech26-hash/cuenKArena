/* ---------- Captura el dominio: bosses, generadores, barreras, avisos, HUD y minimapa ----------
   Todo lo decide el servidor (src/nucleo/07-partida/5b-dominio.js): acá solo se dibuja.
   El estado llega entero en `welcome`, `start` y `sc` (resincroniza una vez por segundo: `dm`), los cambios
   rápidos en el snapshot (`bs` bosses, `gh` vida de generadores, `ob` orbes) y lo demás por avisos `dom`.
   Los bosses están hechos en código a partir de las imágenes de referencia (no hay .glb): pocas mallas
   unidas por pieza rígida y animación procedural (brazos, cadenas, halo, capa). De lejos se apaga lo fino. */
const DM={on:false,g:[],b:[],h:[0,0],gens:[],bars:[],boss:[],orbs:new Map(),zones:[],grp:null,mmT:0,hudKey:'',bg:null,veins:null,alertT:0};
const DCOL=[0xff7a20,0x2fb8ff],DCSS=['#ff8a2a','#3fa7ff'],DNAME=['ROJO','AZUL'];   // en este modo el rojo se ve naranja, como en el arte del mapa
const DLOD={BOSS:95,GEN:150,BAR:210};   // a más de estos metros se simplifica u oculta
const dmV=new THREE.Vector3();
function dmGeo(parts){const P=[],N=[],Cc=[],c=new THREE.Color();
  for(const [g0,col] of parts){const g=g0.index?g0.toNonIndexed():g0,p=g.attributes.position.array,n=g.attributes.normal.array;c.setHex(col);
    for(let i=0;i<p.length;i+=3){P.push(p[i],p[i+1],p[i+2]);N.push(n[i],n[i+1],n[i+2]);Cc.push(c.r,c.g,c.b);}}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(P,3));o.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));o.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));return o;}
const dmT=(g,x,y,z,rx,ry,rz)=>{if(rx)g.rotateX(rx);if(rz)g.rotateZ(rz);if(ry)g.rotateY(ry);g.translate(x||0,y||0,z||0);return g;};
const dmBox=(w,h,d,x,y,z,rx,ry,rz)=>dmT(new THREE.BoxGeometry(w,h,d),x,y,z,rx,ry,rz);
const dmCyl=(r1,r2,h,n,x,y,z,rx,ry,rz)=>dmT(new THREE.CylinderGeometry(r1,r2,h,n),x,y,z,rx,ry,rz);
const dmSph=(r,x,y,z)=>dmT(new THREE.IcosahedronGeometry(r,1),x,y,z);
let dmMatS=null,dmMatBurnt=null;
const dmMat=()=>dmMatS||(dmMatS=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:38,specular:0x39404a,side:THREE.DoubleSide}));
const dmGlow=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o==null?1:o,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
const DWH=0xe9edf0,DDK=0x22252b,DMT=0x8b9098,DBZ=0x9a6a2c,DBZD=0x5e4020;

/* ---- boss: 14 m, mira hacia -z y se gira con el yaw del servidor ---- */
function buildBoss(team){
  const g=new THREE.Group(),m=dmMat(),col=DCOL[team],o={g,team,fino:[],t:Math.random()*9,atk:0,warn:0,dur:1,fx:0,fxK:0,pain:0,dead:0,yaw:0,yawT:0,hp:1,tgt:0};
  const mesh=(parts,par)=>{const q=new THREE.Mesh(dmGeo(parts),m);(par||g).add(q);return q;};
  // piernas, túnica rasgada y cintura
  const robe=new THREE.CylinderGeometry(1.15,2.35,6.6,14,3,true);{const p=robe.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<-3.2)p.setY(i,p.getY(i)+((i*7919)%13)/13*1.5);robe.translate(0,4.2,0);robe.computeVertexNormals();}
  const low=[[robe,DWH],[dmCyl(1.25,1.2,.6,10,0,7.7,0),DDK],[dmBox(2.3,.9,1.5,0,7.2,0),DWH]];
  for(const s of [-1,1])low.push([dmBox(.9,.5,1.7,s*.7,.25,-.25),DDK],[dmCyl(.36,.3,2.4,8,s*.7,1.6,0),DDK],[dmBox(.5,1.6,.2,s*.7,1.9,-.4),DWH]);
  if(team===0)for(let i=-2;i<=2;i++)low.push([dmBox(.72,8.4-Math.abs(i)*.9,.07,i*.78,6.3+Math.abs(i)*.45,1.05+Math.abs(i)*.06,.05),DWH]);   // capa en tiras (boss rojo)
  mesh(low);
  // torso (respira), con el anillo del núcleo
  const tor=o.tor=new THREE.Group();g.add(tor);
  const tp=[[dmCyl(.95,1.15,1.5,8,0,8.5,0),DDK],[dmBox(3.2,2.2,1.7,0,9.9,0),DWH],[dmBox(2.2,.5,1.9,0,10.9,0),DDK],[dmCyl(.45,.5,.7,8,0,11.3,0),DDK],
    [dmT(new THREE.TorusGeometry(.66,.14,6,14),0,9.6,-.9),DDK],[dmBox(1.1,.9,.25,-1,9.9,-.9),DWH],[dmBox(1.1,.9,.25,1,9.9,-.9),DWH]];
  for(const s of [-1,1])tp.push([dmSph(.9,s*2.15,10.65,0),DWH],[dmBox(.5,1.2,1.2,s*1.75,9.2,0),DDK]);
  mesh(tp,tor);
  o.core=new THREE.Mesh(new THREE.SphereGeometry(.56,12,10),new THREE.MeshBasicMaterial({color:col,fog:false}));o.core.position.set(0,9.6,-1);tor.add(o.core);
  o.coreGlow=new THREE.Mesh(new THREE.SphereGeometry(1.25,10,8),dmGlow(col,.28));o.coreGlow.position.copy(o.core.position);tor.add(o.coreGlow);
  // cabeza y halo de espinas
  const head=o.head=new THREE.Group();head.position.set(0,11.6,0);tor.add(head);
  const hp=[[dmBox(1,1.3,1.15,0,.72,0),DWH],[dmBox(.82,.34,.12,0,.8,-.58),DDK],[dmBox(.6,.4,.5,0,.1,-.2),DDK]];
  if(team===0)hp.push([dmCyl(.02,.2,1.5,5,0,2,0),0xc9a84e]);
  mesh(hp,head);
  const halo=o.halo=new THREE.Group();halo.position.set(0,1,.5);head.add(halo);
  const ha=[[new THREE.TorusGeometry(1.25,.1,5,20),DMT]],tips=[];
  for(let i=0;i<12;i++){const a=i/12*6.2832,L=i%2?1.05:.7;ha.push([dmT(new THREE.ConeGeometry(.15,L,5),Math.cos(a)*(1.3+L/2),Math.sin(a)*(1.3+L/2),0,0,0,a-1.5708),team?DMT:DWH]);tips.push([dmT(new THREE.OctahedronGeometry(.16,0),Math.cos(a)*(1.36+L),Math.sin(a)*(1.36+L),0),0xffffff]);}
  mesh(ha,halo);
  if(team===1){o.tips=new THREE.Mesh(dmGeo(tips),new THREE.MeshBasicMaterial({color:col,fog:false}));halo.add(o.tips);}
  // brazos (hombro y codo) con dos cadenas en cada muñeca
  const linkG=new THREE.BoxGeometry(.17,.62,.17);linkG.translate(0,-.33,0);
  o.arms=[-1,1].map(s=>{
    const sh=new THREE.Group();sh.position.set(s*2.2,10.6,0);tor.add(sh);
    mesh([[dmCyl(.42,.36,2.7,8,s*1.35,0,0,0,0,1.5708),DWH],[dmSph(.46,s*2.7,0,0),DDK]],sh);
    const el=new THREE.Group();el.position.set(s*2.7,0,0);sh.add(el);
    const fp=[[dmCyl(.36,.3,2.5,8,s*1.25,0,0,0,0,1.5708),DWH],[dmCyl(.42,.42,.7,8,s*2.1,0,0,0,0,1.5708),DDK],[dmBox(.7,.3,.6,s*2.85,0,0),DWH]];
    for(let k=-1;k<=1;k++)fp.push([dmT(new THREE.ConeGeometry(.09,team?.5:.8,4),s*(3.35+(team?0:.15)),0,k*.2,0,0,-s*1.5708),team?DWH:DDK]);
    mesh(fp,el);
    const chains=[-.26,.26].map(dz=>{const root=new THREE.Group();root.position.set(s*2.1,-.35,dz);el.add(root);const links=[];let par=root;
      for(let k=0;k<6;k++){const l=new THREE.Mesh(linkG,m);l.position.y=k?-.66:0;par.add(l);par=l;links.push(l);}o.fino.push(root);return {root,links,ph:Math.random()*6};});
    return {s,sh,el,chains};
  });
  // avisos en el piso: abanico del latigazo (rojo) o anillo del pulso (azul), y la línea del agarre
  const half=Math.acos(C.DOM.LASH.cos);
  o.tell=new THREE.Mesh(team===0?new THREE.CircleGeometry(C.DOM.LASH.r,28,1.5708-half,half*2):new THREE.RingGeometry(1.5,C.DOM.PULSE.r,48),dmGlow(col,0));o.tell.rotation.x=-1.5708;o.tell.position.y=.09;o.tell.visible=false;g.add(o.tell);
  o.beam=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3)),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.9,fog:false}));o.beam.frustumCulled=false;o.beam.visible=false;
  if(team===1&&o.tips)o.fino.push(o.tips);
  return o;
}
/* ---- generador: máquina de bronce con anillo luminoso ---- */
let dmGenG=null,dmGenRing=null;
function buildGen(team,x,y,z){
  if(!dmGenG){
    const p=[[dmBox(2,.45,2,0,.22,0),DDK],[dmBox(1.6,1.5,1.6,0,1.2,0),DBZ],[dmCyl(.62,.7,1.25,10,0,2.55,0),DBZD],[dmSph(.6,0,3.15,0),DBZ],[dmCyl(.14,.14,.6,6,.55,3.5,.3),DDK],[dmCyl(.2,.14,.25,6,.55,3.85,.3),DBZ]];
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){p.push([dmCyl(.13,.13,1.5,6,a*.9,1.25,b*.9),DBZD],[dmT(new THREE.TorusGeometry(.2,.07,5,8),a*.82,1.3,b*.82,0,b?0:1.5708),DDK]);}
    for(const s of [-1,1])p.push([dmCyl(.1,.1,1.7,6,s*.45,2.1,-.7,0,0,.5*s),DBZ]);
    dmGenG=dmGeo(p);dmGenRing=dmGeo([[dmCyl(.72,.72,.34,12,0,2.05,0),0xffffff],[dmBox(1.64,.5,.5,0,1.25,0),0xffffff],[dmBox(.5,.5,1.64,0,1.25,0),0xffffff]]);
    dmMatBurnt=new THREE.MeshPhongMaterial({color:0x17140f,flatShading:true,shininess:4});
  }
  const g=new THREE.Group();g.position.set(x,y,z);
  const body=new THREE.Mesh(dmGenG,dmMat()),ring=new THREE.Mesh(dmGenRing,new THREE.MeshBasicMaterial({color:DCOL[team],fog:false})),halo=new THREE.Mesh(new THREE.SphereGeometry(1.5,8,6),dmGlow(DCOL[team],.1));halo.position.y=2;
  g.add(body,ring,halo);
  return {g,body,ring,halo,team,x,y,z,hp:1,dead:false,ph:Math.random()*6,smoke:0};
}
/* ---- barrera: campo de fuerza translúcido con vetas de energía ---- */
function dmVeins(){
  if(DM.veins)return DM.veins;
  const t=new THREE.CanvasTexture(cv(128,128,(g)=>{g.fillStyle='#000';g.fillRect(0,0,128,128);
    for(let k=0;k<9;k++){g.strokeStyle='rgba(255,255,255,'+(.25+rnd()*.55)+')';g.lineWidth=1+rnd()*2.5;g.beginPath();let x=rnd()*128;g.moveTo(x,0);for(let y=0;y<=128;y+=16){x+=(rnd()-.5)*26;g.lineTo(x,y);}g.stroke();}
    const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(.5,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(255,255,255,.4)');g.fillStyle=gr;g.fillRect(0,0,128,128);}));
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,1);return DM.veins=t;
}
function buildBar(b){
  const mat=new THREE.MeshBasicMaterial({map:dmVeins(),color:DCOL[b.team],transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(b.w,b.h),mat);m.position.set(b.x,b.y+b.h/2,b.z);m.rotation.y=1.5708;m.renderOrder=4;
  return {m,mat,st:0,fall:0,x:b.x,y:b.y,z:b.z,w:b.w,h:b.h,team:b.team,lane:b.lane};
}
/* ---- arte de fondo: lo que enmarca el mapa ----
   Las ruinas, arcos, columnas, vitrales y caños del Santuario son bloques del mapa (02-mapas/9-santuario.js),
   así que el cliente los dibuja con el resto del nivel. Acá va solo lo que no puede ser un bloque:
   los acantilados y las ruinas lejanas del horizonte, el resplandor de las cúpulas y las brasas en el aire. */
function dmVitral(team){
  return new THREE.CanvasTexture(cv(64,128,(g)=>{const base=team?[40,120,255]:[255,120,30];g.fillStyle='#07080c';g.fillRect(0,0,64,128);
    for(let y=0;y<16;y++)for(let x=0;x<6;x++){const px=4+x*9.5+(y%2?4.7:0),py=6+y*7.6,inArch=Math.hypot((px-32)/30,(Math.min(py,40)-40)/36)<1;if(!inArch||px>60)continue;
      const k=.45+rnd()*.55,w=rnd()<.18;g.fillStyle='rgb('+(w?235:base[0]*k|0)+','+(w?225:base[1]*k|0)+','+(w?190:base[2]*k|0)+')';g.fillRect(px,py,8,6.2);}
    g.strokeStyle='#07080c';g.lineWidth=3;g.beginPath();g.moveTo(32,4);g.lineTo(32,128);g.moveTo(4,64);g.lineTo(60,64);g.stroke();}));
}
function dmArt(group,M){
  const B=M.bounds,far=[];
  // acantilados: un anillo de moles oscuras bien lejos, hundidas, para que el mapa no termine en el vacío
  const roca=(x,z,w,d,h,col)=>{for(let k=0;k<4;k++){const t=k/4,ww=w*(1-t*.42),dd=d*(1-t*.42);far.push([dmBox(ww,h/4+2,dd,x+(k%2?6:-5),-70+h*t+h/8,z+(k%3?-6:7)),k%2?col:col+0x060a0e]);}};
  const R0=Math.max(B.x1,B.z1)+150;
  for(let a2=0;a2<36;a2++){
    const an=a2/36*6.2832,rad=R0+((a2*37)%70),h=90+((a2*53)%90);
    roca(Math.cos(an)*rad*1.25,Math.sin(an)*rad,46+((a2*17)%30),44+((a2*29)%26),h,0x0e131d);
  }
  // ruinas lejanas: torres y campanarios recortados contra el cielo
  for(let a2=0;a2<14;a2++){
    const an=a2/14*6.2832+.22,rad=R0+90+((a2*61)%90),x=Math.cos(an)*rad*1.3,z=Math.sin(an)*rad,h=60+((a2*43)%70),w=14+((a2*23)%12);
    far.push([dmBox(w,h,w,x,h/2-10,z),0x131926],[dmBox(w*1.6,4,w*1.6,x,h-10,z),0x171e2d],[dmBox(w*.35,h*.55,w*.35,x+w*.9,h*.27-10,z+w*.5),0x131926]);
    if(a2%3===0)far.push([dmCyl(.5,w*.5,h*.45,6,x,h*1.18-10,z),0x171e2d]);
  }
  const m=new THREE.Mesh(dmGeo(far),new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));
  m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;group.add(m);
  // vitral de la cúpula, visto desde adentro de cada arena
  for(const team of [0,1]){
    const bo=M.bosses[team],g=new THREE.PlaneGeometry(11,11);g.rotateX(-1.5708);g.translate(bo.x,15.4,bo.z);
    group.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:dmVitral(team),side:THREE.DoubleSide,transparent:true,opacity:.75})));
  }
}
/* ---- cargar y sincronizar ---- */
function domClear(){
  DM.on=false;DM.gens=[];DM.bars=[];DM.boss=[];DM.zones=[];DM.orbs.clear();DM.grp=null;DM.hudKey='';DM.bg=null;
  $('domBox').hidden=true;$('domMap').hidden=true;
}
function domLoad(group,M){
  domClear();
  for(const b of M.brushes)if(b.bar)b.bar.down=false;
  if(MODE!=='dominio'||!M.gens)return;
  DM.on=true;DM.grp=new THREE.Group();group.add(DM.grp);
  DM.gens=M.gens.map(g=>{const o=buildGen(g.team,g.x,g.y,g.z);DM.grp.add(o.g);return o;});
  DM.bars=M.bars.map(b=>{const o=buildBar(b);DM.grp.add(o.m);return o;});
  DM.boss=M.bosses.map((b,t)=>{const o=buildBoss(t);o.g.position.set(b.x,b.y,b.z);o.x=b.x;o.y=b.y;o.z=b.z;o.yaw=o.yawT=b.yaw;o.g.rotation.y=b.yaw;DM.grp.add(o.g);DM.grp.add(o.beam);return o;});
  if(S.q)dmArt(DM.grp,M);   // en calidad Liviana no se dibuja el fondo lejano
  DM.g=M.gens.map(()=>C.DOM.GEN_HP);DM.b=M.bars.map(()=>0);DM.h=[C.DOM.BOSS_HP,C.DOM.BOSS_HP];
  $('domBox').hidden=false;$('domMap').hidden=false;
}
function domSet(dm){
  if(!DM.on||!dm)return;
  DM.g=dm.g.slice();DM.h=dm.h.slice();
  dm.b.forEach((st,i)=>domBarState(i,st,true));
  DM.gens.forEach((o,i)=>domGenHp(i,DM.g[i],true));
  DM.boss.forEach((o,i)=>{o.hp=DM.h[i]/C.DOM.BOSS_HP;if(DM.h[i]>0){o.dead=0;o.g.rotation.x=0;o.g.position.y=o.y;}else if(!o.dead)o.dead=9;});
}
function domBarState(i,st,quiet){
  const o=DM.bars[i];if(!o)return;const was=DM.b[i];DM.b[i]=st;
  for(const b of W.brushes)if(b.bar&&b.bar.i===i)b.bar.down=st===2;
  if(st===2&&was!==2&&!quiet){o.fall=.7;SFX.domBar(vAt(o.x,o.y+3,o.z));for(let k=0;k<40;k++)emit(sparks,o.x,o.y+Math.random()*o.h,o.z+(Math.random()-.5)*o.w,R(5),R(5),R(5),.7,1,.8,.5,3);}
  else if(st===2&&quiet)o.fall=0;
  o.st=st;o.m.visible=st!==2||o.fall>0;
}
function domGenHp(i,hp,quiet){
  const o=DM.gens[i];if(!o)return;const was=DM.g[i];DM.g[i]=hp;o.hp=hp/C.DOM.GEN_HP;
  if(hp<=0&&!o.dead){o.dead=true;o.body.material=dmMatBurnt;o.ring.visible=false;o.halo.visible=false;o.g.rotation.z=.13;
    if(!quiet){fxExplosion(o.x,o.y+1.6,o.z);SFX.domGen(vAt(o.x,o.y,o.z));}}
  else if(hp>0&&o.dead){o.dead=false;o.body.material=dmMat();o.ring.visible=true;o.halo.visible=true;o.g.rotation.z=0;}
  else if(hp<was&&!quiet){o.flash=.12;if(Math.random()<.5)fxSparks(o.x,o.y+1.6+Math.random(),o.z,[R(1),1,R(1)],4);}
}
function domSnap(m){
  if(!DM.on)return;
  if(m.bs)m.bs.forEach((r,i)=>{const o=DM.boss[i];if(!o)return;if(r[0]<DM.h[i])o.pain=.18;DM.h[i]=r[0];o.hp=r[0]/C.DOM.BOSS_HP;o.yawT=r[1];if(!r[2]&&o.atk&&o.warn>0)o.warn=0;});
  if(m.gh)for(const r of m.gh)domGenHp(r[0],r[1]);
  const seen=m.ob?new Set(m.ob.map(r=>r[0])):null;
  if(m.ob)for(const r of m.ob){let o=DM.orbs.get(r[0]);
    if(!o){const g=new THREE.Mesh(new THREE.SphereGeometry(.42,8,6),new THREE.MeshBasicMaterial({color:DCOL[r[4]],fog:false}));const h=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),dmGlow(DCOL[r[4]],.3));g.add(h);g.position.set(r[1],r[2],r[3]);scene.add(g);o={g,x:r[1],y:r[2],z:r[3]};DM.orbs.set(r[0],o);}
    o.x=r[1];o.y=r[2];o.z=r[3];}
  for(const [id,o] of DM.orbs)if(!seen||!seen.has(id)){scene.remove(o.g);DM.orbs.delete(id);}
}
const dmLane=i=>C.DOM.LANES[i].toUpperCase();
function domEvent(m){
  if(!DM.on)return;
  const mine=t=>t===myTeam;
  switch(m.a){
    case 'gen':{const g=W.gens[m.i];if(!g)break;domGenHp(m.i,0);
      const who=m.n?'<b style="color:'+DCSS[1-g.team]+'">'+esc(m.n)+'</b> ':'';
      feedLine(who+'<i>destruyó un generador</i> <b style="color:'+DCSS[g.team]+'">'+DNAME[g.team].toLowerCase()+' · '+C.DOM.LANES[g.lane]+'</b>',m.id===myId);
      if(m.first)announce(mine(g.team)?'PERDIMOS EL PRIMER GENERADOR':'PRIMER GENERADOR DESTRUIDO','barrera '+C.DOM.LANES[g.lane]+' del equipo '+DNAME[g.team].toLowerCase());
      break;}
    case 'bar':{const b=W.bars[m.i];if(!b)break;domBarState(m.i,m.st);
      if(m.st===2){announce('RUTA '+dmLane(b.lane)+' ABIERTA',mine(b.team)?'entran a tu fortaleza: defendé al boss':'entrá por ahí y matá al boss '+DNAME[b.team].toLowerCase());feedLine('<i>cayó la barrera</i> <b style="color:'+DCSS[b.team]+'">'+DNAME[b.team].toLowerCase()+' · '+C.DOM.LANES[b.lane]+'</b>');}
      else if(m.st===1){feedLine('<i>barrera debilitada:</i> <b style="color:'+DCSS[b.team]+'">'+DNAME[b.team].toLowerCase()+' · '+C.DOM.LANES[b.lane]+'</b>');SFX.domBlink(vAt(b.x,b.y+3,b.z));}
      else feedLine('<i>la barrera '+C.DOM.LANES[b.lane]+' '+DNAME[b.team].toLowerCase()+' volvió a levantarse</i>');
      break;}
    case 'alert': if(mine(m.b)&&G.time-DM.alertT>6){DM.alertT=G.time;announce('ATACAN A TU BOSS','volvé a defenderlo');SFX.domAlert();}break;
    case 'bossdown':{const o=DM.boss[m.b];if(o){o.dead=.001;o.atk=0;o.tell.visible=false;o.beam.visible=false;fxExplosion(o.x,o.y+9.6,o.z);fxExplosion(o.x,o.y+5,o.z);SFX.domDeath(vAt(o.x,o.y+8,o.z));}
      feedLine((m.n?'<b style="color:'+DCSS[1-m.b]+'">'+esc(m.n)+'</b> <i>mató al</i> ':'<i>cayó el</i> ')+'<b style="color:'+DCSS[m.b]+'">BOSS '+DNAME[m.b]+'</b>',m.id===myId);break;}
    case 'atk':{const o=DM.boss[m.b];if(!o)break;o.atk=m.k;o.warn=o.dur=m.t||1;o.tgt=m.id||0;if(m.y!=null)o.yawT=m.y;SFX.domWarn(vAt(o.x,o.y+8,o.z),m.k);break;}
    case 'fx':{const o=DM.boss[m.b];if(!o)break;o.fx=.5;o.fxK=m.k;o.warn=0;o.beam.visible=false;const v=vAt(o.x,o.y+6,o.z);
      if(m.k===1)SFX.domLash(v);else if(m.k===3){SFX.domPulse(v);o.ring=.6;}else if(m.k===4)SFX.domOrb(v);else if(m.k===2)SFX.domLash(v*.7);
      if(v>.2&&(m.k===1||m.k===3))shake=Math.max(shake,.12*v);break;}
    case 'grab': if(m.id===myId){announce('¡TE AGARRÓ!','');shake=Math.max(shake,.25);}break;
    case 'zone':{const q=new THREE.Mesh(new THREE.CircleGeometry(m.r,32),dmGlow(DCOL[m.b],.1));q.rotation.x=-1.5708;q.position.set(m.p[0],m.p[1]+.1,m.p[2]);
      const rim=new THREE.Mesh(new THREE.RingGeometry(m.r-.35,m.r,40),dmGlow(DCOL[m.b],.9));q.add(rim);scene.add(q);DM.zones.push({q,t:m.t,dur:m.t});SFX.domZoneWarn(vAt(m.p[0],m.p[1],m.p[2]));break;}
    case 'zx':{fxExplosion(m.p[0],m.p[1]+.6,m.p[2]);for(let k=0;k<26;k++){const a=Math.random()*6.283,r=Math.random()*m.r;emit(sparks,m.p[0]+Math.cos(a)*r,m.p[1]+.2,m.p[2]+Math.sin(a)*r,R(2),6+Math.random()*9,R(2),.7,m.b?.3:1,.6,m.b?1:.2,6);}
      const v=vAt(m.p[0],m.p[1],m.p[2]);SFX.domZone(v);if(v>.5)shake=Math.max(shake,.15);
      for(let i=DM.zones.length-1;i>=0;i--){const z=DM.zones[i];if(Math.hypot(z.q.position.x-m.p[0],z.q.position.z-m.p[2])<.5){scene.remove(z.q);DM.zones.splice(i,1);}}break;}
    case 'orbx':{const o=DM.orbs.get(m.id);if(o){scene.remove(o.g);DM.orbs.delete(m.id);}fxSparks(m.p[0],m.p[1],m.p[2],[0,1,0],10);SFX.domOrbHit(vAt(m.p[0],m.p[1],m.p[2]));break;}
  }
  DM.hudKey='';
}
/* ---- lo que el jugador le pega con un tiro: generador (-1-i) o boss (-101-equipo); hs = núcleo ---- */
function domClaim(claims,wall,ex,ey,ez,dd){
  if(!DM.on||!wall||!wall.b)return false;const b=wall.b;let id=0,core=0;
  if(b.gen!=null){const g=W.gens[b.gen];if(!g||g.team===myTeam||DM.g[b.gen]<=0)return false;id=-1-b.gen;}
  else if(b.boss!=null){if(b.boss===myTeam||DM.h[b.boss]<=0)return false;id=-101-b.boss;const o=DM.boss[b.boss],f=C.dirFromAngles(o.yaw,0);
    if(dd[0]*f[0]+dd[2]*f[2]<-.15){const cx=o.x+f[0]*C.DOM.CORE_FWD-ex,cy=o.y+C.DOM.CORE_Y-ey,cz=o.z+f[2]*C.DOM.CORE_FWD-ez,pr=cx*dd[0]+cy*dd[1]+cz*dd[2];if(pr>0&&Math.hypot(cx-dd[0]*pr,cy-dd[1]*pr,cz-dd[2]*pr)<C.DOM.CORE_R)core=1;}}
  else return false;
  const c=claims.get(id)||[id,0,0];c[1]++;if(core)c[2]++;claims.set(id,c);return true;
}
/* ---- animación por cuadro ---- */
function updBoss(o,dt,near){
  o.t+=dt;const t=o.t;
  let dy=o.yawT-o.yaw;while(dy>Math.PI)dy-=6.2832;while(dy<-Math.PI)dy+=6.2832;o.yaw+=dy*Math.min(1,dt*8);o.g.rotation.y=o.yaw;
  if(o.dead){o.dead=Math.min(9,o.dead+dt);const k=Math.min(1,o.dead/2.4),e=k*k*(3-2*k);o.g.rotation.x=-e*1.25;o.g.position.y=o.y-e*1.2;o.core.material.color.setHex(0x1a1a1a);o.coreGlow.visible=false;o.tell.visible=false;return;}
  o.pain=Math.max(0,o.pain-dt);o.fx=Math.max(0,o.fx-dt);
  const w=o.atk&&o.warn>0?1-o.warn/o.dur:0;if(o.warn>0){o.warn-=dt;if(o.warn<=0&&!o.fx)o.atk=0;}
  const k=o.warn>0?o.atk:o.fx>0?o.fxK:0,hit=o.fx>0?o.fx/.5:0;
  // torso: respira, se sacude al recibir daño
  o.tor.position.y=Math.sin(t*1.3)*.12;o.tor.rotation.x=(o.pain>0?Math.sin(t*70)*.03:0)+(k===3?-w*.22+hit*.3:k===1?w*.12-hit*.25:0);o.tor.rotation.z=Math.sin(t*.7)*.015;
  o.head.rotation.y=Math.sin(t*.5)*.12;o.halo.rotation.z+=dt*(k===4?4+w*10:.35);
  const pulse=.75+.25*Math.sin(t*3)+(o.warn>0?w*.9:0)+(o.pain>0?.6:0);o.coreGlow.scale.setScalar(pulse);o.coreGlow.material.opacity=.2+.18*pulse;
  for(const a of o.arms){const s=a.s;let z=.78+Math.sin(t*.8+s)*.05,x=Math.sin(t*.6+s)*.06,y=0,e=.25;
    if(k===1&&s===1){z=.78-w*2.1;x=w*.9-hit*2.2*(o.fx>0?1:0);if(o.fx>0){z=-.4;x=-1.5*hit+.2;}}
    else if(k===2&&s===-1){z=.78*(1-Math.max(w,hit));y=1.45*Math.max(w,hit);e=0;}
    else if(k===3){z=.78-Math.max(w,hit)*2.2;e=.1;}
    else if(k===4){z=.78-Math.max(w,hit)*.85;e=0;}
    else if((k===5||k===6)&&s===1){z=.78-w*2.5;if(o.fx>0){z=.9;x=-.9*hit;}}
    a.sh.rotation.z+=(-s*z-a.sh.rotation.z)*Math.min(1,dt*10);a.sh.rotation.x+=(x-a.sh.rotation.x)*Math.min(1,dt*12);a.sh.rotation.y+=(s*y-a.sh.rotation.y)*Math.min(1,dt*10);
    a.el.rotation.z+=(-s*e-a.el.rotation.z)*Math.min(1,dt*8);
    if(near)for(const c of a.chains){c.root.rotation.z=-(a.sh.rotation.z+a.el.rotation.z);c.root.rotation.x=-a.sh.rotation.x;
      const swing=(k===1&&s===1&&o.fx>0)?1.2:.12;for(let i=0;i<c.links.length;i++){c.links[i].rotation.x=Math.sin(t*1.7+c.ph-i*.55)*swing*(i?.5:1);c.links[i].rotation.z=Math.cos(t*1.3+c.ph-i*.5)*.07;}}
  }
  // avisos
  const tk=o.warn>0&&(o.atk===1||o.atk===3);o.tell.visible=tk||(o.ring>0);
  if(tk){o.tell.material.opacity=.12+w*.38+(Math.sin(t*22)>0?.08:0);o.tell.scale.setScalar(1);}
  else if(o.ring>0){o.ring-=dt;o.tell.material.opacity=Math.max(0,o.ring);}
  if(o.warn>0&&o.atk===2){const q=o.tgt===myId?me.s:players.get(o.tgt);if(q){const p=o.beam.geometry.attributes.position;dmV.set(-2.2-2.6,10.6,-2.4).applyAxisAngle(THREE.Object3D.DefaultUp,o.yaw);p.setXYZ(0,o.x+dmV.x,o.y+dmV.y,o.z+dmV.z);p.setXYZ(1,q.x,q.y+1,q.z);p.needsUpdate=true;o.beam.visible=Math.sin(t*30)>-.3;}}
  else o.beam.visible=false;
}
function updDom(dt){
  if(!DM.on||!level)return;
  const cx=camera.position.x,cz=camera.position.z,t=G.time;
  if(DM.veins)DM.veins.offset.y=(t*.35)%1;
  DM.boss.forEach(o=>{const d=Math.hypot(o.x-cx,o.z-cz),near=d<DLOD.BOSS;if(o.lod!==near){o.lod=near;o.fino.forEach(q=>q.visible=near);}updBoss(o,dt,near);});
  for(const o of DM.gens){const d=Math.hypot(o.x-cx,o.z-cz),vis=d<DLOD.GEN;if(o.g.visible!==vis)o.g.visible=vis;if(!vis)continue;
    if(o.dead){o.smoke-=dt;if(o.smoke<=0&&d<60){o.smoke=.18;emit(sparks,o.x+R(.5),o.y+3,o.z+R(.5),R(.6),1.5+Math.random(),R(.6),1.1,.25,.22,.2,-.5);}continue;}
    o.flash=Math.max(0,(o.flash||0)-dt);const k=(.55+.45*o.hp)*(o.hp<.35&&Math.sin(t*14+o.ph)>0?.35:1)+(o.flash>0?1:0);
    o.ring.material.color.setHex(DCOL[o.team]).multiplyScalar(Math.min(1.6,k));o.halo.material.opacity=.04+.06*k+.02*Math.sin(t*2.4+o.ph);}
  for(const o of DM.bars){
    if(o.fall>0){o.fall-=dt;const k=Math.max(0,o.fall/.7);o.m.scale.y=k;o.m.position.y=o.y+o.h/2*k;o.mat.opacity=.9*k;if(o.fall<=0)o.m.visible=false;continue;}
    if(o.st===2)continue;
    const vis=Math.hypot(o.x-cx,o.z-cz)<DLOD.BAR;if(o.m.visible!==vis)o.m.visible=vis;
    o.m.scale.y=1;o.m.position.y=o.y+o.h/2;o.mat.opacity=o.st===1?(Math.sin(t*17)>0?.5:.12)+.06*Math.sin(t*3):.42+.08*Math.sin(t*2+o.z);
    if(o.st===1&&vis&&Math.random()<dt*6)emit(sparks,o.x,o.y+Math.random()*o.h,o.z+(Math.random()-.5)*o.w,R(2),R(2),R(2),.4,1,.9,.7,2);}
  for(let i=DM.zones.length-1;i>=0;i--){const z=DM.zones[i];z.t-=dt;const k=1-Math.max(0,z.t)/z.dur;z.q.material.opacity=.08+k*.34+(Math.sin(t*(10+k*30))>0?.06:0);if(z.t<-.6){scene.remove(z.q);DM.zones.splice(i,1);}}
  for(const o of DM.orbs.values()){const p=o.g.position,a=Math.min(1,dt*18);p.x+=(o.x-p.x)*a;p.y+=(o.y-p.y)*a;p.z+=(o.z-p.z)*a;o.g.scale.setScalar(1+.15*Math.sin(t*20));}
  DM.mmT-=dt;if(DM.mmT<=0){DM.mmT=.2;domHud();domMap();}
}
/* ---- HUD: vida de los bosses y, por equipo, las 3 barreras con sus 2 generadores ---- */
function domHud(){
  const key=DM.h.join()+'|'+DM.b.join()+'|'+DM.g.map(v=>Math.ceil(v/C.DOM.GEN_HP*20)).join()+'|'+myTeam;
  const tl=Math.max(0,timeLeft);setTxt('domT',Math.floor(tl/60)+':'+String(tl%60).padStart(2,'0'));$('domT').classList.toggle('low',tl<=60);
  if(key===DM.hudKey)return;DM.hudKey=key;
  for(const t of [0,1]){
    const hp=Math.max(0,DM.h[t]/C.DOM.BOSS_HP*100);
    let h='<div class="dn"><span>BOSS '+DNAME[t]+(t===myTeam?' · TU EQUIPO':'')+'</span><b>'+Math.ceil(hp)+'%</b></div><div class="dhp"><i style="width:'+hp.toFixed(1)+'%"></i></div><div class="dl">';
    for(let l=0;l<3;l++){const st=DM.b[t*3+l]||0;
      h+='<span class="lane s'+st+'" title="'+C.DOM.LANES[l]+'"><em>'+C.DOM.LANES[l][0].toUpperCase()+'</em>'+[0,1].map(k=>{const v=Math.max(0,DM.g[t*6+l*2+k]/C.DOM.GEN_HP*100);return '<u'+(v<=0?' class="x"':'')+'><i style="width:'+v.toFixed(0)+'%"></i></u>';}).join('')+'<s>'+(st===2?'ABIERTA':st===1?'DÉBIL':'ACTIVA')+'</s></span>';}
    $('domS'+t).innerHTML=h+'</div>';$('domS'+t).classList.toggle('mine',t===myTeam);
  }
}
/* ---- minimapa: norte arriba. El fondo se dibuja una sola vez a partir de los bloques del mapa
   (planta del nivel entre -8 y 10 m), así sirve para cualquier mapa sin tener que dibujarlo a mano ---- */
function domMapBg(cvs){
  const b=W.bounds,sw=cvs.width/(b.x1-b.x0),sh=cvs.height/(b.z1-b.z0),X=x=>(x-b.x0)*sw,Z=z=>(z-b.z0)*sh;
  const c=document.createElement('canvas');c.width=cvs.width;c.height=cvs.height;const g=c.getContext('2d');
  g.fillStyle='rgba(8,10,16,.84)';g.fillRect(0,0,c.width,c.height);
  // mitades de cada equipo apenas teñidas
  const xm=Math.abs(W.bars[0].x);
  g.fillStyle='rgba(58,139,255,.1)';g.fillRect(0,0,X(-xm),c.height);
  g.fillStyle='rgba(255,122,32,.1)';g.fillRect(X(xm),0,c.width-X(xm),c.height);
  // agua
  for(const l of W.lava||[])if(l.water){g.fillStyle='#071318';g.fillRect(X(l.min[0]),Z(l.min[2]),(l.max[0]-l.min[0])*sw,(l.max[2]-l.min[2])*sh);}
  // planta: cada bloque del nivel, más claro cuanto más alto
  for(const q of W.brushes){
    if(q.nc||q.mat==='clip'||q.bar)continue;
    const top=q.max[1];if(top<-8||q.min[1]>10)continue;
    const k=Math.max(0,Math.min(1,(top+8)/18));
    g.fillStyle='rgba('+(42+k*95|0)+','+(46+k*95|0)+','+(54+k*100|0)+',.9)';
    g.fillRect(X(q.min[0]),Z(q.min[2]),Math.max(1,(q.max[0]-q.min[0])*sw),Math.max(1,(q.max[2]-q.min[2])*sh));
  }
  g.strokeStyle='rgba(255,255,255,.22)';g.strokeRect(.5,.5,c.width-1,c.height-1);
  return c;
}
function domMap(){
  const cvs=$('domMap'),g=cvs.getContext('2d'),B=W.bounds,sw=cvs.width/(B.x1-B.x0),sh=cvs.height/(B.z1-B.z0),X=x=>(x-B.x0)*sw,Z=z=>(z-B.z0)*sh;
  if(!DM.bg)DM.bg=domMapBg(cvs);
  g.clearRect(0,0,cvs.width,cvs.height);g.drawImage(DM.bg,0,0);
  DM.bars.forEach((o,i)=>{const st=DM.b[i];if(st===2)return;g.fillStyle=DCSS[o.team];g.globalAlpha=st===1&&Math.sin(G.time*12)>0?.3:1;g.fillRect(X(o.x)-1.5,Z(o.z-o.w/2),3,o.w*sh);g.globalAlpha=1;});
  DM.gens.forEach((o,i)=>{g.fillStyle=DM.g[i]>0?DCSS[o.team]:'#555';g.fillRect(X(o.x)-2.5,Z(o.z)-2.5,5,5);if(DM.g[i]>0){g.strokeStyle='#000';g.lineWidth=1;g.strokeRect(X(o.x)-2.5,Z(o.z)-2.5,5,5);}});
  DM.boss.forEach((o,i)=>{g.fillStyle=DM.h[i]>0?DCSS[i]:'#555';g.beginPath();g.arc(X(o.x),Z(o.z),5.5,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1.2;g.stroke();});
  const q=level.items.find(o=>o.ty==='quad');if(q){g.fillStyle=q.g.visible?'#c060ff':'#4a3a5a';g.save();g.translate(X(q.it.x),Z(q.it.z));g.rotate(.785);g.fillRect(-3,-3,6,6);g.restore();}
  for(const p of players.values())if(p.alive&&p.team===myTeam&&p.id!==myId){g.fillStyle=DCSS[myTeam<0?0:myTeam];g.fillRect(X(p.x)-1.5,Z(p.z)-1.5,3,3);}
  if(me.alive||G.pov){const f=C.dirFromAngles(me.yaw,0),x=X(me.s.x),z=Z(me.s.z);g.fillStyle='#fff';g.beginPath();g.moveTo(x+f[0]*6,z+f[2]*6);g.lineTo(x-f[0]*3-f[2]*3.5,z-f[2]*3+f[0]*3.5);g.lineTo(x-f[0]*3+f[2]*3.5,z-f[2]*3-f[0]*3.5);g.fill();}
}
// pantalla final: por qué ganó el que ganó
function domEnd(m){
  const d=m.dw;if(!d)return;
  const why=d.why==='boss'?'Mataron al boss '+DNAME[1-m.wt].toLowerCase():d.why==='empate'?'Se acabó el tiempo y empataron en todo':'Se acabó el tiempo · desempató: '+d.why;
  $('interS').textContent=why+' — Boss rojo '+d.hp[0]+'% · Boss azul '+d.hp[1]+'% — Barreras tiradas: rojo '+d.bars[0]+', azul '+d.bars[1]+' — Generadores rotos: rojo '+d.gens[0]+', azul '+d.gens[1]+(m.mv?'':' — Próximo mapa: '+(m.nextName||''));
}
/* ---- sonidos (con el sistema de siempre: tn = tono, nz = ruido) ---- */
Object.assign(SFX,{
  domWarn:(v,k)=>{if(v<=0)return;tn({type:'sawtooth',f0:k===3||k===4?220:90,f1:k===3||k===4?520:180,dur:.9,vol:.2*v});nz({dur:.9,f0:300,f1:1800,type:'bandpass',q:2,vol:.18*v});},
  domLash:v=>{if(v<=0)return;nz({dur:.35,f0:5000,f1:300,type:'bandpass',q:1.2,vol:.9*v});tn({type:'square',f0:900,f1:120,dur:.2,vol:.16*v});for(let i=0;i<4;i++)tn({type:'square',f0:1900+i*260,f1:1500,dur:.04,vol:.07*v,delay:.05+i*.04});},
  domPulse:v=>{if(v<=0)return;tn({type:'sine',f0:70,f1:28,dur:.8,vol:.8*v});nz({dur:.6,f0:1200,f1:80,vol:.7*v});tn({type:'sawtooth',f0:660,f1:110,dur:.5,vol:.14*v});},
  domOrb:v=>{if(v<=0)return;[0,.08,.16].forEach(d=>tn({type:'sine',f0:500,f1:1500,dur:.25,vol:.16*v,delay:d}));},
  domOrbHit:v=>{if(v<=0)return;nz({dur:.15,f0:4000,f1:900,type:'bandpass',q:1,vol:.4*v});tn({type:'sine',f0:900,f1:200,dur:.15,vol:.14*v});},
  domZoneWarn:v=>{if(v<=0)return;tn({type:'triangle',f0:300,f1:900,dur:1.1,vol:.12*v});},
  domZone:v=>{if(v<=0)return;nz({dur:.7,f0:1800,f1:60,vol:1*v});tn({type:'sine',f0:95,f1:30,dur:.6,vol:.7*v});},
  domGen:v=>{if(v<=0)return;nz({dur:.9,f0:2600,f1:70,vol:1.1*v});tn({type:'sawtooth',f0:420,f1:40,dur:.9,vol:.22*v});[0,.12,.26].forEach(d=>tn({type:'square',f0:1400,f1:300,dur:.08,vol:.09*v,delay:d}));},
  domBlink:v=>{if(v<=0)return;[0,.09,.18,.27].forEach(d=>tn({type:'square',f0:1250,f1:950,dur:.05,vol:.07*v,delay:d}));},
  domBar:v=>{const k=Math.max(.35,v);tn({type:'sawtooth',f0:900,f1:50,dur:1.1,vol:.22*k});nz({dur:1,f0:7000,f1:200,type:'bandpass',q:.8,vol:.6*k});tn({type:'sine',f0:60,f1:30,dur:.9,vol:.5*k,delay:.15});},
  domAlert:()=>{[0,.22,.44].forEach(d=>tn({type:'square',f0:740,f1:520,dur:.16,vol:.13,delay:d}));},
  domDeath:v=>{const k=Math.max(.4,v);tn({type:'sawtooth',f0:300,f1:24,dur:2.4,vol:.3*k});nz({dur:2.2,f0:3000,f1:50,vol:.9*k});[0,.3,.7,1.2].forEach(d=>tn({type:'sine',f0:80,f1:30,dur:.5,vol:.5*k,delay:d}));}
});

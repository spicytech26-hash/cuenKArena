/* =================== KILLCAM Y MODO ESPECTADOR ===================
   Al morir con un tirador, se repiten en primera persona los últimos ~3,6 s desde los ojos de quien te mató
   (mundo, jugadores, disparos y proyectiles incluidos). Clic izquierdo saltea la repetición y pasa a mirar a otro
   jugador o bot vivo; otro clic, al siguiente. Sin tirador (lava, caída, río, explosión propia) no hay repetición.
   Todo es del lado del cliente: se graba un historial corto de cada jugador (20 por segundo) con lo que ya llega
   del servidor, así funciona igual en práctica (LocalNet) y online. */
const KC_CLIP=3.6,KC_HOLD=.7,KC_HIST=5.2;
const KC={mode:null,on:false,t:0,t0:0,t1:0,el:0,len:0,holdT:0,kid:0,snap:new Map(),shots:[],si:0,vic:null,vicKey:'',vicEnd:null,pj:[],
  cp:null,gs:null,bob:0,kick:0,raise:0,fireT:9,flash:0,recP:0,recY:0,tilt:0,lastW:-1,lastRigW:-1,specId:0,preT:0,fxDone:true,gib:false};
const meHist=[];
const kcOn=()=>S.killcam!==false;
const kcNow=()=>KC.on?KC.t:serverNow();
// mirando por los ojos de otro (repetición o espectador): sin velo rojo ni tinte de lava
const kcWatching=()=>KC.mode==='replay'||KC.mode==='hold'||KC.mode==='spec';

/* ---------- grabación (corre siempre que la opción esté activada) ---------- */
function kcRecRemote(p,s,tm){
  if(!kcOn())return;
  const h=p.hist||(p.hist=[]);h.push(s);
  while(h.length>2&&h[0].t<tm-KC_HIST)h.shift();
}
function kcRecMe(){
  if(!kcOn()||!me.alive)return;
  const t=serverNow();
  meHist.push({t,x:me.s.x,y:me.s.y,z:me.s.z,yaw:me.yaw,pitch:me.pitch,w:me.w,fl:1|(me.s.on?4:0)|(me.s.crouch?8:0),vx:me.s.vx,vy:me.s.vy,vz:me.s.vz});
  while(meHist.length>2&&meHist[0].t<t-KC_HIST)meHist.shift();
}
// disparos y proyectiles de cada jugador (para repetirlos); si estás espectando a ese jugador también mueve su arma
function kcRecShot(id,e){
  if(!kcOn()||id===myId)return;
  const p=players.get(id);if(!p)return;
  e.t=serverNow();
  const a=p.kcShots||(p.kcShots=[]);a.push(e);
  while(a.length&&a[0].t<e.t-KC_HIST)a.shift();
  if(KC.mode==='spec'&&KC.specId===id)kcFireFx(e.w);
}

/* ---------- al morir ---------- */
// devuelve 'replay' si arrancó la repetición (en ese caso los efectos de la muerte se hacen al final de la repetición)
function kcOnDeath(m){
  kcStop();KC.mode=null;KC.gs=null;KC.cp=null;me.deathLen=0;
  if(!kcOn())return null;
  const shooter=m.k&&m.k!==myId&&m.k!==m.v&&m.how!=='lava'&&m.how!=='water'&&m.how!=='void';
  if(shooter&&kcStart(m)){KC.mode='replay';kcUI();return 'replay';}
  KC.mode='pre';KC.preT=.6;kcUI();   // sin tirador: un instante de tu propia caída y se pasa a otro jugador
  return null;
}
function kcStart(m){
  const kp=players.get(m.k),H=kp&&kp.hist;if(!H||H.length<3||!kp.model)return false;
  // fin: la última muestra del tirador en que seguía vivo
  let ie=H.length-1;while(ie>=0&&!(H[ie].fl&1))ie--;if(ie<2)return false;
  const t1=H[ie].t;
  // inicio: hasta KC_CLIP antes, sin pasar de la última vez que reapareció
  let i0=ie;while(i0>0&&(H[i0-1].fl&1))i0--;
  const t0=Math.max(t1-KC_CLIP,H[i0].t);
  if(t1-t0<.8)return false;
  KC.snap=new Map();
  for(const p of players.values())if(p.hist&&p.hist.length)KC.snap.set(p.id,p.hist.filter(s=>s.t>=t0-.3&&s.t<=t1+.3));
  // yo mismo: mis muestras están en mi reloj; las corro lo que tarda en llegar al servidor y corto justo en el disparo mortal
  const lat=online?Math.min(.3,(ping||0)/2000):0;
  const mv=meHist.map(s=>Object.assign({},s,{t:s.t+lat})).filter(s=>s.t>=t0-.3&&s.t<=t1-.04);
  if(mv.length){const l=mv[mv.length-1];mv.push(Object.assign({},l,{t:t1,fl:0,vx:0,vy:0,vz:0}));KC.vicEnd=[l.x,l.y,l.z];}else KC.vicEnd=null;
  KC.snap.set(myId,mv);
  KC.shots=(kp.kcShots||[]).filter(e=>e.t>=t0&&e.t<=t1+.05).sort((a,b)=>a.t-b.t);KC.si=0;
  KC.kid=m.k;KC.t0=t0;KC.t1=t1;KC.t=t0;KC.el=0;KC.len=t1-t0;KC.holdT=0;KC.on=true;
  KC.cp=null;KC.gs=null;KC.bob=0;KC.kick=0;KC.raise=0;KC.fireT=9;KC.flash=0;KC.recP=KC.recY=KC.tilt=0;KC.lastW=-1;KC.lastRigW=-1;
  KC.fxDone=false;KC.gib=!!m.gib;
  // el modelo con el que te ve el que te mata
  const tm=teamsMode(),col=tm&&myTeam>=0?TEAMS[myTeam].c:S.skin.c,key=JSON.stringify([S.skin,S.name,col,tm]);
  if(!KC.vic||KC.vicKey!==key){
    if(KC.vic&&KC.vic.model)scene.remove(KC.vic.model.g);
    KC.vicKey=key;KC.vic={id:myId,name:S.name,color:col,buf:[],model:buildPlayer(tm?Object.assign({},S.skin,{c:col}):S.skin,S.name,true)};
  }
  const v=KC.vic;Object.assign(v,{alive:false,deadT:0,w:1,fl:0,spd:0,phase:0,x:0,y:0,z:0,yaw:0,pitch:0,gib:false,px:null,pz:null,vxs:0,vzs:0,fire:0,pain:0});
  v.model.g.visible=false;scene.add(v.model.g);
  me.deathLen=Math.max(DEATH_T,KC.len+KC_HOLD);
  const wI=m.w>=0&&WEAPONS[m.w]?m.w:(H[ie].w);
  $('kcL').textContent=m.ns?'TE ELIMINÓ SIN USAR MIRA':'TE ELIMINÓ';
  $('kcN').textContent=nameOf(m.k);$('kcN').style.color=colorOf(m.k);
  $('kcW').textContent=WEAPONS[wI]?(WEAPONS[wI].melee?'a pelo · ':'con ')+WEAPONS[wI].name:'';
  return true;
}
function kcList(){return KC.vic?[...players.values(),KC.vic]:players.values();}

/* ---------- cierre ---------- */
// deja de reproducir (el mundo vuelve al presente)
function kcStop(){
  if(KC.on){
    KC.on=false;
    if(KC.vic&&KC.vic.model)scene.remove(KC.vic.model.g);
    for(const p of KC.pj)scene.remove(p.m);
    KC.pj.length=0;
    for(const q of projs)q.m.visible=!q.dead;
  }
  KC.snap=new Map();KC.shots=[];
}
// el efecto de tu muerte se pospone hasta el final de la repetición (o hasta que la saltees)
function kcDeathFx(fromReplay){
  if(KC.fxDone)return;KC.fxDone=true;
  const d=(fromReplay&&KC.vicEnd)||me.deathPos||[me.s.x,me.s.y,me.s.z];
  if(KC.gib)fxGib(d[0],d[1],d[2]);else fxBlood(d[0],d[1]+1,d[2],20);
  SFX.die(fromReplay?vAt(d[0],d[1],d[2]):1);
  if(fromReplay&&KC.vic){KC.vic.gib=KC.gib;}
}
function kcEnd(){
  kcStop();KC.fxDone=true;KC.mode=null;KC.gs=null;KC.cp=null;me.deathLen=0;
  G.pov=null;kcUI();
}
function kcUI(){
  const md=KC.mode,rep=md==='replay'||md==='hold';
  $('kcOv').hidden=!rep;
  $('deathBox').classList.toggle('spec',md==='spec');
  if(rep){$('deathBox').hidden=true;const el=$('kcOv');el.style.animation='none';void el.offsetWidth;el.style.animation='';}
  else if(md==='spec'||md==='pre'||md==='death')$('deathBox').hidden=false;
}

/* ---------- reloj de la repetición (se llama cada cuadro mientras estás muerto) ---------- */
function kcTick(dt){
  const md=KC.mode;if(!md)return;
  if(md==='pre'){KC.preT-=dt;if(KC.preT<=0)kcSpecNext(true);return;}
  if(md==='replay'||md==='hold'){
    for(const q of projs)q.m.visible=false;   // los proyectiles de ahora no tienen que verse en una escena del pasado
    if(md==='replay'){
      KC.el+=dt;KC.t=Math.min(KC.t1,KC.t0+KC.el);
      while(KC.si<KC.shots.length&&KC.shots[KC.si].t<=KC.t)kcFire(KC.shots[KC.si++]);
      kcProjs(dt);
      if(KC.el>=KC.len){KC.mode='hold';KC.t=KC.t1;KC.holdT=0;kcDeathFx(true);}
    }else{
      KC.holdT+=dt;
      // si la repetición fue corta, no queda congelada hasta reaparecer: se pasa a mirar a otro
      if(KC.holdT>.8&&me.deathLen-me.deadT>.5)kcSpecNext(true);
    }
    $('kcProgB').style.width=Math.min(100,KC.el/KC.len*100).toFixed(1)+'%';
    setTxt('kcResp',liveState()?'Reaparecés en '+Math.max(1,Math.ceil((me.deathLen||DEATH_T)-me.deadT)):'');
    return;
  }
  if(md==='spec'){
    const p=players.get(KC.specId);
    if(!p||!p.model||!p.alive||p.gib)kcSpecNext(true,true);   // el que mirabas murió o se fue: pasa al siguiente
  }
}
function kcSpecList(){const a=[];for(const p of players.values())if(p.id!==myId&&p.model&&p.alive&&!p.gib)a.push(p);return a;}
// pasa a mirar a otro jugador vivo; si no queda nadie, queda la vista de la muerte de siempre
function kcSpecNext(first,auto){
  const l=kcSpecList();
  if(!l.length){
    if(KC.mode==='spec'&&!auto)return;           // clic sin nadie más: te quedás con quien estás
    kcStop();kcDeathFx(false);KC.mode='death';KC.cp=null;KC.gs=null;kcUI();return;
  }
  let i=0;
  if(!first||KC.mode==='spec'){const at=l.findIndex(p=>p.id===KC.specId);i=at>=0?(at+1)%l.length:0;}
  if(KC.mode!=='spec'){kcStop();kcDeathFx(false);}
  KC.mode='spec';KC.specId=l[i].id;KC.cp=null;KC.gs=null;KC.lastW=-1;KC.kick=0;KC.raise=0;KC.fireT=9;KC.flash=0;
  kcUI();SFX.ui&&SFX.ui();
}
// clic izquierdo estando muerto
function kcClick(){
  if(me.alive||!inGame||paused)return;
  const md=KC.mode;
  if(md==='replay'||md==='hold')kcSpecNext(true);
  else if(md==='pre'||md==='death')kcSpecNext(true);
  else if(md==='spec')kcSpecNext(false);
}
function kcHintPrefix(){
  if(KC.mode==='spec'){const n=kcSpecList().length;return 'Viendo a '+nameOf(KC.specId)+(n>1?' · Clic izquierdo: siguiente jugador':'')+' · ';}
  return G.pov?'Viendo a '+nameOf(G.pov.id)+' · ':'';
}

/* ---------- reproducción de disparos y proyectiles ---------- */
function kcFireFx(w){KC.kick=1;KC.fireT=0;KC.flash=.06;KC.recP+=w===3?.006:.014;KC.recY+=(Math.random()-.5)*.008;}
function kcFire(e){
  const w=e.w,W_=WEAPONS[w];if(!W_)return;
  kcFireFx(w);
  const c=KC.cp;
  if(e.k==='s'){
    const o=e.o,d=e.d;
    if(W_.melee){if(SFX[7])SFX[7](.9);return;}
    const h=C.raycast(W,o[0],o[1],o[2],d[0],d[1],d[2],W_.range||300),L=h?h.t:(W_.range||300);
    const end=[o[0]+d[0]*L,o[1]+d[1]*L,o[2]+d[2]*L];
    // el fogonazo sale de la boca del arma en pantalla (abajo a la derecha de la mira)
    const yw=c?c.yaw:0,rx=Math.cos(yw),rz=-Math.sin(yw),tip=[o[0]+d[0]*.9+rx*.28,o[1]+d[1]*.9-.12,o[2]+d[2]*.9+rz*.28];
    const kp=players.get(KC.kid);
    if(w===6)fxRail(tip,end,kp?new THREE.Color(kp.color).getHex():0xa8e6ff);
    else{fxTracer(tip,end);if(h)fxSparks(end[0]-d[0]*.05,end[1]-d[1]*.05,end[2]-d[2]*.05,h.n,W_.pel>1?8:5);}
    flashLight(tip[0],tip[1],tip[2],0xffaa50,.06);
    if(SFX[w])SFX[w](.9);
  }else{
    const k=e.pk;
    const m=new THREE.Mesh(k==='rocket'?rocketGeo:k==='bullet'?bulletGeo:k==='molotov'?molGeo:grenadeGeo,k==='rocket'?rocketMat:k==='bullet'?bulletMat:k==='molotov'?molMat:mOlive);
    m.position.set(e.p[0],e.p[1],e.p[2]);scene.add(m);
    KC.pj.push({k,x:e.p[0],y:e.p[1],z:e.p[2],v:e.v.slice(),life:k==='grenade'?W_.fuse||2.5:k==='bullet'?1.6:6,m,age:0});
    if(SFX[w])SFX[w](.9);
  }
}
function kcProjs(dt){
  for(let i=KC.pj.length-1;i>=0;i--){
    const p=KC.pj[i],ox=p.x,oy=p.y,oz=p.z;p.age+=dt;
    const res=C.projStep(W,p,dt);
    let hit=false;const dx=p.x-ox,dy=p.y-oy,dz=p.z-oz,L=Math.hypot(dx,dy,dz);
    if(L>1e-6)for(const q of kcList()){
      if(q.id===KC.kid||!q.alive)continue;
      const h=C.rayPlayer(q.x,q.y,q.z,ox,oy,oz,dx/L,dy/L,dz/L);
      if(h&&h.t<=L+.15){p.x=ox+dx/L*h.t;p.y=oy+dy/L*h.t;p.z=oz+dz/L*h.t;hit=true;break;}
    }
    p.m.position.set(p.x,p.y,p.z);
    if(p.k==='bullet'||p.k==='rocket'){const sp=Math.hypot(p.v[0],p.v[1],p.v[2])||1;p.m.lookAt(p.x+p.v[0]/sp,p.y+p.v[1]/sp,p.z+p.v[2]/sp);}
    else{p.m.rotation.x+=dt*8;p.m.rotation.z+=dt*5;}
    if(p.k==='rocket')emit(sparks,p.x,p.y,p.z,R(1),R(1),R(1),.18,1,.6,.2,0);
    else if(p.k==='bullet'){if(Math.random()<.8)emit(sparks,p.x,p.y,p.z,0,0,0,.25,.9,.85,.6,0);}
    else if(p.k==='molotov')emit(sparks,p.x,p.y+.12,p.z,R(.6),1.2,R(.6),.3,1,.55,.12,-1);
    if(hit||(res&&res.boom)||p.life<=0){
      if(p.k==='bullet'){if(hit)fxBlood(p.x,p.y,p.z,22);else fxSparks(p.x,p.y,p.z,res&&res.n||[0,1,0],10);}
      else if(p.k==='molotov')fxGlass(p.x,p.y,p.z);
      else fxExplosion(p.x,p.y,p.z);
      scene.remove(p.m);KC.pj.splice(i,1);
    }
  }
}

/* ---------- cámara y arma en primera persona del que mirás ---------- */
// muestra interpolada de un historial en el instante t
function kcInterp(b,t){
  if(!b||!b.length)return null;
  let a=null,c=null;
  for(let i=b.length-1;i>=0;i--)if(b[i].t<=t){a=b[i];c=b[i+1]||null;break;}
  if(!a)return b[0];
  if(!c)return a;
  const u=Math.max(0,Math.min(1,(t-a.t)/((c.t-a.t)||1)));
  return {x:a.x+(c.x-a.x)*u,y:a.y+(c.y-a.y)*u,z:a.z+(c.z-a.z)*u,yaw:angLerp(a.yaw,c.yaw,u),pitch:a.pitch+(c.pitch-a.pitch)*u,w:u<.5?a.w:c.w,fl:u<.5?a.fl:c.fl,vx:a.vx,vy:a.vy,vz:a.vz};
}
// pone la cámara en los ojos de s con suavizado, balanceo al caminar, retroceso y un poco de campo de visión por velocidad
function kcFP(dt,s){
  const tg={x:s.x,y:s.y,z:s.z,yaw:s.yaw,pitch:s.pitch,eye:s.crouch?K.EYEC:K.EYE};
  let c=KC.cp;
  if(!c||Math.hypot(tg.x-c.x,tg.z-c.z)>5||Math.abs(tg.y-c.y)>6)c=KC.cp=Object.assign({},tg);
  else{const k=1-Math.exp(-dt*26);c.x+=(tg.x-c.x)*k;c.y+=(tg.y-c.y)*k;c.z+=(tg.z-c.z)*k;c.yaw=angLerp(c.yaw,tg.yaw,k);c.pitch+=(tg.pitch-c.pitch)*k;c.eye+=(tg.eye-c.eye)*Math.min(1,dt*14);}
  if(s.onG&&s.hs>1)KC.bob+=dt*s.hs*1.05;
  const bobY=s.onG?Math.sin(KC.bob*2)*.05:0;
  KC.tilt+=(-Math.max(-1,Math.min(1,s.side/6))*.016-KC.tilt)*Math.min(1,dt*8);
  KC.recP*=Math.exp(-dt*11);KC.recY*=Math.exp(-dt*11);
  if(KC.lastW!==s.w){if(KC.lastW>=0)KC.raise=1;KC.lastW=s.w;}
  camera.position.set(c.x,c.y+c.eye+bobY,c.z);camera.rotation.order='YXZ';
  camera.rotation.set(c.pitch-KC.kick*.025+KC.recP,c.yaw+KC.recY,KC.tilt);
  const fov=S.fov+Math.min(12,Math.max(0,s.hs-11)*.8);
  if(Math.abs(camera.fov-fov)>.05){camera.fov+=(fov-camera.fov)*Math.min(1,dt*6);camera.updateProjectionMatrix();}
  sky.position.copy(camera.position);
  KC.gs=s;G.pov={w:WEAPONS[s.w]?s.w:1,id:s.id};
}
const kcSide=(vx,vz,yaw)=>vx*Math.cos(yaw)-vz*Math.sin(yaw);
// devuelve true si manejó la cámara (si no, sigue la cámara de muerte de siempre)
function kcCamera(dt){
  const md=KC.mode;
  if(md==='replay'||md==='hold'){
    const kp=players.get(KC.kid),s=kcInterp(KC.snap.get(KC.kid),KC.t);
    if(!s||!kp)return false;
    kcFP(dt,{id:KC.kid,x:s.x,y:s.y,z:s.z,yaw:s.yaw,pitch:s.pitch,w:s.w,crouch:!!(s.fl&8),onG:!!(s.fl&4),hs:Math.hypot(s.vx,s.vz),vy:s.vy,side:kcSide(s.vx,s.vz,s.yaw)});
    if(kp.model)kp.model.g.visible=false;
    return true;
  }
  if(md==='spec'){
    const p=players.get(KC.specId);if(!p||!p.model)return false;
    kcFP(dt,{id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,w:p.w,crouch:!!p.crouch,onG:!!p.onG,hs:Math.hypot(p.vxs||0,p.vzs||0),vy:0,side:kcSide(p.vxs||0,p.vzs||0,p.yaw)});
    p.model.g.visible=false;
    return true;
  }
  return false;
}
// arma del que mirás, con retroceso, balanceo, animación de disparo y manos (se dibuja sobre el mundo en el bucle)
function povGun(dt){
  const pv=G.pov;if(!pv)return;
  const i=pv.w,g=vms[i],b=vmBase[i];if(!g)return;
  vms.forEach((v,k)=>v.visible=k===i);
  if(!KC.gs||!kcWatching()){
    // vista de la muerte a la antigua: el arma quieta
    g.position.copy(b);g.rotation.set(i===7?.1:0,i===7?.5:0,i===7?.25:0);
    VEV.cu=-1;VEV.cf=9;vRig(i,g,-1,9);knArm.visible=lhG.visible=lhArm.visible=sweep.visible=false;if(i===7)updKnifeArm();
    return;
  }
  const gs=KC.gs;
  KC.kick=Math.max(0,KC.kick-dt*(i===3?14:i===0?10:i===7?4:5));KC.raise=Math.max(0,KC.raise-dt*4);KC.fireT+=dt;KC.flash=Math.max(0,KC.flash-dt);
  const mv=gs.onG?Math.min(1,gs.hs/10):.3;
  g.position.set(b.x+Math.cos(KC.bob)*.014*mv,b.y-Math.abs(Math.sin(KC.bob))*.012*mv-KC.raise*.35+(gs.onG?0:Math.max(-.04,Math.min(.04,-(gs.vy||0)*.003))),b.z+KC.kick*.06);
  if(i===7)g.rotation.set(.1,.5,.25);
  else g.rotation.set(KC.kick*.12-KC.raise*.6,VYAW[i]||0,VROLL[i]||0);
  if(KC.lastRigW!==i){VEV.pu=-1;VEV.pf=9;KC.lastRigW=i;}
  VEV.cu=-1;VEV.cf=KC.fireT;
  const rigged=vRig(i,g,-1,VEV.cf);
  VEV.pu=-1;VEV.pf=VEV.cf;
  updKnifeArm();updSweep(dt);vUpdEjects(dt);
  if(rigged&&g.visible)vPlaceHand(g);else vHideHands();
  const tip=g.userData.tip;
  flashMesh.visible=KC.flash>0&&!!tip&&i!==7;
  if(flashMesh.visible){flashMesh.position.set(g.position.x+tip.x,g.position.y+tip.y,g.position.z+tip.z-.04);flashMesh.rotation.z=Math.random()*6.28;flashMesh.scale.setScalar(i===0?.7:i===2?1.7:i===1?1.3:1);}
  wMuz.intensity=KC.flash>0?3:0;wMuz.position.copy(g.position).add(tipTmp.set(0,.05,-.4));wMuz.color.setHex(0xffaa44);
  camera.getWorldDirection(tipTmp);
  muzzleWorld.intensity=KC.flash>0&&S.q?2.4:0;muzzleWorld.position.copy(camera.position).addScaledVector(tipTmp,1);
}

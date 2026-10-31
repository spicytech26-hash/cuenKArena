/* =================== ESPECTADOR (estando muerto) ===================
   Al morir se ve primero al que te mató (cámara de muerte de 18-camara.js). Después:
   · Clic izquierdo: pasás a mirar por los ojos de otro jugador o bot vivo; otro clic, al siguiente.
   · Espacio: cámara orbital alrededor del jugador que mirás (el mouse la gira), como en Counter-Strike o TF2;
     otro Espacio vuelve a la primera persona. Sin nadie vivo queda la vista de la muerte. */
const SP={mode:null,id:0,orbit:false,oy:0,op:-.25,oc:null,cp:null,gs:null,bob:0,kick:0,raise:0,fireT:9,flash:0,recP:0,recY:0,tilt:0,lastW:-1,lastRigW:-1};
const spWatching=()=>SP.mode==='spec';
function spList(){const a=[];for(const p of players.values())if(p.id!==myId&&p.model&&p.alive&&!p.gib)a.push(p);return a;}

function spUI(){
  const b=$('deathBox');b.classList.toggle('spec',SP.mode==='spec');
  if(SP.mode==='spec')b.hidden=false;
}
function spStart(id){
  SP.mode='spec';SP.id=id;SP.cp=null;SP.gs=null;SP.oc=null;SP.lastW=-1;SP.kick=0;SP.raise=0;SP.fireT=9;SP.flash=0;
  const p=players.get(id);if(SP.orbit&&p){SP.oy=p.yaw;SP.op=-.25;}
  spUI();
}
// al reaparecer, salir de la partida o terminar: todo vuelve a cero
function spEnd(){SP.mode=null;SP.orbit=false;SP.cp=null;SP.gs=null;SP.oc=null;G.pov=null;spUI();}

// clic izquierdo estando muerto: pasa al siguiente jugador vivo (el primer clic sale de la vista del que te mató)
function spClick(){
  if(me.alive||!inGame||paused)return;
  const l=spList();if(!l.length)return;
  const cur=SP.mode==='spec'?SP.id:me.killer,at=l.findIndex(p=>p.id===cur);
  spStart(l[(at+1)%l.length].id);SFX.ui&&SFX.ui();
}
// Espacio estando muerto: alterna entre primera persona y cámara orbital
function spSpace(){
  if(me.alive||!inGame||paused)return;
  if(SP.mode!=='spec'){
    const l=spList();if(!l.length)return;
    SP.orbit=true;spStart((l.find(p=>p.id===me.killer)||l[0]).id);SFX.ui&&SFX.ui();return;
  }
  SP.orbit=!SP.orbit;SP.cp=null;SP.oc=null;SP.gs=null;
  const p=players.get(SP.id);if(SP.orbit&&p){SP.oy=p.yaw;SP.op=-.25;}
  SFX.ui&&SFX.ui();
}
// mouse en la cámara orbital
function spLook(dx,dy){
  if(!(SP.mode==='spec'&&SP.orbit))return;
  const k=.0022*S.sens;SP.oy-=dx*k;SP.op=Math.max(-1.4,Math.min(1.2,SP.op-dy*k*(S.invY?-1:1)));
}
// cada cuadro mientras estás muerto: si el que mirás murió o se fue, pasa a otro vivo (o vuelve a la vista de la muerte)
function spTick(){
  if(SP.mode!=='spec')return;
  const p=players.get(SP.id);
  if(p&&p.model&&p.alive&&!p.gib)return;
  const l=spList();
  if(l.length)spStart(l[0].id);else spEnd();
}
function spHint(){
  if(SP.mode==='spec'){
    const n=spList().length;
    return 'Viendo a '+nameOf(SP.id)+(n>1?' · Clic izquierdo: siguiente':'')+' · Espacio: '+(SP.orbit?'primera persona':'ver alrededor')+' · ';
  }
  const pre=G.pov?'Viendo a '+nameOf(G.pov.id)+' · ':'';
  return spList().length?pre+'Clic izquierdo: ver a otros · Espacio: ver alrededor · ':pre;
}
function spFireFx(w){SP.kick=1;SP.fireT=0;SP.flash=.06;SP.recP+=w===3?.006:.014;SP.recY+=(Math.random()-.5)*.008;}
// el que mirás disparó (llega por el mismo mensaje que mueve su modelo en tercera persona)
function spShot(id,w){if(SP.mode==='spec'&&!SP.orbit&&SP.id===id)spFireFx(w);}

/* ---------- cámara ---------- */
// primera persona del que mirás: suavizado, balanceo al caminar, retroceso y un poco más de campo de visión con la velocidad
function spFP(dt,s){
  const tg={x:s.x,y:s.y,z:s.z,yaw:s.yaw,pitch:s.pitch,eye:s.crouch?K.EYEC:K.EYE};
  let c=SP.cp;
  if(!c||Math.hypot(tg.x-c.x,tg.z-c.z)>5||Math.abs(tg.y-c.y)>6)c=SP.cp=Object.assign({},tg);
  else{const k=1-Math.exp(-dt*26);c.x+=(tg.x-c.x)*k;c.y+=(tg.y-c.y)*k;c.z+=(tg.z-c.z)*k;c.yaw=angLerp(c.yaw,tg.yaw,k);c.pitch+=(tg.pitch-c.pitch)*k;c.eye+=(tg.eye-c.eye)*Math.min(1,dt*14);}
  if(s.onG&&s.hs>1)SP.bob+=dt*s.hs*1.05;
  const bobY=s.onG?Math.sin(SP.bob*2)*.05:0;
  SP.tilt+=(-Math.max(-1,Math.min(1,s.side/6))*.016-SP.tilt)*Math.min(1,dt*8);
  SP.recP*=Math.exp(-dt*11);SP.recY*=Math.exp(-dt*11);
  if(SP.lastW!==s.w){if(SP.lastW>=0)SP.raise=1;SP.lastW=s.w;}
  camera.position.set(c.x,c.y+c.eye+bobY,c.z);camera.rotation.order='YXZ';
  camera.rotation.set(c.pitch-SP.kick*.025+SP.recP,c.yaw+SP.recY,SP.tilt);
  const fov=S.fov+Math.min(12,Math.max(0,s.hs-11)*.8);
  if(Math.abs(camera.fov-fov)>.05){camera.fov+=(fov-camera.fov)*Math.min(1,dt*6);camera.updateProjectionMatrix();}
  sky.position.copy(camera.position);
  SP.gs=s;G.pov={w:WEAPONS[s.w]?s.w:1,id:s.id};
}
// cámara orbital: gira alrededor del jugador con el mouse y se acerca si hay una pared atrás
function spOrbit(dt,p){
  const tg={x:p.x,y:p.y+1.15,z:p.z};
  let c=SP.oc;
  if(!c||Math.hypot(tg.x-c.x,tg.z-c.z)>6)c=SP.oc=Object.assign({dist:3.4},tg);
  else{const k=1-Math.exp(-dt*14);c.x+=(tg.x-c.x)*k;c.y+=(tg.y-c.y)*k;c.z+=(tg.z-c.z)*k;}
  const d=C.dirFromAngles(SP.oy,SP.op);
  let dist=3.4;const h=C.raycast(W,c.x,c.y,c.z,-d[0],-d[1],-d[2],dist+.3);if(h)dist=Math.max(.6,h.t-.3);
  c.dist=dist<c.dist?dist:c.dist+(dist-c.dist)*Math.min(1,dt*8);
  camera.position.set(c.x-d[0]*c.dist,c.y-d[1]*c.dist,c.z-d[2]*c.dist);
  camera.rotation.order='YXZ';camera.rotation.set(SP.op,SP.oy,0);
  if(Math.abs(camera.fov-S.fov)>.05){camera.fov+=(S.fov-camera.fov)*Math.min(1,dt*6);camera.updateProjectionMatrix();}
  sky.position.copy(camera.position);
  SP.gs=null;G.pov=null;
}
const spSide=(vx,vz,yaw)=>vx*Math.cos(yaw)-vz*Math.sin(yaw);
// devuelve true si manejó la cámara (si no, sigue la cámara de muerte de siempre)
function spCamera(dt){
  if(SP.mode!=='spec')return false;
  const p=players.get(SP.id);if(!p||!p.model)return false;
  if(SP.orbit){spOrbit(dt,p);return true;}
  spFP(dt,{id:p.id,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,w:p.w,crouch:!!p.crouch,onG:!!p.onG,hs:Math.hypot(p.vxs||0,p.vzs||0),vy:0,side:spSide(p.vxs||0,p.vzs||0,p.yaw)});
  p.model.g.visible=false;   // vas por sus ojos: su modelo no tapa la vista
  return true;
}

/* ---------- arma del que mirás ---------- */
// con retroceso, balanceo, animación de disparo y manos (se dibuja sobre el mundo en el bucle)
function povGun(dt){
  const pv=G.pov;if(!pv)return;
  const i=pv.w,g=vms[i],b=vmBase[i];if(!g)return;
  vms.forEach((v,k)=>v.visible=k===i);
  if(!SP.gs||!spWatching()){
    // vista de la muerte (el que te mató, sin espectador): el arma quieta
    g.position.copy(b);g.rotation.set(i===7?.1:0,i===7?.5:0,i===7?.25:0);
    VEV.cu=-1;VEV.cf=9;vRig(i,g,-1,9);knArm.visible=lhG.visible=lhArm.visible=sweep.visible=false;if(i===7)updKnifeArm();
    return;
  }
  const gs=SP.gs;
  SP.kick=Math.max(0,SP.kick-dt*(i===3?14:i===0?10:i===7?4:5));SP.raise=Math.max(0,SP.raise-dt*4);SP.fireT+=dt;SP.flash=Math.max(0,SP.flash-dt);
  const mv=gs.onG?Math.min(1,gs.hs/10):.3;
  g.position.set(b.x+Math.cos(SP.bob)*.014*mv,b.y-Math.abs(Math.sin(SP.bob))*.012*mv-SP.raise*.35+(gs.onG?0:Math.max(-.04,Math.min(.04,-(gs.vy||0)*.003))),b.z+SP.kick*.06);
  if(i===7)g.rotation.set(.1,.5,.25);
  else g.rotation.set(SP.kick*.12-SP.raise*.6,VYAW[i]||0,VROLL[i]||0);
  if(SP.lastRigW!==i){VEV.pu=-1;VEV.pf=9;SP.lastRigW=i;}
  VEV.cu=-1;VEV.cf=SP.fireT;
  const rigged=vRig(i,g,-1,VEV.cf);
  VEV.pu=-1;VEV.pf=VEV.cf;
  updKnifeArm();updSweep(dt);vUpdEjects(dt);
  if(rigged&&g.visible)vPlaceHand(g);else vHideHands();
  const tip=g.userData.tip;
  flashMesh.visible=SP.flash>0&&!!tip&&i!==7;
  if(flashMesh.visible){flashMesh.position.set(g.position.x+tip.x,g.position.y+tip.y,g.position.z+tip.z-.04);flashMesh.rotation.z=Math.random()*6.28;flashMesh.scale.setScalar(i===0?.7:i===2?1.7:i===1?1.3:1);}
  wMuz.intensity=SP.flash>0?3:0;wMuz.position.copy(g.position).add(tipTmp.set(0,.05,-.4));wMuz.color.setHex(0xffaa44);
  camera.getWorldDirection(tipTmp);
  muzzleWorld.intensity=SP.flash>0&&S.q?2.4:0;muzzleWorld.position.copy(camera.position).addScaledVector(tipTmp,1);
}

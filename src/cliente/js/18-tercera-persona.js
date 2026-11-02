/* =================== TERCERA PERSONA (estilo Deadlock y Marvel Rivals) ===================
   Cámara sobre el hombro: detrás y al costado de la cabeza, con la mira en el centro de la pantalla y el personaje a un costado.
   - Se alterna con H (o en Ajustes → Video); J cambia de hombro.
   - La cámara se acomoda sola: se aleja un poco al correr, se queda un poco atrás al esquivar de costado, baja al agacharse y se acerca
     si hay una pared detrás (nunca queda adentro de una pared). Con el francotirador volvés a primera persona para mirar por la mira.
   - Lo que dispara apunta al punto que marca la mira (primero se busca a qué pega la cámara y desde el ojo se apunta ahí), así no hay que
     "apuntar al costado del enemigo" como pasa en otros juegos de tercera persona.
   - El personaje propio se anima igual que los demás (marcha, salto, agachado, retroceso, golpes, cambio de arma, muerte). */
const TP={blend:0,k:1,dist:3,lag:0,back:0,fireT:0,painT:0,model:null,clave:'',tips:{},f:new THREE.Vector3(),r:new THREE.Vector3(),u:new THREE.Vector3(),des:new THREE.Vector3(),piv:new THREE.Vector3(),mz:new THREE.Vector3(),
  p:{vxs:0,vzs:0,yaw:0,pitch:0,onG:true,crouch:false,fire:0,pain:0,w:1,vy:0,rel:false,deadT:0}};
const tpQuiere=()=>S.view==='tp'&&me.alive&&!(me.scope&&WEAPONS[me.w].scope);
// el modelo propio se arma de nuevo si cambian los colores, el emblema o el nombre (o el color de equipo)
function tpModelo(){
  const eq=teamsMode()&&myTeam>=0,sk=eq?Object.assign({},S.skin,{c:colorOf(myId),ck:null,cp:null,cb:null,cl:null}):S.skin;
  const k=[sk.c,sk.ck,sk.cp,sk.cb,sk.cl,sk.c2,sk.c3,sk.v,sk.a,sk.em,sk.ce,sk.img?sk.img.length:0].join('|');
  if(!TP.model||TP.clave!==k){if(TP.model)scene.remove(TP.model.g);TP.model=buildPlayer(sk,S.name,true,true);TP.model.g.visible=false;scene.add(TP.model.g);TP.clave=k;}
  return TP.model;
}
function updMiModelo(dt){
  if(S.view!=='tp'){TP.blend+=(0-TP.blend)*Math.min(1,dt*9);if(TP.model)TP.model.g.visible=false;return;}
  const want=tpQuiere()?1:0;TP.blend+=(want-TP.blend)*Math.min(1,dt*(want?6:9));if(Math.abs(TP.blend-want)<.003)TP.blend=want;
  const m=tpModelo(),P=TP.p;
  if(me.alive){
    TP.fireT=Math.max(0,TP.fireT-dt);TP.painT=Math.max(0,TP.painT-dt);
    P.vxs=me.s.vx;P.vzs=me.s.vz;P.vy=me.s.vy;P.yaw=me.yaw;P.pitch=me.pitch;P.onG=me.s.on;P.crouch=!!me.s.crouch;P.fire=TP.fireT;P.pain=TP.painT;P.w=me.w;P.rel=me.rel>0&&me.relW===me.w;
    if(m.gun.userData.w!==me.w){m.gun.clear();m.gun.add(tpGun(me.w));m.gun.userData.w=me.w;}
    m.g.position.set(me.s.x,me.s.y,me.s.z);m.g.rotation.y=me.yaw+Math.PI;
    m.gun.scale.setScalar(me.w===0?1.9:me.w===7||me.w===10?1.6:1.15);P.tp=true;   // en tercera persona el arma se ve más grande (sobre todo la pistola)
    rbLod(m,false);rbAnimar(m,P,dt);
    const em=TP.painT>0?0x803020:me.q>0?0x5020a0:0;m.mats.forEach(mm=>mm.emissive.setHex(em));
    m.g.visible=TP.blend>.02&&TP.dist>.85;   // si la cámara queda pegada a una pared, no se dibuja el cuerpo
  }else{
    // el cuerpo propio cae y queda en el piso mientras la cámara de muerte hace lo suyo
    const d=me.deathPos||[me.s.x,me.s.y,me.s.z];P.deadT=me.deadT;rbMuerte(m,P);
    m.g.position.set(d[0],d[1],d[2]);m.g.rotation.y=me.yaw+Math.PI;m.g.visible=!G.pov&&me.deadT<5;
  }
  m.g.updateMatrixWorld(true);
}
// posición de la cámara (se llama desde updCamera, con la rotación ya puesta)
function tpCamara(dt){
  if(TP.blend<=.001)return;
  const q=camera.quaternion,f=TP.f.set(0,0,-1).applyQuaternion(q),r=TP.r.set(1,0,0).applyQuaternion(q),u=TP.u.set(0,1,0).applyQuaternion(q),piv=TP.piv,des=TP.des;
  const hs=Math.hypot(me.s.vx,me.s.vz),sh=S.shoulder||1;
  TP.back+=(Math.min(.28,hs*.022)-TP.back)*Math.min(1,dt*3);                                   // al correr, la cámara se aleja un poco
  const vr=me.s.vx*r.x+me.s.vz*r.z;TP.lag+=(Math.max(-.14,Math.min(.14,-vr*.012))-TP.lag)*Math.min(1,dt*5);   // al esquivar de costado se queda un poco atrás
  piv.set(me.s.x,me.s.y+me.eyeC+.02,me.s.z);
  const dist=1.7*(S.tpd||1)+TP.back-Math.min(.08,(me.kick||0)*.05);                            // el disparo la empuja un poquito hacia adelante
  des.copy(piv).addScaledVector(f,-dist).addScaledVector(r,.85*sh+TP.lag).addScaledVector(u,.27);
  // choque con las paredes: tres rayos desde la cabeza; la cámara se acerca hasta antes de la pared y vuelve despacio
  let k=1;const L=des.distanceTo(piv);
  for(const o of [[0,0,0],[r.x*.3*sh,r.y*.3*sh,r.z*.3*sh],[u.x*.25,u.y*.25,u.z*.25]]){
    const ox=piv.x+o[0],oy=piv.y+o[1],oz=piv.z+o[2],vx=des.x-ox,vy=des.y-oy,vz=des.z-oz,vl=Math.hypot(vx,vy,vz)||1,h=C.raycast(W,ox,oy,oz,vx/vl,vy/vl,vz/vl,vl);
    if(h)k=Math.min(k,Math.max(.1,(h.t-.3)/vl*(vl/L)));}
  TP.k+=(k-TP.k)*Math.min(1,dt*(k<TP.k?30:5));TP.dist=L*TP.k;
  const e=TP.blend*TP.blend*(3-2*TP.blend);
  camera.position.x+=(piv.x+(des.x-piv.x)*TP.k-camera.position.x)*e;camera.position.y+=(piv.y+(des.y-piv.y)*TP.k-camera.position.y)*e;camera.position.z+=(piv.z+(des.z-piv.z)*TP.k-camera.position.z)*e;
}
// hacia dónde hay que disparar desde el ojo para pegarle a lo que marca la mira (la cámara está corrida y atrás del ojo)
function tpApunte(ex,ey,ez){
  if(TP.blend<.9)return null;
  const f=TP.f.set(0,0,-1).applyQuaternion(camera.quaternion),cx=camera.position.x,cy=camera.position.y,cz=camera.position.z;
  let tm=150;const w=C.raycast(W,cx,cy,cz,f.x,f.y,f.z,tm);if(w)tm=w.t;
  const t0=(ex-cx)*f.x+(ey-cy)*f.y+(ez-cz)*f.z+.4;   // lo que esté entre la cámara y el ojo no cuenta
  for(const q of players.values()){if(!q.alive||!q.model||!q.model.g.visible||(teamsMode()&&q.team===myTeam))continue;
    const h=C.rayPlayer(q.x,q.y,q.z,cx,cy,cz,f.x,f.y,f.z,q.crouch);if(h&&h.t<tm&&h.t>t0)tm=h.t;}
  if(tm<=t0)return null;
  const dx=cx+f.x*tm-ex,dy=cy+f.y*tm-ey,dz=cz+f.z*tm-ez,l=Math.hypot(dx,dy,dz)||1;return [dx/l,dy/l,dz/l];
}
// boca del arma en el mundo (para los trazos, las chispas y los proyectiles)
function tpMuzzle(){
  const m=TP.model;if(!m)return [me.s.x,me.s.y+K.EYE,me.s.z];
  let t=TP.tips[me.w];if(!t){const g=tpGun(me.w);t=TP.tips[me.w]=g.userData.tip||{x:0,y:0,z:-.5};}
  m.gun.localToWorld(TP.mz.set(t.x,t.y,t.z));return [TP.mz.x,TP.mz.y,TP.mz.z];
}
function tpAlternar(){S.view=S.view==='tp'?'fp':'tp';saveS();syncSettings();announce('',S.view==='tp'?'Vista en tercera persona':'Vista en primera persona');}
function tpHombro(){S.shoulder=-(S.shoulder||1);saveS();syncSettings();if(S.view==='tp')announce('','Cámara sobre el hombro '+(S.shoulder>0?'derecho':'izquierdo'));}

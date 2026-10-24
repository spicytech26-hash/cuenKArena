/* =================== PROYECTILES =================== */
const rocketGeo=new THREE.CylinderGeometry(.06,.08,.5,8);rocketGeo.rotateX(Math.PI/2);
const grenadeGeo=new THREE.IcosahedronGeometry(.13,0);
const molGeo=new THREE.CylinderGeometry(.045,.05,.24,8),molMat=new THREE.MeshPhongMaterial({color:0x6b8a3a,emissive:0x221100,transparent:true,opacity:.85,shininess:120});
const rocketMat=new THREE.MeshPhongMaterial({color:0x8a8f96,emissive:0x331a08,flatShading:true});
const bulletGeo=new THREE.CylinderGeometry(.012,.012,3.2,5);bulletGeo.rotateX(Math.PI/2);
const bulletMat=new THREE.MeshBasicMaterial({color:0xffe9a8,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
function spawnProjVis(k,p,v,own,pid,ownerId){
  const m=new THREE.Mesh(k==='rocket'?rocketGeo:k==='bullet'?bulletGeo:k==='molotov'?molGeo:grenadeGeo,k==='rocket'?rocketMat:k==='bullet'?bulletMat:k==='molotov'?molMat:mOlive);
  m.position.set(p[0],p[1],p[2]);scene.add(m);
  projs.push({k,x:p[0],y:p[1],z:p[2],v:v.slice(),life:k==='grenade'?WEAPONS[4].fuse:k==='bullet'?1.6:6,m,own,pid,owner:ownerId,age:0,dead:false});
}
function updProjs(dt){
  for(let i=projs.length-1;i>=0;i--){
    const p=projs[i];if(p.dead){p.life-=dt;if(p.life<-1.5){scene.remove(p.m);projs.splice(i,1);}continue;}
    const ox=p.x,oy=p.y,oz=p.z;p.age+=dt;
    const res=C.projStep(W,p,dt);
    if(p.k==='grenade'&&p.bounced){p.bounced=false;SFX.bounce(vAt(p.x,p.y,p.z));}
    let hitPlayer=false;
    if(p.own){
      const dx=p.x-ox,dy=p.y-oy,dz=p.z-oz,L=Math.hypot(dx,dy,dz);
      if(L>1e-6)for(const q of players.values()){if(!q.alive||!q.model)continue;const h=C.rayPlayer(q.x,q.y,q.z,ox,oy,oz,dx/L,dy/L,dz/L);if(h&&h.t<=L+.15){p.x=ox+dx/L*h.t;p.y=oy+dy/L*h.t;p.z=oz+dz/L*h.t;hitPlayer=true;break;}}
    }
    p.m.position.set(p.x,p.y,p.z);
    if(p.k==='bullet'){const sp=Math.hypot(p.v[0],p.v[1],p.v[2])||1;p.m.lookAt(p.x+p.v[0]/sp,p.y+p.v[1]/sp,p.z+p.v[2]/sp);if(Math.random()<.8)emit(sparks,p.x,p.y,p.z,0,0,0,.25,.9,.85,.6,0);}
    else if(p.k==='rocket'){const sp=Math.hypot(p.v[0],p.v[1],p.v[2])||1;p.m.lookAt(p.x+p.v[0]/sp,p.y+p.v[1]/sp,p.z+p.v[2]/sp);emit(sparks,p.x,p.y,p.z,R(1),R(1),R(1),.18,1,.6,.2,0);if(Math.random()<.7)emit(gore,p.x,p.y,p.z,R(.6),.4+Math.random()*.4,R(.6),.7,.36,.34,.32,-.3);}
    else if(p.k==='molotov'){p.m.rotation.x+=dt*9;p.m.rotation.z+=dt*4;emit(sparks,p.x,p.y+.12,p.z,R(.6),1.2,R(.6),.3,1,.55,.12,-1);}
    else{p.m.rotation.x+=dt*8;p.m.rotation.z+=dt*5;if(p.life<.5&&Math.random()<.5)emit(sparks,p.x,p.y+.1,p.z,R(1),1,R(1),.2,1,.3,.1,0);}
    if(hitPlayer||(res&&res.boom)){
      if(p.own&&p.k==='molotov'){fxGlass(p.x,p.y,p.z);scene.remove(p.m);projs.splice(i,1);continue;}
      if(p.own&&p.k==='bullet'){if(hitPlayer){fxBlood(p.x,p.y,p.z,22);G.hitT=.18;G.predHit=.35;SFX.hit(100);}else fxSparks(p.x,p.y,p.z,res&&res.n||[0,1,0],10);scene.remove(p.m);projs.splice(i,1);}
      else if(p.own){selfBlast(p);fxExplosion(p.x,p.y,p.z);scene.remove(p.m);projs.splice(i,1);}
      else{p.dead=true;p.m.visible=false;}
    }
  }
}
function selfBlast(p){
  if(!me.alive||p.k==='molotov')return;
  const W_=WEAPONS[p.k==='rocket'?5:4],d=C.boxDist(p.x,p.y,p.z,me.s.x,me.s.y,me.s.z);
  if(d>=W_.rad)return;
  if(!C.los(W,p.x,p.y+.1,p.z,me.s.x,me.s.y+.9,me.s.z)&&!C.los(W,p.x,p.y+.1,p.z,me.s.x,me.s.y+.2,me.s.z))return;
  const dmg=W_.dmg*(1-d/W_.rad),cx=me.s.x-p.x,cyy=me.s.y+.9-p.y,cz=me.s.z-p.z,cl=Math.hypot(cx,cyy,cz)||1;
  if(p.k==='rocket'){
    // rocket jump estilo Soldier: buen empuje hacia arriba y hacia adelante; si ya saltaste, se suma al salto
    const k=dmg*.17*(105/W_.dmg),up=Math.max(0,cyy/cl);   // el empuje del rocket jump no cambió con el nerf del daño
    me.s.vx+=cx/cl*k*1.15;me.s.vz+=cz/cl*k*1.15;me.s.vy=Math.min(Math.max(me.s.vy,0)+up*k*1.05+(me.s.crouch?1.2:0),19);
    if(up>.2)me.s.on=false;
  }else{me.s.vx+=cx/cl*dmg*.16;me.s.vy+=cyy/cl*dmg*.16;me.s.vz+=cz/cl*dmg*.16;if(cyy>0)me.s.on=false;}
}

/* =================== ARMAS DEL JUGADOR =================== */
const hasAmmo=i=>{const w=WEAPONS[i];return MODE==='gungame'||(C.MODES[MODE]&&C.MODES[MODE].inf)||!w.ammo||me.am[w.ammo]>=w.cost;};
// Q: vuelve al arma que tenías antes; si esa ya no está (la reemplazaste o te mataron), alterna entre pistola y principal
function quickSwitch(){
  const ok=i=>i!=null&&i>=0&&i!==me.w&&me.ow[i]&&hasAmmo(i);
  let t=me.lastW;if(!ok(t)){const pr=C.primaryOf(me.ow);t=me.w===0?pr:0;if(!ok(t))t=ok(pr)?pr:ok(7)?7:-1;}
  if(t>=0)selectWeapon(t);
}
// F: inspeccionar el arma como en CS o Valorant
function inspect(){if(!me.alive||me.scope||(me.rel>0&&me.relW===me.w))return;me.inspT=0;if(me.w===7)me.flipT=0;}
function selectWeapon(i,silent){if(i===me.w||!me.ow[i]||!me.alive)return;if(!hasAmmo(i)&&!silent){SFX.click();return;}me.lastW=me.w;me.w=i;me.scope=false;me.inspT=9;me.fireT=9;if(me.rel>0&&me.relW!==i){me.rel=0;}me.raise=1;me.cool=Math.max(me.cool,.2);showWeapon();updateHUD();}
function cycleWeapon(d){const n=WEAPONS.length;for(let k=1;k<=n;k++){const i=((me.w+d*k)%n+n)%n;if(me.ow[i]&&hasAmmo(i)){selectWeapon(i);return;}}}
function autoSwitch(){for(const i of [6,5,2,3,1,4,0]){if(me.ow[i]&&hasAmmo(i)){if(i!==me.w)selectWeapon(i,true);return;}}}
function showWeapon(){vms.forEach((g,k)=>g.visible=k===me.w);}
const rgtV=new THREE.Vector3(),upV=new THREE.Vector3();
/* recarga con animación propia de cada arma, al estilo de TF2 y Quake 3: el arma baja e inclina, hace su movimiento
   (cargador afuera y adentro, cartuchos de a uno, quebrar la escopeta, cohetes al tubo) y vuelve. u va de 0 a 1 */
function reloadAnim(i,g,u){
  const ss=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},bump=(x,a,b)=>x>a&&x<b?Math.sin((x-a)/(b-a)*Math.PI):0;
  const inn=ss(u/.18),out=1-ss((u-.82)/.18),hold=Math.min(inn,out);
  // como en TF2: el arma sube y se corre al centro para que se vea el trabajo de la mano izquierda
  g.position.x-=.06*hold;g.position.y+=.07*hold;
  if(i===0||i===3||i===8){
    // cargador: inclina de costado, saca el cargador (tirón abajo), mete el nuevo (golpe arriba) y monta (atrás)
    g.rotation.z+=.55*hold;g.rotation.x+=(.22-.1*bump(u,.55,.68))*hold;g.position.y-=.05*hold;g.position.x-=.03*hold;
    g.position.y-=.05*bump(u,.25,.4);g.position.y+=.035*bump(u,.55,.66);
    if(u>.7&&u<.85)g.position.z+=.06*bump(u,.7,.85);
  }else if(i===1||i===5||i===4){
    // de a uno (escopeta, cohetes, granadas): arma inclinada hacia arriba y un empujón por cada cartucho
    const n=i===1?4:3,k=Math.max(0,Math.min(1,(u-.2)/.55));
    g.rotation.x+=.38*hold;g.rotation.z-=.35*hold;g.position.y-=.06*hold;g.position.x+=.02*hold;
    if(u>.2&&u<.75){const f=(k*n)%1;g.position.z-=.035*Math.sin(f*Math.PI);g.rotation.x+=.06*Math.sin(f*Math.PI);}
    if(i===1&&u>.78&&u<.92)g.position.z+=.07*bump(u,.78,.92);   // bombeo final
  }else if(i===2){
    // escopeta doble: la quiebra apuntando abajo, cartuchos adentro y la cierra de un golpe
    g.rotation.x-=.85*hold;g.position.y-=.04*hold;g.position.z+=.04*hold;g.rotation.z+=.2*hold;
    g.position.y+=.03*bump(u,.4,.55);g.rotation.x+=.5*bump(u,.75,.86);
  }else if(i===6||i===9){
    // rifle de plasma y rifle de caza: lo baja girándolo, carga y lo vuelve a subir con un tirón
    g.rotation.z+=.9*hold;g.rotation.y+=.3*hold;g.position.y-=.09*hold;g.position.x-=.02*hold;
    g.position.z+=.05*bump(u,.45,.6);g.rotation.x+=.15*bump(u,.6,.75);
  }else{g.position.y-=Math.sin(u*Math.PI)*.18;g.rotation.x-=Math.sin(u*Math.PI)*.36;}
}
function fullMags(){const o={};WEAPONS.forEach((W_,i)=>{if(W_.mag)o[i]=W_.mag;});return o;}
function startReload(w){me.inspT=9;if(WEAPONS[w].mag&&me.mag[w]==null)me.mag[w]=WEAPONS[w].mag;
  const W_=WEAPONS[w];if(!W_.mag||me.rel>0||me.mag[w]>=W_.mag||!hasAmmo(w))return;
  me.rel=W_.reload*.75;me.relW=w;me.relN=W_.mag-me.mag[w];if(!vRigs[w])SFX.reload();if(net)net.send({t:'reload',w});
}
// lo que pasa en el arma en el instante del tiro: vaina afuera, tambor que gira
function vOnFire(w){const g=vms[w];
  if(w===0)vEject(g,[.02,.04,-.02],[1.3,1.4,.3],'brass');
  if(w===3)vEject(g,[.036,.01,-.02],[1.6,.9,.4],'brass');
  if(w===4)me.drumA=(me.drumA||0)+Math.PI/3;}
function fire(){
  const w=me.w,W_=WEAPONS[w];
  if(!hasAmmo(w)){SFX.click();me.cool=.3;autoSwitch();return;}
  if(W_.mag&&me.mag[w]==null)me.mag[w]=W_.mag;
  if(W_.mag){if(me.rel>0&&me.relW===w)return;if(!(me.mag[w]>0)){startReload(w);return;}}
  if(W_.ammo&&MODE!=='gungame')me.am[W_.ammo]-=W_.cost;
  if(W_.mag){me.mag[w]--;}
  if(W_.melee){me.mt=0;me.mdir=-me.mdir;sweepFx(me.mdir);}
  if(w===10)me.throwT=0;
  me.inspT=9;
  me.fireT=0;me.fireW=w;vOnFire(w);
  me.cool=W_.rate;me.kick=w===2?1.5:w===6||w===9?1.4:w===3?.4:1;me.flash=w===6||W_.melee?0:.06;
  const ex=me.s.x,ey=me.s.y+(me.s.crouch?K.EYEC:K.EYE),ez=me.s.z,d=C.dirFromAngles(me.yaw,me.pitch);
  camera.updateMatrixWorld();rgtV.set(1,0,0).applyQuaternion(camera.quaternion);upV.set(0,1,0).applyQuaternion(camera.quaternion);
  muzzleWorld.position.set(ex+d[0],ey+d[1],ez+d[2]);
  SFX[w](1);if(me.q>0)SFX.quadfire();SFX.body(w);
  // retroceso: la mira sube un poco y vuelve, sacudida chica y un golpe de campo de visión según el arma
  const RC=[.014,.04,.05,.008,.022,.026,.024,0,.055,.06,0][w]||0,SH=[0,.07,.09,0,.04,.05,.03,0,.06,.07,0][w]||0;
  me.recP=(me.recP||0)+RC*(.85+Math.random()*.3);me.recY=(me.recY||0)+(Math.random()-.5)*RC*.6;shake=Math.max(shake,SH);me.fovPunch=Math.max(me.fovPunch||0,RC*55);
  if(RC){wMuz.intensity=Math.max(wMuz.intensity,2.2+RC*30);}
  if(W_.type==='proj'){
    let o=[ex+d[0]*.5+rgtV.x*.15-upV.x*.12,ey+d[1]*.5+rgtV.y*.15-upV.y*.12,ez+d[2]*.5+rgtV.z*.15-upV.z*.12];
    if(!C.los(W,ex,ey,ez,o[0],o[1],o[2]))o=[ex,ey,ez];
    spawnProjVis(W_.proj,o,C.projLaunch(w,d),true,0,myId);
    net.send({t:'fire',w,o:r3(o),d:r3(d),sc:me.scope?1:0});
  }else{
    const claims=new Map();
    const pel=W_.pel||1;
    for(let k=0;k<pel;k++){
      let dd=d;
      const spr=W_.scope&&!me.scope?W_.hip:W_.spread;
      if(spr){const heat=w===3?1+Math.min(.5,me.heat):1;const sx=(Math.random()+Math.random()-1)*spr*heat,sy=(Math.random()+Math.random()-1)*spr*(w===2?.6:1);
        dd=[d[0]+rgtV.x*sx+upV.x*sy,d[1]+rgtV.y*sx+upV.y*sy,d[2]+rgtV.z*sx+upV.z*sy];const l=Math.hypot(dd[0],dd[1],dd[2]);dd=[dd[0]/l,dd[1]/l,dd[2]/l];}
      const wall=C.raycast(W,ex,ey,ez,dd[0],dd[1],dd[2],W_.range||300),wt=wall?wall.t:(W_.range||300);
      const hits=[];
      for(const q of players.values()){if(!q.alive||!q.model||!q.model.g.visible||(teamsMode()&&q.team===myTeam))continue;const h=C.rayPlayer(q.x,q.y,q.z,ex,ey,ez,dd[0],dd[1],dd[2],q.crouch);if(h&&h.t<wt)hits.push({q,t:h.t,head:h.head});}
      hits.sort((a,b)=>a.t-b.t);
      const use=W_.type==='rail'?hits:hits.slice(0,1);
      for(const h of use){const c=claims.get(h.q.id)||[h.q.id,0,0];c[1]++;if(h.head)c[2]++;claims.set(h.q.id,c);fxBlood(ex+dd[0]*h.t,ey+dd[1]*h.t,ez+dd[2]*h.t,W_.type==='rail'?14:4);}
      const end=[ex+dd[0]*wt,ey+dd[1]*wt,ez+dd[2]*wt];
      if(W_.type==='rail'){fxRail(vmWorldTip(),end,new THREE.Color(colorOf(myId)).getHex());if(wall)for(let j=0;j<16;j++)emit(sparks,end[0],end[1],end[2],wall.n[0]*3+R(4),wall.n[1]*3+R(4),wall.n[2]*3+R(4),.5,.5,.8,1,4);}
      else{if(w===8||w===0||w===3)fxTracer(vmWorldTip(),use.length?[ex+dd[0]*use[0].t,ey+dd[1]*use[0].t,ez+dd[2]*use[0].t]:end);if(!use.length&&wall)fxSparks(end[0]-dd[0]*.05,end[1]-dd[1]*.05,end[2]-dd[2]*.05,wall.n,pel>1?3:6);}
    }
    if(W_.melee){
      let best=null,bd=1e9;
      for(const q of players.values()){if(!q.alive||!q.model||!q.model.g.visible||(teamsMode()&&q.team===myTeam))continue;
        const vx=q.x-ex,vy=q.y+1-ey,vz=q.z-ez,dist=Math.hypot(vx,vy,vz);if(dist>W_.range+.3)continue;
        const ang=Math.acos(Math.max(-1,Math.min(1,(vx*d[0]+vy*d[1]+vz*d[2])/(dist||1))));
        if(ang>.7||!C.los(W,ex,ey,ez,q.x,q.y+1.1,q.z)||claims.has(q.id))continue;
        claims.set(q.id,[q.id,1,0]);fxBlood(q.x,q.y+1.1,q.z,4);}
    }
    if(w===3)me.heat=Math.min(1.5,me.heat+.12);
    // respuesta inmediata: marcador de impacto y sonido sin esperar al servidor
    if(claims.size){let n=0;claims.forEach(c=>n+=c[1]);G.hitT=.18;G.predHit=.35;$('hitm').classList.remove('kill');let hs=0;claims.forEach(c=>hs+=c[2]);if(hs&&!W_.melee)SFX.head();else SFX.hit(n*(W_.dmg||10));G.predHS=hs>0;claims.forEach(c=>{const t=players.get(c[0]);if(t)t.pain=.12;});}
    net.send({t:'fire',w,o:r3([ex,ey,ez]),d:r3(d),h:[...claims.values()],sc:me.scope?1:0});
    if(W_.mag&&me.mag[w]<=0)startReload(w);
  }
  updateHUD();
}
const r3=a=>a.map(v=>Math.round(v*1000)/1000);
function vmWorldTip(){const d=C.dirFromAngles(me.yaw,me.pitch);return [me.s.x+d[0]*.6+rgtV.x*.2-upV.x*.15,me.s.y+K.EYE+d[1]*.6+rgtV.y*.2-upV.y*.15,me.s.z+d[2]*.6+rgtV.z*.2-upV.z*.15];}
function gunTip(p){const d=C.dirFromAngles(p.yaw,p.pitch),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);return [p.x+d[0]*.9+rx*.42,p.y+1.35+d[1]*.9,p.z+d[2]*.9+rz*.42];}


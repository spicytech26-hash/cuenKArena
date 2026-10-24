/* =================== CÁMARA Y ARMA EN MANO =================== */
const tipTmp=new THREE.Vector3();
const DEATH_T=3.6,dcTmp=new THREE.Vector3();
// cámara de muerte: primero caés, después la cámara vuela hasta quedar enfrente del que te mató, mirándolo
function deathCam(){
  const t=me.deadT,d=me.deathPos||[me.s.x,me.s.y,me.s.z],k=me.killer&&me.killer!==myId?players.get(me.killer):null;
  const fall=Math.max(.35,K.EYE-t*2.2),base=[d[0],d[1]+fall,d[2]];
  G.pov=null;
  if(k&&k.model&&k.alive&&t>.9){
    // mirás por los ojos del que te mató: su posición, a dónde apunta y el arma que tiene en la mano
    const eye=k.crouch?K.EYEC:K.EYE;camera.position.set(k.x,k.y+eye,k.z);camera.rotation.order='YXZ';camera.rotation.set(k.pitch||0,k.yaw||0,0);
    camera.fov+=(S.fov-camera.fov)*.2;camera.updateProjectionMatrix();k.model.g.visible=false;
    G.pov={w:WEAPONS[k.w]?k.w:1,id:k.id};
  }else if(k&&k.model){
    const kh=[k.x,k.y+1.5,k.z];let dx=d[0]-k.x,dz=d[2]-k.z;const dl=Math.hypot(dx,dz)||1;dx/=dl;dz/=dl;
    let want=[k.x+dx*3.4-dz*.8,k.y+2.1,k.z+dz*3.4+dx*.8];
    const vx=want[0]-kh[0],vy=want[1]-kh[1],vz=want[2]-kh[2],vl=Math.hypot(vx,vy,vz);
    const hit=C.raycast(W,kh[0],kh[1],kh[2],vx/vl,vy/vl,vz/vl,vl);if(hit){const s=Math.max(.6,hit.t-.35)/vl;want=[kh[0]+vx*s,kh[1]+vy*s,kh[2]+vz*s];}
    const e=Math.max(0,Math.min(1,(t-.6)/.9)),u=e*e*(3-2*e);
    camera.position.set(base[0]+(want[0]-base[0])*u,base[1]+(want[1]-base[1])*u,base[2]+(want[2]-base[2])*u);
    camera.lookAt(dcTmp.set(kh[0],kh[1],kh[2]));
    const fz=u>.98?Math.min(1,(t-1.5)*2):0;camera.fov+=(S.fov*(1-.3*fz)-camera.fov)*.12;camera.updateProjectionMatrix();
  }else{
    // sin culpable (lava, caída, propia explosión): la cámara sube despacio dando una vuelta
    const a=t*.5,r=Math.min(3.5,t*2.2);camera.position.set(base[0]+Math.sin(a)*r,base[1]+Math.min(2.5,t*1.2),base[2]+Math.cos(a)*r);
    camera.lookAt(dcTmp.set(d[0],d[1]+.6,d[2]));
  }
  sky.position.copy(camera.position);
}
function updCamera(dt){
  if(!me.alive&&inGame&&me.deadT>.05){me.dip=0;deathCam();$('scopeOv').hidden=true;$('huntOv').hidden=true;return;}
  me.dip=Math.max(0,me.dip-dt*.9);me.roll*=Math.pow(.02,dt);shake=Math.max(0,shake-dt*1.5);
  const bobY=me.s.on&&me.alive?Math.sin(me.bob*2)*.05:0;
  me.eyeC+=((me.s.crouch?K.EYEC:K.EYE)-me.eyeC)*Math.min(1,dt*14);
  let eye=me.eyeC+bobY-me.dip;
  if(!me.alive)eye=Math.max(.35,K.EYE-me.deadT*2.2);
  const sh=shake*shake;
  const st=G.time*38;camera.position.set(me.s.x+Math.sin(st)*sh*.22,me.s.y+eye+Math.sin(st*1.31+1.7)*sh*.22,me.s.z+Math.sin(st*.87+3.1)*sh*.22);
  me.recP=(me.recP||0)*Math.exp(-dt*11);me.recY=(me.recY||0)*Math.exp(-dt*11);me.fovPunch=(me.fovPunch||0)*Math.exp(-dt*12);
  camera.rotation.set(me.pitch-me.kick*.025+me.recP,me.yaw+me.recY,me.tilt+me.roll+(me.alive?0:Math.min(.5,me.deadT*.6)));
  const scoped=me.scope&&me.alive&&WEAPONS[me.w].scope,zoom=WEAPONS[me.w].zoom||22;
  const fov=(scoped?zoom:S.fov+Math.min(12,Math.max(0,Math.hypot(me.s.vx,me.s.vz)-11)*.8))+(me.fovPunch||0)*(scoped?.2:1);
  if(Math.abs(camera.fov-fov)>.05){camera.fov+=(fov-camera.fov)*Math.min(1,dt*(scoped?14:6));camera.updateProjectionMatrix();}
  const hunt=scoped&&me.w===9;
  $('scopeOv').hidden=!(scoped&&!hunt&&camera.fov<zoom+8);$('huntOv').hidden=true;$('xh').style.visibility=(hunt&&me.ads>.6)||(MODE==='snipers'&&!scoped)?'hidden':'';
  sky.position.copy(camera.position);
}
function updViewmodel(dt){
  const i=me.w,g=vms[i],b=vmBase[i];
  me.kick=Math.max(0,me.kick-dt*(i===3?14:i===0?10:i===7?4:5));me.raise=Math.max(0,me.raise-dt*4);
  const hs=Math.hypot(me.s.vx,me.s.vz),mv=me.s.on?Math.min(1,hs/10):.3;
  g.position.set(b.x+Math.cos(me.bob)*.014*mv,b.y-Math.abs(Math.sin(me.bob))*.012*mv-me.raise*.35-me.dip*.3+(me.s.on?0:Math.max(-.04,Math.min(.04,-me.s.vy*.003))),b.z+me.kick*.06);
  if(i===7){
    // al sacarlo, los dos mangos dan la vuelta sobre los pernos y se cierran atrás (como el balisong del espía)
    if(me.vmW!==7){me.flipT=0;}
    me.flipT=(me.flipT||0)+dt;
    const ft=me.flipT,ez=x=>{x=Math.max(0,Math.min(1,x));return 1-Math.pow(1-x,3);};
    const hA=g.getObjectByName('hA'),hB=g.getObjectByName('hB');
    // como el butterfly knife del CS:GO: al sacarlo los mangos se abren y cierran dos veces mientras gira en la mano
    const DR=.85,k=Math.min(2,Math.max(0,ft/DR*2)),kb=Math.min(2,Math.max(0,(ft-.07)/DR*2));
    let fa=Math.pow(Math.sin(Math.PI*k),2),fb=Math.pow(Math.sin(Math.PI*kb),2);
    // inspección (F): la rutina de trucos, mangos que vuelan seis veces con giros de muñeca
    const it=me.inspT!=null&&me.inspT<2.6&&me.alive&&!me.scope?me.inspT:-1;
    if(it>=0&&it<2.3){const q=Math.min(1,it/2.3)*6,qb=Math.min(1,Math.max(0,(it-.06)/2.3))*6;fa=Math.max(fa,Math.pow(Math.sin(Math.PI*q*.5),2));fb=Math.max(fb,Math.pow(Math.sin(Math.PI*qb*.5),2));}
    // el mango que agarra la mano queda quieto; el libre da las vueltas (así la mano nunca se separa del cuchillo)
    if(hA&&hB){hA.rotation.x=0;hB.rotation.x=-Math.PI*Math.max(fa,fb);}
    me.bflyDraw=ft<DR?ft/DR:1;
  }
  me.vmW=i;
  if(i===7){
    // butterfly knife del CS:GO: tajo diagonal corto y muy rápido (de arriba a la derecha hacia abajo a la izquierda,
    // el siguiente de vuelta) con un golpe de muñeca al final; la hoja casi no sale del cuadro
    me.mt+=dt;const D=.3,p=Math.min(1,me.mt/D),dr=me.mdir;
    const ss=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},out=x=>{x=Math.max(0,Math.min(1,x));return 1-Math.pow(1-x,3);};
    const R=[.1,.5,.25,0,0,0];
    // barrido horizontal ancho: de derecha a izquierda con la hoja acostada y de vuelta de revés
    const Wk=dr>0?[.18,1.25,-.95,.16,.07,.05]:[.18,-.35,1.15,-.2,.07,.05],St=dr>0?[-.12,-.85,-1.3,-.42,-.05,-.14]:[-.12,1.45,1.25,.32,-.05,-.14];
    const e1=ss(p/.14),e2=out((p-.14)/.2),e3=ss((p-.42)/.58);
    const v=R.map((r,k)=>{let x=r+(Wk[k]-r)*e1;x+=(St[k]-x)*e2;x+=(r-x)*e3;return x;});
    v[4]+=.045*Math.sin(Math.min(1,Math.max(0,(p-.18)/.26))*Math.PI);   // arco: sube en el medio del corte, como la ráfaga
    const idle=p>=1?1:0,tt=G.time;
    const bd=me.bflyDraw==null?1:me.bflyDraw,spin=bd<1?Math.PI*2*ss(bd):0;
    g.rotation.set(v[0]+Math.sin(tt*1.6)*.015*idle-me.raise*.3+Math.sin(bd*Math.PI)*.35,v[1]+Math.cos(tt*1.1)*.02*idle,v[2]+spin);
    g.position.x+=v[3];g.position.y+=v[4]+Math.sin(tt*2)*.004*idle;g.position.z+=v[5];
  }else if(i===9){
    // apuntar con las miras: el rifle sube al centro y la mira trasera se alinea con la delantera
    me.ads+=((me.scope&&me.alive?1:0)-me.ads)*Math.min(1,dt*12);const a=me.ads;
    g.position.set(g.position.x*(1-a),g.position.y*(1-a)-.1205*a,g.position.z*(1-a)-.25*a);
    g.rotation.set((me.kick*.12-me.raise*.6)*(1-a*.6)+.0213*a,VYAW[9]*(1-a),VROLL[9]*(1-a));
  }else g.rotation.set(me.kick*.12-me.raise*.6,VYAW[i]||0,VROLL[i]||0);
  // inspección (F): gira el arma para mostrar un costado, la inclina para mostrar el otro y vuelve; el cuchillo además da una vuelta
  if(me.inspT!=null&&me.inspT<2.6&&me.alive&&!me.scope){
    me.inspT+=dt;const t=me.inspT,ss=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const w1=ss(t/.38)*(1-ss((t-1.15)/.4)),w2=ss((t-1.15)/.4)*(1-ss((t-2.1)/.45)),sw=Math.sin(t*2.2)*.012*(w1+w2);
    const k=i===7?1.15:i===0?1.1:1;
    g.position.x+=(-.07*w1-.03*w2)*k;g.position.y+=(.045*w1+.06*w2+sw)*k;g.position.z+=(.06*w1+.03*w2);
    g.rotation.y+=(-.95*w1+.55*w2)*k;g.rotation.z+=(.4*w1-.3*w2)*k;g.rotation.x+=(.08*w1-.32*w2);
    if(i===7&&t<2.3){g.rotation.z+=Math.PI*4*ss(t/2.3);g.rotation.x+=Math.sin(t*5.5)*.25;}
  }
  if(me.rel>0){me.rel-=dt;if(me.rel<=0){me.rel=0;if(me.relW>=0)me.mag[me.relW]=WEAPONS[me.relW].mag;updateHUD();}}
  const ru=me.rel>0&&me.relW===i&&me.alive?1-Math.min(1,me.rel/(WEAPONS[i].reload*.75)):-1;
  me.fireT=(me.fireT==null?9:me.fireT)+dt;
  if(me.vmLastW!==i){VEV.pu=-1;VEV.pf=9;me.vmLastW=i;}
  VEV.cu=ru;VEV.cf=me.fireW===i?me.fireT:9;
  const rigged=vRig(i,g,ru,VEV.cf);
  if(!rigged&&ru>=0)reloadAnim(i,g,ru);
  VEV.pu=ru;VEV.pf=VEV.cf;
  vms.forEach((v,k)=>v.visible=k===i&&me.alive&&!(me.scope&&WEAPONS[i].scope&&i!==9&&camera.fov<(WEAPONS[i].zoom||22)+8)&&!(i===10&&me.throwT<.75&&((me.throwT>.2&&me.throwT<.45)||(me.throwT>=.45&&!hasAmmo(10)))));
  updKnifeArm();updSweep(dt);vUpdEjects(dt);if(rigged&&g.visible)vPlaceHand(g);else vHideHands();
  if(i===10){
    const f=g.getObjectByName('flame');if(f){const k=.8+Math.random()*.45;f.scale.set(k,.8+Math.random()*.7,k);}
    // tiro: amague atrás, brazo hacia adelante, la mano vuelve vacía y sube otra botella (si quedan)
    me.throwT=me.throwT==null?9:me.throwT+dt;const t=me.throwT,sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    if(t<.75){
      const back=sm(t/.09)*(1-sm((t-.09)/.1)),fwd=sm((t-.09)/.12),gone=t>.2&&t<.45,rise=sm((t-.45)/.3);
      g.position.y+=back*.07-fwd*.05;g.position.z+=back*.12-fwd*.28;g.rotation.x+=-back*.9+fwd*1.25;
      if(gone||(t>=.45&&!hasAmmo(10)))g.visible=false;
      else if(t>=.45){g.position.y-=(1-rise)*.32;g.position.z+=.28*(1-rise);g.rotation.x-=1.25*(1-rise);}
      if(t>.5&&!hasAmmo(10)&&!me.throwDone){me.throwDone=true;autoSwitch();}
    }else me.throwDone=false;
  }
  me.flash=Math.max(0,me.flash-dt);
  flashMesh.visible=me.flash>0&&me.alive;
  if(flashMesh.visible){const tip=g.userData.tip;flashMesh.position.set(g.position.x+tip.x,g.position.y+tip.y,g.position.z+tip.z-.04);flashMesh.rotation.z=Math.random()*6.28;flashMesh.scale.setScalar(i===0?.7:i===2?1.7:i===1?1.3:1);}
  wMuz.intensity=me.flash>0?3:0;wMuz.position.copy(g.position).add(tipTmp.set(0,.05,-.4));
  wMuz.color.setHex(me.q>0?0xb46cff:0xffaa44);
  muzzleWorld.intensity=me.flash>0&&S.q?2.4:0;
}
const opCache={},elCache={};
function setOp(id,v){v=Math.round(v*50)/50;if(opCache[id]===v)return;opCache[id]=v;(elCache[id]||(elCache[id]=$(id))).style.opacity=v;}
function updEffects(dt){
  for(let i=booms.length-1;i>=0;i--){const b=booms[i];b.t+=dt;const k=b.t/.38;b.m.scale.setScalar(.4+k*3.4);b.m.material.opacity=Math.max(0,1-k);b.m.material.color.setHSL(.08-k*.06,1,.6-k*.3);if(k>=1){b.m.visible=false;boomPool.push(b.m);booms.splice(i,1);}}
  for(let i=beams.length-1;i>=0;i--){const b=beams[i];b.t+=dt;b.line.material.opacity=Math.max(0,1-b.t/b.life);if(b.t>b.life){b.line.visible=false;beamPool.push(b.line);beams.splice(i,1);}}
  dynLights.forEach(L=>{L.t=Math.max(0,L.t-dt);L.l.intensity=L.max?L.t/L.max*3:0;});
  updSys(sparks,dt);updSys(gore,dt);
  if(!$('inter').hidden&&G.interEnd)setTxt('interN',String(Math.max(0,Math.ceil(G.interEnd-performance.now()/1000))));
  G.hurt=Math.max(0,G.hurt-dt*1.6);G.predHit=(G.predHit||0)-dt;G.pick=Math.max(0,G.pick-dt*2.5);G.hitT=Math.max(0,G.hitT-dt);G.dmgT=Math.max(0,G.dmgT-dt*1.2);
  setOp('flash',!inGame?0:!me.alive?Math.min(.7,.3+me.deadT*.25):Math.min(.85,G.hurt+(me.hp<25?.12+Math.sin(G.time*5)*.05:0)));
  setOp('pflash',G.pick*.8);setOp('lavatint',G.lava);
  setOp('qtint',me.q>0&&me.alive?.6+Math.sin(G.time*6)*.15:0);
  setOp('hitm',G.hitT>0?1:0);
  setOp('dmgdir',G.dmgT);if(G.dmgT>0)$('dmgdir').style.transform='rotate('+(-(G.dmgAng-me.yaw)).toFixed(3)+'rad)';
  const sp=Math.round(Math.hypot(me.s.vx,me.s.vz)*32);setTxt('spdV',String(sp));$('speed').className=sp>500?'vfast':sp>360?'fast':'';
  $('xh').hidden=!me.alive;
  if(level){
    for(const o of level.items){if(!o.g.visible)continue;o.ph+=dt;o.g.rotation.y+=dt*1.6;o.g.position.y=o.it.y+.6+Math.sin(o.ph*2.2)*.12;}
    if(shards.size)updShards(dt);
    level.lavaTexs.forEach((t,i)=>{t.offset.x=(G.time*.04+i*.3)%1;t.offset.y=Math.sin(G.time*.35+i)*.06;});
    level.waterTexs.forEach(t=>{t.offset.x=(G.time*.035)%1;t.offset.y=Math.sin(G.time*.2)*.03;});
    const club=!!level.club;
    for(const pm of level.pads)if(Math.random()<dt*14)emit(sparks,pm.p.x+R(1.4),pm.p.y+.15,pm.p.z+R(1.4),0,2+Math.random()*3,0,.5,1,club?.25:.65,club?.85:.2,0);
    if(level.geysers)for(const gy of level.geysers){
      const p=gy.p,g=p.geyser,ph=C.geyserPhase(p,serverNow()),on=ph<g.on,warn=Math.max(0,1-(g.period-ph)/1.2);
      // burbujeo que avisa, después la columna de magma
      gy.core.material.opacity=on?1:.35+warn*.6;gy.core.material.color.setHex(on?0xffd27a:warn>.1?0xff8a20:0xb03a0a);
      gy.gl.intensity=S.q?(on?3.2+Math.random():warn*1.6):0;
      if(!on&&warn>0&&Math.random()<dt*40*warn)emit(sparks,p.x+R(p.r*1.4),p.y+.45,p.z+R(p.r*1.4),R(.4),1+Math.random()*1.5,R(.4),.4,1,.45,.08,4);
      if(on){const n=Math.round(dt*260);for(let k=0;k<n;k++){const a=Math.random()*6.28,r=Math.random()*p.r*.8;emit(sparks,p.x+Math.cos(a)*r,p.y+.5,p.z+Math.sin(a)*r,R(1.2),9+Math.random()*7,R(1.2),.7+Math.random()*.4,1,.5+Math.random()*.35,.08,9);}
        if(Math.random()<dt*10)emit(gore,p.x+R(p.r),p.y+.6,p.z+R(p.r),R(.6),3+Math.random()*3,R(.6),1.6,.18,.15,.14,-.8);}
      if(on&&!gy.was)SFX.geyser(vAt(p.x,p.y,p.z));gy.was=on;
    }
    for(const t of level.teles)if(Math.random()<dt*20){const a=Math.random()*6.28;emit(sparks,t.x+Math.cos(a)*t.r,t.y+.1,t.z+Math.sin(a)*t.r,0,1.5+Math.random(),0,.9,.4,.8,1,0);}
  }
  G.fpsN++;G.fpsT+=dt;if(G.fpsT>=.5){setTxt('tFps',String(Math.round(G.fpsN/G.fpsT)));G.fpsN=0;G.fpsT=0;}
}


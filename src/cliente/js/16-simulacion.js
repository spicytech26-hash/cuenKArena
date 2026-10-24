/* =================== SIMULACIÓN LOCAL =================== */
function updMe(dt){
  // aviso "E · agarrar" si hay un arma principal tirada al lado y no es la tuya
  G.grabT=(G.grabT||0)-dt;if(G.grabT<=0){G.grabT=.15;let txt='';
    if(me.alive&&MODE!=='gungame'&&level)for(const o of level.items){const inf=C.ITEMS[o.ty];if(!o.g.visible||!inf||inf.weapon==null||!C.PRIMARY.includes(inf.weapon)||me.ow[inf.weapon])continue;
      if(Math.hypot(me.s.x-o.it.x,me.s.z-o.it.z)<2.2&&Math.abs(me.s.y-o.it.y)<1.6){txt='<kbd>E</kbd>agarrar '+esc(inf.name)+(C.primaryOf(me.ow)>=0?' (deja '+esc(WEAPONS[C.primaryOf(me.ow)].name)+')':'');break;}}
    // parado sobre un botiquín o un escudo que no podés agarrar porque ya estás lleno: avisarlo (no es que no funcione)
    if(!txt&&me.alive&&level)for(const o of level.items){if(!o.g.visible||Math.abs(me.s.x-o.it.x)>1.1||Math.abs(me.s.z-o.it.z)>1.1||Math.abs(me.s.y-o.it.y)>1.4)continue;
      if((o.ty==='health'&&me.hp>=100)||(o.ty==='mega'&&me.hp>=150))txt='Salud llena · el botiquín se agarra cuando te falta vida';
      else if((o.ty==='armor'||o.ty==='armorH')&&me.ar>=100)txt='Blindaje lleno (100) · se agarra cuando te falta';
      if(txt)break;}
    const h=$('grabHint');if(h.dataset.t!==txt){h.dataset.t=txt;h.innerHTML=txt;h.hidden=!txt;}}
  if(!me.alive){me.deadT+=dt;
    // como en TF2: unos segundos mirando al que te mató y reaparecés solo
    const left=Math.max(0,DEATH_T-me.deadT);
    setTxt('deathHint',(G.pov?'Viendo a '+nameOf(G.pov.id)+' · ':'')+(liveState()?(left>0?'Reaparecés en '+Math.ceil(left)+(C.MODES[MODE].shop?' · B abre la tienda':''):'Reapareciendo…'):''));
    if(me.deadT>=DEATH_T&&!me.respawnAsk&&liveState()&&net){me.respawnAsk=true;net.send({t:'respawn'});}
    if(me.respawnAsk&&me.deadT>DEATH_T+1.5)me.respawnAsk=false; // si no llegó, se vuelve a pedir
    return;}
  let f=0,s=0;
  const free=!chatOpen&&$('shop').hidden;
  if(free){if(keys.KeyW||keys.ArrowUp)f+=1;if(keys.KeyS||keys.ArrowDown)f-=1;if(keys.KeyD)s+=1;if(keys.KeyA)s-=1;if(keys.ArrowLeft)me.yaw+=dt*2.4;if(keys.ArrowRight)me.yaw-=dt*2.4;}
  const sy=Math.sin(me.yaw),cyw=Math.cos(me.yaw);
  const wx=-sy*f+cyw*s,wz=-cyw*f-sy*s;
  const jumpKey=free&&!!keys.Space;
  const jump=jumpKey&&(S.hop||!me.jumpHeld);
  const crouch=free&&!!(keys.ControlLeft||keys.ControlRight||keys.KeyC);
  const r=C.pmove(W,me.s,{wx,wz,jump,crouch,fast:MODE==='snipers'&&me.w===7?1.3:1},dt);
  me.jumpHeld=jumpKey;
  if(r.jumped)SFX.jump();
  if(r.landed<-9){me.dip=Math.min(.25,-r.landed*.015);SFX.land(Math.min(1,-r.landed/20));}
  me.padT-=dt;
  const tr=C.triggers(W,me.s);
  if(C.padReady(me.s,tr.pad,r.landed<-2)&&tr.pad&&me.padT<=0){C.launchPad(me.s,tr.pad);me.padT=.4;SFX.pad(1);for(let i=0;i<20;i++)emit(sparks,me.s.x+R(1),me.s.y+.1,me.s.z+R(1),R(1),3+Math.random()*3,R(1),.4,1,.7,.2,4);}
  if(tr.tele){fxTele(me.s.x,me.s.y,me.s.z);me.s.x=tr.tele.to[0];me.s.y=tr.tele.to[1];me.s.z=tr.tele.to[2];me.s.vx=me.s.vy=me.s.vz=0;me.yaw=tr.tele.yaw;SFX.tele(1);fxTele(me.s.x,me.s.y,me.s.z);G.pick=.4;sendState();}
  const hot=tr.lava&&!tr.water;
  G.lava=hot?Math.min(1,G.lava+dt*4):Math.max(0,G.lava-dt*3);
  if(hot&&Math.random()<dt*4)SFX.sizzle();
  const hs=Math.hypot(me.s.vx,me.s.vz);
  if(me.s.on&&hs>1){me.bob+=dt*hs*1.05;me.stepT-=dt*hs;if(me.stepT<=0){me.stepT=2.4;SFX.step();}}
  me.tilt+=(-s*.016-me.tilt)*Math.min(1,dt*8);
  me.cool-=dt;me.heat=Math.max(0,me.heat-dt*1.5);
  if(!mouseDown)me.held=false;
  const W_=WEAPONS[me.w];
  if(mouseDown&&me.cool<=0&&me.raise<.4&&!(W_.semi&&me.held)&&liveState()&&$('shop').hidden){fire();me.held=true;}
  G.sendT-=dt;if(G.sendT<=0){G.sendT=1/30;sendState();}
}
function sendState(){if(net)net.send({t:'st',p:r3([me.s.x,me.s.y,me.s.z]),v:r3([me.s.vx,me.s.vy,me.s.vz]),y:Math.round(me.yaw*1000)/1000,x:Math.round(me.pitch*1000)/1000,w:me.w,o:me.s.on?1:0,c:me.s.crouch?1:0});}

/* ---------- jugadores remotos: interpolación con colchón adaptativo ---------- */
const angLerp=(a,b,t)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*t;};
// el reloj con el que se dibujan los demás avanza parejo: si la estimación de la hora del servidor o el colchón cambian,
// se acomoda de a poco (como mucho 10% más rápido o más lento) en vez de dar un salto que se ve como un tirón
let rtS=null;
function renderClock(dt){
  const target=serverNow()-CLK.delay;
  if(rtS==null||Math.abs(target-rtS)>.25)rtS=target;
  else{rtS+=dt;const e=target-rtS;rtS+=Math.max(-dt*.1,Math.min(dt*.1,e*Math.min(1,dt*3)));}
  return rtS;
}
// sombra bajo cada jugador: una mancha suave estirada hacia donde da el sol (más barata que recalcular el mapa de sombras)
const blobTex=new THREE.CanvasTexture(cv(64,64,g=>{const gr=g.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(0,0,0,.85)');gr.addColorStop(.55,'rgba(0,0,0,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);}));
const blobGeo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),blobs=[];
function blobAt(i){let b=blobs[i];if(!b){b=new THREE.Mesh(blobGeo,new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,opacity:.5,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));b.renderOrder=1;blobs[i]=b;scene.add(b);}b.visible=true;return b;}
function placeBlob(i,x,y,z,k){
  const hit=C.raycast(W,x,y+.3,z,0,-1,0,7);if(!hit)return false;
  const gy=y+.3-hit.t,h=y-gy,f=Math.max(0,1-h/5);if(f<=0)return false;
  const b=blobAt(i),sun=level&&level.sun;
  if(sun){const dx=sun.target.position.x-sun.position.x,dz=sun.target.position.z-sun.position.z,dl=Math.hypot(dx,dz)||1,ux=dx/dl,uz=dz/dl;
    b.position.set(x+ux*.5,gy+.02,z+uz*.5);b.rotation.y=Math.atan2(ux,uz);b.scale.set(.85+h*.1,1,1.7+h*.1);b.material.opacity=.55*f*k;}
  else{b.position.set(x,gy+.02,z);b.rotation.y=0;b.scale.set(1+h*.15,1,1+h*.15);b.material.opacity=.45*f*k;}
  return true;
}
function updRemote(dt){
  const rt=renderClock(dt);let nb=0;
  for(const p of players.values()){
    const m=p.model;if(!m)continue;
    const b=p.buf;if(!b.length){m.g.visible=false;continue;}
    let a=null,c=null;
    for(let i=b.length-1;i>=0;i--)if(b[i].t<=rt){a=b[i];c=b[i+1]||null;break;}
    let x,y,z,yaw,pitch,cur;
    if(!a){cur=b[0];x=cur.x;y=cur.y;z=cur.z;yaw=cur.yaw;pitch=cur.pitch;}
    else if(!c){
      // no llegó el dato siguiente todavía: seguir un poquito con la velocidad conocida
      cur=a;const e=Math.min(rt-a.t,.15);x=a.x+a.vx*e;y=a.y+(a.fl&4?0:a.vy*e);z=a.z+a.vz*e;yaw=a.yaw;pitch=a.pitch;
    }else{
      let t=(rt-a.t)/((c.t-a.t)||1);t=Math.max(0,Math.min(1,t));
      if(Math.hypot(c.x-a.x,c.z-a.z)>8)t=t<.5?0:1;
      x=a.x+(c.x-a.x)*t;y=a.y+(c.y-a.y)*t;z=a.z+(c.z-a.z)*t;yaw=angLerp(a.yaw,c.yaw,t);pitch=a.pitch+(c.pitch-a.pitch)*t;cur=t<.5?a:c;
    }
    p.x=x;p.y=y;p.z=z;p.yaw=yaw;p.pitch=pitch;
    const alive=!!(cur.fl&1);
    if(alive&&!p.alive){p.alive=true;p.gib=false;p.deadT=0;}
    if(!alive&&p.alive){p.alive=false;p.deadT=0;}
    p.w=cur.w;p.quad=!!(cur.fl&2);p.onG=!!(cur.fl&4);p.crouch=!!(cur.fl&8);p.spd=Math.hypot(cur.vx,cur.vz);
    // el modelo mira a +z y en el juego yaw 0 mira a -z: hay que girarlo media vuelta
    m.g.position.set(p.x,p.y,p.z);m.g.rotation.y=p.yaw+Math.PI;
    // velocidad real a partir de cuánto se movió en pantalla (no depende de lo que mande el servidor)
    if(p.px==null||Math.hypot(p.x-p.px,p.z-p.pz)>3){p.px=p.x;p.pz=p.z;}
    const ivx=(p.x-p.px)/Math.max(dt,1e-3),ivz=(p.z-p.pz)/Math.max(dt,1e-3);p.px=p.x;p.pz=p.z;
    const ks=Math.min(1,dt*10);p.vxs=(p.vxs||0)+(ivx-(p.vxs||0))*ks;p.vzs=(p.vzs||0)+(ivz-(p.vzs||0))*ks;
    if(p.alive){
      m.g.visible=true;m.b.rotation.set(0,0,0);m.b.position.y=0;
      const sp=Math.hypot(p.vxs,p.vzs),sy=Math.sin(p.yaw),cyw=Math.cos(p.yaw);
      const fwd=-p.vxs*sy-p.vzs*cyw,side=p.vxs*cyw-p.vzs*sy;           // hacia adelante y hacia la derecha
      const fr=sp>.3?fwd/sp:0,sr=sp>.3?side/sp:0;
      p.phase+=dt*Math.min(sp,14)*1.9*(fwd<-.3?-1:1);
      const amp=Math.min(1,sp/5)*.85,ph=Math.sin(p.phase);
      if(p.onG){
        m.legs[0].rotation.set(-ph*amp*Math.max(.35,Math.abs(fr)),0,ph*amp*sr*.5);
        m.legs[1].rotation.set(ph*amp*Math.max(.35,Math.abs(fr)),0,-ph*amp*sr*.5);
        m.b.position.y=Math.abs(Math.cos(p.phase))*amp*.07;
        m.b.rotation.x=Math.max(-.12,Math.min(.18,fwd*.014));m.b.rotation.z=Math.max(-.12,Math.min(.12,-side*.01));
      }else{m.legs[0].rotation.set(-.7,0,0);m.legs[1].rotation.set(.35,0,0);m.b.rotation.x=.08;}
      if(p.crouch){m.b.position.y-=.55;m.legs[0].rotation.x-=.9;m.legs[1].rotation.x-=.5;m.b.rotation.x+=.18;}
      m.armL.rotation.x=ph*amp*.8*(p.onG?1:0)-(p.onG?0:.6);m.armR.rotation.x=-p.pitch*.8-(p.fire>0?.25:0);m.head.rotation.x=-p.pitch*.5;
      p.fire=(p.fire||0)-dt;p.pain=(p.pain||0)-dt;
      const em=p.pain>0?0x803020:p.quad?0x5020a0:0;m.mats.forEach(mm=>mm.emissive.setHex(em));
      if(m.gun.userData.w!==p.w){m.gun.clear();m.gun.add(tpGun(p.w));m.gun.userData.w=p.w;}
      if(m.tag)m.tag.visible=true;
      if(placeBlob(nb,p.x,p.y,p.z,1))nb++;
    }else{
      p.deadT+=dt;if(m.tag)m.tag.visible=false;
      if(p.gib)m.g.visible=false;
      else{m.b.rotation.x=Math.max(-Math.PI/2,-p.deadT*5);m.b.position.y=p.deadT>2?Math.max(-.3,-(p.deadT-2)*.3):0;m.g.visible=p.deadT<5;
        if(m.g.visible&&placeBlob(nb,p.x,p.y,p.z,Math.max(0,1-p.deadT/5)))nb++;}
    }
  }
  for(let i=nb;i<blobs.length;i++)blobs[i].visible=false;
}
function updMovers(){
  if(!level||!level.movers.length)return;
  C.updateMovers(W,serverNow());
  for(const mv of level.movers)mv.mesh.position.set(mv.b.min[0],mv.b.min[1],mv.b.min[2]);
}


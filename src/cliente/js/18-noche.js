/* ---------- modo noche (solo los mapas con theme.noche, por ahora Skatenight) ----------
   · Cada arma lleva una linterna: un foco real que sale de tu arma (el 0) y otros dos para las linternas de los
     dos rivales más cercanos (hay solo 3 focos reales para no pesar). El resto de las linternas se ven como un haz
     translúcido y un brillo en el lente que pega fuerte cuando te apuntan a vos.
   · Los rivales se ven apenas: la luz ambiente es mínima, y las partes que brillan solas (visor, pecho) se apagan
     salvo que estén cerca (menos de 5 m) o los estés alumbrando; el nombre aparece solo si los alumbrás. */
const nBeamGeo=(()=>{const g=new THREE.ConeGeometry(3.4,15,18,1,true);g.translate(0,-7.5,0);g.rotateX(-Math.PI/2);return g;})();   // la punta en el origen, apunta a +z
const nBeamMat=new THREE.MeshBasicMaterial({color:0xfff0c8,transparent:true,opacity:.04,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const nLinBody=new THREE.MeshPhongMaterial({color:0x4a4e56,shininess:70,emissive:0x121418}),nLinLens=new THREE.MeshBasicMaterial({color:0xfff4cc});
const nDir=new THREE.Vector3(),nRight=new THREE.Vector3(),nUp=new THREE.Vector3(0,1,0);
// linterna táctica montada a cada arma: va pegada al costado del caño y un soporte (riel) la une al cuerpo del arma, así no queda flotando.
// LIN_POS: x, y, z de la linterna en el modelo de cada arma (la 7 es el cuchillo y la 10 el molotov); el soporte llega hasta el eje del arma (x=0)
const LIN_POS=[[-.045,.02,-.09],[-.075,.02,-.45],[-.065,.02,-.35],[-.055,.02,-.3],[-.075,0,-.3],[-.115,0,-.4],[-.075,.02,-.35],[-.045,-.005,.08],[-.055,0,-.5],[-.055,0,-.55],[-.07,.08,-.02]];
const nLinMount=new THREE.MeshPhongMaterial({color:0x2a2c31,shininess:30});
function makeLin(i){
  const p=LIN_POS[i]||LIN_POS[1],gp=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.1,10),nLinBody);body.rotation.x=Math.PI/2;
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.0205,10),nLinLens);lens.position.z=-.051;lens.rotation.y=Math.PI;
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(.0185,.0185,.014,10),nLinLens);ring.rotation.x=Math.PI/2;ring.position.z=-.034;   // aro de luz: se ve de costado
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.0175,.0175,.012,10),nLinMount);cap.rotation.x=Math.PI/2;cap.position.z=.056;       // tapa trasera
  const w=Math.abs(p[0])+.004,arm=new THREE.Mesh(new THREE.BoxGeometry(w,.012,.05),nLinMount);arm.position.set(w/2,0,.005);               // soporte: de la linterna al eje del arma
  const clip=new THREE.Mesh(new THREE.BoxGeometry(.022,.022,.012),nLinMount);clip.position.set(0,0,.005);                                  // abrazadera sobre el cuerpo del arma
  gp.add(body,lens,ring,cap,arm,clip);gp.position.set(p[0],p[1],p[2]);arm.position.x=w/2-.002;clip.position.x=Math.abs(p[0]);return gp;
}
// haz y lente de un rival (cuelgan de su modelo, así se limpian solos)
function buildBeam(m){
  m.beam=new THREE.Mesh(nBeamGeo,nBeamMat);m.beam.frustumCulled=false;m.beam.renderOrder=3;m.beam.position.set(.2,1.38,.5);
  m.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:flashTex,color:0xfff2cc,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false}));
  m.glow.position.copy(m.beam.position);m.glow.renderOrder=4;
  m.g.add(m.beam,m.glow);m.basC=m.bas.map(x=>x.color.clone());
}
// dirección de mirada (yaw 0 mira a -z)
const nLook=(yaw,pitch,o)=>o.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
// un rival vivo, cada cuadro: haz, brillo del lente, visor apagado y nombre
function nightRemote(p,m,dt){
  if(!m.beam)buildBeam(m);
  m.beam.position.y=m.glow.position.y=p.crouch?.95:1.38;m.beam.rotation.x=-p.pitch;
  const dx=p.x-camera.position.x,dy=p.y+1.2-camera.position.y,dz=p.z-camera.position.z,d=Math.hypot(dx,dy,dz)||1;
  nLook(camera.rotation.y,camera.rotation.x,nDir);
  const lit=d<3||(d<24&&(dx*nDir.x+dy*nDir.y+dz*nDir.z)/d>.93);   // cerca, o dentro del cono de mi linterna (24 m)
  m.beam.visible=m.glow.visible=d<26;   // el haz y el lente solo se ven hasta 26 m
  p.lit=(p.lit||0)+((lit?1:0)-(p.lit||0))*Math.min(1,dt*(lit?14:2.5));   // se prende rápido y se apaga despacio
  const k=.02+.98*p.lit;
  for(let i=0;i<m.bas.length;i++)m.bas[i].color.copy(m.basC[i]).multiplyScalar(k);
  if(m.tag)m.tag.visible=p.lit>.5&&d<26;
  const oculto=!(d<4.5||p.lit>.15);m.b.visible=!oculto;   // fuera del alcance y sin alumbrarlo, el cuerpo no se ve (el haz y el lente sí)
  // el lente brilla fuerte si me apunta (cos entre su mirada y la dirección hacia mí)
  nLook(p.yaw,p.pitch,nRight);
  const f=Math.max(0,-(nRight.x*dx+nRight.y*dy+nRight.z*dz)/d);
  m.glow.material.opacity=(.1+.9*f*f*f)*Math.max(0,1-d/26);m.glow.scale.setScalar((.25+1.3*f*f)*Math.max(.3,1-d/40));
  // pasos: se oyen hasta 24 m (más fuerte cuanto más cerca); agachado no suena
  const sp=Math.hypot(p.vxs||0,p.vzs||0);
  if(p.onG&&!p.crouch&&sp>2.5&&d<24){p.stepD=(p.stepD||0)+sp*dt;if(p.stepD>2.3){p.stepD=0;const vv=Math.pow(Math.max(0,1-d/24),1.6);if(vv>.02)nz({dur:.06+Math.random()*.03,f0:520+Math.random()*180,f1:160,type:'lowpass',vol:.24*vv});}}
  return oculto;
}
function nightHide(m){if(m.beam)m.beam.visible=m.glow.visible=false;m.b.visible=true;}
// focos reales: el mío y los de los 2 rivales más cercanos
// ambiente sonoro de noche: viento bajo que sube y baja, y de tanto en tanto un crujido de metal, un golpe lejano o un susurro
let nAmb=null,nAmbT=4,nGustT=8,nTrainT=40,nStepT=22;
function nightAmbient(dt){
  if(!AC||!noiseBuf)return;
  const pir=!!(W&&W.theme&&W.theme.ambiente==='piramide');   // cada mapa de noche tiene su propio ambiente: Skatenight (viento, tren, pasos) y Pyramid (aullido, campana, zumbido de gravedad)
  pyramidAmbient(dt,pir);
  if(!NIGHT||pir){if(nAmb){const t=AC.currentTime;for(const g of [nAmb.g.gain,nAmb.g2.gain]){g.cancelScheduledValues(t);g.setTargetAtTime(0,t,.05);}}return;}   // fuera de Skatenight no suena nada
  if(!nAmb){
    const mkL=(type,fr,q)=>{const s=AC.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=fr;if(q)f.Q.value=q;const g=AC.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(master);s.start();return {g,f};};
    const a=mkL('lowpass',380),b=mkL('bandpass',1000,.4);nAmb={g:a.g,f:a.f,g2:b.g,gust:0};   // viento bajo + capa de niebla (aire)
  }
  const t=AC.currentTime;
  nGustT-=dt;if(nGustT<=0){nGustT=8+Math.random()*14;nAmb.gust=1;}   // ráfaga: sube rápido y se va despacio
  nAmb.gust=Math.max(0,nAmb.gust-dt*.3);const gu=nAmb.gust*nAmb.gust;
  nAmb.g.gain.setTargetAtTime(.06+.04*Math.sin(t*.35)+.02*Math.sin(t*1.1)+.14*gu,t,.35);nAmb.f.frequency.setTargetAtTime(300+160*Math.sin(t*.23)+520*gu,t,.5);
  nAmb.g2.gain.setTargetAtTime(.016+.012*Math.sin(t*.17)+.035*gu,t,.8);
  nTrainT-=dt;if(nTrainT<=0){nTrainT=70+Math.random()*80;nightTrain();}
  nStepT-=dt;if(nStepT<=0){nStepT=16+Math.random()*28;const n=2+Math.floor(Math.random()*4);for(let k=0;k<n;k++)nz({dur:.06,f0:520,f1:170,type:'lowpass',vol:.08,delay:k*.52+Math.random()*.08});}   // pasos lejanos de alguien que no ves
  nAmbT-=dt;
  if(nAmbT<=0){nAmbT=6+Math.random()*12;const k=Math.random();
    if(k<.4){tn({type:'sawtooth',f0:230,f1:150,dur:1.2,vol:.025});nz({dur:1.2,f0:520,f1:300,type:'bandpass',q:7,vol:.05});}
    else if(k<.75)tn({type:'sine',f0:72,f1:36,dur:.55,vol:.2});
    else nz({dur:1,f0:2000,f1:900,type:'bandpass',q:5,vol:.035});}
}
// música de Pyramid: electrónica de tracker con orquesta y guitarras, en la onda de Unreal Tournament (DM-Pyramid suena "bouncy" y a tempo medio).
// 140 BPM, mi frigio/menor (Mi Mi Do Re | Mi Mi Fa Si), batería saltarina, bajo con filtro, guitarra con distorsión, arpegio con eco, cuerdas, campanas y coro.
// Se programa con un reloj por adelantado (cada cuadro agenda los próximos 16avos). Pasa por musicGain: la barra de "música" de Ajustes la controla.
let pMus=null;
const PM_S=60/140/4;                                                      // un 16avo
const PM_ROOT=[82.41,82.41,65.41,73.42,82.41,82.41,87.31,61.74];         // raíz de cada compás de la vuelta de 8
const PM_CH=[[0,3,7],[0,3,7],[0,4,7],[0,4,7],[0,3,7],[0,3,7],[0,4,7],[0,4,7]];
const PM_BASS=[[0,-1,0,12,-1,0,-1,7,0,-1,0,12,-1,10,-1,7],[0,0,12,0,0,7,0,12,0,0,12,0,0,10,7,12]];
const PM_ARP=[0,2,4,2,1,3,5,3,0,2,4,5,3,2,1,0],PM_MEL=[[0,3,6,8,11,12,14],[3,2,4,3,5,4,2]];
function pmOsc(type,f,t,dur,vol,o){
  o=o||{};const osc=AC.createOscillator();osc.type=type;osc.frequency.setValueAtTime(f,t);if(o.f1)osc.frequency.exponentialRampToValueAtTime(o.f1,t+dur);
  let node=osc;
  if(o.lp){const fl=AC.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(o.lp,t);if(o.lp1)fl.frequency.exponentialRampToValueAtTime(o.lp1,t+dur);fl.Q.value=o.q||1;node.connect(fl);node=fl;}
  const g=AC.createGain(),a=o.att||.004,r=Math.min(o.rel||.05,dur*.8);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setValueAtTime(vol,Math.max(t+a,t+dur-r));g.gain.linearRampToValueAtTime(0,t+dur);
  node.connect(g);g.connect(o.out||pMus.bus);if(o.dly)g.connect(pMus.dly);osc.start(t);osc.stop(t+dur+.03);
}
function pmInit(){
  const bus=AC.createGain();bus.gain.value=0;bus.connect(musicGain||master);
  const dly=AC.createDelay(1);dly.delayTime.value=PM_S*3;const fb=AC.createGain();fb.gain.value=.38;const df=AC.createBiquadFilter();df.type='lowpass';df.frequency.value=2600;dly.connect(df);df.connect(fb);fb.connect(dly);df.connect(bus);
  const gtr=AC.createGain(),ws=AC.createWaveShaper(),c=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;c[i]=(3+40)*x*.35/(1+40*.35*Math.abs(x)*.5);}ws.curve=c;
  const gl=AC.createBiquadFilter();gl.type='lowpass';gl.frequency.value=2400;gtr.connect(ws);ws.connect(gl);gl.connect(bus);   // guitarra: saturación + filtro
  pMus={bus,dly,gtr,next:0,step:0,on:false};
}
function pmStep(i,t){
  const bar=(i>>4)&7,st=i&15,root=PM_ROOT[bar],ch=PM_CH[bar],hard=bar>=4,B=pMus.bus;
  // batería
  if([0,6,8,11].includes(st)||(bar%4===3&&st===14)){tn({type:'sine',f0:165,f1:44,dur:.2,vol:.8,at:t,out:B});nz({dur:.015,f0:3000,f1:800,type:'highpass',vol:.25,at:t,out:B});}
  if(st===4||st===12){nz({dur:.15,f0:3200,f1:1100,type:'bandpass',q:.7,vol:.5,at:t,out:B});tn({type:'triangle',f0:210,f1:120,dur:.09,vol:.3,at:t,out:B});}
  if(st===15&&bar%2===1)nz({dur:.06,f0:3000,f1:1500,type:'bandpass',vol:.18,at:t,out:B});
  if(st%2===0)nz({dur:.035,f0:9500,f1:7500,type:'highpass',vol:st%4===2?.17:.11,at:t,out:B});else nz({dur:.025,f0:9500,f1:8000,type:'highpass',vol:.05,at:t,out:B});
  if(st===10)nz({dur:.2,f0:8000,f1:5000,type:'highpass',vol:.13,at:t,out:B});
  if((bar===3||bar===7)&&st>=12)tn({type:'sine',f0:230-(st-12)*22,f1:90,dur:.2,vol:.55,at:t,out:B});   // redoble al final de cada frase
  if(st===0&&(bar===0||bar===4))nz({dur:1.3,f0:9000,f1:5000,type:'highpass',vol:.2,at:t,out:B});         // platillo
  if(bar===7&&st===8)nz({dur:PM_S*8,f0:600,f1:9000,type:'bandpass',q:1.5,vol:.22,at:t,out:B});          // subida de ruido antes de volver al principio
  // bajo (con barrido de filtro en cada nota)
  const bn=PM_BASS[hard?1:0][st];if(bn>=0)pmOsc('sawtooth',root*Math.pow(2,bn/12),t,PM_S*.85,.2,{lp:900,lp1:220,q:3,rel:.03});
  // guitarra: acordes de quinta (raíz + quinta + octava) cortados, desde el compás 3
  if(bar>=2&&[0,3,6,8,11,14].includes(st)){const gf=root*2,d=st===0||st===8?PM_S*1.6:PM_S*.7;for(const m of [1,1.4983,2])pmOsc('sawtooth',gf*m,t,d,.06,{out:pMus.gtr,rel:.02});}
  // arpegio de cuadrada con eco
  const cn=[0,ch[1],ch[2],12,12+ch[1],12+ch[2]][PM_ARP[st]];pmOsc('square',root*4*Math.pow(2,cn/12),t,PM_S*.8,hard?.04:.026,{lp:3200,dly:1,rel:.03});
  // melodía de sierra (solo en la segunda mitad): notas del acorde en la octava de arriba
  if(hard){const k=PM_MEL[0].indexOf(st);if(k>=0){const m=[0,ch[1],ch[2],12,12+ch[1],12+ch[2]][PM_MEL[1][k]];pmOsc('sawtooth',root*8*Math.pow(2,m/12),t,PM_S*(k%2?1.5:2.4),.05,{lp:3600,dly:1,att:.01,rel:.08});}}
  // cuerdas, campana y coro
  if(st===0){for(const m of ch){for(const dt of [-6,6])pmOsc('sawtooth',root*4*Math.pow(2,m/12)*Math.pow(2,dt/1200),t,PM_S*16,.03,{lp:1000,att:.35,rel:.6});}
    if(bar%4===0){pmOsc('triangle',659.25,t,2.2,.05,{dly:1,rel:1.8});pmOsc('sine',659.25*2.76,t,1.2,.015,{rel:1});}
    if(bar===2||bar===6)for(const m of ch)pmOsc('triangle',root*8*Math.pow(2,m/12),t,PM_S*16,.025,{att:.8,rel:1,lp:1800});}   // coro lejano
}
function pyramidAmbient(dt,on){
  const t=AC.currentTime,play=on&&inGame&&!paused;
  if(!pMus){if(!play)return;pmInit();}
  if(play!==pMus.on){pMus.on=play;pMus.bus.gain.cancelScheduledValues(t);pMus.bus.gain.setTargetAtTime(play?1:0,t,play?.4:.2);if(play){pMus.next=t+.1;}}
  if(play){
    if(pMus.next<t-.3)pMus.next=t+.05;                                     // si la pestaña se durmió, retoma sin ponerse al día
    while(pMus.next<t+.3){pmStep(pMus.step,pMus.next);pMus.next+=PM_S;pMus.step++;}
  }
  // zumbido de gravedad: solo suena adentro del pozo de gravedad cero
  if(!pMus.hum&&on){const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=64;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=240;const g=AC.createGain();g.gain.value=0;o.connect(f);f.connect(g);g.connect(master);o.start();pMus.hum={o,g,z:0};}
  if(pMus.hum){const h=pMus.hum,zg=!!(on&&me.alive&&W.zerog&&C.inZeroG(W,me.s));h.z+=((zg?1:0)-h.z)*Math.min(1,dt*3);h.g.gain.setTargetAtTime(.04*h.z,t,.2);h.o.frequency.setTargetAtTime(58+14*h.z+6*Math.sin(t*3),t,.2);}
}
// tren que pasa a lo lejos: retumbo grave que sube y baja yendo de un lado al otro, bocina de dos notas y traqueteo de ruedas
function nightTrain(){
  const t0=AC.currentTime+.2,dur=16,pan=AC.createStereoPanner?AC.createStereoPanner():null;
  const s=AC.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=150;
  const g=AC.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.32,t0+6);g.gain.linearRampToValueAtTime(.2,t0+10);g.gain.linearRampToValueAtTime(0,t0+dur);
  s.connect(f);f.connect(g);let out=g;if(pan){pan.pan.setValueAtTime(-.9,t0);pan.pan.linearRampToValueAtTime(.9,t0+dur);g.connect(pan);out=pan;}out.connect(master);s.start(t0);s.stop(t0+dur+.3);
  tn({type:'triangle',f0:233,f1:233,dur:1.8,vol:.03,at:t0+.6});tn({type:'triangle',f0:294,f1:294,dur:1.8,vol:.025,at:t0+.6});tn({type:'triangle',f0:233,f1:233,dur:1,vol:.025,at:t0+3.4});
  for(let i=0,t=t0+2;t<t0+dur-1;i++){const env=Math.sin(Math.PI*Math.min(1,(t-t0)/dur));nz({dur:.04,f0:800,f1:250,type:'bandpass',q:3,vol:.13*env,at:t});t+=.36-Math.min(.12,i*.004);}
}
// la linterna titila: cada tanto se apaga casi del todo un instante, y siempre tiembla un poquito
let nFl={t:5,d:0};
function nightFlicker(dt){
  if(nFl.d>0){nFl.d-=dt;return .12+Math.random()*.4;}
  nFl.t-=dt;if(nFl.t<=0){nFl.t=5+Math.random()*10;nFl.d=.12+Math.random()*.28;}
  return .96+Math.random()*.06;
}
// G: prende y apaga mi linterna (los demás la ven siempre encendida)
let nLinOn=true;
function nightToggle(){
  if(!NIGHT||!me.alive)return;
  nLinOn=!nLinOn;nz({dur:.025,f0:3200,f1:1800,type:'bandpass',q:4,vol:.14});tn({type:'square',f0:nLinOn?900:600,f1:nLinOn?1100:420,dur:.04,vol:.03});
}
function updNight(dt){
  if(!level)return;
  nightAmbient(dt);
  if(!NIGHT){nLinOn=true;for(const v of vms)if(v.userData.lin)v.userData.lin.visible=false;return;}
  const sp=level.spots;if(!sp)return;
  vms.forEach((v,i)=>{if(!v.userData.lin){
    const l=v.userData.lin=makeLin(i),P=v.userData.parts,br=i===2&&P&&P.brl;   // en la escopeta doble la linterna va en los caños, que se quiebran al recargar
    if(br){l.position.sub(br.position);br.add(l);}else v.add(l);}
    v.userData.lin.visible=true;v.userData.lin.children[1].visible=v.userData.lin.children[2].visible=nLinOn;});   // apagada: el lente no brilla   // todas las armas llevan linterna
  nLook(camera.rotation.y,camera.rotation.x,nDir);nRight.crossVectors(nDir,nUp).normalize();
  const mine=sp[0],on=me.alive||spWatching();
  mine.position.copy(camera.position).addScaledVector(nRight,.16).addScaledVector(nUp,-.1).addScaledVector(nDir,.2);
  mine.target.position.copy(camera.position).addScaledVector(nDir,14);mine.target.updateMatrixWorld();
  mine.intensity=nLinOn?mine.userData.i0*(on?1:.2)*nightFlicker(dt):0;
  // rivales más cercanos con linterna (solo con la calidad de luces encendida)
  const near=[];
  if(S.q)for(const p of players.values()){
    if(!p.alive||!p.model||!p.model.g.visible)continue;
    const d=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);if(d<52)near.push({p,d});
  }
  near.sort((a,b)=>a.d-b.d);near.length=Math.min(2,near.length);
  const free=[sp[1],sp[2]];
  for(const s of free)s.userData.pid=near.some(o=>o.p.id===s.userData.pid)?s.userData.pid:null;
  for(const o of near)if(!free.some(s=>s.userData.pid===o.p.id)){const s=free.find(q=>q.userData.pid==null);if(s)s.userData.pid=o.p.id;}
  for(const s of free){
    const o=near.find(q=>q.p.id===s.userData.pid);
    if(!o){s.intensity=Math.max(0,s.intensity-dt*5);continue;}
    const p=o.p;nLook(p.yaw,p.pitch,nDir);
    s.position.set(p.x+nDir.x*.5,p.y+(p.crouch?.95:1.38)+nDir.y*.5,p.z+nDir.z*.5);
    s.target.position.set(s.position.x+nDir.x*12,s.position.y+nDir.y*12,s.position.z+nDir.z*12);s.target.updateMatrixWorld();
    s.intensity=Math.min(s.userData.i0,s.intensity+dt*5);
  }
}

/* ---------- La tormenta del último minuto (solo Arena): muro, viñeta y HUD ----------
   El servidor manda los parámetros UNA sola vez (ver src/nucleo/07-partida/6d-tormenta.js) y
   acá se calcula todo con el reloj del servidor y las mismas cuentas del núcleo (C.stormR y
   C.stormDmg), así cliente y servidor nunca se van a discutir dónde está el borde.
   i = [arranque, centro x, centro z, radio inicial, radio final, achique, daño inicial, daño final] */
const STM={i:null,muro:null,geos:[],mats:[],av:0,tex:null};
const SMOD={ALTO:90,SEG:72,OP:.62,OP2:.2,BAJO:-14};   // alto del muro, segmentos del círculo, opacidad del muro y del resplandor, y desde dónde arranca

// textura del muro: cortina rojo oscuro con vetas y rayos claros (se repite alrededor y corre hacia arriba)
function stormTex(){
  if(STM.tex)return STM.tex;
  const t=new THREE.CanvasTexture(cv(256,256,(g)=>{
    const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#3a0508');gr.addColorStop(.5,'#8a0c0c');gr.addColorStop(1,'#3a0508');g.fillStyle=gr;g.fillRect(0,0,256,256);
    for(let k=0;k<90;k++){g.fillStyle='rgba('+(160+rnd()*95|0)+','+(20+rnd()*60|0)+',20,'+(.12+rnd()*.3)+')';const x=rnd()*256,w=2+rnd()*10;g.fillRect(x,0,w,256);}
    for(let k=0;k<7;k++){g.strokeStyle='rgba(255,'+(190+rnd()*60|0)+',150,.95)';g.lineWidth=1.5+rnd()*2;g.beginPath();let x=rnd()*256;g.moveTo(x,0);for(let y=0;y<=256;y+=16){x+=(rnd()-.5)*30;g.lineTo(x,y);}g.stroke();}
  }));
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return STM.tex=t;
}
function stormEnsure(){
  if(STM.muro)return;
  const g=new THREE.CylinderGeometry(1,1,SMOD.ALTO,SMOD.SEG,1,true);
  // el muro de verdad: opaco a medias y SIN mezcla aditiva (con aditiva contra el cielo claro casi no se veía)
  const m=new THREE.MeshBasicMaterial({map:stormTex(),transparent:true,opacity:SMOD.OP,depthWrite:false,side:THREE.DoubleSide,fog:false});
  const g2=new THREE.CylinderGeometry(1,1,SMOD.ALTO,SMOD.SEG,1,true);
  const m2=new THREE.MeshBasicMaterial({color:0xff3a14,transparent:true,opacity:SMOD.OP2,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,side:THREE.DoubleSide,fog:false});   // sin prueba de profundidad: el resplandor se ve A TRAVÉS de las paredes (en los mapas cerrados el muro quedaba tapado)
  // línea brillante en el piso: se ve dónde está el borde aunque el muro quede detrás de una pared
  const g3=new THREE.RingGeometry(.988,1.012,128);g3.rotateX(-Math.PI/2);
  const m3=new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.95,side:THREE.DoubleSide,fog:false,depthWrite:false});
  STM.geos=[g,g2,g3];STM.mats=[m,m2,m3];
  STM.muro=new THREE.Mesh(g,m);STM.muro.renderOrder=2;STM.muro.visible=false;scene.add(STM.muro);
  STM.glow=new THREE.Mesh(g2,m2);STM.glow.renderOrder=3;STM.muro.add(STM.glow);
  STM.aro=new THREE.Mesh(g3,m3);STM.aro.renderOrder=3;STM.aro.visible=false;scene.add(STM.aro);
  // el mapita del HUD trabaja directo en coordenadas del mundo: el viewBox son los límites del mapa
  const b=W&&W.bounds?W.bounds:{x0:-50,x1:50,z0:-50,z1:50};
  const sv=$('stmSvg');if(sv)sv.setAttribute('viewBox',b.x0+' '+b.z0+' '+(b.x1-b.x0)+' '+(b.z1-b.z0));
}
function clearStorm(){
  STM.i=null;STM.av=0;
  if(STM.muro){scene.remove(STM.muro);if(STM.aro)scene.remove(STM.aro);STM.aro=null;STM.geos.forEach(o=>o.dispose());STM.mats.forEach(o=>o.dispose());STM.geos=[];STM.mats=[];STM.muro=null;}
  const b=$('stmBox');if(b)b.hidden=true;
  setOp('stmtint',0);setOp('stmnear',0);
}
function stormSet(i){
  if(!i){clearStorm();return;}
  STM.i=i;stormEnsure();
}
function stormEvent(m){
  switch(m.a){
    case 'off': clearStorm();break;
    case 'warn':
      stormSet(m.i);STM.av=1;
      announce('¡VIENE LA TORMENTA!','la zona se achica en '+(m.d||10)+' s · quedate adentro del círculo');
      SFX.voteStart();
      break;
    case 'go':
      stormSet(m.i);
      if(!STM.av){announce('LA TORMENTA','la zona se está achicando');}
      sysChat('La tormenta arrancó: afuera del círculo el daño sube con el tiempo y el blindaje no lo frena');
      SFX.start();
      break;
  }
}
/* ---- cada cuadro ---- */
function updStorm(dt){
  const box=$('stmBox');
  if(!STM.i||!C.MODES[MODE].storm){
    if(box&&!box.hidden){box.hidden=true;setOp('stmtint',0);}
    if(STM.muro)STM.muro.visible=false;
    return;
  }
  stormEnsure();
  const i=STM.i,ahora=serverNow(),t=ahora-i[0],activa=t>=0,r=C.stormR(i,ahora);
  // --- el muro: ya se ve durante el aviso (quieto y más tenue) y después se cierra ---
  const d=Math.hypot(me.s.x-i[1],me.s.z-i[2]),afuera=activa&&me.alive&&d>r,borde=r-d;   // borde: metros que te faltan para tocar el muro (negativo = afuera)
  STM.muro.visible=STM.aro.visible=true;
  STM.muro.position.set(i[1],SMOD.ALTO/2+SMOD.BAJO,i[2]);STM.muro.scale.set(r,1,r);
  const tx=STM.tex;tx.repeat.set(Math.max(6,Math.round(r*6.2832/26)),3);tx.offset.y=(G.time*.22)%1;tx.offset.x=(G.time*.012)%1;
  const lat=.5+.5*Math.sin(G.time*(activa?5:9));
  STM.mats[0].opacity=activa?SMOD.OP+lat*.1:.3+lat*.18;
  // el resplandor atraviesa paredes: apenas se nota lejos del borde y se enciende cuando el muro se te viene encima
  const cercaK=Math.max(0,Math.min(1,1-borde/30));
  STM.mats[1].opacity=(activa?.04+SMOD.OP2*cercaK:.04)*(.7+lat*.5)+(activa&&Math.random()<.03?.12:0);   // y cada tanto un relámpago
  STM.aro.position.set(i[1],camera.position.y-1.45,i[2]);STM.aro.scale.set(r,1,r);STM.mats[2].opacity=.6+lat*.4;
  // chispas subiendo por el muro cerca tuyo
  if(activa&&Math.abs(borde)<45){const a0=Math.atan2(me.s.z-i[2],me.s.x-i[1]);for(let k=0;k<2;k++){const a=a0+(Math.random()-.5)*Math.min(1.2,50/Math.max(r,1));emit(sparks,i[1]+Math.cos(a)*r,camera.position.y-1.4+Math.random()*7,i[2]+Math.sin(a)*r,R(1.5),4+Math.random()*7,R(1.5),.8,1,.35+Math.random()*.4,.12,-2);}}
  // --- viñeta roja: fuerte cuando estás afuera, y un aviso suave cuando el muro está por alcanzarte ---
  setOp('stmtint',afuera?.55+Math.sin(G.time*5)*.15:0);
  setOp('stmnear',activa&&me.alive&&!afuera&&borde<9?(1-borde/9)*.55*(.7+.3*lat):0);
  // --- el HUD: mapita con el círculo y el contador ---
  if(box.hidden)box.hidden=false;
  box.classList.toggle('afuera',afuera);
  const c=$('stmC'),yo=$('stmMe');
  const rr=Math.round(r*10)/10;
  if(c._r!==rr){c._r=rr;c.setAttribute('cx',i[1]);c.setAttribute('cy',i[2]);c.setAttribute('r',rr);}
  const mx=Math.round(me.s.x),mz=Math.round(me.s.z);
  if(yo._x!==mx||yo._z!==mz){yo._x=mx;yo._z=mz;yo.setAttribute('cx',mx);yo.setAttribute('cy',mz);}
  if(!activa){
    setTxt('stmWho','LLEGA LA TORMENTA');
    setTxt('stmSub','en '+Math.max(0,Math.ceil(-t))+' s');
  }else if(t<i[5]){
    setTxt('stmWho',afuera?'¡SALÍ DE LA TORMENTA!':'ZONA SEGURA');
    setTxt('stmSub',(afuera?'volvé '+Math.ceil(-borde)+' m · '+Math.round(C.stormDmg(i,ahora))+' HP/s':'el borde está a '+Math.max(0,Math.floor(borde))+' m')+' · se cierra en '+Math.max(0,Math.ceil(i[5]-t))+' s');
  }else{
    setTxt('stmWho',afuera?'¡SALÍ DE LA TORMENTA!':'ZONA FINAL');
    setTxt('stmSub',afuera?'volvé '+Math.ceil(-borde)+' m · '+Math.round(C.stormDmg(i,ahora))+' HP/s':'el borde está a '+Math.max(0,Math.floor(borde))+' m');
  }
}

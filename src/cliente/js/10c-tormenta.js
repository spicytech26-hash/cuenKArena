/* ---------- La tormenta del último minuto (solo Arena): muro, viñeta y HUD ----------
   El servidor manda los parámetros UNA sola vez (ver src/nucleo/07-partida/6d-tormenta.js) y
   acá se calcula todo con el reloj del servidor y las mismas cuentas del núcleo (C.stormR y
   C.stormDmg), así cliente y servidor nunca se van a discutir dónde está el borde.
   i = [arranque, centro x, centro z, radio inicial, radio final, achique, daño inicial, daño final] */
const STM={i:null,muro:null,geos:[],mats:[],av:0};
const SMOD={ALTO:80,SEG:64,OP:.17,OP2:.3};   // alto del muro, segmentos del círculo y opacidades

function stormEnsure(){
  if(STM.muro)return;
  const g=new THREE.CylinderGeometry(1,1,SMOD.ALTO,SMOD.SEG,1,true);
  const m=new THREE.MeshBasicMaterial({color:0xff2a1a,transparent:true,opacity:SMOD.OP,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  STM.geos=[g];STM.mats=[m];
  STM.muro=new THREE.Mesh(g,m);STM.muro.visible=false;scene.add(STM.muro);
  // el mapita del HUD trabaja directo en coordenadas del mundo: el viewBox son los límites del mapa
  const b=W&&W.bounds?W.bounds:{x0:-50,x1:50,z0:-50,z1:50};
  const sv=$('stmSvg');if(sv)sv.setAttribute('viewBox',b.x0+' '+b.z0+' '+(b.x1-b.x0)+' '+(b.z1-b.z0));
}
function clearStorm(){
  STM.i=null;STM.av=0;
  if(STM.muro){scene.remove(STM.muro);STM.geos.forEach(o=>o.dispose());STM.mats.forEach(o=>o.dispose());STM.geos=[];STM.mats=[];STM.muro=null;}
  const b=$('stmBox');if(b)b.hidden=true;
  setOp('stmtint',0);
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
  // --- el muro ---
  STM.muro.visible=activa;
  if(activa){
    STM.muro.position.set(i[1],SMOD.ALTO/2-14,i[2]);
    STM.muro.scale.set(r,1,r);
    STM.mats[0].opacity=SMOD.OP+Math.sin(G.time*2.2)*.04;
  }
  // --- viñeta roja cuando estás afuera ---
  const d=Math.hypot(me.s.x-i[1],me.s.z-i[2]),afuera=activa&&me.alive&&d>r;
  setOp('stmtint',afuera?.42+Math.sin(G.time*5)*.12:0);
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
    setTxt('stmSub',Math.round(r)+' m · se cierra en '+Math.max(0,Math.ceil(i[5]-t))+' s'+(afuera?' · '+Math.round(C.stormDmg(i,ahora))+' HP/s':''));
  }else{
    setTxt('stmWho',afuera?'¡SALÍ DE LA TORMENTA!':'ZONA FINAL');
    setTxt('stmSub',Math.round(r)+' m'+(afuera?' · '+Math.round(C.stormDmg(i,ahora))+' HP/s':''));
  }
}

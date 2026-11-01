/* ---------- modo noche (solo los mapas con theme.noche, por ahora Skatenight) ----------
   · Cada arma lleva una linterna: un foco real que sale de tu arma (el 0) y otros dos para las linternas de los
     dos rivales más cercanos (hay solo 3 focos reales para no pesar). El resto de las linternas se ven como un haz
     translúcido y un brillo en el lente que pega fuerte cuando te apuntan a vos.
   · Los rivales se ven apenas: la luz ambiente es mínima, y las partes que brillan solas (visor, pecho) se apagan
     salvo que estén cerca (menos de 5 m) o los estés alumbrando; el nombre aparece solo si los alumbrás. */
const nBeamGeo=(()=>{const g=new THREE.ConeGeometry(5.4,26,18,1,true);g.translate(0,-13,0);g.rotateX(-Math.PI/2);return g;})();   // la punta en el origen, apunta a +z
const nBeamMat=new THREE.MeshBasicMaterial({color:0xfff0c8,transparent:true,opacity:.055,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
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
  m.beam.visible=m.glow.visible=true;
  m.beam.position.y=m.glow.position.y=p.crouch?.95:1.38;m.beam.rotation.x=-p.pitch;
  const dx=p.x-camera.position.x,dy=p.y+1.2-camera.position.y,dz=p.z-camera.position.z,d=Math.hypot(dx,dy,dz)||1;
  nLook(camera.rotation.y,camera.rotation.x,nDir);
  const lit=d<5||(d<46&&(dx*nDir.x+dy*nDir.y+dz*nDir.z)/d>.93);   // cerca, o dentro del cono de mi linterna
  p.lit=(p.lit||0)+((lit?1:0)-(p.lit||0))*Math.min(1,dt*(lit?14:2.5));   // se prende rápido y se apaga despacio
  const k=.08+.92*p.lit;
  for(let i=0;i<m.bas.length;i++)m.bas[i].color.copy(m.basC[i]).multiplyScalar(k);
  if(m.tag)m.tag.visible=p.lit>.5&&d<34;
  // el lente brilla fuerte si me apunta (cos entre su mirada y la dirección hacia mí)
  nLook(p.yaw,p.pitch,nRight);
  const f=Math.max(0,-(nRight.x*dx+nRight.y*dy+nRight.z*dz)/d);
  m.glow.material.opacity=.1+.9*f*f*f;m.glow.scale.setScalar(.25+1.3*f*f);
}
function nightHide(m){if(m.beam)m.beam.visible=m.glow.visible=false;}
// focos reales: el mío y los de los 2 rivales más cercanos
function updNight(dt){
  if(!level)return;
  if(!NIGHT){for(const v of vms)if(v.userData.lin)v.userData.lin.visible=false;return;}
  const sp=level.spots;if(!sp)return;
  vms.forEach((v,i)=>{if(!v.userData.lin){v.userData.lin=makeLin(i);v.add(v.userData.lin);}v.userData.lin.visible=true;});   // todas las armas llevan linterna
  nLook(camera.rotation.y,camera.rotation.x,nDir);nRight.crossVectors(nDir,nUp).normalize();
  const mine=sp[0],on=me.alive||spWatching();
  mine.position.copy(camera.position).addScaledVector(nRight,.16).addScaledVector(nUp,-.1).addScaledVector(nDir,.2);
  mine.target.position.copy(camera.position).addScaledVector(nDir,14);mine.target.updateMatrixWorld();
  mine.intensity=mine.userData.i0*(on?1:.2);
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

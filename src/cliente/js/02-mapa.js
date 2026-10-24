/* =================== GEOMETRÍA DEL MAPA =================== */
let level=null;
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),new THREE.MeshBasicMaterial({fog:false,side:THREE.BackSide,depthWrite:false}));sky.renderOrder=-1;scene.add(sky);
function skyDay(){return cv(1024,512,(g,w,h)=>{
  // tarde soleada en Posadas: celeste, nubes de algodón y la ciudad baja en el horizonte
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#3f7fd0');gr.addColorStop(.32,'#6ea6e6');gr.addColorStop(.47,'#b9d6f2');gr.addColorStop(.5,'#e3edf4');gr.addColorStop(.52,'#8a8f86');gr.addColorStop(1,'#5f6358');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let c=0;c<26;c++){const cx=rnd()*w,cy=h*(.12+rnd()*.3),s=20+rnd()*40;for(let k=0;k<9;k++){g.fillStyle='rgba(255,255,255,'+(.35+rnd()*.4)+')';g.beginPath();g.ellipse(cx+(rnd()-.5)*s*2.6,cy+(rnd()-.5)*s*.5,s*(.5+rnd()*.6),s*(.25+rnd()*.25),0,0,7);g.fill();}}
  for(let x=0;x<w;x+=5){const bh=4+rnd()*rnd()*40;g.fillStyle=['#c9cdd2','#b7bcc2','#d8d4cc','#a9aeb4'][rnd()*4|0];g.fillRect(x,h*.5-bh,5,bh);}
  for(let x=0;x<w;x+=9){if(rnd()<.35){g.fillStyle='#4f6e3a';g.beginPath();g.arc(x,h*.5-2,4+rnd()*8,Math.PI,0);g.fill();}}
});}
const skyTex={dusk:new THREE.CanvasTexture(skyDusk()),night:new THREE.CanvasTexture(skyNight()),day:new THREE.CanvasTexture(skyDay())};
function quad(g,v,nrm,uvs,shade){
  const b=g.p.length/3;
  v.forEach(q=>g.p.push(q[0],q[1],q[2]));
  for(let k=0;k<4;k++){g.n.push(nrm[0],nrm[1],nrm[2]);g.c.push(shade,shade,shade);}
  uvs.forEach(q=>g.u.push(q[0],q[1]));
  let cx=0,cy=0,cz=0;
  for(let k=0;k<4;k++){const p0=v[k],p1=v[(k+1)%4];cx+=(p0[1]-p1[1])*(p0[2]+p1[2]);cy+=(p0[2]-p1[2])*(p0[0]+p1[0]);cz+=(p0[0]-p1[0])*(p0[1]+p1[1]);}
  if(cx*nrm[0]+cy*nrm[1]+cz*nrm[2]>=0)g.i.push(b,b+1,b+2,b,b+2,b+3);else g.i.push(b,b+2,b+1,b,b+3,b+2);
}
function brushFaces(g,b,sc,ox,oy,oz){
  ox=ox||0;oy=oy||0;oz=oz||0;
  const x0=b.min[0]-ox,x1=b.max[0]-ox,z0=b.min[2]-oz,z1=b.max[2]-oz,y0=b.min[1]-oy;
  const tp=(x,z)=>C.topAt(b,x+ox,z+oz,x+ox,z+oz)-oy;
  const t00=tp(x0,z0),t10=tp(x1,z0),t11=tp(x1,z1),t01=tp(x0,z1);
  let nx=0,ny=1,nz=0;
  if(b.ramp){const r=b.ramp,L=r.axis==='x'?x1-x0:z1-z0,k=(r.hi-r.lo)/L*(r.dir>0?1:-1);if(r.axis==='x')nx=-k;else nz=-k;const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;}
  const U=(a,c)=>[(a+ox)/sc,(c+oz)/sc];
  quad(g,[[x0,t00,z0],[x1,t10,z0],[x1,t11,z1],[x0,t01,z1]],[nx,ny,nz],[U(x0,z0),U(x1,z0),U(x1,z1),U(x0,z1)],1);
  if(b.min[1]>-5.9)quad(g,[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],[0,-1,0],[U(x0,z0),U(x1,z0),U(x1,z1),U(x0,z1)],.55);
  const V=(a,y)=>[a/sc,(y+oy)/sc];
  quad(g,[[x0,y0,z0],[x0,y0,z1],[x0,t01,z1],[x0,t00,z0]],[-1,0,0],[V(z0+oz,y0),V(z1+oz,y0),V(z1+oz,t01),V(z0+oz,t00)],.8);
  quad(g,[[x1,y0,z0],[x1,y0,z1],[x1,t11,z1],[x1,t10,z0]],[1,0,0],[V(z0+oz,y0),V(z1+oz,y0),V(z1+oz,t11),V(z0+oz,t10)],.8);
  quad(g,[[x0,y0,z0],[x1,y0,z0],[x1,t10,z0],[x0,t00,z0]],[0,0,-1],[V(x0+ox,y0),V(x1+ox,y0),V(x1+ox,t10),V(x0+ox,t00)],.68);
  quad(g,[[x0,y0,z1],[x1,y0,z1],[x1,t11,z1],[x0,t01,z1]],[0,0,1],[V(x0+ox,y0),V(x1+ox,y0),V(x1+ox,t11),V(x0+ox,t01)],.68);
}
function geoOf(d){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(d.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(d.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(d.u,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(d.c,3));geo.setIndex(d.i);return geo;}
const matCache={};
function matOf(m){
  if(matCache[m])return matCache[m];
  const md=MATS[m]||MATS.wall;
  const mat=new THREE.MeshPhongMaterial({map:md.t,vertexColors:true,shininess:md.shin,specular:0x2a241d});
  if(md.alpha){mat.transparent=true;mat.side=THREE.DoubleSide;if(m==='tube'){mat.depthWrite=false;}else mat.alphaTest=.4;}
  if(md.em){mat.emissiveMap=md.em;mat.emissive=new THREE.Color(m==='led'?0xbbbbbb:0xffffff);}
  if(md.emc)mat.emissive=new THREE.Color(md.emc);
  return matCache[m]=mat;
}
const padTex=new THREE.CanvasTexture(cv(64,64,(g)=>{g.fillStyle='#120a06';g.fillRect(0,0,64,64);g.strokeStyle='#ffb12b';g.lineWidth=4;g.beginPath();g.arc(32,32,26,0,7);g.stroke();g.fillStyle='#ffb12b';for(let k=0;k<3;k++){g.beginPath();g.moveTo(32,8+k*14);g.lineTo(44,20+k*14);g.lineTo(38,20+k*14);g.lineTo(32,14+k*14);g.lineTo(26,20+k*14);g.lineTo(20,20+k*14);g.fill();}}));
const subTex=new THREE.CanvasTexture(cv(64,64,(g)=>{g.fillStyle='#08070a';g.fillRect(0,0,64,64);for(let r=30;r>4;r-=5){g.strokeStyle=r%10?'#2a2830':'#ff3fd2';g.lineWidth=2;g.beginPath();g.arc(32,32,r,0,7);g.stroke();}g.fillStyle='#ff3fd2';g.beginPath();g.arc(32,32,6,0,7);g.fill();}));
/* ---- luces: en vez de una luz real por cada lámpara del mapa (La Represa tenía 14 y cada una se calcula en cada
   píxel), hay 6 luces fijas que se ubican en las lámparas más cercanas a la cámara. Como la cantidad no cambia,
   la placa de video nunca recompila los sombreadores, y el costo por píxel baja a menos de la mitad ---- */
function vLight(x,y,z,c,i,d){return {position:{x,y,z},color:c,intensity:i,distance:d,visible:true};}
const LIGHT_SLOTS=6,lightSlots=[];let slotT=0;
function initLightSlots(){if(lightSlots.length)return;for(let k=0;k<LIGHT_SLOTS;k++){const l=new THREE.PointLight(0xffffff,0,10,1.3);scene.add(l);lightSlots.push({l,v:null,cur:0});}}
function updLightSlots(dt){
  if(!level||!level.vlights)return;initLightSlots();
  slotT-=dt;
  if(slotT<=0){slotT=.2;const cx=camera.position.x,cy=camera.position.y,cz=camera.position.z;
    const rank=level.vlights.filter(v=>v.visible!==false).map(v=>{const dx=v.position.x-cx,dy=v.position.y-cy,dz=v.position.z-cz,d2=dx*dx+dy*dy+dz*dz,r=v.distance||20;
      return {v,sc:d2>(r+12)*(r+12)?-1:(Math.max(v.intensity,.3))*r*r/(d2+4)};}).filter(o=>o.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,LIGHT_SLOTS).map(o=>o.v);
    // las que siguen elegidas se quedan en su lugar; las nuevas ocupan los lugares libres
    const keep=new Set(rank);for(const sl of lightSlots)if(sl.v&&!keep.has(sl.v))sl.v=null;
    for(const v of rank)if(!lightSlots.some(sl=>sl.v===v)){const f=lightSlots.find(sl=>!sl.v);if(f){f.v=v;f.cur=0;}}}
  for(const sl of lightSlots){const v=sl.v,l=sl.l;
    if(!v||!S.q){l.intensity=Math.max(0,l.intensity-dt*6);continue;}
    l.position.set(v.position.x,v.position.y,v.position.z);l.color.setHex(v.color);l.distance=v.distance;
    sl.cur=Math.min(1,sl.cur+dt*5);l.intensity=v.intensity*sl.cur;}
}
function loadMap(id){
  const M=C.MAPS[id]||C.MAPS.represa;clearShards();initLightSlots();for(const sl of lightSlots){sl.v=null;sl.l.intensity=0;}slotT=0;
  if(level){scene.remove(level.group);level.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  W=M;
  const group=new THREE.Group();scene.add(group);
  const L={group,items:[],pads:[],teles:[],lavaTexs:[],waterTexs:[],movers:[],club:null,maplights:[],flags:[]};
  const th=M.theme;
  scene.fog.color.setHex(th.fog);scene.fog.density=th.fogD;scene.background.setHex(th.fog);
  sky.material.map=skyTex[th.sky]||skyTex.dusk;sky.material.needsUpdate=true;
  const groups={};
  for(const b of M.brushes){
    if(NEON[b.mat]){const m=new THREE.Mesh(new THREE.BoxGeometry(b.max[0]-b.min[0],b.max[1]-b.min[1],b.max[2]-b.min[2]),new THREE.MeshBasicMaterial({color:NEON[b.mat]}));m.position.set((b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,(b.min[2]+b.max[2])/2);group.add(m);continue;}
    if(b.mover)continue;
    const g=groups[b.mat]||(groups[b.mat]={p:[],n:[],u:[],c:[],i:[]});
    brushFaces(g,b,(MATS[b.mat]||MATS.wall).sc);
  }
  for(const m in groups)group.add(new THREE.Mesh(geoOf(groups[m]),matOf(m)));
  for(const b of M.movers){
    const m0=b.mover,d={p:[],n:[],u:[],c:[],i:[]};
    brushFaces(d,{min:m0.min0,max:m0.max0},(MATS[b.mat]||MATS.wall).sc,m0.min0[0],m0.min0[1],m0.min0[2]);
    const mesh=new THREE.Mesh(geoOf(d),matOf(b.mat));group.add(mesh);
    const glow=new THREE.Mesh(new THREE.BoxGeometry(m0.max0[0]-m0.min0[0]+.06,.06,m0.max0[2]-m0.min0[2]+.06),new THREE.MeshBasicMaterial({color:0x2be6ff}));
    glow.position.set((m0.max0[0]-m0.min0[0])/2,-.03,(m0.max0[2]-m0.min0[2])/2);mesh.add(glow);
    L.movers.push({b,mesh});
  }
  for(const l of M.lava){
    const w=l.max[0]-l.min[0],d=l.max[2]-l.min[2];
    const t=(l.water?waterTex:lavaTex).clone();t.needsUpdate=true;t.repeat.set(w/(l.water?8:4),d/(l.water?8:4));(l.water?L.waterTexs:L.lavaTexs).push(t);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),l.water?new THREE.MeshPhongMaterial({map:t,shininess:120,specular:0xffd0a0,transparent:true,opacity:.92}):new THREE.MeshBasicMaterial({map:t,fog:false}));
    m.rotation.x=-Math.PI/2;m.position.set((l.min[0]+l.max[0])/2,l.max[1],(l.min[2]+l.max[2])/2);group.add(m);
  }
  if(M.lines&&M.lines.length){
    const pts=[];for(const q of M.lines)pts.push(new THREE.Vector3(q[0],q[1],q[2]),new THREE.Vector3(q[3],q[4],q[5]));
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xd8d0c4})));
  }
  // con sombras el sol pesa más y la luz ambiente menos, así se notan (sin que el mapa quede más oscuro en general)
  const shOn=th.sun&&S.sh!==0;
  group.add(new THREE.AmbientLight(th.amb,th.ambI*(shOn?.62:1)));
  group.add(new THREE.HemisphereLight(th.hemi[0],th.hemi[1],th.hemi[2]*(shOn?.75:1)));
  if(th.sun){const sun=new THREE.DirectionalLight(th.sunC||0xffb48a,(th.sunI||.35)*(shOn?1.7:1));
    const B=M.bounds,cx=(B.x0+B.x1)/2,cz=(B.z0+B.z1)/2,R=Math.max(B.x1-B.x0,B.z1-B.z0)*.62;
    sun.position.set(cx-40,60,cz+28);sun.target.position.set(cx,0,cz);group.add(sun.target);
    sun.castShadow=S.sh!==0;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-R,right:R,top:R,bottom:-R,near:5,far:160});sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;L.sun=sun;group.add(sun);}
  // todo el mapa recibe sombra y la proyecta (menos lo transparente y los neones)
  group.traverse(o=>{if(!o.isMesh)return;const mt=o.material;if(mt&&(mt.transparent||mt.isMeshBasicMaterial))return;o.castShadow=true;o.receiveShadow=true;});
  // las sombras del mapa se calculan una sola vez (el mapa no se mueve): las plataformas móviles reciben sombra pero no la proyectan
  for(const mv of L.movers)mv.mesh.traverse(o=>{o.castShadow=false;});
  renderer.shadowMap.needsUpdate=true;
  if(M.deco)buildDeco(group,M.deco);
  // luces del mapa "virtuales": se encienden solo las más cercanas en unas pocas luces fijas (ver lightSlots)
  L.vlights=[];
  for(const li of M.lights){const v=vLight(li.x,li.y,li.z,li.c,li.i,li.d);L.vlights.push(v);L.maplights.push({l:v,base:li.i});}
  for(const p of M.pads){
    if(p.geyser){
      // boca del géiser: anillo de roca negra con el centro incandescente que se enciende antes de soplar
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(p.r*.95,p.r*1.15,.5,14,1,true),new THREE.MeshPhongMaterial({map:T.basalt,emissive:0x331005,side:THREE.DoubleSide,flatShading:true}));
      rim.position.set(p.x,p.y+.2,p.z);group.add(rim);
      const core=new THREE.Mesh(new THREE.CircleGeometry(p.r*.9,18),new THREE.MeshBasicMaterial({color:0xff7a20,transparent:true,opacity:.6}));
      core.rotation.x=-Math.PI/2;core.position.set(p.x,p.y+.42,p.z);group.add(core);
      const gl=vLight(p.x,p.y+1.2,p.z,0xff6a18,0,14);L.vlights.push(gl);
      L.geysers=(L.geysers||[]);L.geysers.push({p,core,gl,was:false});
      continue;
    }
    const top=new THREE.MeshBasicMaterial({map:th.club?subTex:padTex});
    const m=new THREE.Mesh(new THREE.CylinderGeometry(p.r,p.r*1.1,.14,24),[new THREE.MeshPhongMaterial({color:th.club?0x15131a:0x3a2a1c}),top,new THREE.MeshPhongMaterial({color:0x15131a})]);
    m.rotation.y=Math.atan2(p.t[0]-p.x,p.t[2]-p.z)+Math.PI;m.position.set(p.x,p.y+.07,p.z);group.add(m);L.pads.push({m,p});
  }
  for(const t of M.teles){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(t.r,.08,8,24),new THREE.MeshBasicMaterial({color:0x6fd8ff}));ring.rotation.x=Math.PI/2;ring.position.set(t.x,t.y+.05,t.z);group.add(ring);
    const disc=new THREE.Mesh(new THREE.CircleGeometry(t.r,24),new THREE.MeshBasicMaterial({color:0x2a8cff,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(t.x,t.y+.04,t.z);group.add(disc);
    L.teles.push(t);
  }
  L.items=M.items.map(it=>{const g=buildItem(it.type);g.position.set(it.x,it.y+.6,it.z);group.add(g);return {g,it,ty:it.type,ph:Math.random()*6};});
  if(th.club)L.club=buildClub(group);
  if(MODE==='ctf'&&M.flags)L.flags=M.flags.map((f,i)=>buildFlag(group,i,f));
  level=L;
  $('bTitle').textContent=M.name;
  warmShaders();
}
// la primera vez que aparece cada material la placa de video arma su sombreador y el juego se congela un instante:
// se arman todos al cargar el mapa (armas, jugadores, explosión, rayo, proyectiles, fuego)
function warmShaders(){
  if(typeof renderer==='undefined'||!renderer.compile)return;
  const tmp=[];
  try{
    const add=o=>{o.position.set(camera.position.x,camera.position.y,camera.position.z-3);scene.add(o);tmp.push(o);};
    fxExplosion(0,-999,0);fxRail([0,-999,0],[1,-999,0],0xffffff);
    add(buildPlayer({c:'#e8542a',v:'#ffffff',a:1},'x',true).g);
    for(const k of ['rocket','grenade','bullet','molotov']){spawnProjVis(k,[0,-999,0],[0,0,0],false,-1,0);}
    const vis=vms.map(v=>v.visible);vms.forEach(v=>v.visible=true);
    // render de verdad a una textura chiquita (renderer.compile falla con las sombras en three r128)
    const rt=warmShaders.rt||(warmShaders.rt=new THREE.WebGLRenderTarget(8,8));
    try{renderer.shadowMap.needsUpdate=true;renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,camera);renderer.render(wScene,wCam);}finally{renderer.setRenderTarget(null);}
    vms.forEach((v,i)=>v.visible=vis[i]);
  }catch(e){console.warn('warmShaders',e);}
  // pase lo que pase, el muñeco de prueba y los proyectiles de prueba se sacan (si no, quedaba un "bot congelado" en el mapa)
  tmp.forEach(o=>scene.remove(o));
  for(let i=projs.length-1;i>=0;i--)if(projs[i].pid===-1){scene.remove(projs[i].m);projs.splice(i,1);}
}


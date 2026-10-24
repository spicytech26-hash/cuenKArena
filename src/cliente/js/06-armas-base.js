/* =================== MODELOS =================== */
const mGun=new THREE.MeshPhongMaterial({color:0x5d5852,flatShading:true,shininess:40,specular:0x6a5e50});
const mDark=new THREE.MeshPhongMaterial({color:0x2a2724,flatShading:true,shininess:20});
const mBrass=new THREE.MeshPhongMaterial({color:0x9a7636,flatShading:true,shininess:60});
const mWood=new THREE.MeshPhongMaterial({color:0x5a3a22,flatShading:true});
const mRed=new THREE.MeshPhongMaterial({color:0x9a2416,flatShading:true});
const mOlive=new THREE.MeshPhongMaterial({color:0x4d5a2e,flatShading:true});
const mRail=new THREE.MeshBasicMaterial({color:0x8fd8ff});
function bx(w,h,d,m,x,y,z,rx=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.x=rx;return o;}
function cy(r,l,m,x,y,z,rz=0,seg=8){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,seg),m);o.rotation.x=Math.PI/2;if(rz)o.rotation.set(0,0,rz);o.position.set(x,y,z);return o;}
// acero cepillado para el cuchillo: filo brillante, canal oscuro y lomo gris
const knifeTex=(()=>{const c=cv(128,128,(g,w,h)=>{
  const gr=g.createLinearGradient(0,0,w,0);
  gr.addColorStop(0,'#fbfdff');gr.addColorStop(.12,'#e9eef3');gr.addColorStop(.3,'#c6cdd4');gr.addColorStop(.5,'#9aa2ab');
  gr.addColorStop(.56,'#6f7780');gr.addColorStop(.62,'#d9dfe5');gr.addColorStop(.8,'#a7afb7');gr.addColorStop(1,'#545b62');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){g.fillStyle='rgba(255,255,255,'+(Math.random()*.12)+')';g.fillRect(Math.random()*w,Math.random()*h,1,6+Math.random()*30);}
  for(let i=0;i<40;i++){g.fillStyle='rgba(40,44,50,'+(Math.random()*.25)+')';g.fillRect(Math.random()*w,Math.random()*h,1,2+Math.random()*8);}
});const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;})();
const gripTex=(()=>{const c=cv(32,64,(g,w,h)=>{g.fillStyle='#2a1d14';g.fillRect(0,0,w,h);for(let y=-8;y<h+8;y+=6){g.strokeStyle='#4a3424';g.lineWidth=3;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+8);g.stroke();g.strokeStyle='#120c08';g.lineWidth=1;g.beginPath();g.moveTo(0,y+2);g.lineTo(w,y+10);g.stroke();}});return new THREE.CanvasTexture(c);})();
const woodRifle=new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(cv(32,128,(g)=>{g.fillStyle='#7a3f1d';g.fillRect(0,0,32,128);for(let y=0;y<128;y+=3){g.fillStyle='rgba('+(110+Math.random()*50|0)+','+(55+Math.random()*25|0)+',22,.5)';g.fillRect(0,y,32,1+Math.random()*2);}for(let i=0;i<6;i++){g.fillStyle='rgba(230,200,160,.35)';g.fillRect(Math.random()*28,Math.random()*120,3,2);}})),shininess:35,specular:0x332211});
const bluedSteel=new THREE.MeshPhongMaterial({color:0x22262e,shininess:110,specular:0x8899aa,flatShading:true});
const clothWrap=new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(cv(16,32,(g)=>{g.fillStyle='#d9d4c8';g.fillRect(0,0,16,32);g.strokeStyle='#a39d90';for(let y=-8;y<40;y+=5){g.beginPath();g.moveTo(0,y);g.lineTo(16,y+6);g.stroke();}})),shininess:4});
const mSlide=new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(cv(64,16,(g)=>{g.fillStyle='#2b2e33';g.fillRect(0,0,64,16);for(let x=46;x<62;x+=3){g.fillStyle='#16181b';g.fillRect(x,0,1,16);}g.fillStyle='rgba(255,255,255,.06)';g.fillRect(0,0,64,2);})),shininess:90,specular:0x666a70});
const mSteelL=new THREE.MeshPhongMaterial({color:0x8d939a,shininess:120,specular:0xffffff,flatShading:true});
const mPoly=new THREE.MeshPhongMaterial({color:0x1d1e20,shininess:15,flatShading:true});
const mGripT=new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(cv(16,32,(g)=>{g.fillStyle='#202124';g.fillRect(0,0,16,32);for(let i=0;i<90;i++){g.fillStyle=Math.random()<.5?'#2c2d31':'#141517';g.fillRect(Math.random()*16|0,Math.random()*32|0,1,1);}})),shininess:6});
const mODrab=new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(cv(64,64,(g)=>{g.fillStyle='#565e36';g.fillRect(0,0,64,64);for(let i=0;i<220;i++){const v=Math.random();g.fillStyle=v<.5?'rgba(30,34,16,.18)':'rgba(170,175,120,.12)';g.fillRect(Math.random()*64|0,Math.random()*64|0,1+Math.random()*3|0,1);}g.fillStyle='rgba(20,22,10,.55)';g.fillRect(0,21,64,1);g.fillRect(0,43,64,1);g.fillRect(31,0,1,64);g.fillStyle='rgba(210,210,170,.25)';g.fillRect(0,0,64,1);})),shininess:22,specular:0x3a3a28,flatShading:true});
const mODdark=new THREE.MeshPhongMaterial({color:0x353b22,flatShading:true,shininess:16});
const mGlove=new THREE.MeshPhongMaterial({color:0x2a2420,flatShading:true,shininess:10});
const mSleeve=new THREE.MeshPhongMaterial({color:0x3a4433,flatShading:true,shininess:4});
/* ===== armas con más definición (inspiradas en TF2 y Quake): piezas redondeadas, partes que se mueven y manos de verdad =====
   Cada arma es un grupo; las piezas móviles son subgrupos con nombre (pump, mag, bolt, slide, drum, cell, brl, cock, rh).
   Todo lo que no se mueve se fusiona en una sola malla por material, así un arma con 80 piezas cuesta unas pocas llamadas de dibujo. */
const VMAT=(c,o)=>new THREE.MeshPhongMaterial(Object.assign({color:c,shininess:40,specular:0x3a3a3a},o||{}));
const vSteel=VMAT(0x3a3e44,{shininess:90,specular:0x8a9099}),vSteelL=VMAT(0x858b93,{shininess:110,specular:0xd0d6de}),vBlack=VMAT(0x1c1d20,{shininess:30,specular:0x303030});
const vPoly=VMAT(0x26282c,{shininess:14,specular:0x222222}),vBrass=VMAT(0xb08a3e,{shininess:80,specular:0xffe0a0}),vShell=VMAT(0xa8281a,{shininess:30,specular:0x553322});
const vOD=VMAT(0x5b6339,{shininess:18,specular:0x2a2a1a}),vODd=VMAT(0x3a4026,{shininess:14}),vRL=VMAT(0x6c705c,{shininess:26,specular:0x3a3a2e}),vRLd=VMAT(0x3f4237,{shininess:20});
const vRed=VMAT(0xa8291c,{shininess:34}),vWoodD=VMAT(0x3b2516,{shininess:10}),vSci=VMAT(0x5d636b,{shininess:70,specular:0x9aa6b4}),vSciD=VMAT(0x2c3036,{shininess:50,specular:0x55606c});
const vRubber=VMAT(0x151515,{shininess:6,specular:0x111111});
// coordenadas de textura por la cara dominante, escaladas a la pieza (así la veta de la madera corre a lo largo del arma)
function vUV(geo){const p=geo.attributes.position,n=geo.attributes.normal;geo.computeBoundingBox();const b=geo.boundingBox,s=new THREE.Vector3();b.getSize(s);const uv=new Float32Array(p.count*2);
  for(let k=0;k<p.count;k++){const ax=Math.abs(n.getX(k)),ay=Math.abs(n.getY(k)),az=Math.abs(n.getZ(k));let u,v;
    if(ax>=ay&&ax>=az){u=(p.getZ(k)-b.min.z)/(s.z||1);v=(p.getY(k)-b.min.y)/(s.y||1);}
    else if(ay>=az){u=(p.getZ(k)-b.min.z)/(s.z||1);v=(p.getX(k)-b.min.x)/(s.x||1);}
    else{u=(p.getX(k)-b.min.x)/(s.x||1);v=(p.getY(k)-b.min.y)/(s.y||1);}
    uv[k*2]=u;uv[k*2+1]=v;}
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geo;}
function vM(geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);return o;}
// caja con cantos redondeados (w ancho x, h alto y, d largo z)
function vRB(w,h,d,r,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){
  const b=Math.min(r*.5,d*.25,.004),W=w-2*b,H=h-2*b;r=Math.max(0,Math.min(r-b,W/2-1e-4,H/2-1e-4));
  const s=new THREE.Shape(),x0=-W/2,y0=-H/2;
  if(r>.0005){s.moveTo(x0+r,y0);s.lineTo(x0+W-r,y0);s.quadraticCurveTo(x0+W,y0,x0+W,y0+r);s.lineTo(x0+W,y0+H-r);s.quadraticCurveTo(x0+W,y0+H,x0+W-r,y0+H);s.lineTo(x0+r,y0+H);s.quadraticCurveTo(x0,y0+H,x0,y0+H-r);s.lineTo(x0,y0+r);s.quadraticCurveTo(x0,y0,x0+r,y0);}
  else{s.moveTo(x0,y0);s.lineTo(x0+W,y0);s.lineTo(x0+W,y0+H);s.lineTo(x0,y0+H);s.lineTo(x0,y0);}
  const geo=new THREE.ExtrudeGeometry(s,{depth:Math.max(1e-4,d-2*b),bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:3});
  geo.translate(0,0,-(d-2*b)/2);vUV(geo);return vM(geo,m,x,y,z,rx,ry,rz);}
// tubo a lo largo de z (r1 atrás, r2 adelante)
function vT(r1,r2,len,m,x=0,y=0,z=0,seg=16,open=false){const geo=new THREE.CylinderGeometry(r1,r2,len,seg,1,open);geo.rotateX(Math.PI/2);return vM(geo,m,x,y,z);}
// tubo vertical (empuñaduras)
function vTY(r1,r2,len,m,x=0,y=0,z=0,rx=0,seg=12){const geo=new THREE.CylinderGeometry(r1,r2,len,seg);return vM(geo,m,x,y,z,rx);}
function vRing(r,t,m,x=0,y=0,z=0,seg=18){return vM(new THREE.TorusGeometry(r,t,6,seg),m,x,y,z);}
// perfil lateral (puntos z,y) extruido de ancho wd: culatas, empuñaduras, guardamontes
function vP(pts,wd,m,x=0,y=0,z=0,bev=.004){const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)s.lineTo(pts[k][0],pts[k][1]);s.lineTo(pts[0][0],pts[0][1]);
  const b=Math.min(bev,wd*.3);const geo=new THREE.ExtrudeGeometry(s,{depth:Math.max(1e-4,wd-2*b),bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:2});
  geo.rotateY(-Math.PI/2);geo.translate((wd-2*b)/2,0,0);vUV(geo);return vM(geo,m,x,y,z);}
function vSph(r,m,x=0,y=0,z=0,ws=10,hs=8){return vM(new THREE.SphereGeometry(r,ws,hs),m,x,y,z);}
function vCone(r,len,m,x=0,y=0,z=0,seg=14){const geo=new THREE.ConeGeometry(r,len,seg);geo.rotateX(-Math.PI/2);return vM(geo,m,x,y,z);}   // punta hacia -z
function vGrp(name,...kids){const g=new THREE.Group();g.name=name;kids.forEach(k=>g.add(k));return g;}
// fusiona las piezas quietas de cada grupo por material (no toca las que tienen nombre ni las transparentes)
function vMerge(root){
  const walk=grp=>{const by=new Map();
    for(const o of [...grp.children]){
      if(o.isMesh&&!o.name&&!o.children.length&&o.material&&!o.material.transparent){if(!by.has(o.material))by.set(o.material,[]);by.get(o.material).push(o);}
      else if(o.children.length)walk(o);}
    for(const [m,list] of by){if(list.length<2)continue;
      const parts=list.map(o=>{o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);
        if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;});
      let n=0;parts.forEach(g=>n+=g.attributes.position.count);
      const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let off=0;
      for(const g of parts){P.set(g.attributes.position.array,off*3);N.set(g.attributes.normal.array,off*3);U.set(g.attributes.uv.array,off*2);off+=g.attributes.position.count;g.dispose();}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,3));geo.setAttribute('uv',new THREE.BufferAttribute(U,2));
      list.forEach(o=>grp.remove(o));grp.add(new THREE.Mesh(geo,m));}};
  walk(root);return root;}

// cartucho de escopeta, vaina, cohete y granada (se usan en el arma, en la mano y en lo que sale despedido)
function vShellM(){return vGrp('',vT(.0125,.0125,.05,vShell,0,0,-.004,10),vT(.0135,.0135,.016,vBrass,0,0,.022,10));}
function vRocketM(){const r=new THREE.Group();r.add(vT(.026,.026,.17,vRL,0,0,.085,12),vCone(.026,.07,vRed,0,0,-.035,12),vT(.027,.027,.012,vRLd,0,0,.0,12),vT(.02,.024,.03,vBlack,0,0,.18,10));
  for(let k=0;k<4;k++){const f=vRB(.004,.03,.05,.0015,vRLd,0,0,.15);const a=k*Math.PI/2;f.position.set(Math.sin(a)*.03,Math.cos(a)*.03,.15);f.rotation.z=-a;r.add(f);}return r;}
function vNadeM(){return vGrp('',vSph(.03,vODd,0,0,0,12,10),vT(.031,.031,.012,vBlack,0,0,0,12),vT(.012,.012,.02,vBrass,0,0,.032,8));}
// registro de armas: cada archivo de 07-armas/ completa VMOD[i] (modelo) y vRigs[i] (animación)
const VMOD={},vRigs={};
// modelos .glb que reemplazan a los hechos con código (los carga 20-modelos-glb.js desde public/modelos/modelos.json)
const GLB={armas:{},items:{}};

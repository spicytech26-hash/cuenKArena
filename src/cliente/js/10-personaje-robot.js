/* ---------- personaje robot humanoide (hoja CUE-87) ----------
   Se arma con primitivas, UNA sola vez: cada parte que se mueve (torso, cabeza, brazos, piernas) es una malla por zona de color.
   Zonas de color (la piel guarda hexadecimales):
     A armadura principal  → skin.c
     B partes secundarias y articulaciones → skin.c2 (si falta: el color de armadura más oscuro)
     C detalles y luces (cuerno, hebilla, luces del pecho, ancla) → skin.c3 (si falta: el color de armadura más claro)
     V visor → skin.v          K tela y goma del cinturón/suelas → fijo
   Las geometrías se comparten entre todos los jugadores y bots; lo único que cambia por jugador son los materiales (colores).
   Mide unos 1,88 m con el cuerno; la hitbox y la física las decide el servidor (K en src/nucleo/01-datos.js), esto es solo visual. */
const RB_HEX=/^#[0-9a-fA-F]{6}$/,RB_ZONAS=['A','B','C','V','K'];
// colores de cada zona, con los valores por defecto derivados del color de armadura (para que los ajustes viejos sigan andando)
function skinParts(skin){
  const c=new THREE.Color(RB_HEX.test(skin.c)?skin.c:'#e8542a');
  const c2=RB_HEX.test(skin.c2)?new THREE.Color(skin.c2):c.clone().multiplyScalar(.6);
  const c3=RB_HEX.test(skin.c3)?new THREE.Color(skin.c3):c.clone().lerp(new THREE.Color(1,1,1),.45);
  return {c:'#'+c.getHexString(),c2:'#'+c2.getHexString(),c3:'#'+c3.getHexString(),v:RB_HEX.test(skin.v)?skin.v:'#ffffff'};
}
// caja biselada: caja subdividida cuyos vértices se empujan hacia afuera del núcleo; las normales quedan suaves
function rbCaja(w,h,d,r,seg){
  const g=new THREE.BoxGeometry(w,h,d,seg,seg,seg),p=g.attributes.position,n=g.attributes.normal;
  const hx=w/2-r,hy=h/2-r,hz=d/2-r,v=new THREE.Vector3(),q=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    q.set(Math.max(-hx,Math.min(hx,v.x)),Math.max(-hy,Math.min(hy,v.y)),Math.max(-hz,Math.min(hz,v.z)));
    v.sub(q);const l=v.length();
    if(l>1e-6){v.multiplyScalar(r/l);n.setXYZ(i,v.x/r,v.y/r,v.z/r);}
    p.setXYZ(i,q.x+v.x,q.y+v.y,q.z+v.z);
  }
  return g;
}
// junta varias geometrías indexadas (ya transformadas) en una sola malla
function rbJuntar(lista){
  let nv=0,ni=0;lista.forEach(g=>{nv+=g.attributes.position.count;ni+=g.index.count;});
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),I=new Uint16Array(ni);let ov=0,oi=0;
  lista.forEach(g=>{
    P.set(g.attributes.position.array,ov*3);N.set(g.attributes.normal.array,ov*3);
    for(let i=0;i<g.index.count;i++)I[oi+i]=g.index.array[i]+ov;
    ov+=g.attributes.position.count;oi+=g.index.count;g.dispose();
  });
  const o=new THREE.BufferGeometry();
  o.setAttribute('position',new THREE.BufferAttribute(P,3));o.setAttribute('normal',new THREE.BufferAttribute(N,3));o.setIndex(new THREE.BufferAttribute(I,1));
  return o;
}
// un "juego de piezas" (una parte del cuerpo) con ayudas para ir poniendo primitivas por zona
function rbParte(){
  const z={A:[],B:[],C:[],V:[],K:[]},M=new THREE.Matrix4(),E=new THREE.Euler(),Q=new THREE.Quaternion(),S1=new THREE.Vector3(),P1=new THREE.Vector3();
  const poner=(zona,g,x,y,zz,rx,ry,rz,sx,sy,sz)=>{
    M.compose(P1.set(x||0,y||0,zz||0),Q.setFromEuler(E.set(rx||0,ry||0,rz||0)),S1.set(sx||1,sy||1,sz||1));
    g.applyMatrix4(M);z[zona].push(g);
  };
  return {
    caja:(zona,w,h,d,r,seg,x,y,zz,rx,ry,rz)=>poner(zona,rbCaja(w,h,d,r,seg||1),x,y,zz,rx,ry,rz),
    cil:(zona,r1,r2,h,lados,x,y,zz,rx,ry,rz,sx,sy,sz)=>poner(zona,new THREE.CylinderGeometry(r1,r2,h,lados||8,1),x,y,zz,rx,ry,rz,sx,sy,sz),
    esf:(zona,r,x,y,zz,sx,sy,sz)=>poner(zona,new THREE.SphereGeometry(r,9,7),x,y,zz,0,0,0,sx,sy,sz),
    cono:(zona,r,h,x,y,zz,rx,ry,rz)=>poner(zona,new THREE.ConeGeometry(r,h,6),x,y,zz,rx,ry,rz),
    crudo:(zona,g)=>z[zona].push(g),
    fin:(rotX)=>{const o={};RB_ZONAS.forEach(k=>{if(z[k].length){o[k]=rbJuntar(z[k]);if(rotX)o[k].rotateX(rotX);}});return o;}
  };
}
function rbBrazo(s,adelante){ // s = lado hacia afuera (-1 izquierdo, +1 derecho); el origen es el hombro y cuelga hacia -y
  const t=rbParte();
  t.esf('B',.058,0,0,0);
  t.esf('A',.095,s*.03,.015,0,1,.82,1);                       // hombrera redondeada
  t.cil('A',.05,.043,.26,8,0,-.15,0);                         // brazo
  t.esf('B',.045,0,-.29,0);                                   // codo
  t.cil('A',.046,.036,.24,8,0,-.42,0);                        // antebrazo
  t.cil('C',.047,.047,.022,8,0,-.5,0);                        // luz de la muñeca
  t.esf('B',.03,0,-.55,0);                                    // muñeca
  t.caja('A',.06,.085,.036,.012,1,0,-.6,0);                   // mano
  t.caja('A',.05,.04,.03,.01,1,0,-.66,.004);                  // dedos
  return t.fin(adelante?-1.3:0);                              // el derecho apunta hacia adelante (-1.3 rad) para sostener el arma
}
function rbGeos(){
  if(rbGeos.c)return rbGeos.c;
  const R={};
  // torso (todo en coordenadas del cuerpo, +z es el frente)
  let t=rbParte();
  t.caja('A',.30,.17,.20,.05,1,0,.96,0);                      // pelvis
  t.caja('K',.34,.05,.23,.02,1,0,1.06,0);                     // cinturón
  t.caja('C',.07,.045,.02,.01,1,0,1.06,.118);                 // hebilla
  [[.10,.11,.2],[-.10,.11,-.2],[.165,.04,1.2],[-.165,.04,-1.2],[.11,-.11,2.9],[-.11,-.11,-2.9]].forEach(p=>t.caja('K',.06,.075,.05,.015,1,p[0],1.04,p[1],0,p[2]*.5,0));
  t.crudo('A',new THREE.CylinderGeometry(.2121,.1273,.20,4,1).rotateY(Math.PI/4).scale(1,1,.66).translate(0,1.15,0));  // abdomen plano en V
  t.caja('B',.2,.045,.15,.02,1,0,1.27,0);                     // junta de la cintura
  t.caja('A',.42,.30,.26,.07,4,0,1.43,0);                     // pecho redondeado (el frente es la zona del decal)
  t.caja('B',.46,.09,.17,.03,1,0,1.52,-.01);                  // puente de hombros
  t.caja('A',.30,.055,.2,.025,1,0,1.595,0);                   // cuello de armadura
  t.cil('B',.04,.045,.075,8,0,1.625,0);                       // cuello
  t.caja('A',.34,.25,.06,.03,1,0,1.43,-.15);                  // placa de la espalda
  t.caja('C',.035,.2,.02,.01,1,0,1.43,-.185);
  t.caja('C',.06,.014,.02,.006,1,-.13,1.34,.125);t.caja('C',.06,.014,.02,.006,1,.13,1.34,.125);  // luces del pecho
  R.torso=t.fin();
  // cabeza (origen en el centro del casco)
  t=rbParte();
  t.esf('A',.125,0,0,0,1,1.06,1.08);                          // casco
  t.caja('B',.15,.08,.14,.03,1,0,-.085,.03);                  // mandíbula
  t.cil('B',.032,.032,.03,8,.125,0,0,0,0,Math.PI/2);t.cil('B',.032,.032,.03,8,-.125,0,0,0,0,Math.PI/2); // orejeras
  t.cono('C',.016,.055,0,.158,-.01,-.15,0,0);                 // cuerno chico
  t.crudo('V',new THREE.CylinderGeometry(.145,.145,.04,12,1,true,-1.15,2.3).translate(0,.014,0)); // visor curvo
  R.head=t.fin();
  // pierna (origen en la cadera, cuelga hasta -.93 donde están las suelas)
  t=rbParte();
  t.esf('B',.062,0,-.01,0);
  t.cil('A',.075,.06,.42,8,0,-.22,0);                         // muslo
  t.esf('B',.062,0,-.45,0);                                   // rodilla
  t.caja('A',.09,.07,.05,.02,1,0,-.45,.058);                  // rodillera
  t.cil('A',.058,.048,.40,8,0,-.66,0);                        // pierna (bota alta)
  t.caja('C',.036,.28,.014,.006,1,0,-.66,.052);               // tira de la bota
  t.esf('B',.045,0,-.875,0);                                  // tobillo
  t.caja('A',.11,.07,.25,.03,1,0,-.895,.05);                  // pie
  t.caja('K',.1,.045,.07,.015,1,0,-.91,-.075);                // taco
  t.caja('K',.115,.018,.27,.008,1,0,-.921,.045);              // suela
  R.leg=t.fin();
  R.armL=rbBrazo(-1,false);R.armR=rbBrazo(1,true);
  // accesorios (se adaptan al casco nuevo; origen = centro del casco)
  R.acc={
    cresta:rbCaja(.03,.09,.2,.012,1).translate(0,.145,-.045),
    antena:new THREE.CylinderGeometry(.008,.008,.2,6).translate(.075,.23,-.02),
    antenaPunta:new THREE.SphereGeometry(.03,8,6).translate(.075,.34,-.02),
    cuerno:new THREE.ConeGeometry(.035,.17,6),
    gorra:new THREE.CylinderGeometry(.142,.146,.04,12).translate(0,.112,0),
    visera:rbCaja(.2,.016,.1,.006,1).translate(0,.098,.16),
    decal:new THREE.PlaneGeometry(.24,.24)
  };
  return rbGeos.c=R;
}
// ancla blanca sobre fondo transparente (se tiñe con el color de detalles)
let rbAncla=null;
function rbAnclaTex(){
  if(rbAncla)return rbAncla;
  rbAncla=new THREE.CanvasTexture(cv(128,128,g=>{
    g.strokeStyle='#fff';g.fillStyle='#fff';g.lineCap='round';g.lineWidth=9;
    g.beginPath();g.arc(64,26,12,0,Math.PI*2);g.stroke();
    g.beginPath();g.moveTo(64,38);g.lineTo(64,104);g.moveTo(44,54);g.lineTo(84,54);g.stroke();
    g.beginPath();g.arc(64,72,36,Math.PI*.1,Math.PI*.9);g.stroke();
    g.beginPath();g.moveTo(24,84);g.lineTo(22,66);g.lineTo(42,76);g.fill();
    g.beginPath();g.moveTo(104,84);g.lineTo(106,66);g.lineTo(86,76);g.fill();
  }));
  return rbAncla;
}
function buildPlayer(skin,name,noTag){
  const G=rbGeos(),P=skinParts(skin);
  const mA=new THREE.MeshPhongMaterial({color:P.c,shininess:45,specular:0x3a3a3a});
  const mB=new THREE.MeshPhongMaterial({color:P.c2,shininess:80,specular:0x777777});
  const mC=new THREE.MeshPhongMaterial({color:P.c3,shininess:60,specular:0x444444});
  const mV=new THREE.MeshBasicMaterial({color:P.v});
  const mK=new THREE.MeshPhongMaterial({color:0x26231f,shininess:10});
  const MZ={A:mA,B:mB,C:mC,V:mV,K:mK};
  const parte=(set,grupo)=>{RB_ZONAS.forEach(k=>{if(set[k])grupo.add(new THREE.Mesh(set[k],MZ[k]));});return grupo;};
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);
  parte(G.torso,b);
  // imagen del pecho (o el ancla de origen): un plano cuadrado pegado unos 2 mm adelante de la placa
  const hasImg=!!(skin.img&&(noTag||S.showImg));
  const dm=hasImg?new THREE.MeshBasicMaterial({map:chestTex(skin.img),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
                 :new THREE.MeshBasicMaterial({map:rbAnclaTex(),color:P.c3,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const dec=new THREE.Mesh(G.acc.decal,dm);dec.position.set(0,1.435,.132);b.add(dec);
  const legs=[-1,1].map(side=>{const l=parte(G.leg,new THREE.Group());l.position.set(side*.095,.93,0);b.add(l);return l;});
  const head=parte(G.head,new THREE.Group());head.position.y=1.715;b.add(head);
  const a=skin.a|0,A=G.acc;
  if(a===1)head.add(new THREE.Mesh(A.cresta,mC));
  if(a===2)head.add(new THREE.Mesh(A.antena,mK),new THREE.Mesh(A.antenaPunta,mC));
  if(a===3)for(const sx of [-1,1]){const h=new THREE.Mesh(A.cuerno,mC);h.position.set(sx*.1,.14,0);h.rotation.z=-sx*.5;head.add(h);}
  if(a===4)head.add(new THREE.Mesh(A.gorra,mA),new THREE.Mesh(A.visera,mA));
  const armL=parte(G.armL,new THREE.Group());armL.position.set(-.285,1.52,0);b.add(armL);
  const armR=parte(G.armR,new THREE.Group());armR.position.set(.285,1.52,0);b.add(armR);
  // el arma que tiene en la mano (se cambia sola cuando cambia de arma)
  const gun=new THREE.Group();gun.position.set(0,-.15,.56);gun.rotation.y=Math.PI;gun.scale.setScalar(1.2);armR.add(gun);
  if(noTag){gun.add(tpGun(1));gun.userData.w=1;}
  let tag=null;if(!noTag){tag=nameSprite(name,P.c);g.add(tag);}
  const bas=[mV];if(hasImg)bas.push(dm);   // materiales que brillan solos (de noche se apagan, ver 18-noche.js)
  return {g,b,legs,armL,armR,head,gun,tag,mats:[mA,mB,mC,mK],bas};
}

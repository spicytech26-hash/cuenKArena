/* ---------- personaje robot humanoide (hoja CUE-87, versión 2: musculoso, como en las láminas) ----------
   Se arma con primitivas, UNA sola vez: cada parte que se mueve (torso, cabeza, brazos, piernas) es una malla por zona de color.
   Zonas de color (la piel guarda hexadecimales):
     A armadura principal  → skin.c
     B partes secundarias y articulaciones → skin.c2 (si falta: el color de armadura más oscuro)
     C detalles y luces (cuerno, hebilla, ancla) → skin.c3 (si falta: el color de armadura más claro)
     V visor → skin.v (si falta: cian como en la lámina)          K tela y goma del cinturón/suelas → fijo
   Las geometrías se comparten entre todos los jugadores y bots; lo único que cambia por jugador son los materiales (colores).
   Medidas de la lámina: 1,88 m con el cuerno, hombros de 52 cm, pecho de 44 cm, cintura de 36 cm, cinturón de 4 cm.
   La hitbox y la física las decide el servidor (K en src/nucleo/01-datos.js), esto es solo visual. */
const RB_HEX=/^#[0-9a-fA-F]{6}$/,RB_ZONAS=['A','B','C','V','K'];
// colores de cada zona, con los valores por defecto derivados del color de armadura (para que los ajustes viejos sigan andando)
function skinParts(skin){
  const c=new THREE.Color(RB_HEX.test(skin.c)?skin.c:'#e8542a');
  const c2=RB_HEX.test(skin.c2)?new THREE.Color(skin.c2):c.clone().multiplyScalar(.6);
  const c3=RB_HEX.test(skin.c3)?new THREE.Color(skin.c3):c.clone().lerp(new THREE.Color(1,1,1),.45);
  return {c:'#'+c.getHexString(),c2:'#'+c2.getHexString(),c3:'#'+c3.getHexString(),v:RB_HEX.test(skin.v)?skin.v:'#2be6ff'};
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
    esf:(zona,r,x,y,zz,sx,sy,sz,lw,lh)=>poner(zona,new THREE.SphereGeometry(r,lw||8,lh||6),x,y,zz,0,0,0,sx,sy,sz),
    cono:(zona,r,h,x,y,zz,rx,ry,rz)=>poner(zona,new THREE.ConeGeometry(r,h,6),x,y,zz,rx,ry,rz),
    crudo:(zona,g)=>z[zona].push(g),
    fin:(rotX)=>{const o={};RB_ZONAS.forEach(k=>{if(z[k].length){o[k]=rbJuntar(z[k]);if(rotX)o[k].rotateX(rotX);}});return o;}
  };
}
// brazo musculoso: s = lado hacia afuera (-1 izquierdo, +1 derecho); el origen es el hombro y cuelga hacia -y
function rbBrazo(s,adelante){
  const t=rbParte(),X=s*.03;                                  // el brazo cuelga un poco hacia afuera del hombro, para no meterse en el pecho
  t.esf('A',.072,s*.012,0,0,.95,.9,1,9,7);                    // deltoides grande y redondeado
  t.cil('A',.06,.05,.27,9,X,-.17,0);                          // brazo
  t.esf('A',.052,X,-.14,.012,1,1.5,1.1);                      // bíceps
  t.esf('B',.046,X,-.3,0);                                    // codo (articulación)
  t.cil('A',.05,.037,.25,9,X,-.435,0);                        // antebrazo
  t.esf('A',.043,X,-.38,.008,1,1.4,1);                        // músculo del antebrazo
  t.cil('B',.04,.04,.03,8,X,-.55,0);                          // muñequera
  t.caja('A',.062,.075,.034,.012,1,X,-.6,0);                  // palma
  for(let i=0;i<4;i++)t.caja('A',.013,.06,.02,.005,1,X+(i-1.5)*.0145,-.665,.004);   // cuatro dedos
  t.caja('A',.014,.045,.02,.006,1,X,-.62,.03,.5,0,0);         // pulgar
  return t.fin(adelante?-1.3:0);                              // el derecho apunta hacia adelante (-1.3 rad) para sostener el arma
}
// pierna musculosa con bota alta; la costura va del lado de afuera (por eso hay una izquierda y una derecha)
function rbPierna(s){
  const t=rbParte();
  t.esf('B',.065,0,-.01,0);                                   // cadera
  t.cil('A',.092,.064,.43,9,0,-.23,0,0,0,0,1,1,1.08);         // muslo grueso
  t.esf('A',.075,s*.015,-.19,.035,1,1.6,1,8,6);               // cuádriceps
  t.esf('B',.063,0,-.46,0);                                   // rodilla
  t.caja('A',.1,.08,.05,.02,1,0,-.46,.062);                   // rodillera
  t.cil('A',.066,.05,.40,9,0,-.67,0);                         // caña de la bota
  t.esf('A',.062,0,-.58,-.025,1,1.5,1.05);                    // pantorrilla
  t.caja('B',.012,.3,.014,.004,1,s*.06,-.67,0);               // costura exterior
  t.esf('B',.048,0,-.875,0);                                  // tobillo
  t.caja('A',.105,.06,.25,.03,1,0,-.886,.055);                // pie
  t.caja('K',.09,.045,.075,.015,1,0,-.907,-.07);              // taco (más bajo que la punta)
  t.caja('K',.112,.016,.26,.007,1,0,-.912,.05);               // suela
  return t.fin();
}
function rbGeos(){
  if(rbGeos.c)return rbGeos.c;
  const R={};
  // torso (todo en coordenadas del cuerpo, +z es el frente)
  let t=rbParte();
  t.caja('A',.33,.15,.21,.05,1,0,.975,0);                     // pelvis
  t.caja('A',.13,.09,.05,.025,1,0,.955,.105,.2,0,0);          // placa en V de la ingle
  t.esf('A',.075,.07,.95,-.065,1,1,.9,6,4);t.esf('A',.075,-.07,.95,-.065,1,1,.9,6,4);   // glúteos (se ven de espalda)
  t.caja('K',.355,.05,.235,.02,1,0,1.055,0);                  // cinturón de 4 cm
  t.caja('C',.07,.04,.02,.01,1,0,1.055,.122);                 // hebilla
  [[.11,.108,.35],[-.11,.108,-.35],[.17,.06,1.1],[-.17,.06,-1.1],[.07,-.125,3.0],[-.07,-.125,-3.0]].forEach(p=>t.caja('K',.065,.08,.05,.015,1,p[0],1.035,p[1],0,p[2],0));   // bolsitas del cinturón
  t.crudo('A',new THREE.CylinderGeometry(.2546,.17,.2,4,1).rotateY(Math.PI/4).scale(1,1,.55).translate(0,1.15,0));  // abdomen plano en V (36 cm en la cintura)
  for(let f=0;f<3;f++)for(const sx of [-1,1])t.caja('A',.075,.045,.035,.014,1,sx*.045,1.1+f*.055,.095);   // placas de los abdominales
  t.caja('B',.30,.03,.19,.015,1,0,1.265,0);                   // junta de la cintura
  t.caja('A',.36,.13,.22,.06,2,0,1.33,0);                     // caja torácica
  t.caja('A',.44,.22,.235,.055,3,0,1.46,0);                   // pecho redondeado de 44 cm (el frente es la zona del decal)
  t.esf('A',.08,.125,1.39,.07,1,.72,.7);t.esf('A',.08,-.125,1.39,.07,1,.72,.7);          // pectorales, a los costados del emblema
  t.caja('A',.14,.05,.17,.02,1,.115,1.585,-.01,0,0,-.4);t.caja('A',.14,.05,.17,.02,1,-.115,1.585,-.01,0,0,.4);   // trapecios en pendiente
  t.caja('A',.19,.05,.15,.02,1,0,1.59,0);                     // cuello de armadura
  t.cil('B',.042,.045,.08,8,0,1.625,0);                       // cuello
  t.caja('A',.34,.26,.05,.025,1,0,1.43,-.13);                 // placa de la espalda
  t.caja('A',.12,.24,.07,.035,1,.14,1.38,-.12,0,0,-.08);t.caja('A',.12,.24,.07,.035,1,-.14,1.38,-.12,0,0,.08);   // dorsales
  for(let i=0;i<4;i++)t.caja('B',.045,.035,.03,.01,1,0,1.32+i*.06,-.168);                // vértebras de la columna
  R.torso=t.fin();
  // cabeza (origen en el centro del casco): cráneo ovalado, cara angosta, visor cian y cuernito
  t=rbParte();
  t.esf('A',.12,0,.015,0,1,1.06,1.1,10,7);                    // casco
  t.cil('A',.096,.05,.14,10,0,-.075,.015,0,0,0,1,1,.95);      // cara que se afina hacia el mentón
  t.cil('B',.033,.033,.028,8,.12,-.005,0,0,0,Math.PI/2);t.cil('B',.033,.033,.028,8,-.12,-.005,0,0,0,Math.PI/2);   // orejeras
  t.cono('C',.014,.04,0,.155,-.03,-.2,0,0);                   // cuerno del casco
  t.crudo('V',new THREE.CylinderGeometry(.136,.136,.034,14,1,true,-1.22,2.44).translate(0,.012,0)); // visor curvo
  t.crudo('B',new THREE.CylinderGeometry(.1375,.1375,.007,14,1,true,-1.22,2.44).translate(0,.0325,0)); // marco de arriba
  t.crudo('B',new THREE.CylinderGeometry(.1375,.1375,.007,14,1,true,-1.22,2.44).translate(0,-.0085,0)); // marco de abajo
  R.head=t.fin();
  R.legL=rbPierna(-1);R.legR=rbPierna(1);
  R.armL=rbBrazo(-1,false);R.armR=rbBrazo(1,true);
  // accesorios (origen = centro del casco)
  R.acc={
    cresta:rbCaja(.03,.09,.2,.012,1).translate(0,.145,-.045),
    antena:new THREE.CylinderGeometry(.008,.008,.2,6).translate(.075,.23,-.02),
    antenaPunta:new THREE.SphereGeometry(.03,8,6).translate(.075,.34,-.02),
    cuerno:new THREE.ConeGeometry(.035,.17,6),
    gorra:new THREE.CylinderGeometry(.142,.146,.04,12).translate(0,.112,0),
    visera:rbCaja(.2,.016,.1,.006,1).translate(0,.098,.16),
    decal:new THREE.PlaneGeometry(.15,.15)
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
  const mA=new THREE.MeshPhongMaterial({color:P.c,shininess:70,specular:0x555555});   // armadura lustrosa, como en las láminas
  const mB=new THREE.MeshPhongMaterial({color:P.c2,shininess:60,specular:0x555555});
  const mC=new THREE.MeshPhongMaterial({color:P.c3,shininess:60,specular:0x444444});
  const mV=new THREE.MeshBasicMaterial({color:P.v});
  const mK=new THREE.MeshPhongMaterial({color:0x3d4952,shininess:20});                // tela del cinturón gris azulada
  const MZ={A:mA,B:mB,C:mC,V:mV,K:mK};
  const parte=(set,grupo)=>{RB_ZONAS.forEach(k=>{if(set[k])grupo.add(new THREE.Mesh(set[k],MZ[k]));});return grupo;};
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);
  parte(G.torso,b);
  // imagen del pecho (o el ancla de origen): un plano cuadrado pegado unos 3 mm adelante de la placa
  const hasImg=!!(skin.img&&(noTag||S.showImg));
  const dm=hasImg?new THREE.MeshBasicMaterial({map:chestTex(skin.img),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
                 :new THREE.MeshBasicMaterial({map:rbAnclaTex(),color:P.c3,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const dec=new THREE.Mesh(G.acc.decal,dm);dec.position.set(0,1.46,.121);b.add(dec);
  const legs=[-1,1].map(side=>{const l=parte(side<0?G.legL:G.legR,new THREE.Group());l.position.set(side*.1,.93,0);b.add(l);return l;});
  const head=parte(G.head,new THREE.Group());head.position.y=1.715;b.add(head);
  const a=skin.a|0,A=G.acc;
  if(a===1)head.add(new THREE.Mesh(A.cresta,mC));
  if(a===2)head.add(new THREE.Mesh(A.antena,mK),new THREE.Mesh(A.antenaPunta,mC));
  if(a===3)for(const sx of [-1,1]){const h=new THREE.Mesh(A.cuerno,mC);h.position.set(sx*.1,.14,0);h.rotation.z=-sx*.5;head.add(h);}
  if(a===4)head.add(new THREE.Mesh(A.gorra,mA),new THREE.Mesh(A.visera,mA));
  const armL=parte(G.armL,new THREE.Group());armL.position.set(-.19,1.52,0);b.add(armL);
  const armR=parte(G.armR,new THREE.Group());armR.position.set(.19,1.52,0);b.add(armR);
  // el arma que tiene en la mano (se cambia sola cuando cambia de arma)
  const gun=new THREE.Group();gun.position.set(0,-.15,.56);gun.rotation.y=Math.PI;gun.scale.setScalar(1.2);armR.add(gun);
  if(noTag){gun.add(tpGun(1));gun.userData.w=1;}
  let tag=null;if(!noTag){tag=nameSprite(name,P.c);g.add(tag);}
  const bas=[mV];if(hasImg)bas.push(dm);   // materiales que brillan solos (de noche se apagan, ver 18-noche.js)
  return {g,b,legs,armL,armR,head,gun,tag,mats:[mA,mB,mC,mK],bas};
}

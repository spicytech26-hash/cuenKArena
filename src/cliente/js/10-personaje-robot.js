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
// loft: superficie suave que pasa por secciones [y,rx,rz,ox,oz,n] (radio en x y en z, centro, n=2 elipse, n>2 más "cuadrada").
// Las secciones se interpolan con Catmull-Rom, así salen músculos y placas redondeadas sin aristas.
function rbPot(v,p){return Math.sign(v)*Math.pow(Math.abs(v),p);}
function rbLoft(secs,seg,sub){
  seg=seg||12;sub=sub||1;
  const D=[0,1,1,0,0,2],S=secs.map(q=>[0,1,2,3,4,5].map(j=>q[j]===undefined?(j===2?q[1]:D[j]):q[j]));
  const cr=(p0,p1,p2,p3,t)=>.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
  const n=S.length,R=[];
  for(let i=0;i<n-1;i++)for(let k=0;k<sub;k++){
    const t=k/sub,a=S[Math.max(0,i-1)],b=S[i],c=S[i+1],d=S[Math.min(n-1,i+2)];
    R.push([0,1,2,3,4,5].map(j=>cr(a[j],b[j],c[j],d[j],t)));
  }
  R.push(S[n-1].slice());
  const P=[],I=[];
  R.forEach(r=>{
    const rx=Math.max(.0008,r[1]),rz=Math.max(.0008,r[2]),e=2/Math.max(1.2,r[5]);
    for(let j=0;j<seg;j++){const a=j/seg*Math.PI*2;P.push(r[3]+rx*rbPot(Math.cos(a),e),r[0],r[4]+rz*rbPot(Math.sin(a),e));}
  });
  const nr=R.length,V=new THREE.Vector3(),A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3();
  // agrega un triángulo con el sentido que apunta hacia afuera de "ref"
  const tri=(a,b,c,rx,ry,rz)=>{
    A.set(P[a*3],P[a*3+1],P[a*3+2]);B.set(P[b*3],P[b*3+1],P[b*3+2]);C.set(P[c*3],P[c*3+1],P[c*3+2]);
    V.subVectors(B,A).cross(C.clone().sub(A));
    const cx=(A.x+B.x+C.x)/3-rx,cy=(A.y+B.y+C.y)/3-ry,cz=(A.z+B.z+C.z)/3-rz;
    if(V.x*cx+V.y*cy+V.z*cz<0)I.push(a,c,b);else I.push(a,b,c);
  };
  for(let i=0;i<nr-1;i++)for(let j=0;j<seg;j++){
    const a=i*seg+j,b=i*seg+(j+1)%seg,c=(i+1)*seg+j,d=(i+1)*seg+(j+1)%seg,r=R[i];
    tri(a,b,c,r[3],r[0],r[4]);tri(b,d,c,r[3],r[0],r[4]);
  }
  // tapas planas con vértices propios (así no se mezclan las normales)
  [[0,1],[nr-1,nr-2]].forEach(([i,o])=>{
    const r=R[i],dir=Math.sign(r[0]-R[o][0])||1,base=P.length/3;
    P.push(r[3],r[0],r[4]);for(let j=0;j<seg;j++)P.push(P[(i*seg+j)*3],P[(i*seg+j)*3+1],P[(i*seg+j)*3+2]);
    for(let j=0;j<seg;j++)tri(base,base+1+j,base+1+(j+1)%seg,r[3],r[0]-dir,r[4]);
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));
  g.setIndex(I);g.computeVertexNormals();
  return g;
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
    loft:(zona,secs,seg,sub,x,y,zz,rx,ry,rz)=>poner(zona,rbLoft(secs,seg,sub),x,y,zz,rx,ry,rz),
    // anillo finito que marca una junta entre placas (rx, rz = radios de la pieza en esa altura)
    banda:(zona,y,rx,rz,h,oz,n)=>poner(zona,rbLoft([[y-h/2,rx-.006,rz-.006,0,oz||0,n||2.4],[y-h/2+.003,rx+.003,rz+.003,0,oz||0,n||2.4],[y+h/2-.003,rx+.003,rz+.003,0,oz||0,n||2.4],[y+h/2,rx-.006,rz-.006,0,oz||0,n||2.4]],12,1),0,0,0),
    crudo:(zona,g)=>z[zona].push(g),
    fin:(rotX)=>{const o={};RB_ZONAS.forEach(k=>{if(z[k].length){o[k]=rbJuntar(z[k]);if(rotX)o[k].rotateX(rotX);}});return o;}
  };
}
// brazo: s = lado hacia afuera (-1 izquierdo, +1 derecho); el origen es el hombro y cuelga hacia -y
function rbBrazo(s,adelante){
  const t=rbParte(),X=s*.03;
  t.esf('A',.088,s*.012,.005,0,1,.95,1.05,10,7);                                            // hombrera grande y redonda
  t.loft('A',[[-.03,.074,.076,X],[-.12,.074,.074,X],[-.22,.062,.064,X],[-.29,.052,.054,X]],10,1);   // manga del brazo
  t.banda('B',-.1,.076,.076,.012,0);                                                        // junta de la hombrera
  t.esf('B',.05,X,-.315,0);                                                                // codo oscuro
  t.loft('A',[[-.335,.054,.054,X],[-.39,.062,.062,X,.004],[-.47,.047,.047,X],[-.545,.036,.036,X]],10,1);   // antebrazo
  t.cil('B',.04,.04,.034,8,X,-.56,0);                                                     // muñeca oscura
  t.caja('A',.064,.068,.022,.01,1,X,-.605,0);                                               // palma
  for(let i=0;i<4;i++)t.caja('A',.013,.055,.014,.005,1,X+(i-1.5)*.0145,-.662,.002);        // dedos juntos
  t.caja('A',.014,.042,.016,.006,1,X,-.62,.022,.5,0,0);                                     // pulgar
  return t.fin(adelante?-1.3:0);                                                            // el derecho apunta adelante (-1.3 rad) para sostener el arma
}
// pierna: muslo grueso, rodilla oscura, bota alta y grande; cadena de remaches del lado de afuera (por eso hay izquierda y derecha)
function rbPierna(s){
  const t=rbParte();
  t.esf('B',.06,0,-.005,0);                                                                 // cadera
  t.loft('A',[[0,.1,.105],[-.08,.112,.116],[-.2,.104,.11,0,.004],[-.34,.08,.088,0,.004],[-.44,.06,.068,0,.004]],12,1);   // muslo grueso
  [[-.05,.11],[-.12,.112],[-.2,.103],[-.28,.093],[-.36,.078],[-.43,.062]].forEach(q=>t.caja('K',.014,.03,.016,.005,1,s*q[1],q[0],0));   // cadena de remaches
  t.esf('B',.062,0,-.465,0);                                                                // rodilla
  t.caja('A',.09,.075,.042,.02,1,0,-.46,.06);                                               // rodillera
  t.loft('A',[[-.5,.064,.07],[-.56,.076,.084,0,-.012,2.8],[-.68,.074,.08,0,-.008,3],[-.8,.066,.076,0,0,3],[-.865,.064,.074,0,0,3]],12,1);   // bota grande
  t.banda('A',-.525,.08,.088,.05);                                                          // puño de la bota
  [-.6,-.66,-.72,-.78].forEach(y=>t.caja('K',.012,.024,.014,.005,1,s*.077,y,0));            // remaches de la bota
  t.caja('B',.008,.22,.012,.004,1,0,-.69,.08);                                              // costura del frente
  t.esf('B',.052,0,-.875,0);                                                                // tobillo
  t.caja('A',.13,.066,.26,.032,2,0,-.884,.055);                                              // pie
  t.caja('K',.1,.04,.08,.014,1,0,-.908,-.068);                                             // taco
  t.caja('K',.136,.016,.29,.007,1,0,-.912,.05);                                            // suela
  return t.fin();
}
function rbGeos(){
  if(rbGeos.c)return rbGeos.c;
  const R={};
  // torso (coordenadas del cuerpo, +z es el frente)
  let t=rbParte();
  t.loft('A',[[.84,.06,.06,0,0,2.2],[.89,.125,.085,0,0,2.4],[.95,.158,.105,0,0,2.6],[1.01,.16,.108,0,0,2.6],[1.07,.14,.098,0,0,2.4]],12,1);   // pelvis
  t.loft('A',[[.85,.03,.02,0,.085],[.9,.06,.03,0,.098],[.97,.075,.035,0,.108],[1.02,.08,.035,0,.108]],10,1);                                  // calzón en U
  t.banda('K',1.055,.172,.122,.06,0,2.6);                                                                                                       // cinturón de 4 cm
  [[.075,.13,.1],[-.075,.13,-.1],[.15,.08,.9],[-.15,.08,-.9],[.085,-.12,3.0],[-.085,-.12,-3.0]].forEach(p=>t.caja('K',.058,.062,.04,.013,1,p[0],1.04,p[1],0,p[2],0));   // bolsitas
  t.caja('K',.045,.03,.03,.01,1,0,1.05,.136);t.caja('C',.036,.026,.012,.006,1,0,1.05,.153);                                                     // bolsita del medio y hebilla
  t.loft('A',[[1.06,.142,.098,0,0],[1.12,.14,.09,0,.004],[1.2,.134,.086,0,.006],[1.27,.142,.092,0,.004],[1.32,.158,.102,0,0]],12,1);          // abdomen
  t.banda('B',1.165,.139,.09,.012,.005);t.banda('B',1.235,.138,.089,.012,.005);                                                                 // juntas de las placas
  t.loft('A',[[1.29,.15,.1,0,0,2.4],[1.35,.19,.112,0,.004,2.6],[1.43,.218,.126,0,.008,2.8],[1.51,.218,.122,0,.004,2.8],[1.555,.19,.1,0,-.004,2.6],[1.585,.095,.062,0,-.01,2.2],[1.605,.045,.04,0,-.01,2]],14,2);   // pecho de 44 cm
  t.banda('B',1.345,.192,.114,.01,.004,2.6);                                                                                                    // borde de la placa del pecho
  t.loft('B',[[1.55,.034],[1.57,.041],[1.59,.034],[1.61,.041],[1.63,.034],[1.66,.04]],10,1);                                                    // cuello con ranuras
  t.loft('A',[[1.34,.13,.03,0,-.105,3],[1.45,.16,.042,0,-.122,3],[1.55,.12,.03,0,-.108,3]],12,1);                                              // placa de la espalda
  for(let i=0;i<4;i++)t.caja('B',.05,.03,.03,.01,1,0,1.33+i*.06,-.166);                                                                         // vértebras
  R.torso=t.fin();
  // cabeza (origen en el centro del casco): domo ovalado, cara lisa que se afina, visor cian y cuernito; se achica a 0,78
  t=rbParte();
  t.loft('A',[[-.165,.03,.034,0,.02,2],[-.145,.048,.054,0,.02,2.3],[-.115,.07,.08,0,.016,2.5],[-.075,.095,.108,0,.008,2.6],[-.03,.115,.128,0,0,2.4],[.03,.124,.138,0,-.004,2.2],[.09,.118,.13,0,-.008,2.1],[.135,.085,.098,0,-.008,2],[.158,.035,.045,0,-.008,2],[.165,.005,.006,0,-.008,2]],16,1);
  t.cil('B',.035,.035,.03,8,.124,-.01,0,0,0,Math.PI/2);t.cil('B',.035,.035,.03,8,-.124,-.01,0,0,0,Math.PI/2);                                   // orejeras
  t.cono('C',.015,.06,0,.175,-.03,-.4,0,0);                                                                                                     // cuerno
  const visor=(h,y,ex)=>new THREE.CylinderGeometry(1,1,h,20,1,true,-1.4,2.8).scale(.14+ex,1,.152+ex).translate(0,y,0);
  t.crudo('V',visor(.04,.03,0));t.crudo('B',visor(.008,.056,.003));t.crudo('B',visor(.008,.004,.003));                                          // visor y su marco
  R.head=t.fin();Object.keys(R.head).forEach(k=>R.head[k].scale(.78,.78,.78));
  R.legL=rbPierna(-1);R.legR=rbPierna(1);
  R.armL=rbBrazo(-1,false);R.armR=rbBrazo(1,true);
  // accesorios (origen = centro del casco)
  R.acc={
    cresta:rbCaja(.03,.09,.2,.012,1).translate(0,.12,-.045),
    antena:new THREE.CylinderGeometry(.008,.008,.2,6).translate(.075,.2,-.02),
    antenaPunta:new THREE.SphereGeometry(.03,8,6).translate(.075,.31,-.02),
    cuerno:new THREE.ConeGeometry(.035,.17,6),
    gorra:new THREE.CylinderGeometry(.12,.124,.04,12).translate(0,.1,0),
    visera:rbCaja(.2,.016,.1,.006,1).translate(0,.088,.15),
    decal:new THREE.PlaneGeometry(.11,.11)
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
  const mA=new THREE.MeshPhongMaterial({color:P.c,shininess:40,specular:0x333333});   // armadura lustrosa, como en las láminas
  const mB=new THREE.MeshPhongMaterial({color:P.c2,shininess:50,specular:0x333333});
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
  const dec=new THREE.Mesh(G.acc.decal,dm);dec.position.set(0,1.47,.139);b.add(dec);
  const legs=[-1,1].map(side=>{const l=parte(side<0?G.legL:G.legR,new THREE.Group());l.position.set(side*.108,.93,0);b.add(l);return l;});
  const head=parte(G.head,new THREE.Group());head.position.y=1.735;b.add(head);
  const a=skin.a|0,A=G.acc;
  if(a===1)head.add(new THREE.Mesh(A.cresta,mC));
  if(a===2)head.add(new THREE.Mesh(A.antena,mK),new THREE.Mesh(A.antenaPunta,mC));
  if(a===3)for(const sx of [-1,1]){const h=new THREE.Mesh(A.cuerno,mC);h.position.set(sx*.1,.14,0);h.rotation.z=-sx*.5;head.add(h);}
  if(a===4)head.add(new THREE.Mesh(A.gorra,mA),new THREE.Mesh(A.visera,mA));
  const armL=parte(G.armL,new THREE.Group());armL.position.set(-.2,1.5,0);b.add(armL);
  const armR=parte(G.armR,new THREE.Group());armR.position.set(.2,1.5,0);b.add(armR);
  // el arma que tiene en la mano (se cambia sola cuando cambia de arma)
  const gun=new THREE.Group();gun.position.set(0,-.15,.56);gun.rotation.y=Math.PI;gun.scale.setScalar(.72);armR.add(gun);
  if(noTag){gun.add(tpGun(1));gun.userData.w=1;}
  let tag=null;if(!noTag){tag=nameSprite(name,P.c);g.add(tag);}
  const bas=[mV];if(hasImg)bas.push(dm);   // materiales que brillan solos (de noche se apagan, ver 18-noche.js)
  return {g,b,legs,armL,armR,head,gun,tag,mats:[mA,mB,mC,mK],bas};
}

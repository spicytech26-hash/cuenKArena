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
  const c2=RB_HEX.test(skin.c2)?new THREE.Color(skin.c2):c.clone().multiplyScalar(.5);
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
    banda:(zona,y,rx,rz,h,oz,n,ox)=>poner(zona,rbLoft([[y-h/2,rx-.006,rz-.006,ox||0,oz||0,n||2.4],[y-h/2+.003,rx+.003,rz+.003,ox||0,oz||0,n||2.4],[y+h/2-.003,rx+.003,rz+.003,ox||0,oz||0,n||2.4],[y+h/2,rx-.006,rz-.006,ox||0,oz||0,n||2.4]],10,1),0,0,0),
    crudo:(zona,g)=>z[zona].push(g),
    fin:(rotX)=>{const o={};RB_ZONAS.forEach(k=>{if(z[k].length){o[k]=rbJuntar(z[k]);if(rotX)o[k].rotateX(rotX);}});return o;}
  };
}
// perfil de un loft a una altura (interpolación lineal): sirve para pegar juntas y bandas justo sobre la superficie
function rbPerfil(S,y){
  for(let i=0;i<S.length-1;i++){const a=S[i],b=S[i+1];if(y>=a[0]&&y<=b[0]){const t=(y-a[0])/(b[0]-a[0]);return [0,1,2,3,4].map(j=>(a[j]||0)+((b[j]||0)-(a[j]||0))*t);}}
  return S[S.length-1].slice();
}
const RB_CODO=-.315,RB_L1=.315,RB_L2=.292;   // codo y largo de brazo/antebrazo (hombro → codo → centro de la palma)
// brazo (lado s: -1 izquierdo, +1 derecho). Se arma en dos partes: "U" (hombro y brazo) y "F" (antebrazo y mano), que gira alrededor del codo.
// El origen es el hombro y todo cuelga hacia -y; la pose la decide rbPose (IK hacia el arma).
function rbBrazo(s){
  const t=rbParte(),u=rbParte();
  t.esf('A',.092,s*.018,.0,0,1,.95,1.05,10,8);                                               // hombrera grande y redonda
  t.banda('B',-.062,.094,.096,.016,.002,2.4,s*.012);                                         // anillo del hombro (articulación)
  t.esf('V',.012,s*.082,-.01,.045,1,1,1,6,4);                                                // luz de la hombrera
  t.loft('A',[[-.045,.07,.072,0,.003],[-.12,.074,.076,0,.007],[-.21,.064,.066,0,.003],[-.285,.052,.054]],10,1);   // brazo con bíceps
  t.cil('K',.007,.007,.14,6,0,-.19,-.05);                                                    // pistón hidráulico (por atrás)
  [-.11,-.2].forEach(y=>t.caja('K',.012,.012,.012,.003,1,s*.072,y,0));                       // remaches
  t.banda('B',-.272,.056,.058,.014,0,2.2,0);                                                 // junta sobre el codo
  t.cil('B',.04,.04,.1,10,0,RB_CODO,0,0,0,Math.PI/2);                                        // bisagra del codo
  t.cil('K',.03,.03,.012,10,.056,RB_CODO,0,0,0,Math.PI/2);t.cil('K',.03,.03,.012,10,-.056,RB_CODO,0,0,0,Math.PI/2);   // tapas del codo
  t.esf('B',.047,0,RB_CODO,0,1,1,1,8,6);
  u.loft('A',[[-.338,.052,.054],[-.395,.064,.062,0,.004],[-.47,.048,.048],[-.545,.036,.036]],10,1);   // antebrazo con músculo
  u.banda('C',-.47,.052,.052,.05,0,2.2,0);                                                   // muñequera de color
  [-1,1].forEach(q=>u.caja('V',.008,.13,.012,.003,1,q*.054,-.43,0));                         // luces del antebrazo
  u.cil('B',.04,.04,.034,10,0,-.558,0);u.banda('K',-.545,.034,.034,.012,0,2,0);u.banda('K',-.572,.036,.036,.012,0,2,0);   // muñeca con anillos
  u.caja('A',.068,.07,.026,.012,1,0,-.607,0);u.caja('A',.06,.058,.012,.005,1,0,-.603,-.016);   // palma y dorso
  for(let i=0;i<4;i++){const fx=(i-1.5)*.0155;
    u.caja('A',.0135,.03,.015,.005,1,fx,-.656,.011,-1.0);                                    // primera falange (curvada hacia la palma)
    u.caja('A',.0125,.026,.014,.005,1,fx,-.668,.04,-2.1);}                                   // segunda falange
  u.caja('A',.016,.04,.017,.006,1,.034,-.612,.012,-.2,0,.35);                                // pulgar
  const U=t.fin(),F=u.fin();
  Object.keys(F).forEach(k=>F[k].translate(0,-RB_CODO,0));                                   // la parte F queda centrada en el codo
  return {U,F};
}
// pierna: muslo grueso, rodilla con pistones, bota alta; cadena de remaches y luces del lado de afuera (por eso hay izquierda y derecha)
function rbPierna(s){
  const t=rbParte();
  t.esf('B',.065,0,-.005,0,1,1,1,8,6);                                                       // cadera
  t.loft('A',[[0,.1,.105],[-.08,.112,.116,0,.006],[-.2,.104,.112,0,.01],[-.34,.08,.088,0,.006],[-.44,.06,.068,0,.004]],12,1);   // muslo con cuádriceps
  t.banda('B',-.1,.122,.128,.014,.006,2.2);                                                   // junta del muslo
  [[-.06,.111],[-.16,.108],[-.26,.097],[-.36,.078],[-.43,.062]].forEach(q=>t.caja('K',.014,.03,.016,.005,1,s*q[1],q[0],-.012));   // cadena de remaches
  t.caja('V',.012,.25,.012,.005,1,s*.06,-.22,.095);                              // luz del frente del muslo
  t.cil('B',.05,.05,.12,10,0,-.465,0,0,0,Math.PI/2);                                         // bisagra de la rodilla
  t.esf('B',.062,0,-.465,0,1,1,1,8,6);
  t.caja('C',.1,.085,.05,.022,2,0,-.465,.06);                                                // rodillera de color
  [-1,1].forEach(q=>t.cil('K',.01,.01,.15,6,q*.032,-.46,-.075));                             // pistones atrás de la rodilla
  t.loft('A',[[-.5,.064,.07],[-.56,.076,.084,0,-.012,2.4],[-.68,.074,.08,0,-.008,2.5],[-.8,.066,.076,0,0,2.5],[-.865,.064,.074,0,0,2.5]],10,1);   // bota con pantorrilla
  t.banda('A',-.525,.082,.09,.055,0,2.3);                                                    // puño de la bota
  t.caja('A',.09,.22,.026,.012,1,0,-.69,.088);                                               // placa del frente de la bota
  [-.64,-.72,-.8].forEach(y=>t.caja('B',.07,.006,.01,.003,1,0,y,.1));                        // costuras
  [-.62,-.7,-.78].forEach(y=>t.caja('K',.012,.024,.014,.005,1,s*.077,y,0));                  // remaches de la bota
  t.caja('V',.011,.15,.012,.005,1,s*.058,-.67,.056);                                 // luz del costado de la bota
  t.loft('B',[[-.835,.045],[-.845,.053],[-.855,.045],[-.865,.053],[-.875,.045],[-.89,.052]],10,1);   // fuelle del tobillo
  t.caja('A',.13,.066,.26,.032,2,0,-.884,.055);                                              // pie
  t.caja('C',.11,.05,.07,.024,1,0,-.89,.175);                                                // puntera de color
  t.caja('K',.1,.04,.08,.014,1,0,-.908,-.068);                                               // taco
  t.caja('K',.136,.016,.29,.007,1,0,-.912,.05);                                              // suela
  return t.fin();
}
// accesorios hechos a medida del casco (coordenadas ya a escala 0,78, origen = centro del casco)
function rbAccesorios(){
  const domo=z=>.02+.109*Math.sqrt(Math.max(0,1-(z/.11)*(z/.11)));   // altura de la tapa del casco a lo largo de z
  let t=rbParte();   // cresta: aleta que sigue la curva del casco, de adelante hacia atrás
  const sec=[-.09,-.06,-.02,.02,.06,.088].map(z=>{const hh=.016+.02*Math.max(0,1-Math.abs(z+.005)/.1);return [z,.009,hh,0,-(domo(z)+hh*.3)];});
  t.loft('C',sec,8,1,0,0,0,Math.PI/2);
  const A={cresta:t.fin().C};
  t=rbParte();       // cuernos curvos hacia afuera, apoyados sobre el domo
  for(const sx of [-1,1])t.loft('C',[[0,.017,.017,0,0],[.03,.013,.013,sx*.012],[.06,.007,.007,sx*.03],[.085,.001,.001,sx*.052]],8,1,sx*.05,.085,.0,.15,0,-sx*.45);
  A.cuernos=t.fin().C;
  t=rbParte();       // antena: base, varilla y bolita; sale de la orejera derecha
  t.cil('B',.017,.017,.012,8,.092,.07,-.015,0,0,Math.PI/2);
  t.cil('K',.005,.005,.1,6,.098,.118,-.015,0,0,-.18);
  A.antena=t.fin();
  t=rbParte();t.esf('C',.017,.106,.172,-.015,1,1,1,8,6);A.antenaPunta=t.fin().C;
  t=rbParte();       // gorra: tapa que abraza el casco por encima del visor y visera adelante
  t.loft('A',[[.045,.1,.114],[.07,.104,.114],[.105,.075,.085],[.123,.032,.04],[.132,.005,.006]].map(q=>q.slice()),14,1);
  t.caja('A',.17,.012,.085,.005,1,0,.05,.118,.12);
  A.gorra=t.fin().A;
  return A;
}
// torso: UNA sola superficie continua (cadera → cintura → pecho → cuello) para que el cuerpo tenga forma anatómica y no se vea cuadrado
const RB_TORSO=[[.84,.06,.06,0,0,2.2],[.89,.12,.085,0,0,2.2],[.95,.152,.103,0,0,2.3],[1.01,.16,.108,0,0,2.3],[1.07,.142,.098,0,.002,2.3],[1.14,.128,.088,0,.004,2.2],[1.22,.132,.088,0,.006,2.2],[1.3,.162,.102,0,.004,2.3],[1.38,.205,.118,0,.006,2.4],[1.46,.222,.126,0,.008,2.5],[1.52,.216,.12,0,.004,2.5],[1.56,.19,.1,0,-.004,2.4],[1.585,.09,.06,0,-.01,2.2],[1.6,.045,.04,0,-.01,2]];
function rbGeos(){
  if(rbGeos.c)return rbGeos.c;
  const R={};
  let t=rbParte();
  const junta=(y,h,m)=>{const p=rbPerfil(RB_TORSO,y);t.banda('B',y,p[1]+(m||.007),p[2]+(m||.007),h,p[4],2.4,p[3]);};
  t.loft('A',RB_TORSO,14,2);                                                                                                                       // torso continuo
  t.loft('A',[[.85,.03,.02,0,.085],[.9,.06,.03,0,.098],[.97,.075,.035,0,.108],[1.02,.08,.035,0,.108]],10,1);                                       // calzón en U
  t.banda('K',1.055,.172,.122,.06,0,2.5);                                                                                                           // cinturón de 4 cm
  [[.075,.13,.1],[-.075,.13,-.1],[.15,.08,.9],[-.15,.08,-.9],[.085,-.12,3.0],[-.085,-.12,-3.0]].forEach(p=>{t.caja('C',.058,.062,.04,.013,1,p[0],1.04,p[1],0,p[2],0);t.caja('B',.05,.008,.034,.003,1,p[0],1.063,p[1],0,p[2],0);});   // bolsitas con tapa
  t.caja('C',.045,.03,.03,.01,1,0,1.05,.136);t.caja('K',.04,.028,.012,.006,1,0,1.05,.153);t.caja('V',.016,.012,.004,.002,1,0,1.05,.16);              // bolsita del medio, hebilla y su luz
  // cintura flexible (anillos oscuros) entre el pecho y la cadera
  const flex=[];for(let k=0;k<6;k++){const y=1.13+k*.026,p=rbPerfil(RB_TORSO,y),r=k%2?.013:.005;flex.push([y,p[1]+r,p[2]+r,p[3],p[4],2.2]);}
  t.loft('B',flex,14,1);
  for(let f=0;f<3;f++)for(const sx of [-1,1])t.caja('A',.07,.04,.02,.012,1,sx*.043,1.1+f*.05,.098);                                                 // placas de los abdominales (arriba de la cintura)
  junta(1.0,.012);junta(1.3,.012);junta(1.35,.012);junta(1.535,.012,.006);                                                                         // juntas entre placas
  t.caja('B',.007,.2,.01,.003,1,0,1.18,.099);                                                                                                       // surco del medio
  for(const sx of [-1,1]){
    t.caja('A',.07,.022,.15,.008,1,sx*.088,1.59,0,0,0,-sx*.32);                                                                                     // tira del arnés sobre el hombro
    t.caja('B',.01,.12,.014,.004,1,sx*.075,1.5,.118,0,0,-sx*.1);                                                                                    // costura del arnés
    t.caja('V',.013,.1,.012,.005,1,sx*.16,1.44,.108,0,-sx*.55,0);                                                                                   // luces de los costados del pecho
    t.caja('V',.012,.09,.01,.004,1,sx*.15,1.23,.088,0,-sx*.4,0);                                                                                    // luces del abdomen
  }
  t.caja('A',.30,.04,.03,.016,1,0,1.385,.114);t.caja('B',.008,.09,.01,.003,1,0,1.365,.133);                                                         // repisa bajo el emblema y surco del esternón
  t.loft('B',[[1.54,.034],[1.56,.042],[1.58,.034],[1.6,.042],[1.62,.034],[1.66,.04]],10,1);                                                         // cuello con ranuras
  [-1,1].forEach(q=>t.cil('K',.007,.007,.1,6,q*.046,1.6,-.01));                                                                                     // cables del cuello
  t.loft('A',[[1.34,.13,.03,0,-.105,2.6],[1.45,.16,.042,0,-.122,2.6],[1.55,.12,.03,0,-.108,2.6]],12,1);                                             // placa de la espalda
  for(let i=0;i<4;i++)t.caja('B',.05,.03,.03,.01,1,0,1.33+i*.06,-.166);                                                                             // vértebras
  t.caja('V',.01,.22,.01,.004,1,0,1.43,-.17);                                                                                                       // luz de la columna
  R.torso=t.fin();
  // cabeza (origen en el centro del casco): domo ovalado, cara lisa que se afina, visor cian; se achica a 0,78
  t=rbParte();
  t.loft('A',[[-.165,.03,.034,0,.02,2],[-.145,.048,.054,0,.02,2.1],[-.115,.07,.08,0,.016,2.2],[-.075,.095,.108,0,.008,2.3],[-.03,.115,.128,0,0,2.2],[.03,.124,.138,0,-.004,2.1],[.09,.118,.13,0,-.008,2.1],[.135,.085,.098,0,-.008,2],[.158,.035,.045,0,-.008,2],[.165,.005,.006,0,-.008,2]],14,1);
  t.cil('B',.035,.035,.03,8,.124,-.01,0,0,0,Math.PI/2);t.cil('B',.035,.035,.03,8,-.124,-.01,0,0,0,Math.PI/2);                                       // orejeras
  t.cil('V',.017,.017,.008,8,.141,-.01,0,0,0,Math.PI/2);t.cil('V',.017,.017,.008,8,-.141,-.01,0,0,0,Math.PI/2);                                       // luces de las orejeras
  const visor=(h,y,ex)=>new THREE.CylinderGeometry(1,1,h,20,1,true,-1.4,2.8).scale(.14+ex,1,.152+ex).translate(0,y,0);
  t.crudo('V',visor(.04,.03,0));t.crudo('B',visor(.008,.056,.003));t.crudo('B',visor(.008,.004,.003));                                              // visor y su marco
  R.head=t.fin();Object.keys(R.head).forEach(k=>R.head[k].scale(.78,.78,.78));
  R.legL=rbPierna(-1);R.legR=rbPierna(1);
  const bl=rbBrazo(-1),br=rbBrazo(1);R.armLu=bl.U;R.armLf=bl.F;R.armRu=br.U;R.armRf=br.F;
  R.acc=rbAccesorios();R.acc.decal=new THREE.PlaneGeometry(.11,.11);
  return rbGeos.c=R;
}
// ---------- agarre del arma con las dos manos ----------
// Cada brazo es un IK de dos huesos: la mano derecha va a la empuñadura y la izquierda al guardamano (a una fracción del cañón).
// Cuchillo (7) y molotov (10) se sostienen con una mano; la otra cuelga y se balancea.
const rbAgarres={},rbM=new THREE.Matrix4(),rbMB=new THREE.Matrix4(),rbQU=new THREE.Quaternion(),rbQF=new THREE.Quaternion();
function rbAgarre(w){
  if(rbAgarres[w])return rbAgarres[w];
  const g=tpGun(w),tp=g.userData.tip||{x:0,y:0,z:-.5},f=.4;
  return rbAgarres[w]={una:w===7||w===10,emp:new THREE.Vector3(0,-.035,.02),fore:new THREE.Vector3(tp.x*f,tp.y*f-.06,tp.z*f)};
}
function rbIK(arm,S,T,pole,up){
  const V=THREE.Vector3,d0=T.clone().sub(S);let d=d0.length();const dir=d0.clone().divideScalar(d||1);
  d=Math.max(Math.abs(RB_L1-RB_L2)+.02,Math.min(RB_L1+RB_L2-.002,d));
  const a=(RB_L1*RB_L1-RB_L2*RB_L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,RB_L1*RB_L1-a*a));
  const p=pole.clone().addScaledVector(dir,-pole.dot(dir)).normalize();
  const E=S.clone().addScaledVector(dir,a).addScaledVector(p,h),Tc=S.clone().addScaledVector(dir,d);
  const yU=S.clone().sub(E).normalize();
  let n=E.clone().sub(S).cross(Tc.clone().sub(E));if(n.lengthSq()<1e-8)n.copy(p).cross(dir);n.normalize();
  const xU=n.addScaledVector(yU,-n.dot(yU)).normalize(),zU=xU.clone().cross(yU);
  rbQU.setFromRotationMatrix(rbM.makeBasis(xU,yU,zU));arm.quaternion.copy(rbQU);
  const yF=E.clone().sub(Tc).normalize();let zF=up.clone().addScaledVector(yF,-up.dot(yF));if(zF.lengthSq()<1e-6)zF.set(0,0,1);zF.normalize();
  const xF=yF.clone().cross(zF);
  rbQF.setFromRotationMatrix(rbM.makeBasis(xF,yF,zF));arm.fore.quaternion.copy(rbQU.clone().invert().multiply(rbQF));
}
const RB_POLE_L=new THREE.Vector3(-.5,-1,-.2),RB_POLE_R=new THREE.Vector3(.5,-1,-.2),RB_UP_L=new THREE.Vector3(.1,1,.1),RB_UP_R=new THREE.Vector3(-1,.25,0);
// m = modelo de buildPlayer, w = arma, aimX = inclinación del arma (rad), swing = balanceo del brazo libre
function rbPose(m,w,aimX,swing){
  const A=rbAgarre(w),aim=m.aim;aim.rotation.x=aimX;aim.updateMatrix();m.gun.updateMatrix();
  rbM.multiplyMatrices(aim.matrix,m.gun.matrix);
  const TR=A.emp.clone().applyMatrix4(rbM);
  rbIK(m.armR,m.armR.position,TR,RB_POLE_R,RB_UP_R);
  if(A.una){m.armL.rotation.set(swing||0,0,-.08);m.armL.fore.rotation.set(-.3,0,0);}
  else rbIK(m.armL,m.armL.position,A.fore.clone().applyMatrix4(rbM),RB_POLE_L,RB_UP_L);
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
  const mK=new THREE.MeshPhongMaterial({color:0x2b3036,shininess:60,specular:0x777777});                // tela del cinturón gris azulada
  const MZ={A:mA,B:mB,C:mC,V:mV,K:mK};
  const parte=(set,grupo)=>{RB_ZONAS.forEach(k=>{if(set[k])grupo.add(new THREE.Mesh(set[k],MZ[k]));});return grupo;};
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);
  parte(G.torso,b);
  // imagen del pecho (o el ancla de origen): un plano cuadrado pegado unos 3 mm adelante de la placa
  const hasImg=!!(skin.img&&(noTag||S.showImg));
  const dm=hasImg?new THREE.MeshBasicMaterial({map:chestTex(skin.img),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
                 :new THREE.MeshBasicMaterial({map:rbAnclaTex(),color:P.c3,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const dec=new THREE.Mesh(G.acc.decal,dm);dec.position.set(0,1.47,.137);b.add(dec);
  const legs=[-1,1].map(side=>{const l=parte(side<0?G.legL:G.legR,new THREE.Group());l.position.set(side*.108,.93,0);b.add(l);return l;});
  const head=parte(G.head,new THREE.Group());head.position.y=1.76;b.add(head);
  const a=skin.a|0,A=G.acc;
  if(a===1)head.add(new THREE.Mesh(A.cresta,mC));
  if(a===2)head.add(new THREE.Mesh(A.antena.B,mB),new THREE.Mesh(A.antena.K,mK),new THREE.Mesh(A.antenaPunta,mC));
  if(a===3)head.add(new THREE.Mesh(A.cuernos,mC));
  if(a===4)head.add(new THREE.Mesh(A.gorra,mA));
  const brazo=side=>{const up=parte(side<0?G.armLu:G.armRu,new THREE.Group());up.position.set(side*.21,1.5,0);
    const fo=parte(side<0?G.armLf:G.armRf,new THREE.Group());fo.position.set(0,RB_CODO,0);up.add(fo);up.fore=fo;b.add(up);return up;};
  const armL=brazo(-1),armR=brazo(1);
  // el arma cuelga de un pivote a la altura del pecho (aim) y las dos manos van a buscarla con IK (ver rbPose)
  const aim=new THREE.Group();aim.position.set(.04,1.45,0);b.add(aim);
  const gun=new THREE.Group();gun.position.set(.02,-.07,.27);gun.rotation.y=Math.PI;gun.scale.setScalar(.72);aim.add(gun);
  if(noTag){gun.add(tpGun(1));gun.userData.w=1;}
  let tag=null;if(!noTag){tag=nameSprite(name,P.c);g.add(tag);}
  const bas=[mV];if(hasImg)bas.push(dm);   // materiales que brillan solos (de noche se apagan, ver 18-noche.js)
  const modelo={g,b,legs,armL,armR,aim,head,gun,tag,mats:[mA,mB,mC,mK],bas};
  rbPose(modelo,noTag?1:0,-.05,0);
  return modelo;
}

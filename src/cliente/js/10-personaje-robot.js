/* ---------- personaje robot humanoide (hoja CUE-87, versión 3) ----------
   Se arma con primitivas y superficies suaves ("lofts"), UNA sola vez: cada parte que se mueve es una malla por zona de color.
   Zonas de color (la piel guarda hexadecimales; los campos nuevos se derivan de los viejos si faltan):
     A armadura → casco: skin.ck · pecho y abdomen: skin.cp · pelvis y piernas: skin.cl · brazos y manos: skin.cb   (ck, cp, cb y cl valen skin.c si no están: c es el color de todo el cuerpo)
     B articulaciones y partes secundarias → skin.c2 (si falta: el color de armadura más oscuro)
     C detalles (cuerno, hebilla, bolsitas, rodilleras, muñequeras) → skin.c3 (si falta: el color de armadura más claro)
     V visor y luces → skin.v (si falta: cian)      emblema del pecho: skin.em (ancla, flecha, corazón…) y su color skin.ce; o una foto propia skin.img          K metal oscuro (pistones, cinturón, suelas) → fijo
   Las geometrías se comparten entre todos los jugadores y bots; lo único que cambia por jugador son los materiales (colores).
   Medidas de la lámina: ~1,88 m, hombros de 52 cm, pecho de 44 cm, cinturón de 4 cm.
   La hitbox y la física las decide el servidor (K en src/nucleo/01-datos.js), esto es solo visual. */
const RB_HEX=/^#[0-9a-fA-F]{6}$/,RB_ZONAS=['A','B','C','V','K'];
// colores de cada zona, con los valores por defecto derivados del color de armadura (para que los ajustes viejos sigan andando)
function skinParts(skin){
  const c=new THREE.Color(RB_HEX.test(skin.c)?skin.c:'#e8542a');
  const dc=k=>RB_HEX.test(skin[k])?new THREE.Color(skin[k]):null;
  const c2=dc('c2')||c.clone().multiplyScalar(.5),c3=dc('c3')||c.clone().lerp(new THREE.Color(1,1,1),.45);
  const cp=dc('cp')||c.clone(),cb=dc('cb')||c.clone(),cl=dc('cl')||c.clone(),ck=dc('ck')||c.clone(),h=q=>'#'+q.getHexString();
  const ce=dc('ce')||new THREE.Color(rbTintaAncla(h(cp)));   // emblema: el elegido, o negro/claro según el pecho
  return {c:h(c),ck:h(ck),c2:h(c2),c3:h(c3),cp:h(cp),cb:h(cb),cl:h(cl),ce:h(ce),v:RB_HEX.test(skin.v)?skin.v:'#2be6ff'};
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
// junta varias geometrías indexadas (ya transformadas) en una sola malla (con coordenadas de textura)
function rbJuntar(lista){
  let nv=0,ni=0;lista.forEach(g=>{nv+=g.attributes.position.count;ni+=g.index.count;});
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),UV=new Float32Array(nv*2),I=new Uint16Array(ni);let ov=0,oi=0;
  lista.forEach(g=>{
    P.set(g.attributes.position.array,ov*3);N.set(g.attributes.normal.array,ov*3);if(g.attributes.uv)UV.set(g.attributes.uv.array,ov*2);
    for(let i=0;i<g.index.count;i++)I[oi+i]=g.index.array[i]+ov;
    ov+=g.attributes.position.count;oi+=g.index.count;g.dispose();
  });
  const o=new THREE.BufferGeometry();
  o.setAttribute('position',new THREE.BufferAttribute(P,3));o.setAttribute('normal',new THREE.BufferAttribute(N,3));o.setAttribute('uv',new THREE.BufferAttribute(UV,2));o.setIndex(new THREE.BufferAttribute(I,1));
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
  const K=seg+1,P=[],UV=[],I=[];let vv=0;
  R.forEach((r,i)=>{
    if(i)vv+=Math.abs(r[0]-R[i-1][0])*6;
    const rx=Math.max(.0008,r[1]),rz=Math.max(.0008,r[2]),e=2/Math.max(1.2,r[5]);
    for(let j=0;j<=seg;j++){const a=j%seg/seg*Math.PI*2;P.push(r[3]+rx*rbPot(Math.cos(a),e),r[0],r[4]+rz*rbPot(Math.sin(a),e));UV.push(j/seg*2,vv);}
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
    const a=i*K+j,b=i*K+j+1,c=(i+1)*K+j,d=(i+1)*K+j+1,r=R[i];
    tri(a,b,c,r[3],r[0],r[4]);tri(b,d,c,r[3],r[0],r[4]);
  }
  // tapas planas con vértices propios (así no se mezclan las normales)
  [[0,1],[nr-1,nr-2]].forEach(([i,o])=>{
    const r=R[i],dir=Math.sign(r[0]-R[o][0])||1,base=P.length/3;
    P.push(r[3],r[0],r[4]);UV.push(.5,.5);
    for(let j=0;j<seg;j++){const k=i*K+j;P.push(P[k*3],P[k*3+1],P[k*3+2]);const a=j/seg*Math.PI*2;UV.push(.5+.5*Math.cos(a),.5+.5*Math.sin(a));}
    for(let j=0;j<seg;j++)tri(base,base+1+j,base+1+(j+1)%seg,r[3],r[0]-dir,r[4]);
  });
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(UV),2));
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
    esf:(zona,r,x,y,zz,sx,sy,sz,lw,lh,rx,ry,rz)=>poner(zona,new THREE.SphereGeometry(r,lw||8,lh||6),x,y,zz,rx,ry,rz,sx,sy,sz),
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
// mano: palma con dorso y cuatro dedos de tres falanges curvadas hacia la palma (+z local), articulaciones oscuras y pulgar. Palma centrada en y=-.607
function rbMano(u,s){
  const py=-.607;
  u.caja('A',.07,.07,.028,.012,2,0,py,0);u.caja('A',.062,.056,.014,.006,1,0,py+.006,-.019);       // palma y dorso
  u.caja('B',.074,.014,.034,.006,1,0,py+.038,0);                                                   // muñeca
  const L=[.03,.024,.02],ang=[.5,1.3,1.95];
  for(let i=0;i<4;i++){
    const fx=(i-1.5)*.0168,w=.0145-(i===3?.002:0),f=(i===1||i===2)?1.1:1;let y=py-.036,z=.005;
    for(let k=0;k<3;k++){
      const a=ang[k],dy=-Math.cos(a),dz=Math.sin(a),l=L[k]*f;
      u.caja('A',w-k*.0008,l,w,.0055,1,fx,y+dy*l/2,z+dz*l/2,-a);y+=dy*l;z+=dz*l;
      if(k<2)u.caja('B',w-.001,.006,w-.001,.002,1,fx,y,z,-a);                                      // articulación
    }
  }
  // pulgar: sale del costado de la palma y se curva hacia ella
  const ts=s,tx=ts*.04;let ty=py+.012,tz=.006;[[.3,.028],[1.0,.024]].forEach(([a,l],k)=>{
    const dy=-Math.cos(a),dz=Math.sin(a);u.caja('A',.0165-k*.002,l,.0165,.006,1,tx,ty+dy*l/2,tz+dz*l/2,-a,0,ts*.5);ty+=dy*l;tz+=dz*l;});
}
// brazo (lado s: -1 izquierdo, +1 derecho). Se arma en dos partes: "U" (hombro y brazo) y "F" (antebrazo y mano), que gira alrededor del codo.
// El origen es el hombro y todo cuelga hacia -y; la pose la decide rbPose (IK hacia el arma).
function rbBrazo(s){
  const t=rbParte(),u=rbParte();
  t.esf('A',.094,s*.018,.0,0,1,.95,1.05,10,8);                                                // hombrera grande y redonda
  t.esf('A',.07,s*.05,-.045,.0,1,.62,1.12,8,6);                                               // placa baja de la hombrera
  t.banda('B',-.07,.098,.1,.016,.002,2.4,s*.012);                                             // anillo del hombro (articulación)
  t.esf('V',.012,s*.082,-.012,.047,1,1,1,6,4);                                                // luz de la hombrera
  for(let i=0;i<3;i++)t.caja('K',.05,.006,.012,.003,1,s*.06,.045-i*.012,.05,.3,0,0);         // rejillas de la hombrera
  t.loft('A',[[-.045,.07,.072,0,.003],[-.12,.076,.078,0,.008],[-.21,.064,.066,0,.003],[-.285,.052,.054]],10,1);   // brazo con bíceps
  t.esf('A',.04,0,-.12,-.05,1,1.7,.8,6,5);                                                    // tríceps
  t.cil('K',.007,.007,.14,6,0,-.19,-.055);t.cil('K',.005,.005,.12,6,s*.03,-.19,-.06);          // pistones hidráulicos (por atrás)
  [-.1,-.16,-.22].forEach(y=>t.caja('K',.012,.012,.012,.003,1,s*.074,y,0));                   // remaches del costado
  t.banda('B',-.272,.056,.058,.014,0,2.2,0);                                                  // junta sobre el codo
  t.cil('B',.04,.04,.1,10,0,RB_CODO,0,0,0,Math.PI/2);                                         // bisagra del codo
  t.cil('K',.03,.03,.012,10,.056,RB_CODO,0,0,0,Math.PI/2);t.cil('K',.03,.03,.012,10,-.056,RB_CODO,0,0,0,Math.PI/2);   // tapas del codo
  t.esf('B',.047,0,RB_CODO,0,1,1,1,8,6);
  u.loft('A',[[-.338,.052,.054],[-.395,.064,.062,0,.004],[-.47,.048,.048],[-.545,.036,.036]],10,1);   // antebrazo con músculo
  u.banda('C',-.47,.052,.052,.05,0,2.2,0);                                                    // muñequera de color
  [-1,1].forEach(q=>u.caja('V',.008,.13,.012,.003,1,q*.054,-.43,0));                          // luces del antebrazo
  u.cil('K',.006,.006,.2,6,0,-.42,-.056);                                                     // cable del antebrazo
  u.cil('B',.04,.04,.034,10,0,-.558,0);u.banda('K',-.545,.034,.034,.012,0,2,0);u.banda('K',-.572,.036,.036,.012,0,2,0);   // muñeca con anillos
  rbMano(u,s);
  const U=t.fin(),F=u.fin();
  Object.keys(F).forEach(k=>F[k].translate(0,-RB_CODO,0));                                    // la parte F queda centrada en el codo
  return {U,F};
}
// pierna: muslo grueso, rodilla con pistones, bota alta; cadena de remaches y luces del lado de afuera (por eso hay izquierda y derecha)
function rbPierna(s){
  const t=rbParte();
  t.esf('B',.065,0,-.005,0,1,1,1,8,6);                                                        // cadera
  t.loft('A',[[0,.1,.105],[-.08,.112,.116,0,.006],[-.2,.104,.112,0,.01],[-.34,.08,.088,0,.006],[-.44,.06,.068,0,.004]],12,1);   // muslo con cuádriceps
  t.esf('A',.05,s*.03,-.18,.075,1,2.2,.5,6,5);                                                // vasto externo
  t.banda('B',-.1,.122,.128,.014,.006,2.2);                                                   // junta del muslo
  [[-.06,.111],[-.16,.108],[-.26,.097],[-.36,.078],[-.43,.062]].forEach(q=>t.caja('K',.014,.03,.016,.005,1,s*q[1],q[0],-.012));   // cadena de remaches
  t.caja('V',.012,.25,.012,.005,1,s*.06,-.22,.095);                                           // luz del frente del muslo
  t.cil('B',.05,.05,.12,10,0,-.465,0,0,0,Math.PI/2);                                          // bisagra de la rodilla
  t.esf('B',.062,0,-.465,0,1,1,1,8,6);
  t.caja('C',.1,.085,.05,.022,2,0,-.465,.06);t.caja('K',.06,.008,.02,.003,1,0,-.44,.082);     // rodillera de color y su filo
  [-1,1].forEach(q=>t.cil('K',.01,.01,.15,6,q*.032,-.46,-.075));                              // pistones atrás de la rodilla
  t.loft('A',[[-.5,.064,.07],[-.56,.076,.084,0,-.012,2.4],[-.68,.074,.08,0,-.008,2.5],[-.8,.066,.076,0,0,2.5],[-.865,.064,.074,0,0,2.5]],10,1);   // bota con pantorrilla
  t.banda('A',-.525,.082,.09,.055,0,2.3);                                                     // puño de la bota
  t.caja('A',.09,.22,.026,.012,1,0,-.69,.088);                                                // placa del frente de la bota
  [-.64,-.72,-.8].forEach(y=>t.caja('B',.07,.006,.01,.003,1,0,y,.1));                         // costuras
  [-.62,-.7,-.78].forEach(y=>t.caja('K',.012,.024,.014,.005,1,s*.077,y,0));                   // remaches de la bota
  t.caja('V',.011,.15,.012,.005,1,s*.058,-.67,.056);                                          // luz del costado de la bota
  t.loft('B',[[-.835,.045],[-.845,.053],[-.855,.045],[-.865,.053],[-.875,.045],[-.89,.052]],10,1);   // fuelle del tobillo
  t.caja('A',.13,.066,.26,.032,2,0,-.884,.055);                                               // pie
  t.caja('C',.11,.05,.07,.024,1,0,-.89,.175);                                                 // puntera de color
  t.caja('K',.1,.04,.08,.014,1,0,-.908,-.068);                                                // taco
  t.caja('K',.136,.016,.29,.007,1,0,-.912,.05);                                               // suela
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
const RB_TORSO=[[.84,.06,.06,0,0,2.2],[.89,.12,.085,0,0,2.2],[.95,.152,.103,0,0,2.3],[1.01,.16,.108,0,0,2.3],[1.07,.142,.098,0,.002,2.3],[1.14,.128,.088,0,.004,2.2],[1.22,.132,.088,0,.006,2.2],[1.3,.158,.1,0,.004,2.4],[1.36,.2,.114,0,.006,2.6],[1.43,.222,.124,0,.01,2.8],[1.5,.218,.12,0,.006,2.8],[1.55,.196,.102,0,-.002,2.5],[1.575,.12,.07,0,-.01,2.2],[1.6,.05,.04,0,-.01,2]];
function rbGeos(){
  if(rbGeos.c)return rbGeos.c;
  const R={};
  // pelvis (va con el color de las piernas)
  let t=rbParte();
  t.loft('A',RB_TORSO.filter(q=>q[0]<=1.07).concat([[1.08,.14,.098,0,.002,2.3]]),12,2);                                                              // pelvis
  t.loft('A',[[.85,.03,.02,0,.085],[.9,.06,.03,0,.098],[.97,.075,.035,0,.108],[1.02,.08,.035,0,.108]],10,1);                                         // calzón en U
  for(const sx of [-1,1])t.caja('A',.05,.11,.17,.022,1,sx*.162,.99,0,0,0,-sx*.12);                                                                   // placas de la cadera
  R.pelvis=t.fin();
  t=rbParte();
  const junta=(y,h,m)=>{const p=rbPerfil(RB_TORSO,y);t.banda('B',y,p[1]+(m||.007),p[2]+(m||.007),h,p[4],2.4,p[3]);};
  t.loft('A',RB_TORSO.filter(q=>q[0]>=1.07),14,2);                                                                                                    // torso continuo
  t.banda('K',1.055,.172,.122,.06,0,2.5);                                                                                                             // cinturón de 4 cm
  [[.075,.13,.1],[-.075,.13,-.1],[.15,.08,.9],[-.15,.08,-.9],[.085,-.12,3.0],[-.085,-.12,-3.0]].forEach(p=>{t.caja('C',.058,.062,.04,.013,1,p[0],1.04,p[1],0,p[2],0);t.caja('B',.05,.008,.034,.003,1,p[0],1.063,p[1],0,p[2],0);});   // bolsitas con tapa
  t.caja('C',.045,.03,.03,.01,1,0,1.05,.136);t.caja('K',.04,.028,.012,.006,1,0,1.05,.153);t.caja('V',.016,.012,.004,.002,1,0,1.05,.16);                // bolsita del medio, hebilla y su luz
  junta(1.165,.012);junta(1.245,.012);                                                                                                              // juntas finas de la cintura
  for(let f=0;f<3;f++)for(const sx of [-1,1])t.caja('A',.07,.04,.02,.012,1,sx*.043,1.1+f*.05,.098);                                                   // placas de los abdominales
  t.banda('A',1.345,rbPerfil(RB_TORSO,1.345)[1]+.004,rbPerfil(RB_TORSO,1.345)[2]+.004,.014,rbPerfil(RB_TORSO,1.345)[4],2.6);                           // borde inferior de la placa del pecho (pieza única, mismo color)
  t.caja('B',.007,.2,.01,.003,1,0,1.18,.099);                                                                                                         // surco del medio del abdomen
  for(const sx of [-1,1])t.caja('A',.065,.02,.13,.008,1,sx*.088,1.588,0,0,0,-sx*.32);                                                                 // lengüetas sobre los hombros (como en la lámina)
  t.loft('B',[[1.54,.034],[1.56,.042],[1.58,.034],[1.6,.042],[1.62,.034],[1.66,.04]],10,1);                                                           // cuello con ranuras
  [-1,1].forEach(q=>t.cil('K',.007,.007,.1,6,q*.046,1.6,-.01));                                                                                       // cables del cuello
  t.loft('A',[[1.34,.13,.03,0,-.105,2.6],[1.45,.16,.042,0,-.122,2.6],[1.55,.12,.03,0,-.108,2.6]],12,1);                                               // placa de la espalda
  for(let i=0;i<4;i++)t.caja('B',.05,.03,.03,.01,1,0,1.33+i*.06,-.166);                                                                               // vértebras
  // mochila de energía (como en las escenas): caja redondeada con luces, rejillas, antena y mangueras a la cintura
  t.caja('A',.25,.3,.1,.04,2,0,1.4,-.2);t.caja('C',.2,.03,.104,.012,1,0,1.5,-.2);t.caja('C',.2,.03,.104,.012,1,0,1.3,-.2);
  t.caja('V',.012,.2,.01,.004,1,-.07,1.4,-.255);t.caja('V',.012,.2,.01,.004,1,.07,1.4,-.255);
  for(let i=0;i<4;i++)t.caja('K',.1,.008,.01,.003,1,0,1.34+i*.04,-.255);
  t.cil('K',.006,.006,.12,6,.09,1.6,-.2);t.esf('C',.012,.09,1.665,-.2,1,1,1,6,4);
  R.torso=t.fin();
  // cabeza (origen en el centro del casco): domo ovalado, cara lisa que se afina, visor cian, cuerno; se achica a 0,78
  t=rbParte();
  t.loft('A',[[-.165,.03,.034,0,.02,2],[-.145,.048,.054,0,.02,2.1],[-.115,.07,.08,0,.016,2.2],[-.075,.095,.108,0,.008,2.3],[-.03,.115,.128,0,0,2.2],[.03,.124,.138,0,-.004,2.1],[.09,.118,.13,0,-.008,2.1],[.135,.085,.098,0,-.008,2],[.158,.035,.045,0,-.008,2],[.165,.005,.006,0,-.008,2]],14,1);
  t.cil('B',.035,.035,.03,8,.124,-.01,0,0,0,Math.PI/2);t.cil('B',.035,.035,.03,8,-.124,-.01,0,0,0,Math.PI/2);                                         // orejeras
  t.cil('V',.017,.017,.008,8,.141,-.01,0,0,0,Math.PI/2);t.cil('V',.017,.017,.008,8,-.141,-.01,0,0,0,Math.PI/2);                                         // luces de las orejeras
  for(let i=0;i<3;i++)t.caja('K',.05,.006,.012,.002,1,0,-.115-i*.014,.052,-.3,0,0);                                                                   // rejilla del mentón
  t.cono('C',.016,.06,0,.158,-.025,-.35,0,0);                                                                                                         // cuerno del casco
  const visor=(h,y,ex)=>new THREE.CylinderGeometry(1,1,h,20,1,true,-1.4,2.8).scale(.14+ex,1,.152+ex).translate(0,y,0);
  t.crudo('V',visor(.04,.03,0));t.crudo('B',visor(.008,.056,.003));t.crudo('B',visor(.008,.004,.003));                                                // visor y su marco
  R.head=t.fin();Object.keys(R.head).forEach(k=>R.head[k].scale(.78,.78,.78));
  R.legL=rbPierna(-1);R.legR=rbPierna(1);
  const bl=rbBrazo(-1),br=rbBrazo(1);R.armLu=bl.U;R.armLf=bl.F;R.armRu=br.U;R.armRf=br.F;
  R.acc=rbAccesorios();R.acc.decal=new THREE.PlaneGeometry(.09,.09);
  return rbGeos.c=R;
}
// ---------- materiales: pintura lustrosa con reflejos y desgaste ----------
// reflejo de estudio: cielo oscuro con ventanas de luz (se comparte entre todos y vale para cualquier renderer)
let rbEnvT=null,rbBumpT=null,rbMapT=null;
function rbEnv(){
  if(rbEnvT)return rbEnvT;
  rbEnvT=new THREE.CanvasTexture(cv(256,128,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#2a3340');gr.addColorStop(.5,'#6b7580');gr.addColorStop(.55,'#4a4038');gr.addColorStop(1,'#14100e');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='rgba(255,255,255,.9)';g.fillRect(30,20,50,22);g.fillRect(150,14,70,16);
    g.fillStyle='rgba(255,170,110,.8)';g.fillRect(100,44,30,14);g.fillStyle='rgba(120,220,255,.8)';g.fillRect(200,50,24,20);
  }));
  rbEnvT.mapping=THREE.EquirectangularReflectionMapping;rbEnvT.needsUpdate=true;return rbEnvT;
}
// relieve: ruido fino, rayones y picaduras (bump) y mugre suave que solo oscurece (map)
function rbDesgaste(){
  if(rbBumpT)return rbBumpT;
  let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  const mk=fn=>{const t=new THREE.CanvasTexture(cv(256,256,fn));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;return t;};
  rbBumpT=mk(g=>{
    g.fillStyle='#808080';g.fillRect(0,0,256,256);
    for(let i=0;i<900;i++){const v=122+rnd()*14|0;g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(rnd()*256,rnd()*256,1+rnd()*2,1+rnd()*2);}
    for(let i=0;i<70;i++){g.strokeStyle=rnd()<.5?'rgba(40,40,40,.7)':'rgba(220,220,220,.6)';g.lineWidth=.6;g.beginPath();const x=rnd()*256,y=rnd()*256,a=rnd()*3.14,l=8+rnd()*40;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
    for(let i=0;i<30;i++){g.fillStyle='rgba(30,30,30,.55)';g.beginPath();g.arc(rnd()*256,rnd()*256,1+rnd()*2.2,0,6.3);g.fill();}
  });
  rbMapT=mk(g=>{
    g.fillStyle='#fff';g.fillRect(0,0,256,256);
    for(let i=0;i<140;i++){const r=8+rnd()*30,x=rnd()*256,y=rnd()*256,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(60,45,35,'+(.02+rnd()*.05)+')');gr.addColorStop(1,'rgba(60,45,35,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
    for(let i=0;i<40;i++){g.strokeStyle='rgba(50,40,30,.12)';g.lineWidth=1;g.beginPath();const x=rnd()*256,y=rnd()*256;g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*8,y+10+rnd()*40);g.stroke();}
  });
  return rbBumpT;
}
function rbMat(color,rug,met,esp){
  const b=rbDesgaste();
  return new THREE.MeshStandardMaterial({color,roughness:rug,metalness:met,envMap:rbEnv(),envMapIntensity:esp||.75,bumpMap:b,bumpScale:.003,map:rbMapT});
}
// emblemas del pecho: dibujos blancos sobre fondo transparente (se tiñen con el color del emblema). El servidor solo guarda el nombre (EMBLEMS).
function rbTintaAncla(hex){const c=new THREE.Color(hex),l=.299*c.r+.587*c.g+.114*c.b;return l>.3?0x14181c:0xf2efe6;}   // negro sobre pechos claros, claro sobre pechos oscuros
const RB_EMBLEMAS={
  ancla:g=>{g.beginPath();g.arc(64,26,12,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(64,38);g.lineTo(64,104);g.moveTo(44,54);g.lineTo(84,54);g.stroke();
    g.beginPath();g.arc(64,72,36,Math.PI*.1,Math.PI*.9);g.stroke();g.beginPath();g.moveTo(24,84);g.lineTo(22,66);g.lineTo(42,76);g.fill();g.beginPath();g.moveTo(104,84);g.lineTo(106,66);g.lineTo(86,76);g.fill();},
  flecha:g=>{g.lineWidth=11;g.beginPath();g.moveTo(64,114);g.lineTo(64,26);g.stroke();g.beginPath();g.moveTo(32,60);g.lineTo(64,22);g.lineTo(96,60);g.stroke();},
  corazon:g=>{g.beginPath();g.moveTo(64,110);g.bezierCurveTo(64,110,14,82,14,48);g.bezierCurveTo(14,30,28,18,44,18);g.bezierCurveTo(54,18,62,24,64,32);g.bezierCurveTo(66,24,74,18,84,18);g.bezierCurveTo(100,18,114,30,114,48);g.bezierCurveTo(114,82,64,110,64,110);g.fill();},
  estrella:g=>{g.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,r=i%2?17:(i%4?36:56);g.lineTo(64+Math.cos(a)*r,64+Math.sin(a)*r);}g.closePath();g.fill();},
  calavera:g=>{g.beginPath();g.arc(64,54,40,0,Math.PI*2);g.fill();g.fillRect(40,70,48,40);
    g.globalCompositeOperation='destination-out';g.beginPath();g.arc(48,56,11,0,6.3);g.arc(80,56,11,0,6.3);g.fill();g.beginPath();g.moveTo(64,66);g.lineTo(57,82);g.lineTo(71,82);g.fill();
    for(let i=0;i<4;i++)g.fillRect(49+i*10,96,4,14);g.globalCompositeOperation='source-over';},
  rayo:g=>{g.beginPath();[[78,6],[30,70],[58,70],[44,122],[100,50],[70,50]].forEach(q=>g.lineTo(q[0],q[1]));g.closePath();g.fill();},
  mira:g=>{g.beginPath();g.arc(64,64,38,0,Math.PI*2);g.stroke();g.beginPath();g.arc(64,64,10,0,6.3);g.fill();[[64,10,64,36],[64,92,64,118],[10,64,36,64],[92,64,118,64]].forEach(l=>{g.beginPath();g.moveTo(l[0],l[1]);g.lineTo(l[2],l[3]);g.stroke();});},
  corona:g=>{g.beginPath();[[16,98],[16,46],[42,72],[64,30],[86,72],[112,46],[112,98]].forEach(q=>g.lineTo(q[0],q[1]));g.closePath();g.fill();g.fillRect(16,102,96,12);[[16,40],[64,24],[112,40]].forEach(q=>{g.beginPath();g.arc(q[0],q[1],7,0,6.3);g.fill();});},
  escudo:g=>{g.beginPath();g.moveTo(64,8);g.lineTo(110,24);g.lineTo(110,62);g.bezierCurveTo(110,92,88,112,64,122);g.bezierCurveTo(40,112,18,92,18,62);g.lineTo(18,24);g.closePath();g.fill();
    g.globalCompositeOperation='destination-out';g.fillRect(61,24,6,84);g.fillRect(34,50,60,6);g.globalCompositeOperation='source-over';},
  alas:g=>{for(const sd of [-1,1])for(let i=0;i<5;i++){const a=-.7+i*.3,L=58-i*6;g.beginPath();g.moveTo(64+sd*8,72);g.lineTo(64+sd*(8+Math.cos(a)*L),72+Math.sin(a)*L);g.stroke();}g.beginPath();g.arc(64,72,9,0,6.3);g.fill();},
  espada:g=>{g.beginPath();[[64,4],[75,26],[75,86],[53,86],[53,26]].forEach(q=>g.lineTo(q[0],q[1]));g.closePath();g.fill();g.fillRect(30,86,68,10);g.fillRect(59,96,10,18);g.beginPath();g.arc(64,119,7,0,6.3);g.fill();},
  ninguno:()=>{}
};
const rbEmbTex={};
function rbEmblemaTex(id){
  id=RB_EMBLEMAS[id]?id:'ancla';
  if(!rbEmbTex[id])rbEmbTex[id]=new THREE.CanvasTexture(cv(128,128,g=>{g.fillStyle=g.strokeStyle='#fff';g.lineCap=g.lineJoin='round';g.lineWidth=9;RB_EMBLEMAS[id](g);}));
  return rbEmbTex[id];
}
// ---------- agarre del arma con las dos manos ----------
// Cada brazo es un IK de dos huesos: la mano derecha va a la empuñadura y la izquierda al guardamano de ESA arma (medidos sobre los modelos).
// Coordenadas en el espacio del arma (antes de achicarla). Cuchillo (7) y molotov (10) se sostienen con una mano.
const RB_EMP={0:[0,-.075,.0],1:[0,-.1,.12],2:[0,-.1,.1],3:[0,-.11,.1],4:[0,-.11,.05],5:[0,-.14,.04],6:[0,-.1,.08],7:[0,0,0],8:[0,-.09,.1],9:[0,-.09,.1],10:[0,.02,0]};
const RB_FORE={0:[0,-.1,-.04],1:[0,-.08,-.34],2:[0,-.08,-.3],3:[0,-.1,-.32],4:[0,-.13,-.24],5:[0,-.15,-.3],6:[0,-.1,-.34],8:[0,-.09,-.5],9:[0,-.08,-.5]};
const rbM=new THREE.Matrix4(),rbMB=new THREE.Matrix4(),rbQU=new THREE.Quaternion(),rbQF=new THREE.Quaternion();
function rbIK(arm,S,T,pole,up){
  const d0=T.clone().sub(S);let d=d0.length();const dir=d0.clone().divideScalar(d||1);
  d=Math.max(Math.abs(RB_L1-RB_L2)+.02,Math.min(RB_L1+RB_L2-.002,d));
  const a=(RB_L1*RB_L1-RB_L2*RB_L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,RB_L1*RB_L1-a*a));
  const p=pole.clone().addScaledVector(dir,-pole.dot(dir)).normalize();
  const E=S.clone().addScaledVector(dir,a).addScaledVector(p,h),Tc=S.clone().addScaledVector(dir,d);
  const yU=S.clone().sub(E).normalize();
  let n=E.clone().sub(S).cross(Tc.clone().sub(E));if(n.lengthSq()<1e-8)n.copy(p).cross(dir);n.normalize();
  const xU=n.addScaledVector(yU,-n.dot(yU)).normalize(),zU=xU.clone().cross(yU);
  rbQU.setFromRotationMatrix(rbMB.makeBasis(xU,yU,zU));arm.quaternion.copy(rbQU);
  const yF=E.clone().sub(Tc).normalize();let zF=up.clone().addScaledVector(yF,-up.dot(yF));if(zF.lengthSq()<1e-6)zF.set(0,0,1);zF.normalize();
  const xF=yF.clone().cross(zF);
  rbQF.setFromRotationMatrix(rbMB.makeBasis(xF,yF,zF));arm.fore.quaternion.copy(rbQU.clone().invert().multiply(rbQF));
}
const RB_POLE_L=new THREE.Vector3(.8,-.7,-.3),RB_POLE_R=new THREE.Vector3(-.8,-.7,-.3);   // el codo sale hacia afuera y abajo (+x es el lado izquierdo del personaje)
const RB_UP_L=new THREE.Vector3(.1,1,.2),RB_UP_R=new THREE.Vector3(1,.35,0);               // hacia dónde mira la palma: la izquierda abajo del guardamano, la derecha envuelve la empuñadura
// m = modelo de buildPlayer, w = arma, aimX = inclinación del arma (rad), swing = balanceo del brazo libre,
// pose = {p:[x,y,z], yaw} para sostenerla cruzada sobre el pecho (Taquilla); sin pose: en guardia, apuntando hacia adelante
function rbPose(m,w,aimX,swing,pose){
  const aim=m.aim,gun=m.gun,una=w===7||w===10;
  if(pose){aim.position.set(pose.p[0],pose.p[1],pose.p[2]);aim.rotation.set(aimX,pose.yaw,0);gun.position.set(0,0,0);}
  else{aim.position.set(-.1,1.46,0);aim.rotation.set(aimX,0,0);gun.position.set(0,0,.3);}
  aim.updateMatrix();gun.updateMatrix();rbM.multiplyMatrices(aim.matrix,gun.matrix);
  const e=RB_EMP[w]||RB_EMP[1],f=RB_FORE[w]||RB_FORE[1];
  const TR=new THREE.Vector3(e[0],e[1],e[2]).applyMatrix4(rbM),TL=new THREE.Vector3(f[0],f[1],f[2]).applyMatrix4(rbM);   // los dos objetivos, antes de tocar nada
  rbIK(m.armR,m.armR.position,TR,RB_POLE_R,RB_UP_R);
  if(una){m.armL.rotation.set(swing||0,0,.08);m.armL.fore.rotation.set(-.3,0,0);}
  else rbIK(m.armL,m.armL.position,TL,RB_POLE_L,RB_UP_L);
}
function buildPlayer(skin,name,noTag){
  const G=rbGeos(),P=skinParts(skin);
  const mA=rbMat(P.ck,.38,.35),mP=rbMat(P.cp,.58,.08,.4),mBr=P.cb===P.c?mA:rbMat(P.cb,.38,.35),mL=P.cl===P.c?mA:rbMat(P.cl,.38,.35);
  const mB=rbMat(P.c2,.32,.65),mC=rbMat(P.c3,.4,.45),mK=rbMat(0x2b3036,.3,.85,.9);
  const mV=new THREE.MeshBasicMaterial({color:P.v});
  const mats=(a)=>({A:a,B:mB,C:mC,V:mV,K:mK});
  const parte=(set,grupo,a)=>{const MZ=mats(a||mA);RB_ZONAS.forEach(k=>{if(set[k])grupo.add(new THREE.Mesh(set[k],MZ[k]));});return grupo;};
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);
  parte(G.torso,b,mP);parte(G.pelvis,b,mL);
  // imagen del pecho (o el ancla de origen): un plano cuadrado pegado unos 3 mm adelante de la placa
  const hasImg=!!(skin.img&&(noTag||S.showImg)),em=RB_EMBLEMAS[skin.em]?skin.em:'ancla';
  const dm=hasImg?new THREE.MeshBasicMaterial({map:chestTex(skin.img),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
                 :new THREE.MeshBasicMaterial({map:rbEmblemaTex(em),color:P.ce,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const dec=new THREE.Mesh(G.acc.decal,dm);dec.position.set(0,1.47,.137);if(hasImg)dec.scale.setScalar(1.6);
  if(hasImg||em!=='ninguno')b.add(dec);   // el emblema es chico; una foto propia va más grande
  const legs=[-1,1].map(side=>{const l=parte(side<0?G.legL:G.legR,new THREE.Group(),mL);l.position.set(side*.108,.93,0);b.add(l);return l;});
  const head=parte(G.head,new THREE.Group(),mA);head.position.y=1.76;b.add(head);
  const a=skin.a|0,A=G.acc;
  if(a===1)head.add(new THREE.Mesh(A.cresta,mC));
  if(a===2)head.add(new THREE.Mesh(A.antena.B,mB),new THREE.Mesh(A.antena.K,mK),new THREE.Mesh(A.antenaPunta,mC));
  if(a===3)head.add(new THREE.Mesh(A.cuernos,mC));
  if(a===4)head.add(new THREE.Mesh(A.gorra,mA));
  const brazo=side=>{const up=parte(side<0?G.armLu:G.armRu,new THREE.Group(),mBr);up.position.set(side*.21,1.5,0);
    const fo=parte(side<0?G.armLf:G.armRf,new THREE.Group(),mBr);fo.position.set(0,RB_CODO,0);up.add(fo);up.fore=fo;b.add(up);return up;};
  // +x es el lado izquierdo del personaje (mira hacia +z)
  const armL=brazo(1),armR=brazo(-1);
  // el arma cuelga de un pivote a la altura del pecho (aim) y las dos manos van a buscarla con IK (ver rbPose)
  const aim=new THREE.Group();aim.position.set(-.1,1.46,0);b.add(aim);
  const gun=new THREE.Group();gun.position.set(0,0,.3);gun.rotation.y=Math.PI;gun.scale.setScalar(.72);aim.add(gun);
  if(noTag){gun.add(tpGun(1));gun.userData.w=1;}
  let tag=null;if(!noTag){tag=nameSprite(name,P.c);g.add(tag);}
  const bas=[mV];if(hasImg||em!=='ninguno')bas.push(dm);   // materiales que brillan solos (de noche se apagan, ver 18-noche.js)
  const modelo={g,b,legs,armL,armR,aim,head,gun,tag,mats:[mA,mP,mBr,mL,mB,mC,mK],bas};
  rbPose(modelo,noTag?1:0,-.05,0,noTag?RB_POSE_TAQ:null);
  return modelo;
}
// pose de la Taquilla (como en la referencia): la escopeta cruzada sobre el pecho, apuntando hacia el lado izquierdo del personaje
const RB_POSE_TAQ={p:[-.08,1.25,.19],yaw:1.3};

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
    fin:(rotX,kx,kz,ky)=>{const o={};RB_ZONAS.forEach(k=>{if(z[k].length){o[k]=rbJuntar(z[k]);if(rotX)o[k].rotateX(rotX);if(kx||kz||ky)o[k].scale(kx||1,ky||1,kz||1);}});return o;}
  };
}
// perfil de un loft a una altura (interpolación lineal): sirve para pegar juntas y bandas justo sobre la superficie
function rbPerfil(S,y){
  for(let i=0;i<S.length-1;i++){const a=S[i],b=S[i+1];if(y>=a[0]&&y<=b[0]){const t=(y-a[0])/(b[0]-a[0]);return [0,1,2,3,4].map(j=>(a[j]||0)+((b[j]||0)-(a[j]||0))*t);}}
  return S[S.length-1].slice();
}
const RB_KX=1.13,RB_KYP=.957;   // grosor del cuerpo (13 % más ancho y profundo, así es más fácil de ver y apuntar) y largo de piernas (para no pasarnos de altura)
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
  const U=t.fin(0,RB_KX,RB_KX),F=u.fin(0,RB_KX,RB_KX);
  Object.keys(F).forEach(k=>F[k].translate(0,-RB_CODO,0));                                    // la parte F queda centrada en el codo
  return {U,F};
}
// pierna articulada en tres piezas (muslo → rodilla → canilla → tobillo → pie) para poder animarla; la cadena de remaches y las luces
// van del lado de afuera (por eso hay izquierda y derecha). Se arma con coordenadas de cadera y cada pieza se recentra en su articulación.
function rbPierna(s){
  const t=rbParte(),u=rbParte(),f=rbParte();
  t.esf('B',.065,0,-.005,0,1,1,1,8,6);                                                        // cadera
  t.loft('A',[[0,.1,.105],[-.08,.112,.116,0,.006],[-.2,.104,.112,0,.01],[-.34,.08,.088,0,.006],[-.44,.06,.068,0,.004]],12,1);   // muslo con cuádriceps
  t.esf('A',.05,s*.03,-.18,.075,1,2.2,.5,6,5);                                                // vasto externo
  t.banda('B',-.1,.122,.128,.014,.006,2.2);                                                   // junta del muslo
  [[-.06,.111],[-.16,.108],[-.26,.097],[-.36,.078],[-.43,.062]].forEach(q=>t.caja('B',.014,.03,.016,.005,1,s*q[1],q[0],-.012));   // cadena de remaches
  t.caja('V',.012,.25,.012,.005,1,s*.06,-.22,.095);                                           // luz del frente del muslo
  t.cil('B',.05,.05,.12,10,0,-.465,0,0,0,Math.PI/2);                                          // bisagra de la rodilla
  t.esf('B',.062,0,-.465,0,1,1,1,8,6);
  [-1,1].forEach(q=>t.cil('B',.01,.01,.15,6,q*.032,-.46,-.075));                              // pistones atrás de la rodilla
  u.caja('C',.1,.085,.05,.022,2,0,-.465,.06);u.caja('B',.06,.008,.02,.003,1,0,-.44,.082);     // rodillera de color y su filo
  u.loft('A',[[-.5,.064,.07],[-.56,.076,.084,0,-.012,2.4],[-.68,.074,.08,0,-.008,2.5],[-.8,.066,.076,0,0,2.5],[-.865,.064,.074,0,0,2.5]],10,1);   // bota con pantorrilla
  u.banda('A',-.525,.082,.09,.055,0,2.3);                                                     // puño de la bota
  u.caja('A',.09,.22,.026,.012,1,0,-.69,.088);                                                // placa del frente de la bota
  [-.64,-.72,-.8].forEach(y=>u.caja('B',.07,.006,.01,.003,1,0,y,.1));                         // costuras
  [-.62,-.7,-.78].forEach(y=>u.caja('B',.012,.024,.014,.005,1,s*.077,y,0));                   // remaches de la bota
  u.caja('V',.011,.15,.012,.005,1,s*.058,-.67,.056);                                          // luz del costado de la bota
  u.loft('B',[[-.835,.045],[-.845,.053],[-.855,.045],[-.865,.053],[-.875,.045],[-.89,.052]],10,1);   // fuelle del tobillo
  f.caja('A',.13,.066,.26,.032,2,0,-.884,.055);                                               // pie
  f.caja('A',.11,.05,.07,.024,1,0,-.89,.175);                                                 // puntera
  f.caja('B',.1,.04,.08,.014,1,0,-.908,-.068);                                                // taco
  f.caja('B',.136,.016,.29,.007,1,0,-.912,.05);                                               // suela
  const T=t.fin(0,RB_KX,RB_KX,RB_KYP),S=u.fin(0,RB_KX,RB_KX,RB_KYP),F=f.fin(0,RB_KX,RB_KX,RB_KYP);
  Object.keys(S).forEach(k=>S[k].translate(0,.465*RB_KYP,0));                                 // la canilla gira alrededor de la rodilla
  Object.keys(F).forEach(k=>F[k].translate(0,.875*RB_KYP,0));                                 // el pie gira alrededor del tobillo
  return {T,S,F};
}
// accesorios hechos a medida del casco (coordenadas ya a escala 0,78, origen = centro del casco)
function rbAccesorios(){
  const domo=z=>.022+.098*Math.sqrt(Math.max(0,1-(z/.095)*(z/.095)));   // altura de la tapa del casco a lo largo de z
  let t=rbParte();   // cresta: aleta que sigue la curva del casco, de adelante hacia atrás
  const sec=[-.085,-.055,-.02,.02,.055,.08].map(z=>{const hh=.016+.02*Math.max(0,1-Math.abs(z+.005)/.1);return [z,.009,hh,0,-(domo(z)+hh*.3)];});
  t.loft('C',sec,8,1,0,0,0,Math.PI/2);
  const A={cresta:t.fin().C};
  t=rbParte();       // cuernos curvos hacia afuera, apoyados sobre el domo
  for(const sx of [-1,1])t.loft('C',[[0,.017,.017,0,0],[.03,.013,.013,sx*.012],[.06,.007,.007,sx*.03],[.085,.001,.001,sx*.052]],8,1,sx*.05,.088,.0,.15,0,-sx*.45);
  A.cuernos=t.fin().C;
  t=rbParte();       // antena: base, varilla y bolita; sale del costado derecho
  t.cil('B',.017,.017,.012,8,.09,.05,-.03,0,0,Math.PI/2);
  t.cil('K',.005,.005,.09,6,.096,.095,-.03,0,0,-.18);
  A.antena=t.fin();
  t=rbParte();t.esf('C',.015,.102,.142,-.03,1,1,1,8,6);A.antenaPunta=t.fin().C;
  t=rbParte();       // gorra: tapa que abraza el casco por encima del visor y visera adelante
  t.loft('A',[[.035,.1,.102],[.065,.092,.094],[.09,.074,.078],[.106,.048,.052],[.116,.008,.009]],14,1);
  t.caja('A',.17,.012,.085,.005,1,0,.04,.105,.12);
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
  R.pelvis=t.fin(0,RB_KX,RB_KX);
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
  for(const sx of [-1,1])t.caja('A',.05,.016,.1,.006,1,sx*.098,1.57,0,0,0,-sx*.42);                                                                 // lengüetas sobre los hombros (como en la lámina)
  // cuello largo y acanalado de 7 segmentos (como en la lámina de la cabeza), con brida de montaje en la base y dos cables por delante
  const cu=[];for(let k=0;k<=7;k++){const r=.076-.012*(k/7);cu.push([1.555+k*.0108,r*.82,r*.82,0,.012,2.2]);if(k<7)cu.push([1.555+(k+.5)*.0108,r,r,0,.012,2.2]);}
  t.loft('B',cu,12,1);
  t.cil('B',.086,.086,.012,12,0,1.553,.012);t.cil('K',.082,.082,.006,12,0,1.56,.012);
  t.loft('A',[[1.34,.13,.03,0,-.105,2.6],[1.45,.16,.042,0,-.122,2.6],[1.55,.12,.03,0,-.108,2.6]],12,1);                                               // placa de la espalda
  for(let i=0;i<4;i++)t.caja('B',.05,.03,.03,.01,1,0,1.33+i*.06,-.166);                                                                               // vértebras
  // mochila de energía (como en las escenas): caja redondeada con luces, rejillas, antena y mangueras a la cintura
  t.caja('A',.25,.3,.1,.04,2,0,1.4,-.2);t.caja('C',.2,.03,.104,.012,1,0,1.5,-.2);t.caja('C',.2,.03,.104,.012,1,0,1.3,-.2);
  t.caja('V',.012,.2,.01,.004,1,-.07,1.4,-.255);t.caja('V',.012,.2,.01,.004,1,.07,1.4,-.255);
  for(let i=0;i<4;i++)t.caja('K',.1,.008,.01,.003,1,0,1.34+i*.04,-.255);
  t.cil('K',.006,.006,.12,6,.09,1.6,-.2);t.esf('C',.012,.09,1.665,-.2,1,1,1,6,4);
  R.torso=t.fin();
  // cabeza de la lámina CUE-87 (origen en el centro, tamaño final): domo liso y alto, visor plano de punta a punta con marco,
  // dos sensores redondos a cada lado, cuernito central y líneas finas de armado; el cuello largo va en el torso
  t=rbParte();
  const HS=[[-.108,.044,.046,0,0,2],[-.098,.054,.058,0,0,2],[-.08,.064,.068,0,.004,2.1],[-.055,.068,.073,0,.006,2.2],[-.03,.085,.087,0,.004,2.2],[-.005,.096,.097,0,0,2.2],[.025,.099,.099,0,-.002,2.2],[.055,.094,.095,0,-.004,2.2],[.083,.082,.085,0,-.005,2.1],[.103,.06,.064,0,-.005,2],[.114,.03,.032,0,-.005,2],[.12,.006,.007,0,-.005,2]];
  t.loft('A',HS,20,2);
  const sup=(y,th,m)=>{const q=rbPerfil(HS,y),e=2/2.1,c=Math.cos(th),sn=Math.sin(th);return new THREE.Vector3(q[3]+(q[1]+m)*rbPot(c,e),y,q[4]+(q[2]+m)*rbPot(sn,e));};
  const hilo=(pts,sx)=>t.crudo('B',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(q=>{const v=sup(q[0],q[1]*Math.PI/180,.0016);v.x*=sx;return v;})),10,.0026,4));
  for(const sx of [-1,1]){
    hilo([[.112,84],[.085,66],[.055,45],[.022,30]],sx);                                              // arco de la frente hacia el extremo del visor
    hilo([[-.03,34],[-.058,46],[-.086,66],[-.102,82]],sx);                                          // línea de la mandíbula hacia el mentón
    t.cil('B',.03,.03,.012,12,sx*.097,-.016,-.034,0,0,Math.PI/2);t.cil('K',.017,.017,.016,10,sx*.1,-.016,-.034,0,0,Math.PI/2);   // sensor grande del costado
    t.cil('B',.0145,.0145,.01,10,sx*.099,-.006,.03,0,0,Math.PI/2);t.cil('K',.008,.008,.014,8,sx*.103,-.006,.03,0,0,Math.PI/2);   // sensor chico en el extremo del visor
  }
  t.cono('C',.009,.026,0,.132,-.005,-.15,0,0);                                                     // cuerno central chico
  const visor=(h,y,ex)=>new THREE.CylinderGeometry(1,1,h,22,1,true,-1.3,2.6).scale(.099+ex,1,.103+ex).translate(0,y,0);
  t.crudo('V',visor(.019,-.003,0));t.crudo('B',visor(.006,.0125,.003));t.crudo('B',visor(.006,-.0185,.003));   // franja luminosa fina y su marco
  R.head=t.fin();
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
    for(let i=0;i<22;i++){g.strokeStyle=rnd()<.5?'rgba(40,40,40,.4)':'rgba(220,220,220,.35)';g.lineWidth=.6;g.beginPath();const x=rnd()*256,y=rnd()*256,a=rnd()*3.14,l=8+rnd()*40;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
    for(let i=0;i<10;i++){g.fillStyle='rgba(30,30,30,.4)';g.beginPath();g.arc(rnd()*256,rnd()*256,1+rnd()*2.2,0,6.3);g.fill();}
  });
  rbMapT=mk(g=>{
    g.fillStyle='#fff';g.fillRect(0,0,256,256);
    for(let i=0;i<140;i++){const r=8+rnd()*30,x=rnd()*256,y=rnd()*256,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(60,45,35,'+(.02+rnd()*.05)+')');gr.addColorStop(1,'rgba(60,45,35,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
    for(let i=0;i<10;i++){g.strokeStyle='rgba(50,40,30,.06)';g.lineWidth=1;g.beginPath();const x=rnd()*256,y=rnd()*256;g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*8,y+10+rnd()*40);g.stroke();}
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
function rbPose(m,w,aimX,swing,pose,ex){
  const aim=m.aim,gun=m.gun,una=w===7||w===10;
  if(pose){aim.position.set(pose.p[0],pose.p[1],pose.p[2]);aim.rotation.set(aimX,pose.yaw,0);gun.position.set(0,0,0);}
  else{aim.position.set(-.1,1.46,0);aim.rotation.set(aimX,0,0);gun.position.set(0,0,.3);}
  if(ex){aim.position.x+=ex.dx;aim.position.y+=ex.dy;aim.position.z+=ex.dz;aim.rotation.y+=ex.yaw;aim.rotation.z+=ex.roll;}   // retroceso, vaivén de la marcha y cambio de arma
  aim.updateMatrix();gun.updateMatrix();rbM.multiplyMatrices(aim.matrix,gun.matrix);
  const e=RB_EMP[w]||RB_EMP[1],f=RB_FORE[w]||RB_FORE[1];
  const TR=new THREE.Vector3(e[0],e[1],e[2]).applyMatrix4(rbM),TL=new THREE.Vector3(f[0],f[1],f[2]).applyMatrix4(rbM);   // los dos objetivos, antes de tocar nada
  rbIK(m.armR,m.armR.position,TR,RB_POLE_R,RB_UP_R);
  if(una){m.armL.rotation.set(swing||0,0,.08);m.armL.fore.rotation.set(-.3,0,0);}
  else rbIK(m.armL,m.armL.position,TL,RB_POLE_L,RB_UP_L);
}
// ================= ANIMACIÓN =================
// Todo se calcula en el cliente a partir de lo que ya llega de cada jugador (velocidad, si está en el suelo, agachado, mira, disparo, daño y arma).
// Esqueleto: b → pelv (cadera: piernas con rodilla y pie) y up (columna: torso, cabeza, brazos y arma). Las piernas se apoyan en el piso: la cadera baja
// lo justo para que el pie más bajo toque el suelo, así el balanceo del cuerpo, el agachado y el aterrizaje salen solos de los ángulos.
const RB_PM=.465*RB_KYP,RB_PC=.41*RB_KYP,RB_HF=.055*RB_KYP,RB_HIP=.93*RB_KYP;   // muslo, canilla, alto del pie y altura de la cadera
const rbCl=(v,a,b)=>v<a?a:v>b?b:v,rbLe=(a,b,t)=>a+(b-a)*t,rbSm=t=>t*t*(3-2*t);
const RB_TPDZ={0:.1,1:.07,2:.07,3:.08,4:.08,5:.06,6:.07,7:.08,8:.04,9:.04,10:.06};   // cuánto se adelanta cada arma en la vista propia en tercera persona (las largas casi nada: la mano no llega)
const RB_THR=.85;   // segundos que dura el lanzamiento de la molotov
const RB_RETRO={0:.05,1:.17,2:.22,3:.035,4:.13,5:.22,6:.045,7:0,8:.2,9:.13,10:0};   // cuánto patea cada arma al disparar
const rbE=new THREE.Euler(),rbV=new THREE.Vector3();
// gira un grupo alrededor de un punto (px,py,pz) y lo deja en (bx,by,bz) más el desplazamiento que corresponde al pivote
function rbPivote(g,bx,by,bz,px,py,pz,rx,ry,rz){
  rbE.set(rx,ry,rz,'XYZ');g.quaternion.setFromEuler(rbE);rbV.set(px,py,pz).applyQuaternion(g.quaternion);
  g.position.set(bx+px-rbV.x,by+py-rbV.y,bz+pz-rbV.z);
}
function rbAnInit(){return {t:Math.random()*20,ph:0,mov:0,air:0,cro:0,wasG:true,vyU:0,leader:1,takeoff:0,land:0,landAmt:0,flinch:0,fdir:1,swap:0,lastW:-1,fireK:0,lastFire:0,
  vf:0,vs:0,vfp:null,vsp:null,af:0,as:0,yp:null,turn:0,muerte:0,dd:-1,dz:1};}
// m = modelo, p = jugador (velocidades suavizadas vxs/vzs, yaw, pitch, onG, vy, crouch, fire, pain, w), dt, pose (Taquilla)
function rbAnimar(m,p,dt,pose){
  dt=rbCl(dt,1e-4,.05);const a=m.an;a.t+=dt;a.muerte=0;m.gun.visible=true;
  const yw=p.yaw||0,sy=Math.sin(yw),cy=Math.cos(yw),vx=p.vxs||0,vz=p.vzs||0;
  const fwd=-vx*sy-vz*cy,side=vx*cy-vz*sy,spd=Math.hypot(vx,vz),k10=Math.min(1,dt*10);
  a.vf+=(fwd-a.vf)*k10;a.vs+=(side-a.vs)*k10;
  if(a.vfp!=null){a.af+=(rbCl((a.vf-a.vfp)/dt,-60,60)-a.af)*Math.min(1,dt*6);a.as+=(rbCl((a.vs-a.vsp)/dt,-60,60)-a.as)*Math.min(1,dt*6);}
  a.vfp=a.vf;a.vsp=a.vs;
  let dy=a.yp==null?0:yw-a.yp;if(dy>Math.PI)dy-=2*Math.PI;if(dy<-Math.PI)dy+=2*Math.PI;a.yp=yw;a.turn+=(rbCl(dy/dt,-8,8)-a.turn)*Math.min(1,dt*6);
  // ---- estados: aire, agachado, despegue, aterrizaje ----
  const air=!p.onG,vy=p.vy||0;
  if(a.wasG&&air&&vy>1.5){a.takeoff=1;a.leader=Math.abs(a.vs)>1.5?(a.vs>0?-1:1):-a.leader;}   // despega con la pierna de adelante alternada (o hacia donde se mueve)
  if(!a.wasG&&!air){a.landAmt=rbCl(-a.vyU/13,.15,1);a.land=1;}
  a.wasG=!air;if(air)a.vyU=vy;
  a.takeoff=Math.max(0,a.takeoff-dt/.45);a.land=Math.max(0,a.land-dt/.4);
  a.air+=((air?1:0)-a.air)*Math.min(1,dt*(air?18:24));
  a.cro+=((p.crouch?1:0)-a.cro)*Math.min(1,dt*11);
  a.mov+=(rbCl(spd/6,0,1)-a.mov)*Math.min(1,dt*9);
  // ---- disparo, daño y cambio de arma ----
  const fire=p.fire||0;if(fire>0&&a.lastFire<=0)a.fireK=1;a.lastFire=fire;a.fireK*=Math.exp(-dt*13);
  if(fire>0&&p.w===10&&!(a.thr>0))a.thr=.001;                                                                                 // molotov: arranca el lanzamiento (carga, tira, agarra otra)
  if(a.thr>0){a.thr+=dt/RB_THR;if(a.thr>=1||p.w!==10)a.thr=0;}
  if((p.pain||0)>0&&a.flinch<.5){a.flinch=1;a.fdir=Math.random()<.5?-1:1;}a.flinch=Math.max(0,a.flinch-dt/.32);
  if(p.w!==a.lastW){if(a.lastW>=0)a.swap=1;a.lastW=p.w;}a.swap=Math.max(0,a.swap-dt/.42);
  // ---- marcha / carrera ----
  const run=rbCl((spd-3.5)/4,0,1),A=rbCl(.22+spd*.028,.22,.42)*(1-.35*a.cro);
  const om=spd>.3?Math.min(15,spd/(.89*A*.8)):0;a.ph+=(a.vf<-.5?-1:1)*om*dt;
  const w=a.mov*(1-a.air),back=a.vf<-.5?.8:1,sr=rbCl(a.vs/Math.max(spd,2),-1,1);
  const bump=a.land>0?(a.land>.7?(1-a.land)/.3:(a.land/.7)):0,aterr=bump*a.landAmt;   // se hunde rápido al tocar el piso y se recupera
  const rise=rbCl(vy/6,0,1),fall=rbCl(-vy/9,0,1),apex=Math.max(0,1-rise-fall),t0=rbCl((a.takeoff-.65)/.35,0,1);
  const hip=[0,0],kn=[0,0],ab=[0,0];
  for(let i=0;i<2;i++){
    const psi=a.ph+i*Math.PI,s1=Math.sin(psi);
    let h=A*s1*w*back,kk=w*(.1+(.7+.9*run)*Math.pow(Math.max(0,Math.cos(psi+.35)),1.3))+.12*w*Math.max(0,-s1),z=-sr*.38*s1*w;   // paso, rodilla y apertura al moverse de costado
    const lead=i===(a.leader>0?1:0);
    let ha=lead?.85*rise+.65*apex+.35*fall:.1*rise-.1*apex-.15*fall,ka=lead?1.35*rise+1*apex+.4*fall:.95*rise+.7*apex+.25*fall;   // en el aire: una pierna adelante y la otra atrás, recogidas al subir y estiradas al bajar
    ha=ha*(1-t0)-.1*t0;ka=ka*(1-t0)+.12*t0;                                                                                   // estirón del despegue
    h=rbLe(h,ha,a.air);kk=rbLe(kk,ka,a.air);z*=1-a.air;
    h+=.5*aterr;kk+=1.15*aterr;                                                                                                 // amortigua el aterrizaje
    h=h*(1-.55*a.cro)+1.05*a.cro;kk=kk*(1-.4*a.cro)+2.0*a.cro;                                                                 // agachado profundo (y se puede caminar así)
    kk+=.1*a.fireK*(RB_RETRO[p.w]>0.1?1:.5);                                                                                    // las armas pesadas se apoyan en las rodillas
    hip[i]=h;kn[i]=kk;ab[i]=z;
  }
  let need=0;
  for(let i=0;i<2;i++){
    const th=-hip[i],sh=kn[i],lg=m.legs[i],swing=Math.max(0,Math.cos(a.ph+i*Math.PI+.35));
    const ft=rbCl(-(th+sh)*rbLe(1-.7*swing*w,.15,a.air),-1.1,1.1);   // el pie se mantiene paralelo al piso apoyado y apunta hacia abajo en el aire
    lg.rotation.set(th,0,ab[i]);lg.shin.rotation.x=sh;lg.foot.rotation.x=ft;
    const d=RB_PM*Math.cos(th)+RB_PC*Math.cos(th+sh)+RB_HF*Math.cos(th+sh+ft);if(d>need)need=d;
  }
  const t=a.t,idle=(1-a.mov)*(1-a.air),s0=Math.sin(a.ph);
  // ---- cadera y columna ----
  const lean=.03+.14*run*w+rbCl(a.af*.012,-.1,.18)*(1-a.air*.6)+.32*a.cro+.24*aterr-.09*a.takeoff-.07*rise+Math.sin(t*1.6)*.012*idle;    // se inclina al acelerar, al correr y al agacharse; respira
  const roll=a.vs*.014*(1-.4*a.air)+rbCl(a.as*.004,-.1,.1)+a.turn*.035-.5*.05*s0*w+Math.sin(t*.5)*.03*idle;                                  // se inclina hacia donde se mueve y gira
  const twist=-.7*.16*Math.sin(a.ph)*w*(.5+run)+a.flinch*a.fdir*.22+Math.sin(t*.37)*.05*idle;                                                // la columna contrarresta la cadera
  rbPivote(m.pelv,0,0,0,0,RB_HIP,0,.03+.05*run*w+.1*a.cro,.16*Math.sin(a.ph)*w*(.5+run),.05*s0*w+Math.sin(t*.5)*.03*idle);
  rbPivote(m.up,0,-.04,0,0,1.06,0,lean-.22*a.flinch+.03*a.fireK*RB_RETRO[p.w]*4,twist,roll+a.flinch*a.fdir*.1);
  m.b.rotation.set(0,0,0);
  m.b.position.set(-.02*s0*w+Math.sin(t*.5)*.015*idle,(need-RB_HIP)*(1-a.air),0);   // el cuerpo baja lo que haga falta para que el pie más bajo toque el piso
  // ---- cabeza: sigue la mira, compensa la columna y mira alrededor en reposo ----
  m.head.rotation.set(-(p.pitch||0)*.5-(lean-.22*a.flinch)*.55-.12*a.flinch-(vy>0?-vy*.01:-vy*.008),Math.sin(t*.4)*.14*idle-a.flinch*a.fdir*.1,-roll*.5);
  // ---- arma: retroceso, vaivén de la marcha, respiración y cambio de arma ----
  const rt=RB_RETRO[p.w]||0,sw=a.swap*a.swap;
  const tpx=p.tp?-.05:0,tpy=p.tp?.06:0,tpz=p.tp?(RB_TPDZ[p.w]!=null?RB_TPDZ[p.w]:.1):0;   // tercera persona propia: el arma sale hacia adelante y al costado del cuerpo para que se vea desde atrás
  const ex={dx:.012*Math.sin(a.ph)*w+tpx,dy:.014*Math.abs(Math.sin(a.ph))*w*(.5+run)*-1+.004*Math.sin(t*1.6)*idle-.3*sw-.05*a.cro+tpy,dz:-rt*.45*a.fireK-.03*run*w+tpz,yaw:.03*Math.sin(a.ph)*w+.35*sw*.0,roll:.05*Math.sin(a.ph)*w+.4*sw};
  let aimX=-(p.pitch||0)*.8-rt*1.3*a.fireK-.12*rise+.1*fall+.5*sw;
  if(a.thr>0){   // molotov: 0–.28 la mano va atrás y arriba · .28–.45 brazo hacia adelante y suelta la botella · .45–.6 mano vacía · .6–1 saca otra y la sube
    const q=a.thr,cg=rbSm(rbCl(q/.28,0,1)),th=rbSm(rbCl((q-.28)/.17,0,1)),rc=rbSm(rbCl((q-.6)/.4,0,1));
    const k=cg*(1-th);                                                       // cuánto está cargado hacia atrás
    ex.dz+=-.3*k+.34*th*(1-rc);ex.dy+=.2*k-.1*th*(1-rc)-.3*(q>.45&&q<1?1-rc:0)*th;ex.dx+=.05*k;
    aimX+=-1.1*k+.9*th*(1-rc);
    m.thrHide=q>.4&&q<.62;
  }else m.thrHide=false;
  rbPose(m,p.w,aimX,Math.sin(a.ph)*.8*w-.6*a.air,pose,ex);
  m.gun.visible=!m.thrHide;   // en el lanzamiento de la molotov, la botella desaparece de la mano al soltarla y vuelve cuando saca otra
}
// nivel de detalle: lejos de la cámara no se dibujan los pistones, remaches ni luces chicas (ahorra unas 18 llamadas de dibujo por personaje)
function rbLod(m,lejos){if(m.lod===lejos)return;m.lod=lejos;m.fino.forEach(x=>{x.visible=!lejos;});}
// muerte: las rodillas se doblan, el cuerpo cae (para atrás casi siempre), los brazos quedan sueltos y el arma se resbala
function rbMuerte(m,p){
  const a=m.an,t=p.deadT||0;
  if(!a.muerte){a.muerte=1;a.dd=Math.random()<.7?-1:1;a.dz=Math.random()<.5?-1:1;}
  const k1=rbSm(rbCl(t/.3,0,1)),fl=rbSm(rbCl((t-.12)/.7,0,1)),sink=t>2?Math.max(-.3,-(t-2)*.3):0;
  m.b.rotation.set(a.dd*1.5*fl,0,a.dz*.22*fl);m.b.position.set(0,-.3*k1*(1-fl)+.16*fl+sink,0);
  m.legs.forEach((lg,i)=>{lg.rotation.set(-(i?.5:.9)*k1*(1-fl*.6),0,(i?.5:-.4)*fl*.4);lg.shin.rotation.x=(i?1:1.6)*k1;lg.foot.rotation.x=-.3*k1;});
  rbPivote(m.pelv,0,0,0,0,RB_HIP,0,0,0,0);rbPivote(m.up,0,-.04,0,0,1.06,0,.45*k1*(1-fl)-.1*fl,a.dz*.2*fl,0);
  m.head.rotation.set(.5*fl+.2*k1,a.dz*.3*fl,0);
  m.armR.rotation.set(-.3-.9*fl,0,-.4-.6*fl);m.armR.fore.rotation.set(-.5,0,0);m.armL.rotation.set(-.2+.5*fl,0,.5+.6*fl);m.armL.fore.rotation.set(-.4,0,0);
  m.aim.position.set(-.1,1.46-.5*fl,.1+.2*fl);m.aim.rotation.set(1.0*fl,0,.5*fl);m.gun.position.set(0,0,.3);m.gun.visible=t<1.4;
}
// manos y antebrazos en primera persona: toman los colores de brazos (cb), articulaciones (c2), detalles (c3) y visor (v) del jugador; en equipos, el color del equipo
let vmClave='';
function vmSync(){
  const eq=teamsMode()&&myTeam>=0,sk=eq?Object.assign({},S.skin,{c:colorOf(myId),ck:null,cp:null,cb:null,cl:null}):S.skin;
  const k=[sk.c,sk.cb,sk.c2,sk.c3,sk.v].join('|');if(k===vmClave)return;vmClave=k;
  const P=skinParts(sk);
  [[mGlove,P.cb],[mSleeve,P.cb],[mArmB,P.c2],[mArmC,P.c3]].forEach(([m,c])=>{m.color.set(c);
    if(!m.envMap){m.envMap=rbEnv();rbDesgaste();m.map=rbMapT;m.bumpMap=rbBumpT;m.bumpScale=.003;m.envMapIntensity=.7;m.needsUpdate=true;}});
  mArmV.color.set(P.v);
}
// propio = el modelo del propio jugador en tercera persona (se anima como cualquier otro, no como la Taquilla)
function buildPlayer(skin,name,noTag,propio){
  const G=rbGeos(),P=skinParts(skin);
  const mA=rbMat(P.ck,.55,.1,.45),mP=rbMat(P.cp,.58,.08,.4),mBr=P.cb===P.c?mA:rbMat(P.cb,.38,.35),mL=P.cl===P.c?mA:rbMat(P.cl,.38,.35);
  const mB=rbMat(P.c2,.32,.65),mC=rbMat(P.c3,.4,.45),mK=rbMat(0x2b3036,.3,.85,.9);
  const mV=new THREE.MeshBasicMaterial({color:P.v});
  const mats=(a)=>({A:a,B:mB,C:mC,V:mV,K:mK});
  const fino=[];   // mallas de detalle fino (pistones, remaches y luces): a lo lejos se ocultan (ver rbLod)
  const parte=(set,grupo,a,sinLod)=>{const MZ=mats(a||mA);RB_ZONAS.forEach(k=>{if(set[k]){const me=new THREE.Mesh(set[k],MZ[k]);grupo.add(me);if(!sinLod&&(k==='K'||k==='V'))fino.push(me);}});return grupo;};
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);
  // esqueleto: b (cuerpo entero: sube, baja, cae) → pelv (cadera con las piernas) y up (columna con torso, cabeza, brazos y arma).
  // pelv y up giran alrededor de la cadera y la cintura (ver rbPivote). up queda 4 cm más abajo: las piernas son más cortas y así la altura total queda cerca de 1,9 m.
  const pelv=new THREE.Group();b.add(pelv);
  const up=new THREE.Group();up.position.y=-.04;b.add(up);
  const pel=parte(G.pelvis,new THREE.Group(),mL);pel.position.y=-.04;pelv.add(pel);
  parte(G.torso,up,mP);
  // emblema del pecho (o la foto): un plano pegado unos 3 mm adelante de la placa
  const hasImg=!!(skin.img&&(noTag||S.showImg)),em=RB_EMBLEMAS[skin.em]?skin.em:'ancla';
  const dm=hasImg?new THREE.MeshBasicMaterial({map:chestTex(skin.img),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
                 :new THREE.MeshBasicMaterial({map:rbEmblemaTex(em),color:P.ce,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const dec=new THREE.Mesh(G.acc.decal,dm);dec.position.set(0,1.47,.137*RB_KX);if(hasImg)dec.scale.setScalar(1.6);
  if(hasImg||em!=='ninguno')up.add(dec);   // el emblema es chico; una foto propia va más grande
  const pierna=side=>{
    const L=side<0?G.legL:G.legR,th=parte(L.T,new THREE.Group(),mL);th.position.set(side*.108*RB_KX,RB_HIP,0);
    const sh=parte(L.S,new THREE.Group(),mL);sh.position.set(0,-.465*RB_KYP,0);th.add(sh);
    const ft=parte(L.F,new THREE.Group(),mL);ft.position.set(0,-(.875-.465)*RB_KYP,0);sh.add(ft);
    th.shin=sh;th.foot=ft;pelv.add(th);return th;};
  const legs=[pierna(-1),pierna(1)];
  const head=parte(G.head,new THREE.Group(),mA,true);head.position.y=1.735;head.scale.setScalar(1.25);up.add(head);
  const a=skin.a|0,A=G.acc;
  if(a===1)head.add(new THREE.Mesh(A.cresta,mC));
  if(a===2)head.add(new THREE.Mesh(A.antena.B,mB),new THREE.Mesh(A.antena.K,mK),new THREE.Mesh(A.antenaPunta,mC));
  if(a===3)head.add(new THREE.Mesh(A.cuernos,mC));
  if(a===4)head.add(new THREE.Mesh(A.gorra,mA));
  const brazo=side=>{const ar=parte(side<0?G.armLu:G.armRu,new THREE.Group(),mBr);ar.position.set(side*.21*RB_KX,1.5,0);
    const fo=parte(side<0?G.armLf:G.armRf,new THREE.Group(),mBr);fo.position.set(0,RB_CODO,0);ar.add(fo);ar.fore=fo;up.add(ar);return ar;};
  // +x es el lado izquierdo del personaje (mira hacia +z)
  const armL=brazo(1),armR=brazo(-1);
  // el arma cuelga de un pivote a la altura del pecho (aim) y las dos manos van a buscarla con IK (ver rbPose)
  const aim=new THREE.Group();aim.position.set(-.1,1.46,0);up.add(aim);
  const gun=new THREE.Group();gun.position.set(0,0,.3);gun.rotation.y=Math.PI;gun.scale.setScalar(.72);aim.add(gun);
  if(noTag){gun.add(tpGun(1));gun.userData.w=1;}
  let tag=null;if(!noTag){tag=nameSprite(name,P.c);g.add(tag);}
  const bas=[mV];if(hasImg||em!=='ninguno')bas.push(dm);   // materiales que brillan solos (de noche se apagan, ver 18-noche.js)
  const modelo={g,b,pelv,up,legs,armL,armR,aim,head,gun,tag,mats:[mA,mP,mBr,mL,mB,mC,mK],bas,an:rbAnInit(),fino,lod:false};
  if(noTag&&!propio){modelo.pose=RB_POSE_TAQ;modelo.pT={vxs:0,vzs:0,yaw:0,onG:true,crouch:false,pitch:0,fire:0,pain:0,w:1,vy:0,alive:true};}   // la Taquilla respira y se acomoda sola
  rbPose(modelo,noTag?1:0,-.05,0,noTag&&!propio?RB_POSE_TAQ:null);
  rbAnimar(modelo,modelo.pT||{vxs:0,vzs:0,yaw:0,onG:true,crouch:false,pitch:0,fire:0,pain:0,w:0,vy:0},.016,modelo.pose);
  return modelo;
}
// pose de la Taquilla (como en la referencia): la escopeta cruzada sobre el pecho, apuntando hacia el lado izquierdo del personaje
const RB_POSE_TAQ={p:[-.08,1.25,.19],yaw:1.3};

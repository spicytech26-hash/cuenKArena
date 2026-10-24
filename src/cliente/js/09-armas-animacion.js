/* ===== manos y animaciones de las armas (inspiradas en Quake 3 Arena y TF2) =====
   Cada arma tiene un "rig": según el tiempo desde el último tiro (f) y el avance de la recarga (u, de 0 a 1) mueve sus piezas
   (bombeo, cargador, cerrojo, tambor, celda), mueve el arma entera y dice dónde va la mano izquierda (en coordenadas del arma)
   y qué lleva en la mano (un cartucho, un cohete, una granada). La mano derecha va fija en la empuñadura. */
function vHand(m,r){   // mano que envuelve un caño de radio r a lo largo de z: palma del lado -x, dedos por abajo y puntas del otro lado
  const h=new THREE.Group();r=r||.028;
  h.add(vRB(.024,.07,.088,.01,m,-r-.012,-.006,0));
  for(let k=0;k<4;k++){const z=-.031+k*.0205,l=.0185;
    h.add(vRB(.019,.026,l,.007,m,-r-.002,-r*.8-.006,z,0,0,.5));
    h.add(vRB(.03,.018,l,.007,m,0,-r-.011,z));
    h.add(vRB(.018,.024,l*.95,.007,m,r*.75+.004,-r*.55,z,0,0,-.8));}
  h.add(vRB(.018,.019,.052,.008,m,-r*.45,r*.85,-.016,0,.3,0),vRB(.036,.052,.042,.012,m,-r-.018,-.014,.058));
  return vMerge(h);}
const vArmGeo=(()=>{const g=new THREE.CylinderGeometry(.04,.032,1,10);g.rotateX(Math.PI/2);g.translate(0,0,.5);return g;})();
// mano derecha fija en la empuñadura de cada arma: posición, inclinación de la empuñadura y hacia dónde sale el brazo
const RH={0:[0,-.068,.044,1.27,.02],1:[0,-.048,.215,.25,.024],2:[0,-.046,.175,.25,.024],3:[0,-.078,.072,1.2,.02],4:[0,-.085,.068,1.25,.02],
  5:[0,-.125,.0,1.38,.02],6:[0,-.1,.065,1.23,.02],8:[0,-.075,.1,1.25,.02],9:[0,-.062,.13,1.2,.02]};
function vAddHands(i,g){const R_=RH[i];if(!R_)return;
  const rh=vGrp('rh');const hd=vHand(mGlove,R_[4]);
  // mano derecha = la izquierda en espejo, girada para envolver la empuñadura con la palma del lado derecho
  hd.scale.x=-1;hd.rotation.set(R_[3],0,0);rh.add(hd);
  const arm=new THREE.Mesh(vArmGeo,mSleeve);arm.position.set(.03,-.03,.05);arm.lookAt(.2,-.5,.45);arm.scale.set(1,1,.75);rh.add(arm);
  rh.position.set(R_[0],R_[1],R_[2]);g.add(rh);g.userData.rh=rh;g.userData.rh0=rh.position.clone();}
// mano izquierda: una sola, que el rig lleva a donde haga falta; con los objetos que puede llevar
const lhG=new THREE.Group(),lhHand=vHand(mGlove,.028);lhG.add(lhHand);
const lhArm=new THREE.Mesh(vArmGeo,mSleeve);
const lhHold={shell:vShellM(),shell2:vGrp('',vShellM(),vShellM()),rocket:vRocketM(),nade:vNadeM(),brass:vGrp(''),round:vGrp('',vT(.006,.006,.045,vBrass,0,0,.0,8),vCone(.0055,.016,vBrass,0,0,-.03,8))};
lhHold.shell2.children[0].position.x=-.012;lhHold.shell2.children[1].position.x=.014;
lhHold.rocket.position.set(0,.0,-.03);lhHold.rocket.scale.setScalar(1.25);lhHold.nade.position.set(.0,.0,-.0);
for(const k in lhHold){lhHold[k].visible=false;lhG.add(lhHold[k]);}
lhG.visible=lhArm.visible=false;wScene.add(lhG,lhArm);
const lhAnchor=new THREE.Vector3(-.36,-.62,.05),lhP=new THREE.Vector3(),lhW=new THREE.Vector3(),vQ=new THREE.Quaternion(),vE=new THREE.Euler(),vV=new THREE.Vector3();
// vainas y cartuchos que salen despedidos (en el espacio de la cámara)
const vEjects=[];
function vEject(g,pt,vel,kind){g.updateMatrixWorld(true);let e=vEjects.find(o=>!o.on&&o.kind===kind);
  if(!e){const m=kind==='shell'?vShellM():kind==='mag3'||kind==='cell'||kind==='mag0'?null:vGrp('',vT(.005,.005,.022,vBrass,0,0,0,8));if(!m)return;e={m,kind,on:false};wScene.add(m);vEjects.push(e);}
  e.on=true;e.t=0;e.m.visible=true;e.m.position.set(pt[0],pt[1],pt[2]).applyMatrix4(g.matrixWorld);e.v=new THREE.Vector3(vel[0]+R(.3),vel[1]+Math.random()*.4,vel[2]+R(.2));e.s=new THREE.Vector3(R(14),R(14),R(14));e.m.quaternion.copy(g.quaternion);}
function vUpdEjects(dt){for(const e of vEjects){if(!e.on)continue;e.t+=dt;if(e.t>.7){e.on=false;e.m.visible=false;continue;}e.v.y-=5.5*dt;e.m.position.addScaledVector(e.v,dt);e.m.rotation.x+=e.s.x*dt;e.m.rotation.y+=e.s.y*dt;e.m.rotation.z+=e.s.z*dt;}}
// ayudas de animación
const vss=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},vbump=(x,a,b)=>x>a&&x<b?Math.sin((x-a)/(b-a)*Math.PI):0;
function vKF(u,K){if(u<=K[0][0])return K[0][1];for(let k=1;k<K.length;k++)if(u<=K[k][0]){const a=K[k-1],b=K[k],e=vss((u-a[0])/((b[0]-a[0])||1));return a[1].map((v,j)=>v+(b[1][j]-v)*e);}return K[K.length-1][1];}
const vMix=(a,b,k)=>a.map((v,j)=>v+(b[j]-v)*k);
function vCyc(u,a,b,n){if(u<a||u>=b)return null;const x=(u-a)/(b-a)*n;return {i:Math.floor(x),c:x-Math.floor(x)};}
// cruzó el instante t entre el cuadro anterior y este (para sonidos y vainas)
const VEV={pu:-1,cu:-1,pf:9,cf:9,u(t){return this.pu<t&&this.cu>=t;},f(t){return this.pf<t&&this.cf>=t;},cyc(a,b,n,c){if(this.cu<a||this.cu>=b)return false;for(let k=0;k<n;k++){const t=a+(b-a)*(k+c)/n;if(this.u(t))return true;}return false;}};
const H={p:[0,0,0],rot:null,hold:null,show:true};
const VERT=[Math.PI/2,0,0];
function vEnv(u,a,b){return Math.min(vss(u/a),1-vss((u-(1-b))/b));}
function vGun(g,k,o){g.position.x+=o[0]*k;g.position.y+=o[1]*k;g.position.z+=o[2]*k;g.rotation.x+=o[3]*k;g.rotation.y+=o[4]*k;g.rotation.z+=o[5]*k;}
const VPR={0:[-.03,.04,0,.16,.2,.42],1:[-.16,.2,-.1,.55,.35,-.45],2:[-.05,.03,-.05,.34,.1,-.2],3:[-.05,.05,.02,.22,.18,-.5],4:[-.05,.05,.02,.28,.2,-.35],5:[.08,-.05,-.16,-.08,.8,-.15],6:[-.08,.14,-.04,.4,.2,-.4],8:[-.04,.04,.02,.16,.14,-.45],9:[-.06,.08,-.04,.3,.12,.55]};
// bolsillo: punto fuera de la pantalla (abajo a la izquierda, en el espacio de la cámara) de donde la mano saca cartuchos, cohetes y cargadores
const vPkM=new THREE.Matrix4(),vPkV=new THREE.Vector3();
function vPk(g){g.updateMatrix();vPkM.copy(g.matrix).invert();vPkV.set(-.24,-.44,-.24).applyMatrix4(vPkM);return [vPkV.x,vPkV.y,vPkV.z];}
// giro base de cada arma hacia el centro de la pantalla (así se ve su costado derecho)
const VYAW={0:.04,1:.1,2:.1,3:.09,4:.1,5:.08,6:.09,8:.07,9:.07};
const VROLL={0:0,1:.06,2:.06,3:.06,4:.06,5:.04,6:.06,8:.05,9:.05};
// aplica el rig del arma i; devuelve true si el arma usa manos nuevas
function vRig(i,g,u,f){const fn=vRigs[i];if(!fn)return false;const P=g.userData.parts;if(!P||!P.__ok)return false;H.hold=null;H.rot=null;fn(g,P,u,f);return true;}
function vHideHands(){lhG.visible=lhArm.visible=false;}
function vPlaceHand(g){
  if(!H.p){vHideHands();return;}
  g.updateMatrixWorld(true);lhP.set(H.p[0],H.p[1],H.p[2]).applyMatrix4(g.matrixWorld);
  lhG.position.copy(lhP);lhG.quaternion.copy(g.quaternion);if(H.rot){vQ.setFromEuler(vE.set(H.rot[0],H.rot[1],H.rot[2]));lhG.quaternion.multiply(vQ);}
  for(const k in lhHold)lhHold[k].visible=k===H.hold;
  lhG.visible=true;lhG.updateMatrixWorld(true);
  lhW.set(-.046,-.018,.075).applyMatrix4(lhG.matrixWorld);
  lhArm.position.copy(lhW);lhArm.lookAt(lhAnchor);lhArm.scale.set(1,1,Math.max(.05,lhW.distanceTo(lhAnchor)+.12));lhArm.visible=true;}

// piezas móviles por nombre y mano derecha en cada arma nueva
vms.forEach((g,i)=>{const P={};let n=0;g.traverse(o=>{if(o.name){P[o.name]=o;n++;}});P.__ok=n>0;g.userData.parts=P;vAddHands(i,g);});
/* ---- armas con textura de desgaste (segundo paso de los gráficos): rayones, manchas y bordes gastados en cada material,
   y un reflejo suave del entorno en los metales. Se dibuja una sola vez al cargar, así no cuesta rendimiento ---- */
(()=>{
  let sd=777;const rr=()=>{sd=(sd*16807)%2147483647;return (sd-1)/2147483646;};
  const wear=(kind)=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
    g.fillStyle='#fff';g.fillRect(0,0,64,64);
    for(let i=0;i<500;i++){const v=190+rr()*65|0;g.fillStyle='rgba('+v+','+v+','+v+',.7)';g.fillRect(rr()*64|0,rr()*64|0,1+rr()*2|0,1+rr()*2|0);}
    for(let i=0;i<(kind==='metal'?26:12);i++){g.strokeStyle='rgba(255,255,255,'+(.35+rr()*.4)+')';g.lineWidth=.6;g.beginPath();const x=rr()*64,y=rr()*64,a=rr()*6.28,l=4+rr()*14;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
    for(let i=0;i<14;i++){g.fillStyle='rgba(60,45,30,'+(.1+rr()*.12)+')';g.beginPath();g.arc(rr()*64,rr()*64,2+rr()*7,0,6.283);g.fill();}
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2;g.strokeRect(1,1,62,62);g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;g.strokeRect(3,3,58,58);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;};
  const env=(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,64);
    gr.addColorStop(0,'#c8c4bc');gr.addColorStop(.45,'#7a7064');gr.addColorStop(.55,'#4a4038');gr.addColorStop(1,'#1c1814');g.fillStyle=gr;g.fillRect(0,0,128,64);
    g.fillStyle='rgba(255,240,210,.7)';g.fillRect(20,10,22,6);g.fillRect(84,14,16,5);
    const t=new THREE.CanvasTexture(c);t.mapping=THREE.EquirectangularReflectionMapping;return t;})();
  const T={metal:wear('metal'),poly:wear('poly')},done=new Set();
  const isMetal=m=>(m.shininess||0)>=60;
  const apply=g=>g.traverse(o=>{if(!o.isMesh||!o.material||!o.material.isMeshPhongMaterial)return;const m=o.material;if(done.has(m))return;done.add(m);
    if(!m.map){m.map=isMetal(m)?T.metal:T.poly;}
    if(isMetal(m)){m.envMap=env;m.reflectivity=.22;m.combine=THREE.MixOperation;}
    m.needsUpdate=true;});
  vms.forEach(apply);
})();
// manos en primera persona (cuchillo, pistola y rifle de caza)
(()=>{const glove=mGlove,f=new THREE.Group();
  // puño que envuelve el mango que se agarra (dedos alrededor, pulgar arriba); el otro mango gira suelto
  f.add(bx(.04,.045,.075,glove,-.004,-.006,.085),bx(.012,.03,.06,glove,.018,-.006,.085),bx(.03,.012,.03,glove,-.004,.02,.06));vms[7].add(f);
  const arm=(x,y,z,rx,ry,len)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,len),mSleeve);a.geometry.translate(0,0,len/2);a.position.set(x,y,z);a.rotation.set(rx,ry,0,'YXZ');return a;};
})();
// antebrazo del cuchillo: va desde abajo a la derecha de la pantalla hasta la mano y la sigue en cada movimiento
const knArm=new THREE.Group(),knArmM=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,1),mSleeve);knArmM.geometry.translate(0,0,.5);knArm.add(knArmM);
const knCuff=new THREE.Mesh(new THREE.BoxGeometry(.085,.085,.05),mGlove);knArm.visible=false;wScene.add(knArm);
const knHand=new THREE.Vector3(),knAnchor=new THREE.Vector3(.34,-.62,.05);
/* ráfaga del tajo: una media luna blanca que barre delante de la cámara y se desvanece (como el barrido de Minecraft) */
const sweepTex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');
  for(let k=0;k<60;k++){const a0=Math.PI*(1.08+k/60*.84),a1=a0+Math.PI*.84/60+.01,al=Math.sin(k/60*Math.PI);
    g.strokeStyle='rgba(255,255,255,'+(.15+.75*al)+')';g.lineWidth=6+16*al;g.beginPath();g.arc(128,140,104,a0,a1);g.stroke();
    g.strokeStyle='rgba(220,235,255,'+(.25*al)+')';g.lineWidth=3;g.beginPath();g.arc(128,140,86,a0,a1);g.stroke();}
  const t=new THREE.CanvasTexture(c);return t;})();
const sweep=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.55),new THREE.MeshBasicMaterial({map:sweepTex,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,opacity:0}));
sweep.position.set(0,-.04,-.62);sweep.renderOrder=5;wScene.add(sweep);let sweepT=9,sweepD=1;
function sweepFx(d){sweepT=0;sweepD=d;}
function updSweep(dt){sweepT+=dt;const k=sweepT/.2;if(k>=1){sweep.material.opacity=0;sweep.visible=false;return;}sweep.visible=true;
  sweep.material.opacity=Math.sin(k*Math.PI)*.85;sweep.rotation.set(0,0,sweepD*(.5-k)*.9);sweep.scale.set(.85+k*.35,.85+k*.35,1);}
function updKnifeArm(){const g=vms[7];if(!g.visible){knArm.visible=false;return;}g.updateMatrixWorld(true);
  knHand.set(-.004,-.008,.11).applyMatrix4(g.matrixWorld);knArm.position.copy(knHand);knArm.lookAt(knAnchor);
  knArm.scale.set(1,1,Math.max(.05,knHand.distanceTo(knAnchor)+.15));knArm.visible=true;}
wScene.add(new THREE.AmbientLight(0x8a7a66,.75));
const wDir=new THREE.DirectionalLight(0xffe2c0,.85);wDir.position.set(1,2,1.5);wScene.add(wDir);
const wMuz=new THREE.PointLight(0xffaa44,0,2.5);wScene.add(wMuz);
const flashTex=new THREE.CanvasTexture(cv(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,230,1)');gr.addColorStop(.25,'rgba(255,200,90,.9)');gr.addColorStop(.6,'rgba(255,110,20,.35)');gr.addColorStop(1,'rgba(255,80,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);g.fillStyle='rgba(255,230,160,.8)';g.fillRect(30,0,4,64);g.fillRect(0,30,64,4);}));
const flashMesh=new THREE.Mesh(new THREE.PlaneGeometry(.32,.32),new THREE.MeshBasicMaterial({map:flashTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));flashMesh.visible=false;wScene.add(flashMesh);
const muzzleWorld=new THREE.PointLight(0xffaa50,0,14,1.5);scene.add(muzzleWorld);

function nameSprite(name,color){
  const c=cv(256,64,(g)=>{g.font='28px "Share Tech Mono", monospace';g.textAlign='center';g.textBaseline='middle';g.lineWidth=5;g.strokeStyle='rgba(0,0,0,.85)';g.strokeText(name,128,32);g.fillStyle=color;g.fillText(name,128,32);});
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthWrite:false,transparent:true}));
  sp.scale.set(1.6,.4,1);sp.position.y=2.25;return sp;
}

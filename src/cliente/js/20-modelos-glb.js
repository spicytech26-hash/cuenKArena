/* =================== MODELOS 3D EN ARCHIVOS (.glb) ===================
   public/modelos/modelos.json dice qué archivo reemplaza a qué modelo hecho con código. Si un archivo falta o falla,
   queda el de código (el juego nunca se rompe por un modelo). Formato:
   { "armas": { "5": { "archivo": "lanzacohetes.glb", "escala": 1, "pos": [0,0,0], "rot": [0,0,0], "punta": [0,0.03,-1] } },
     "items": { "health": { "archivo": "botiquin.glb", "escala": 1, "pos": [0,0,0], "rot": [0,0,0] } } }
   - armas: la clave es el número del arma (0 pistola … 10 molotov). El arma mira hacia -z, la empuñadura cerca del origen,
     1 unidad = 1 metro. "punta" es de dónde sale el fogonazo.
   - Para que las animaciones (bombeo, cargador, cerrojo…) sigan andando, las piezas que se mueven tienen que llamarse
     igual que en el modelo de código: los nombres están en vGrp('nombre',…) de 07-armas/NN-arma.js. Si falta alguna,
     el arma se ve igual pero queda quieta (sin manos animadas).
   - items: la clave es el tipo de ítem (health, mega, armor, armorH, quad, shells, bullets, rockets, grenades, slugs, caza, w1…). */
const GLB_LOADER='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
function glbLoader(){return new Promise((ok,no)=>{if(THREE.GLTFLoader)return ok();const s=document.createElement('script');s.src=GLB_LOADER;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
function glbPrep(obj,c){if(c.escala)obj.scale.setScalar(c.escala);if(c.pos)obj.position.set(c.pos[0],c.pos[1],c.pos[2]);if(c.rot)obj.rotation.set(c.rot[0],c.rot[1],c.rot[2]);
  obj.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});const w=new THREE.Group();w.add(obj);return w;}
// arma en primera persona: se cambian las piezas del grupo (vms[i] sigue siendo el mismo objeto) y se vuelven a poner las manos
function glbArma(i){const g=vms[i],gl=GLB.armas[i];if(!g||!gl)return;
  const antes=Object.keys(g.userData.parts||{}).filter(k=>k!=='__ok');
  while(g.children.length)g.remove(g.children[0]);
  g.add(gl.obj.clone(true));const t=gl.c.punta||[0,0,-.5];g.userData.tip=new THREE.Vector3(t[0],t[1],t[2]);
  const P={};g.traverse(o=>{if(o.name&&o!==g)P[o.name]=o;});
  P.__ok=antes.length>0&&antes.every(k=>P[k]);g.userData.parts=P;g.userData.rh=null;vAddHands(i,g);delete tpCache[i];}
async function glbCargar(){let man;try{const r=await fetch('modelos/modelos.json',{cache:'no-cache'});if(!r.ok)return;man=await r.json();}catch(e){return;}
  const tareas=[];for(const k in man.armas||{})tareas.push(['armas',k]);for(const k in man.items||{})tareas.push(['items',k]);
  if(!tareas.length)return;
  try{await glbLoader();}catch(e){console.warn('No se pudo cargar GLTFLoader',e);return;}
  const ld=new THREE.GLTFLoader();
  await Promise.all(tareas.map(([tipo,k])=>new Promise(ok=>{const c=man[tipo][k];
    ld.load('modelos/'+c.archivo,gltf=>{GLB[tipo][k]={obj:glbPrep(gltf.scene,c),c};
      if(tipo==='armas')glbArma(+k);else if(level)for(const o of level.items)if(o.ty===k){o.ty=null;setItemType(o,k);}
      ok();},undefined,e=>{console.warn('Modelo '+c.archivo+' no cargó',e);ok();});})));}
glbCargar();

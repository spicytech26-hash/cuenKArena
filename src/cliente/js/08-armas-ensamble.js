/* ===== armado de las armas: cada arma está en 07-armas/NN-nombre.js (modelo VMOD[i] y rig vRigs[i]) ===== */
function buildGun(i){const g=new THREE.Group(),gl=GLB.armas[i];
  if(gl){g.add(gl.obj.clone(true));const t=gl.c.punta||[0,0,-.5];g.userData.tip=new THREE.Vector3(t[0],t[1],t[2]);return g;}
  const f=VMOD[i];const tip=f?f(g):[0,0,-.5];
  g.userData.tip=new THREE.Vector3(tip[0],tip[1],tip[2]);
  return f&&f.sinFusion?g:vMerge(g);}
const vmBase=[[.12,-.09,-.44],[.2,-.19,-.36],[.2,-.2,-.36],[.21,-.2,-.38],[.22,-.21,-.36],[.24,-.22,-.34],[.22,-.2,-.36],[.17,-.13,-.5],[.2,-.2,-.34],[.19,-.2,-.36],[.2,-.17,-.4]].map(a=>new THREE.Vector3(a[0],a[1],a[2]));
const vms=WEAPONS.map((_,i)=>{const g=buildGun(i);g.visible=false;wScene.add(g);return g;});

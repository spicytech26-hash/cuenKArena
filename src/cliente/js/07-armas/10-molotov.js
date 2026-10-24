/* ===== 10 · Bomba molotov =====
   VMOD[10]: modelo hecho con cajas simples (estilo viejo, no se fusiona). Sin rig: sus manos están en 08-armas-animacion.js. */
VMOD[10]=function(g){let tip=[0,0,-.5];
    // molotov: botella de vidrio con nafta, cuello largo y trapo prendido
    const glass=new THREE.MeshPhongMaterial({color:0x6b8a3a,transparent:true,opacity:.72,shininess:140,specular:0xffffff});
    const fuel=new THREE.MeshPhongMaterial({color:0xc9862a,transparent:true,opacity:.8,emissive:0x2a1400});
    const rag=new THREE.MeshPhongMaterial({color:0xd8cbb0,flatShading:true});
    const flame=new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.042,.045,.15,12),glass);body.position.set(0,0,0);
    const liq=new THREE.Mesh(new THREE.CylinderGeometry(.038,.041,.09,12),fuel);liq.position.set(0,-.028,0);
    const sh2=new THREE.Mesh(new THREE.CylinderGeometry(.018,.042,.04,12),glass);sh2.position.set(0,.095,0);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.015,.016,.07,10),glass);neck.position.set(0,.15,0);
    const cloth=new THREE.Mesh(new THREE.CylinderGeometry(.02,.017,.05,7),rag);cloth.position.set(0,.19,0);cloth.rotation.z=.2;
    const fl=new THREE.Mesh(new THREE.ConeGeometry(.024,.075,7),flame);fl.position.set(.004,.245,0);fl.name='flame';
    const bot=new THREE.Group();bot.add(body,liq,sh2,neck,cloth,fl);bot.rotation.x=-.35;bot.rotation.z=.25;g.add(bot);
    g.add(bx(.07,.06,.09,mGlove,.0,-.005,.02),bx(.03,.03,.08,mGlove,-.04,.02,.01));
    tip=[0,.2,-.05];
  return tip;};
VMOD[10].sinFusion=true;

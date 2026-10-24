/* ===== 2 · Escopeta doble =====
   VMOD[2]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[2]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[2]=function(g){let tip=[0,0,-.5];
    // escopeta doble: los caños se quiebran sobre la bisagra para cargar; vainas a la vista en la recámara
    const brl=vGrp('brl',vT(.021,.021,.55,vSteel,-.022,.035,-.27,16),vT(.021,.021,.55,vSteel,.022,.035,-.27,16),vRB(.014,.008,.54,.003,vSteelL,0,.058,-.27),
      vRB(.03,.012,.54,.003,vSteel,0,.014,-.27),vRB(.064,.044,.2,.016,woodRifle,0,-.004,-.18),vRB(.07,.05,.05,.01,vSteel,0,.022,-.02),
      vSph(.006,vBrass,0,.066,-.53,8,6));
    brl.add(vGrp('sh',vT(.018,.018,.008,vBrass,-.022,.035,.004,12),vT(.018,.018,.008,vBrass,.022,.035,.004,12)));
    brl.position.set(0,-.01,-.04);brl.children.forEach(c=>c.position.add(new THREE.Vector3(0,.01,.04)));
    g.add(brl,vRB(.074,.076,.12,.014,vSteel,0,.012,.06),vRB(.016,.016,.04,.004,vSteelL,0,.056,.1,-.4),
      vP([[.05,-.026],[.06,-.06],[.12,-.06],[.12,-.026]],.012,vSteel,0,0,0,.002),vRB(.006,.022,.008,.002,vSteelL,0,-.04,.085,.25),
      vP([[.115,.046],[.18,.036],[.42,-.006],[.436,-.012],[.442,-.124],[.42,-.13],[.28,-.086],[.17,-.06],[.115,-.03]],.052,woodRifle,0,0,0,.006),
      vRB(.056,.12,.014,.004,vRubber,0,-.068,.442,-.06));
    tip=[0,.035,-.56];
  return tip;};
// ---- escopeta doble: la quiebra, saltan las vainas, mete dos cartuchos y la cierra de un golpe ----
vRigs[2]=(g,P,u,f)=>{
  P.brl.rotation.x=0;P.sh.visible=true;H.hold=null;H.rot=null;
  const fore=()=>{P.brl.updateMatrix();vV.set(0,-.004,-.18+.04).applyMatrix4(P.brl.matrix);return [vV.x,vV.y-.024,vV.z];};
  if(u>=0){
    const k=vEnv(u,.12,.12);vGun(g,k,VPR[2]);const PK=vPk(g);
    const open=u<.74?vss((u-.1)/.12):1-vss((u-.74)/.06);P.brl.rotation.x=-.62*open+(u>.8?.05*vbump(u,.8,.9):0);
    if(VEV.u(.24)){vEject(g,[-.022,.06,-.03],[-.2,1.6,1.8],'shell');vEject(g,[.022,.06,-.03],[.2,1.7,1.9],'shell');SFX.breakOpen();}
    P.sh.visible=!(u>.24&&u<.66);
    if(VEV.u(.64))SFX.shellIn();if(VEV.u(.79))SFX.breakClose();
    g.rotation.x+=.08*vbump(u,.78,.88);
    const breech=[0,.07,-.02];
    H.p=vKF(u,[[0,fore()],[.24,fore()],[.36,PK],[.4,PK],[.56,[-.01,.12,.02]],[.66,breech],[.7,breech],[.8,fore()],[1,fore()]]);
    if(u<.24||u>.7)H.p=vMix(H.p,fore(),u<.24?1:vss((u-.7)/.1));
    H.hold=u>.38&&u<.66?'shell2':null;
  }else H.p=fore();
};

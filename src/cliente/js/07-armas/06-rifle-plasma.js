/* ===== 6 · Rifle de plasma =====
   VMOD[6]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[6]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[6]=function(g){let tip=[0,0,-.5];
    // rifle de plasma (en la línea del railgun de Quake): cuerpo de metal con bobinas que brillan, aletas, celda de energía abajo
    const glow=new THREE.MeshBasicMaterial({color:0x8fe4ff});g.userData.glow=glow;
    g.add(vRB(.08,.1,.46,.014,vSci,0,0,-.14),vRB(.084,.03,.36,.006,vSciD,0,.04,-.16),vRB(.024,.016,.3,.004,vSciD,0,.064,-.14),
      vRB(.036,.03,.07,.006,vSciD,0,.08,.0),vT(.016,.016,.03,vSciD,0,.08,-.04,10),vSph(.012,glow,0,.08,-.056,10,8),
      vRB(.018,.018,.3,.004,vSciD,-.026,-.02,-.5),vRB(.018,.018,.3,.004,vSciD,.026,-.02,-.5),vRB(.014,.04,.024,.004,vSciD,0,-.01,-.64),
      vT(.016,.016,.36,glow,0,.0,-.48,12),
      vP([[.02,-.05],[.07,-.05],[.1,-.16],[.055,-.165]],.036,vPoly,0,0,0,.005),vRB(.07,.06,.2,.016,vSciD,0,-.012,.17),vRB(.072,.1,.03,.008,vRubber,0,-.03,.27),
      vRB(.05,.03,.12,.008,vSciD,0,-.064,-.27));
    for(let k=0;k<4;k++){g.add(vRing(.03,.008,glow,0,0,-.42-k*.06,16));g.add(vRB(.09,.012,.012,.003,vSciD,0,.02,-.06-k*.05));}
    for(let k=0;k<5;k++)g.add(vRB(.086,.004,.02,.001,vBlack,0,-.01,-.26+k*.04));
    const cm=new THREE.MeshBasicMaterial({color:0x6ee8ff});g.userData.cellGlow=cm;
    const cell=vGrp('cell',vRB(.05,.05,.09,.01,vSciD,0,0,0),vRB(.052,.012,.07,.003,cm,0,-.004,0),vRB(.03,.008,.03,.004,vSteelL,0,.028,0));cell.position.set(0,-.06,.03);g.add(cell);
    tip=[0,0,-.64];
  return tip;};
// ---- rifle de plasma: las bobinas se cargan después de cada tiro; cambia la celda de energía ----
vRigs[6]=(g,P,u,f)=>{
  const gl=g.userData.glow,cg=g.userData.cellGlow;
  let charge=Math.min(1,f/1.3);if(f<.12)charge=1-f/.12*.9;
  P.cell.position.set(0,-.06,.03);P.cell.rotation.set(0,0,0);P.cell.visible=true;
  H.p=[0,-.07,-.3];H.rot=null;H.hold=null;
  if(u>=0){
    const k=vEnv(u,.12,.12);vGun(g,k,VPR[6]);const PK=vPk(g);
    const grab=[0,-.1,.03];
    if(u<.3){const d=vss((u-.1)/.16);P.cell.position.y-=.06*d;P.cell.position.z+=.02*d;}
    else if(u<.42){const d=vss((u-.3)/.12);P.cell.position.y-=.06+.5*d;P.cell.rotation.x=1.2*d;P.cell.visible=d<.9;}
    else if(u<.66){const h=vKF(u,[[.42,PK],[.56,[0,-.24,.06]],[.66,grab]]);P.cell.position.set(h[0]-grab[0],-.06+h[1]-grab[1],.03+h[2]-grab[2]);}
    if(VEV.u(.2))SFX.cellOut();if(VEV.u(.65))SFX.cellIn();
    g.rotation.x+=.06*vbump(u,.64,.72);
    charge=u<.66?Math.max(0,.3-u):vss((u-.68)/.25);
    H.p=vKF(u,[[0,[0,-.07,-.3]],[.1,grab],[.26,[0,-.16,.05]],[.4,PK],[.42,PK],[.56,[0,-.24,.06]],[.66,grab],[.72,grab],[.86,[0,-.07,-.3]]]);
  }
  const b=.25+.75*charge;gl.color.setRGB(.56*b+.3*(1-charge)*0,.89*b,1*b);cg.color.setRGB(.43*b,.91*b,1*b);
};

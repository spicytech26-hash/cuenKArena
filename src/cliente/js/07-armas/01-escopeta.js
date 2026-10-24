/* ===== 1 · Escopeta =====
   VMOD[1]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[1]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[1]=function(g){let tip=[0,0,-.5];
    // escopeta de bombeo (como la de TF2): cajón de acero, caño con cinta, tubo cargador, guardamano de madera que se bombea
    g.add(vRB(.066,.088,.24,.014,vSteel,0,.006,.04),vRB(.004,.028,.07,.001,vBlack,.0335,.02,.03),vRB(.036,.004,.08,.001,vBlack,0,-.039,.03),
      vT(.021,.021,.62,vSteel,0,.032,-.39,18),vT(.025,.025,.022,vSteelL,0,.032,-.69,18),vRB(.012,.006,.6,.002,vSteelL,0,.055,-.39),vSph(.006,vBrass,0,.062,-.68,8,6),
      vT(.0165,.0165,.5,vSteel,0,-.018,-.33,14),vT(.019,.019,.02,vSteelL,0,-.018,-.585,14),vRB(.05,.064,.016,.006,vSteel,0,.008,-.6),
      vP([[.04,-.044],[.052,-.07],[.11,-.07],[.112,-.044]],.012,vSteel,0,0,0,.002),vRB(.006,.024,.008,.002,vSteelL,0,-.054,.074,.25),
      vP([[.155,.036],[.22,.03],[.44,-.006],[.456,-.012],[.462,-.122],[.44,-.128],[.3,-.084],[.205,-.062],[.155,-.042]],.05,woodRifle,0,0,0,.006),
      vRB(.054,.118,.014,.004,vRubber,0,-.066,.462,-.06));
    const pump=vGrp('pump',vRB(.058,.05,.17,.018,woodRifle,0,-.016,-.34),vRB(.004,.006,.13,.001,vSteel,.026,-.006,-.22),vRB(.004,.006,.13,.001,vSteel,-.026,-.006,-.22));
    for(let k=0;k<6;k++)pump.add(vRB(.0595,.006,.006,.002,vWoodD,0,-.016,-.4+k*.024));
    g.add(pump);tip=[0,.032,-.7];
  return tip;};
// ---- escopeta de bombeo: bombea después de cada tiro; recarga metiendo los cartuchos de a uno por abajo y bombea con las dos manos ----
vRigs[1]=(g,P,u,f)=>{
  let pump=f<.14?0:f<.3?vss((f-.14)/.16):f<.48?1-vss((f-.3)/.18):0;
  if(VEV.f(.24)){SFX.pumpBack();vEject(g,[.045,.03,.03],[1.5,1.3,.4],'shell');}
  if(VEV.f(.4))SFX.pumpFwd();
  g.rotation.z+=.05*pump;g.rotation.x+=.035*pump;g.position.y-=.01*pump;
  H.hold=null;H.rot=null;
  if(u>=0){
    const k=vEnv(u,.13,.12);vGun(g,k,VPR[1]);const PK=vPk(g);
    const n=Math.max(1,Math.min(4,me.relN||4)),c=vCyc(u,.16,.78,n);
    const pt=[0,-.016,-.34],port=[0,-.06,.04],app=[-.01,-.13,.07];
    if(c){const q=c.c;H.p=vKF(q,[[0,PK],[.32,app],[.52,port],[.62,port],[1,PK]]);H.hold=q<.55?'shell':null;g.rotation.x-=.03*vbump(q,.45,.62);}
    else if(u<.16)H.p=vMix(pt,PK,vss(u/.14));
    else{const r=u<.86?vss((u-.78)/.08):1;H.p=vMix(PK,pt,r);if(u>.86)pump=u<.92?vss((u-.86)/.06):1-vss((u-.92)/.06);}
    if(VEV.cyc(.16,.78,n,.5))SFX.shellIn();if(VEV.u(.88))SFX.pumpBack();if(VEV.u(.94))SFX.pumpFwd();
    if(u>.86){g.rotation.z+=.06*pump;g.position.z+=.01*pump;}
  }
  P.pump.position.z=.11*pump;
  if(u<0||u>.86)H.p=[0,-.016,-.34+.11*pump];
};

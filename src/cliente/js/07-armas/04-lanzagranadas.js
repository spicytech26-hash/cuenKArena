/* ===== 4 · Lanzagranadas =====
   VMOD[4]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[4]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[4]=function(g){let tip=[0,0,-.5];
    // lanzagranadas de tambor (como el del Demo): tambor que gira con cada tiro, caño corto, empuñadura y culata
    const drum=vGrp('drum',vT(.06,.06,.12,vSteel,0,0,0,18));
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2;drum.add(vT(.017,.017,.122,vBlack,Math.sin(a)*.036,Math.cos(a)*.036,0,10));drum.add(vRB(.008,.014,.1,.002,vSteelL,Math.sin(a+.52)*.058,Math.cos(a+.52)*.058,0,0,0,-(a+.52)));}
    drum.position.set(0,-.01,-.06);
    g.add(drum,vT(.045,.045,.34,vSteel,0,.0,-.28,16),vT(.05,.05,.03,vODd,0,0,-.45,16),vT(.034,.034,.2,vBlack,0,0,-.36,14,true),vRing(.044,.006,vSteelL,0,0,-.3),
      vRB(.03,.02,.42,.006,vSteel,0,.06,-.18),vRB(.012,.02,.012,.003,vBlack,0,.075,-.42),vRB(.07,.07,.08,.012,vSteel,0,-.008,.03),
      vP([[.03,-.03],[.075,-.03],[.105,-.14],[.06,-.145]],.036,woodRifle,0,0,0,.005),vP([[.02,-.04],[.03,-.06],[.075,-.06],[.075,-.04]],.012,vSteel,0,0,0,.002),
      vP([[.07,.02],[.24,-.01],[.25,-.1],[.21,-.1],[.1,-.05]],.05,woodRifle,0,0,0,.006),vRB(.03,.018,.2,.006,vODd,0,-.05,-.25));
    tip=[0,0,-.47];
  return tip;};
// ---- lanzagranadas: el tambor gira con cada tiro; recarga granada por granada por la ventana del costado ----
vRigs[4]=(g,P,u,f)=>{
  let rot=me.drumA||0;const step=Math.PI/3;
  H.p=[0,-.06,-.25];H.rot=null;H.hold=null;
  if(u>=0){
    const k=vEnv(u,.12,.12);vGun(g,k,VPR[4]);const PK=vPk(g);
    const n=Math.max(1,Math.min(4,me.relN||4)),c=vCyc(u,.15,.85,n),gate=[-.075,.0,-.06],app=[-.16,-.03,-.02];
    if(c){H.p=vKF(c.c,[[0,PK],[.35,app],[.55,gate],[.65,gate],[1,PK]]);H.hold=c.c<.58?'nade':null;rot+=step*(c.i+vss((c.c-.55)/.2));g.rotation.z-=.03*vbump(c.c,.5,.66);}
    else if(u>=.85){rot+=step*n;H.p=vMix(PK,[0,-.06,-.25],vss((u-.85)/.13));}
    else H.p=vMix([0,-.06,-.25],PK,vss(u/.15));
    if(VEV.cyc(.15,.85,n,.56))SFX.shellIn();
    if(VEV.u(.97))me.drumA=(me.drumA||0)+step*n;
  }else if(f<.25)rot+=step*vss(f/.25)-step;
  P.drum.rotation.z=rot;
};

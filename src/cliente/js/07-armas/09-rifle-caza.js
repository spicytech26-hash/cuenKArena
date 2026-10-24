/* ===== 9 · Rifle de caza =====
   VMOD[9]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[9]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[9]=function(g){let tip=[0,0,-.5];
    // rifle de caza de palanca (estilo Winchester): caño octogonal pavonado, tubo cargador, madera rojiza con venda,
    // portón de carga al costado y palanca que se acciona después de cada tiro
    g.add(vT(.019,.017,.92,bluedSteel,0,.035,-.56,8),vT(.024,.024,.02,bluedSteel,0,.035,-1.01,8),vRB(.01,.045,.012,.003,bluedSteel,0,.075,-.98),
      vT(.012,.012,.62,bluedSteel,0,-.002,-.43,12),vT(.014,.014,.014,vSteelL,0,-.002,-.74,12),
      vT(.03,.028,.016,bluedSteel,0,.02,-.42,10),vT(.03,.028,.016,bluedSteel,0,.02,-.58,10),
      vRB(.05,.05,.3,.016,woodRifle,0,.008,-.27),
      vRB(.054,.082,.2,.01,bluedSteel,0,.016,-.02),vRB(.056,.018,.14,.004,vSteelL,0,.044,-.03),vRB(.004,.018,.034,.002,vBrass,.028,.0,-.02),
      vRB(.02,.02,.01,.003,bluedSteel,0,.0875,-.17),vRB(.012,.03,.014,.003,bluedSteel,0,.066,-.17),vRB(.008,.012,.008,.002,vBlack,0,.1,-.17),
      vP([[.08,.034],[.15,.024],[.42,-.008],[.436,-.014],[.442,-.13],[.42,-.136],[.28,-.092],[.16,-.064],[.08,-.036]],.05,woodRifle,0,0,0,.006),
      vRB(.054,.07,.06,.012,clothWrap,0,-.016,.13,-.25),vRB(.054,.118,.014,.004,vRubber,0,-.07,.442,-.06));
    const lever=vGrp('lever',vRB(.009,.012,.1,.004,vSteel,0,0,.05),vRB(.009,.036,.01,.004,vSteel,0,-.02,.1),vRB(.009,.01,.07,.004,vSteel,0,-.04,.07));
    lever.position.set(0,-.028,-.07);g.add(lever);
    const cock=vGrp('cock',vRB(.01,.03,.012,.003,vSteel,0,.012,0),vRB(.012,.006,.018,.002,vSteel,0,.026,.008));cock.position.set(0,.04,.075);g.add(cock);
    tip=[0,.035,-1.02];
  return tip;};
// ---- rifle de caza: después de cada tiro la mano derecha baja y sube la palanca (sale la vaina); recarga bala por bala por el portón ----
vRigs[9]=(g,P,u,f)=>{
  const rh=g.userData.rh,rh0=g.userData.rh0;
  const lev=t=>t<0||t>1?0:t<.45?vss(t/.45):1-vss((t-.55)/.45);
  let lv=lev((f-.14)/.5);
  if(VEV.f(.3)){SFX.bolt();vEject(g,[.03,.07,-.03],[.9,1.8,.3],'brass');}
  H.p=[0,-.03,-.3];H.rot=null;H.hold=null;
  if(u>=0){
    const k=vEnv(u,.12,.12);vGun(g,k,VPR[9]);const PK=vPk(g);
    const n=Math.max(1,Math.min(3,me.relN||3)),c=vCyc(u,.15,.8,n),gate=[.04,.0,-.02],app=[.1,-.08,.04];
    if(c){H.p=vKF(c.c,[[0,PK],[.35,app],[.55,gate],[.65,gate],[1,PK]]);H.hold=c.c<.58?'round':null;H.rot=c.c>.2&&c.c<.7?[0,0,-.9]:null;g.rotation.z+=.03*vbump(c.c,.5,.66);}
    else if(u<.15)H.p=vMix([0,-.03,-.3],PK,vss(u/.15));
    else H.p=vMix(PK,[0,-.03,-.3],vss((u-.8)/.12));
    if(VEV.cyc(.15,.8,n,.56))SFX.shellIn();
    if(u>.84){lv=lev((u-.84)/.16);if(VEV.u(.9))SFX.bolt();}
  }
  P.lever.rotation.x=.9*lv;P.cock.rotation.x=-.55*Math.min(1,lv*2);
  rh.position.copy(rh0);rh.position.y-=.055*lv;rh.position.z+=.03*lv;rh.rotation.x=-.3*lv;
  g.rotation.x+=.04*lv;g.position.y+=.006*lv;
};

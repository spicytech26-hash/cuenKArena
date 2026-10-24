/* ===== 8 · Francotirador =====
   VMOD[8]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[8]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[8]=function(g){let tip=[0,0,-.5];
    // francotirador de cerrojo: mira telescópica con lentes, caño largo con freno, culata de madera, cerrojo con manija a la derecha
    g.add(vRB(.06,.07,.3,.012,vSteel,0,0,-.04),vT(.022,.018,.7,vSteel,0,.012,-.55,16),vT(.028,.028,.07,vSteel,0,.012,-.92,14),
      vRB(.04,.012,.05,.003,vBlack,0,.012,-.93),
      vT(.028,.028,.3,vBlack,0,.085,-.08,18),vT(.036,.03,.06,vBlack,0,.085,-.25,18),vT(.032,.036,.05,vBlack,0,.085,.08,18),vRing(.03,.005,vSteelL,0,.085,-.08),
      vRB(.02,.04,.03,.004,vBlack,0,.055,-.14),vRB(.02,.04,.03,.004,vBlack,0,.055,.0),vRB(.022,.024,.03,.005,vBlack,0,.12,-.08),
      vM(new THREE.CircleGeometry(.03,18),mRail,0,.085,-.281),
      vP([[-.25,-.03],[.05,-.03],[.11,-.045],[.4,-.03],[.42,-.04],[.425,-.15],[.39,-.155],[.22,-.1],[.12,-.075],[-.25,-.05]],.06,woodRifle,0,0,0,.008),
      vP([[.06,-.035],[.1,-.035],[.13,-.13],[.085,-.135]],.044,woodRifle,0,0,0,.006),vRB(.064,.12,.016,.004,vRubber,0,-.095,.425,-.08),
      vP([[.0,-.04],[.01,-.062],[.065,-.062],[.065,-.04]],.012,vSteel,0,0,0,.002));
    g.add(vGrp('mag',vRB(.034,.05,.07,.006,vBlack,0,-.025,0)));g.children[g.children.length-1].position.set(0,-.04,-.06);
    const bolt=vGrp('bolt',vT(.012,.012,.12,vSteelL,0,0,0,10),vRB(.04,.008,.008,.003,vSteelL,.024,0,.03),vSph(.011,vBlack,.046,0,.03,10,8));bolt.position.set(.0,.035,.06);g.add(bolt);
    tip=[0,.012,-.98];
  return tip;};
// ---- francotirador: después de cada tiro la mano derecha trabaja el cerrojo; recarga por cargador ----
vRigs[8]=(g,P,u,f)=>{
  const rh=g.userData.rh,rh0=g.userData.rh0;
  P.mag.position.set(0,-.04,-.06);P.mag.rotation.set(0,0,0);P.mag.visible=true;
  // cerrojo: levantar, atrás (sale la vaina), adelante, bajar
  const bc=(t)=>{const lift=vss((t-.0)/.15)*(1-vss((t-.75)/.15)),back=vss((t-.18)/.22)*(1-vss((t-.5)/.22));return [lift,back];};
  let bt=-1;if(f>.28&&f<1.1)bt=(f-.28)/.8;
  if(u>.82)bt=(u-.82)/.18;
  let lift=0,back=0;if(bt>=0&&bt<=1){[lift,back]=bc(bt);}
  P.bolt.rotation.z=.9*lift;P.bolt.position.z=.06+.09*back;
  const reach=bt>=0&&bt<=1?Math.min(vss(bt/.1),1-vss((bt-.86)/.14)):0;
  rh.position.copy(rh0);if(reach>0){rh.position.x+=.04*reach;rh.position.y+=(.1+.02*lift)*reach;rh.position.z+=(-.02+.09*back)*reach;rh.rotation.z=.4*reach;}else rh.rotation.z=0;
  if((f>.28&&VEV.f(.28+.8*.38))||VEV.u(.82+.18*.38)){vEject(g,[.03,.04,.05],[1.4,1.2,.4],'brass');}
  if(VEV.f(.32)||VEV.u(.84))SFX.bolt();
  g.rotation.z+=.06*reach;
  H.p=[-.0,-.05,-.3];H.rot=null;H.hold=null;
  if(u<0||u>.82)return;
  const k=vEnv(u/.82,.14,.14);vGun(g,k,VPR[8]);const PK=vPk(g);
  const grab=[0,-.1,-.06];
  if(u<.3){const d=vss((u-.1)/.16);P.mag.position.y-=.06*d;}
  else if(u<.42){const d=vss((u-.3)/.12);P.mag.position.y-=.06+.5*d;P.mag.rotation.x=1.1*d;P.mag.visible=d<.9;}
  else if(u<.66){const h=vKF(u,[[.42,PK],[.56,[0,-.25,-.06]],[.66,grab]]);P.mag.position.set(h[0]-grab[0],-.04+h[1]-grab[1],-.06+h[2]-grab[2]);}
  if(VEV.u(.2))SFX.magOut();if(VEV.u(.65))SFX.magIn();
  g.rotation.x+=.05*vbump(u,.64,.72);
  H.p=vKF(u,[[0,[0,-.05,-.3]],[.1,grab],[.26,[0,-.16,-.06]],[.4,PK],[.42,PK],[.56,[0,-.25,-.06]],[.66,grab],[.7,grab],[.82,[0,-.05,-.3]]]);
};

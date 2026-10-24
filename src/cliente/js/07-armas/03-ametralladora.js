/* ===== 3 · Ametralladora =====
   VMOD[3]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[3]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[3]=function(g){let tip=[0,0,-.5];
    // ametralladora estilo Quake: cajón verde oliva con placas, guardamano con ranuras, freno de boca, cargador curvo y palanca de montar
    g.add(vRB(.064,.074,.32,.01,mODrab,0,0,-.06),vRB(.068,.018,.24,.004,vODd,0,.024,-.07),vRB(.026,.014,.26,.003,vBlack,0,.044,-.07),
      vRB(.03,.026,.03,.006,mODrab,0,.06,.07),vRB(.008,.026,.008,.002,vBlack,0,.062,-.205),vRB(.004,.022,.05,.001,vBrass,.0335,.008,-.02),
      vRB(.056,.056,.2,.014,vODd,0,.004,-.31),vT(.012,.012,.12,vSteel,0,.004,-.46,12),vT(.019,.019,.05,vSteel,0,.004,-.535,12),
      vP([[-.04,-.035],[-.03,-.058],[.03,-.058],[.04,-.035]],.03,vBlack,0,0,0,.002),
      vTY(.015,.017,.065,vPoly,0,-.068,-.25,0),vRB(.036,.008,.036,.003,vBlack,0,-.04,-.25),
      vP([[.03,-.03],[.08,-.03],[.11,-.13],[.062,-.135]],.036,vPoly,0,0,0,.005),
      vP([[.1,.03],[.27,.0],[.285,-.002],[.29,-.105],[.27,-.11],[.16,-.07],[.1,-.05]],.05,mODrab,0,0,0,.006),vRB(.054,.108,.016,.004,vRubber,0,-.054,.29,-.06));
    for(let k=0;k<5;k++)g.add(vRB(.058,.012,.016,.003,vBlack,0,.004,-.23-k*.035));
    for(let k=0;k<3;k++)g.add(vRB(.004,.008,.016,.001,vBlack,.012*(k-1),.004,-.545));
    g.add(vGrp('mag',vRB(.03,.07,.05,.006,vODd,0,-.035,-.008,.1),vRB(.03,.064,.048,.006,vODd,0,-.096,-.024,.4),vRB(.034,.01,.052,.003,vBlack,0,-.128,-.04,.4)));
    g.children[g.children.length-1].position.set(0,-.035,-.105);
    g.add(vGrp('cock',vRB(.012,.012,.03,.004,vSteelL,-.036,.026,-.2),vT(.006,.006,.03,vSteel,-.036,.026,-.18,8)));
    tip=[0,.004,-.56];
  return tip;};
// ---- ametralladora: la mano izquierda en la empuñadura delantera; saca el cargador, pone uno nuevo y monta la palanca ----
vRigs[3]=(g,P,u,f)=>{
  P.mag.position.set(0,-.035,-.105);P.mag.rotation.set(0,0,0);P.mag.visible=true;P.cock.position.z=0;
  if(f<.07){const v=1-f/.07;g.position.x+=R(.004)*v;g.position.y+=R(.004)*v;g.rotation.z+=R(.02)*v;}
  const grip=[0,-.07,-.25];H.p=grip;H.rot=VERT;H.hold=null;
  if(u<0)return;
  const k=vEnv(u,.12,.13);vGun(g,k,VPR[3]);const PK=vPk(g);
  const grab=[-.004,-.145,-.135],well=[-.004,-.06,-.125],cock=[-.05,.028,-.19];
  let mo=[0,0,0],mr=0,vis=true;
  if(u<.3){const d=vss((u-.12)/.16);mo=[0,-.1*d,-.01*d];mr=.25*d;}
  else if(u<.44){const d=vss((u-.3)/.14);mo=[0,-.1-.5*d,-.01];mr=.25+1.1*d;vis=d<.9;}
  else if(u<.7){const h=vKF(u,[[.44,PK],[.58,[0,-.27,-.12]],[.7,grab]]);mo=[h[0]-grab[0],h[1]-grab[1],h[2]-grab[2]];mr=u<.6?.3:.3*(1-vss((u-.6)/.1));}
  P.mag.position.set(mo[0],-.035+mo[1],-.105+mo[2]);P.mag.rotation.x=mr;P.mag.visible=vis;
  if(VEV.u(.2))SFX.magOut();if(VEV.u(.69))SFX.magIn();if(VEV.u(.8))SFX.bolt();
  g.rotation.x+=.07*vbump(u,.68,.76);
  const pull=u<.76?0:u<.81?vss((u-.76)/.05):1-vss((u-.81)/.03);P.cock.position.z=.06*pull;
  g.rotation.x-=.04*vbump(u,.8,.88);
  const ck=[cock[0],cock[1],cock[2]+.06*pull];
  H.p=vKF(u,[[0,grip],[.12,grab],[.28,[grab[0],grab[1]-.1,grab[2]-.01]],[.42,PK],[.44,PK],[.58,[0,-.27,-.12]],[.7,grab],[.72,grab],[.76,cock],[.86,cock],[1,grip]]);
  if(u>.76&&u<.86)H.p=ck;
  H.rot=(u>.1&&u<.74)?null:(u>=.74&&u<.88)?[0,0,.5]:VERT;
};

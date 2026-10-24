/* ===== 0 · Pistola =====
   VMOD[0]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[0]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[0]=function(g){let tip=[0,0,-.5];
    // pistola: corredera redondeada con estrías (se mueve al disparar), armazón de polímero, cargador que se cae al recargar
    const slide=vGrp('slide',vRB(.032,.034,.19,.008,mSlide,0,.031,-.045),vT(.0095,.0095,.02,vBlack,0,.03,-.142,12),vRB(.006,.008,.008,.002,vBlack,0,.051,-.128),
      vRB(.026,.008,.012,.002,vBlack,0,.05,.045));
    for(let k=0;k<6;k++)slide.add(vRB(.0335,.024,.003,.001,vBlack,0,.03,.02+k*.007));
    g.add(slide,vRB(.03,.022,.17,.006,vPoly,0,0,-.03),vRB(.026,.012,.07,.004,vPoly,0,-.013,-.09),
      vP([[-.066,-.012],[-.06,-.04],[-.012,-.044],[-.006,-.012]],.026,vPoly,0,0,0,.002),     // guardamonte
      vRB(.005,.02,.006,.002,vSteelL,0,-.022,-.03,.3),
      vP([[.005,-.01],[.064,-.01],[.08,-.13],[.032,-.13]],.034,mGripT,0,0,0,.004),        // empuñadura inclinada
      vRB(.022,.012,.018,.004,vSteelL,0,.026,.062));
    g.add(vGrp('mag',vRB(.022,.1,.038,.004,vBlack,0,-.075,.06,-.26),vRB(.026,.012,.044,.004,vPoly,0,-.124,.073,-.26)));
    tip=[0,.03,-.155];
  return tip;};
// ---- pistola ----
vRigs[0]=(g,P,u,f)=>{
  const empty=me.mag[0]===0&&u<0;
  P.slide.position.z=empty?.03:f<.09?.03*vbump(f,0,.09):0;
  P.mag.position.set(0,0,0);P.mag.rotation.set(0,0,0);P.mag.visible=true;
  // la pistola se lleva con una mano (como en TF2); la izquierda aparece solo para cambiar el cargador
  H.rot=[Math.PI/2-.3,0,0];H.p=null;
  if(u<0)return;
  const k=vEnv(u,.12,.14);vGun(g,k,VPR[0]);const PK=vPk(g),rest=PK;
  if(u<.36){const d=vss((u-.06)/.22);P.mag.position.set(0,-.4*d*d,.03*d);P.mag.rotation.x=.4*d;P.mag.visible=d<.95;}
  else if(u<.62){const h=vKF(u,[[.36,PK],[.52,[0,-.22,.08]],[.62,[0,-.1,.06]]]);P.mag.position.set(h[0],h[1]+.1,h[2]-.06);}
  if(VEV.u(.12))SFX.magOut();if(VEV.u(.6)){SFX.magIn();}
  g.rotation.x+=.05*vbump(u,.58,.68);
  P.slide.position.z=Math.max(P.slide.position.z,u<.72?.03:u<.8?.03+.012*vbump(u,.72,.8):0);
  if(VEV.u(.8))SFX.slideRel();
  H.p=vKF(u,[[0,rest],[.08,[-.05,-.12,.08]],[.3,PK],[.36,PK],[.52,[0,-.22,.08]],[.62,[0,-.1,.06]],[.66,[-.03,.06,.05]],[.74,[-.03,.06,.05]],[.78,[-.03,.065,.09]],[.86,[-.03,.065,.09]],[1,rest]]);
  H.rot=u>.62&&u<.88?null:H.rot;
};

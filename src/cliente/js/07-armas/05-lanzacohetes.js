/* ===== 5 · Lanzacohetes =====
   VMOD[5]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[5]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
VMOD[5]=function(g){let tip=[0,0,-.5];
    // lanzacohetes como el del Soldier: tubo grueso con boca acampanada, anillos, mira arriba, empuñadura y manija delantera
    g.add(vT(.07,.07,.84,vRL,0,0,-.2,22),vT(.074,.086,.08,vRLd,0,0,-.6,22),vT(.066,.066,.12,vBlack,0,0,-.58,20,true),
      vT(.09,.078,.08,vRLd,0,0,.24,22),vT(.07,.07,.06,vBlack,0,0,.25,18,true),
      vT(.074,.074,.03,vRLd,0,0,-.44,22),vT(.074,.074,.03,vRed,0,0,-.5,22),vT(.074,.074,.03,vRLd,0,0,.02,22),vT(.074,.074,.03,vRLd,0,0,.14,22),
      vRB(.03,.05,.12,.008,vRLd,0,.09,-.08),vRB(.018,.036,.02,.005,vBlack,0,.12,-.12),vRB(.012,.022,.012,.003,vBlack,0,.105,-.4),vRB(.02,.03,.03,.004,vRLd,0,.085,-.4),
      vP([[-.04,-.06],[.02,-.06],[.035,-.19],[-.015,-.195]],.034,vPoly,0,0,0,.005),vP([[-.06,-.06],[-.05,-.09],[.0,-.09],[.0,-.06]],.012,vRLd,0,0,0,.002),
      vRB(.04,.016,.1,.005,vRLd,0,-.068,-.32),vTY(.016,.018,.08,vPoly,0,-.11,-.32,0),vRB(.06,.03,.16,.012,vRubber,0,.07,.12));
    const ld=vRocketM();ld.name='loaded';ld.position.set(0,0,-.6);ld.scale.setScalar(1.25);g.add(ld);
    tip=[0,0,-.64];
  return tip;};
// ---- lanzacohetes: como el del Soldier, mete los cohetes de a uno a mano por la boca ----
vRigs[5]=(g,P,u,f)=>{
  P.loaded.visible=(me.mag[5]||0)>0;
  H.p=[0,-.11,-.32];H.rot=VERT;H.hold=null;
  if(u<0)return;
  const k=vEnv(u,.11,.11);vGun(g,k,VPR[5]);const PK=vPk(g);
  const n=Math.max(1,Math.min(4,me.relN||4)),c=vCyc(u,.13,.87,n);
  const app=[-.02,.0,-.98],p1=[-.01,.0,-.8],p2=[-.0,.0,-.7];
  P.loaded.visible=false;
  if(c){const q=c.c;H.rot=null;H.p=vKF(q,[[0,PK],[.36,app],[.56,p1],[.66,p2],[.72,p2],[1,PK]]);H.hold=q<.66?'rocket':null;
    g.rotation.x-=.05*vbump(q,.6,.74);g.position.z+=.02*vbump(q,.6,.74);P.loaded.visible=q>=.66;}
  else if(u<.13)H.p=vMix([0,-.11,-.32],PK,vss(u/.12));
  else{H.p=vMix(PK,[0,-.11,-.32],vss((u-.87)/.11));P.loaded.visible=true;}
  if(VEV.cyc(.13,.87,n,.64))SFX.rocketIn();
};

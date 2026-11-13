/* ===== 6 · Cañón de plasma =====
   VMOD[6]: el modelo (primera persona, tienda, ítem en el piso y en la mano de los demás). Devuelve la punta del caño.
   vRigs[6]: animaciones de disparo y recarga (ver 08-armas-animacion.js). */
// panal de abejas celeste para las rejillas de los costados (textura compartida)
const vHexTex=(()=>{const c=cv(64,64,(g,w,h)=>{g.fillStyle='#06151c';g.fillRect(0,0,w,h);
  const r=6.2,dx=r*1.732,dy=r*1.5;
  for(let row=-1;row*dy<h+r;row++)for(let col=-1;col*dx<w+r;col++){const cx=col*dx+(row&1?dx/2:0),cy=row*dy;
    g.beginPath();for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3,rr=r-1.3;g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}g.closePath();
    const gr=g.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,'#bff8ff');gr.addColorStop(.6,'#2fd2ff');gr.addColorStop(1,'#0b6f96');g.fillStyle=gr;g.fill();}});
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();
VMOD[6]=function(g){
    /* Cañón de plasma: cuerpo cilíndrico gris oscuro, un tubo de vidrio grande en el medio con el plasma girando
       adentro, rejillas hexagonales celestes a los costados, aletas arriba y una boca ancha con un aro de luz. */
    const glow=new THREE.MeshBasicMaterial({color:0x8fe4ff});g.userData.glow=glow;                       // núcleo de plasma (se aviva al cargar)
    const vid=new THREE.MeshPhongMaterial({color:0xaee9ff,transparent:true,opacity:.28,shininess:140,specular:0xffffff,depthWrite:false});
    const hexM=new THREE.MeshBasicMaterial({map:vHexTex});
    const Y=.028;   // el eje del cañón va un poco más arriba que el de antes: así la empuñadura y las manos quedan donde estaban
    // culata redondeada y cuerpo trasero
    g.add(vT(.062,.084,.12,vSciD,0,Y,.17,20),vSph(.062,vSciD,0,Y,.23,16,12),vT(.088,.088,.13,vSci,0,Y,.055,22));
    g.add(vT(.094,.094,.03,vSciD,0,Y,-.025,22),vRing(.092,.006,vBlack,0,Y,-.01,24));                     // collar de atrás del vidrio
    // tubo de vidrio con el plasma
    g.add(vT(.071,.071,.27,vid,0,Y,-.175,24,true));
    g.add(vT(.044,.044,.27,glow,0,Y,-.175,14));
    for(let k=0;k<4;k++){const a=Math.PI/4+k*Math.PI/2;g.add(vRB(.012,.012,.27,.004,vSciD,Math.cos(a)*.076,Y+Math.sin(a)*.076,-.175));}   // varillas que sujetan el vidrio
    // hebras de plasma que giran adentro del vidrio (pieza móvil: 'swirl')
    const sw=new THREE.MeshBasicMaterial({color:0xd8fbff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});g.userData.swirl=sw;
    const hebras=new THREE.Group();hebras.name='swirl';hebras.position.set(0,Y,-.175);
    for(let k=0;k<3;k++){const pts=[];for(let s=0;s<=40;s++){const z=-.13+s/40*.26,a=k*2.094+s/40*9.4,r=.05+Math.sin(s*.7+k)*.008;pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z));}
      hebras.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.0045,5,false),sw));}
    g.add(hebras);
    // collar de adelante y sección delantera con las rejillas
    g.add(vT(.094,.094,.03,vSciD,0,Y,-.325,22),vRing(.092,.006,vBlack,0,Y,-.34,24));
    g.add(vT(.084,.078,.15,vSci,0,Y,-.415,22));
    for(const s of [-1,1]){
      const hx=vM(new THREE.CylinderGeometry(.034,.034,.012,6),vSciD,s*.077,Y,-.415,0,0,Math.PI/2);hx.rotation.set(Math.PI/6,0,Math.PI/2);g.add(hx);   // marco hexagonal
      const hp=vM(new THREE.CylinderGeometry(.027,.027,.014,6),hexM,s*.079,Y,-.415);hp.rotation.set(Math.PI/6,0,Math.PI/2);g.add(hp);
      const hb=vM(new THREE.CylinderGeometry(.03,.03,.01,6),vSciD,s*.085,Y,.07);hb.rotation.set(Math.PI/6,0,Math.PI/2);g.add(hb);                       // y otra chica atrás
      const hb2=vM(new THREE.CylinderGeometry(.023,.023,.012,6),hexM,s*.087,Y,.07);hb2.rotation.set(Math.PI/6,0,Math.PI/2);g.add(hb2);
    }
    // boca: aro ancho con luz y el ánima oscura
    g.add(vT(.078,.07,.06,vSciD,0,Y,-.52,22),vRing(.05,.008,glow,0,Y,-.552,22),vT(.034,.034,.02,vBlack,0,Y,-.548,16));
    // aletas de arriba: adelante (radiador) y atrás, con ranuras de luz entre las de atrás
    for(let k=0;k<4;k++)g.add(vRB(.05,.03,.01,.003,vSciD,0,Y+.088,-.37-k*.028));
    for(let k=0;k<3;k++){g.add(vRB(.044,.034,.012,.004,vSciD,0,Y+.094,.03+k*.034));g.add(vRB(.03,.012,.008,.002,glow,0,Y+.094,.047+k*.034));}
    g.add(vRB(.03,.02,.2,.006,vSciD,0,Y+.09,-.175));   // lomo sobre el vidrio
    // empuñadura, guardamonte y celda de energía (la celda es la pieza que se cambia al recargar)
    g.add(vP([[.02,-.05],[.07,-.05],[.1,-.16],[.055,-.165]],.036,vPoly,0,0,0,.005),vRB(.07,.05,.2,.016,vSciD,0,-.035,.13),vRB(.072,.1,.03,.008,vRubber,0,-.03,.27));
    g.add(vRB(.05,.03,.12,.008,vSciD,0,-.064,-.27));
    const cm=new THREE.MeshBasicMaterial({color:0x6ee8ff});g.userData.cellGlow=cm;
    const cell=vGrp('cell',vRB(.05,.05,.09,.01,vSciD,0,0,0),vRB(.052,.012,.07,.003,cm,0,-.004,0),vRB(.03,.008,.03,.004,vSteelL,0,.028,0));cell.position.set(0,-.06,.03);g.add(cell);
  return [0,Y,-.57];};
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
  const qq=typeof me!=='undefined'&&me.cg?Math.min(1,me.cg/C.CARGA.MAX):0;
  const dtv=Math.max(0,Math.min(.05,G.time-(g.userData.tPrev??G.time)));g.userData.tPrev=G.time;
  if(P.swirl){P.swirl.rotation.z-=(1.2+charge*1.5+qq*14)*dtv;P.swirl.scale.set(1+qq*.12,1+qq*.12,1);}
  if(g.userData.swirl)g.userData.swirl.opacity=.35+.55*charge+qq*.1;
  // mientras mantenés el botón: el tubo se llena de luz hasta quedar blanco y el rifle empieza a vibrar
  const q=typeof me!=='undefined'&&me.cg?Math.min(1,me.cg/C.CARGA.MAX):0;
  if(q>0){
    const e=.3+2.1*q*q,w=q*q*.9;
    gl.color.setRGB(.56*e+w,.89*e+w*.5,e+w*.2);cg.color.setRGB(.43*e+w,.91*e+w*.5,e+w*.2);
    const tt=G.time,v=.0016*q*q;
    g.position.x+=Math.sin(tt*63)*v;g.position.y+=Math.cos(tt*79)*v;g.rotation.z+=Math.sin(tt*51)*.012*q*q;
    if(q>=1){const p=.5+.5*Math.sin(tt*34);gl.color.offsetHSL(0,0,p*.18);}
  }
};

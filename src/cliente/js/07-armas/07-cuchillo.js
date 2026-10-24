/* ===== 7 · Cuchillo =====
   VMOD[7]: modelo hecho con cajas simples (estilo viejo, no se fusiona). Sin rig: sus manos están en 08-armas-animacion.js. */
VMOD[7]=function(g){let tip=[0,0,-.5];
    // cuchillo mariposa al estilo del espía: hoja larga y fina de punta recortada, mangos negros con puntas de acero
    // y los dos mangos giran sobre sus pernos cuando lo sacás (se abre con un giro)
    const L=.25,Wd=.03,sh=new THREE.Shape();
    sh.moveTo(0,0);sh.lineTo(0,L*.8);sh.quadraticCurveTo(-Wd*.1,L*.93,-Wd*.42,L);sh.quadraticCurveTo(-Wd*1.02,L*.7,-Wd*.95,L*.2);sh.lineTo(-Wd*.82,0);sh.lineTo(0,0);
    const bg=new THREE.ExtrudeGeometry(sh,{depth:.004,bevelEnabled:true,bevelThickness:.0018,bevelSize:.0028,bevelSegments:2,curveSegments:10});
    bg.computeBoundingBox();const bb=bg.boundingBox,uv=bg.attributes.uv,ps=bg.attributes.position;
    for(let k=0;k<uv.count;k++)uv.setXY(k,(ps.getX(k)-bb.min.x)/(bb.max.x-bb.min.x),(ps.getY(k)-bb.min.y)/(bb.max.y-bb.min.y));
    bg.translate(Wd*.42,0,-.002);bg.rotateX(-Math.PI/2);bg.rotateZ(Math.PI/2);
    const blade=new THREE.Mesh(bg,new THREE.MeshPhongMaterial({map:knifeTex,shininess:170,specular:0xffffff,emissive:0x1a1c20}));
    const steel=new THREE.MeshPhongMaterial({color:0xb7bec6,shininess:150,specular:0xffffff,flatShading:true});
    const black=new THREE.MeshPhongMaterial({color:0x17181b,shininess:55,specular:0x555a60});
    // recazo y pernos del pivote
    g.add(blade,bx(.016,.022,.018,steel,0,-.002,.004),cy(.0055,.03,steel,0,-.002,.004,Math.PI/2,12));
    const handle=(sx,name)=>{
      const h=new THREE.Group();h.position.set(sx,-.002,.004);h.name=name;
      h.add(bx(.0085,.024,.14,black,0,0,.075),            // cacha negra
        bx(.0092,.026,.022,steel,0,0,.011),               // puntera de acero del lado de la hoja
        bx(.0092,.026,.018,steel,0,0,.147),               // puntera del extremo
        bx(.0094,.004,.1,steel,0,.0095,.08));             // filete de acero a lo largo
      return h;
    };
    const hA=handle(-.0093,'hA'),hB=handle(.0093,'hB');g.add(hA,hB);
    // traba del extremo
    const latch=new THREE.Group();latch.name='latch';latch.position.set(-.0093,-.002,.156);latch.add(bx(.006,.004,.03,steel,.009,-.012,.008));hA.add(latch);latch.position.set(0,0,.152);
    tip=[0,0,-.25];
  return tip;};
VMOD[7].sinFusion=true;

/* ---------- decoración de La Cuenca: nada de esto choca, es solo visual ---------- */
const decoMat={};
const portalAnim=[];   // portales con vórtice animado (se mueven en el bucle de la cámara)
const animTex=[];      // texturas que se desplazan solas (bruma del río)
function ucpLogo(g,cx,cy,r){
  // logo circular: aro verde-amarillo, centro blanco y la onda azul del río
  const gr=g.createLinearGradient(cx-r,cy-r,cx+r,cy+r);gr.addColorStop(0,'#0f8d48');gr.addColorStop(.6,'#5fb43a');gr.addColorStop(1,'#d7d630');
  g.fillStyle=gr;g.beginPath();g.arc(cx,cy,r,0,7);g.fill();
  g.fillStyle='#ffffff';g.beginPath();g.arc(cx,cy,r*.8,0,7);g.fill();
  g.strokeStyle='#1d4f9a';g.lineCap='round';g.lineWidth=r*.12;
  for(const off of [-.12,.12]){g.beginPath();g.moveTo(cx-r*.62,cy-r*.28+off*r);g.bezierCurveTo(cx-r*.25,cy-r*.62+off*r,cx-r*.05,cy+r*.1+off*r,cx+r*.18,cy-r*.3+off*r);g.bezierCurveTo(cx+r*.4,cy-r*.65+off*r,cx+r*.55,cy-r*.05+off*r,cx+r*.35,cy+r*.35+off*r);g.stroke();}
  g.strokeStyle='#2fa84f';g.lineWidth=r*.08;g.beginPath();g.arc(cx+r*.2,cy+r*.15,r*.32,.3,5.2);g.stroke();
}
function buildDeco(group,list){
  const M_=(k,f)=>decoMat[k]||(decoMat[k]=f());
  const trunk=M_('trunk',()=>new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(cv(16,64,(g)=>{for(let y=0;y<64;y+=4){g.fillStyle=y%8?'#7d6a52':'#5e4f3c';g.fillRect(0,y,16,4);}})),flatShading:true}));
  const leaf=M_('leaf',()=>new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(cv(32,128,(g)=>{g.clearRect(0,0,32,128);g.strokeStyle='#5a7a2a';g.lineWidth=2;g.beginPath();g.moveTo(16,0);g.lineTo(16,128);g.stroke();for(let y=4;y<124;y+=5){const L=14*Math.sin(y/128*Math.PI);g.strokeStyle=y%10?'#3f7d2c':'#4e9134';g.beginPath();g.moveTo(16,y);g.lineTo(16-L,y+7);g.moveTo(16,y);g.lineTo(16+L,y+7);g.stroke();}})),transparent:true,alphaTest:.3,side:THREE.DoubleSide}));
  const bushM=M_('bush',()=>new THREE.MeshLambertMaterial({color:0x3f6e2e,flatShading:true}));
  // toda la vegetación (palmeras, arbustos, árboles) se junta en pocas mallas: así se puede decorar sin gastar dibujos
  const unir=gs=>{const P=[],N=[],U=[],X=[];let off=0;for(const g of gs){const p=g.attributes.position.array,n=g.attributes.normal.array,u=g.attributes.uv.array,cnt=p.length/3;for(let i=0;i<p.length;i++){P.push(p[i]);N.push(n[i]);}for(let i=0;i<u.length;i++)U.push(u[i]);
      if(g.index){const ix=g.index.array;for(let i=0;i<ix.length;i++)X.push(ix[i]+off);}else for(let i=0;i<cnt;i++)X.push(off+i);off+=cnt;}
    const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.Float32BufferAttribute(P,3));m.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));m.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));m.setIndex(X);return m;};
  const cil=(r1,r2,h,x,y,z,eje)=>{const g=new THREE.CylinderGeometry(r1,r2,h,eje==='z'?24:16);if(eje==='x')g.rotateZ(Math.PI/2);else if(eje==='z')g.rotateX(Math.PI/2);g.translate(x,y,z);return g;};
  const bake=(g,x,y,z,ry,rx)=>{const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(0,ry||0,0);if(rx)o.rotateX(rx);o.updateMatrix();g.applyMatrix4(o.matrix);return g;};
  const vTr=[],vLf=[],vBu=[],vCo=[],vAv=[];
  portalAnim.length=0;animTex.length=0;
  const vGl=[],vHz=[],vVn=[],vGf=[];   // brillos de farolas, haces de luz y enredaderas: una sola malla por tipo
  for(const d of list){
    if(d.t==='palm'){
      const tg=new THREE.CylinderGeometry(.2,.32,d.h,8);tg.rotateZ(.05);tg.translate(d.x,d.y+d.h/2,d.z);vTr.push(tg);
      for(let i=0;i<11;i++){const g=new THREE.PlaneGeometry(1.3,4.2);g.translate(0,2.1,0);vLf.push(bake(g,d.x+.2,d.y+d.h,d.z,i/11*Math.PI*2,1.05+(i%3)*.18));}
    }else if(d.t==='bush'){
      for(let k=0;k<3;k++){const g=new THREE.IcosahedronGeometry(d.r*(.7+k*.15),1);g.translate(d.x+(k-1)*d.r*.6,d.y+d.r*.6,d.z+((k*7)%3-1)*d.r*.3);vBu.push(g);}
    }else if(d.t==='tree'){
      // árbol de copa redonda (como los de la costanera): tronco y tres bolas de hojas
      const tg=new THREE.CylinderGeometry(.22,.38,d.h*.7,8);tg.translate(d.x,d.y+d.h*.35,d.z);vTr.push(tg);
      for(const [ox,oy,oz,k] of [[0,.95,0,1],[.55,.75,.3,.75],[-.5,.8,-.3,.8]]){const g=new THREE.IcosahedronGeometry(d.r*k,1);g.translate(d.x+ox*d.r*.6,d.y+d.h*oy,d.z+oz*d.r*.6);vCo.push(g);}
    }else if(d.t==='roof'){
      const r=new THREE.Mesh(new THREE.ConeGeometry(d.w*.78,d.h,4),M_('tin',()=>new THREE.MeshPhongMaterial({color:0x9aa3aa,shininess:80,flatShading:true})));r.rotation.y=Math.PI/4;r.position.set(d.x,d.y+d.h/2,d.z);group.add(r);
    }else if(d.t==='pole'){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,d.h,6),M_('pole',()=>new THREE.MeshPhongMaterial({color:0xdadfe3,shininess:90})));pole.position.set(d.x,d.y+d.h/2,d.z);group.add(pole);
      const fc=cv(96,64,(g)=>{
        if(d.flag==='ar'){g.fillStyle='#74acdf';g.fillRect(0,0,96,64);g.fillStyle='#fff';g.fillRect(0,21,96,22);g.fillStyle='#f6b40e';g.beginPath();g.arc(48,32,7,0,7);g.fill();}
        else if(d.flag==='mis'){g.fillStyle='#e8112d';g.beginPath();g.moveTo(0,0);g.lineTo(96,0);g.lineTo(0,64);g.fill();g.fillStyle='#0072bb';g.beginPath();g.moveTo(96,0);g.lineTo(96,64);g.lineTo(0,64);g.fill();g.strokeStyle='#fff';g.lineWidth=10;g.beginPath();g.moveTo(96,0);g.lineTo(0,64);g.stroke();}
        else{g.fillStyle='#fff';g.fillRect(0,0,96,64);ucpLogo(g,48,32,24);}});
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1),new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(fc),side:THREE.DoubleSide}));fl.position.set(d.x+.78,d.y+d.h-.6,d.z);fl.rotation.y=-.2;group.add(fl);
    }else if(d.t==='ac'){
      const g2=new THREE.Group();g2.position.set(d.x,d.y,d.z);
      g2.add(new THREE.Mesh(new THREE.BoxGeometry(.9,.62,.32),M_('acbox',()=>new THREE.MeshPhongMaterial({color:0xeef0f0}))));
      const fan=new THREE.Mesh(new THREE.CircleGeometry(.22,16),M_('acfan',()=>new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv(32,32,(g)=>{g.fillStyle='#bfc4c7';g.fillRect(0,0,32,32);g.strokeStyle='#555b60';for(let r=3;r<16;r+=3){g.beginPath();g.arc(16,16,r,0,7);g.stroke();}}))})));fan.position.set(.15,0,.165);g2.add(fan);group.add(g2);
    }else if(d.t==='lamp'){
      const l=new THREE.Mesh(new THREE.BoxGeometry(.3,.18,.1),M_('lampm',()=>new THREE.MeshBasicMaterial({color:0xffe2a8})));l.position.set(d.x,d.y,d.z+.05);group.add(l);
    }else if(d.t==='pitch'){
      // césped en franjas con las líneas blancas de una cancha de fútbol (pintadas en la textura, 24 px por metro)
      const PX=24,W=(d.x1-d.x0)*PX|0,H=(d.z1-d.z0)*PX|0,X=x=>(x-d.x0)*PX,Z=z=>(z-d.z0)*PX;
      const c=cv(W,H,(g)=>{
        for(let k=0;k*2*PX<H+PX;k++){g.fillStyle=k%2?'#3f8a34':'#4a9a3c';g.fillRect(0,k*2*PX,W,2*PX);}
        for(let n=0;n<2600;n++){g.fillStyle=n%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.05)';g.fillRect(Math.random()*W|0,Math.random()*H|0,1,2);}
        g.strokeStyle='rgba(245,248,240,.92)';g.lineWidth=.12*PX;
        const r=(a,b,c2,e)=>g.strokeRect(X(a),Z(b),(c2-a)*PX,(e-b)*PX),cx=(d.lx0+d.lx1)/2,cz=(d.lz0+d.lz1)/2;
        r(d.lx0,d.lz0,d.lx1,d.lz1);
        g.beginPath();g.moveTo(X(d.lx0),Z(cz));g.lineTo(X(d.lx1),Z(cz));g.stroke();
        g.beginPath();g.arc(X(cx),Z(cz),3.2*PX,0,7);g.stroke();
        g.fillStyle='rgba(245,248,240,.92)';
        const dot=(x,z)=>{g.beginPath();g.arc(X(x),Z(z),.18*PX,0,7);g.fill();};dot(cx,cz);
        for(const s of [-1,1]){const gl=s<0?d.lz0:d.lz1;
          r(cx-7,Math.min(gl,gl-s*5.5),cx+7,Math.max(gl,gl-s*5.5));        // área grande
          r(cx-3.6,Math.min(gl,gl-s*2),cx+3.6,Math.max(gl,gl-s*2));        // área chica
          dot(cx,gl-s*4.2);                                                 // punto del penal
          g.beginPath();if(s<0)g.arc(X(cx),Z(gl+4.2),2.6*PX,Math.PI*.2,Math.PI*.8);else g.arc(X(cx),Z(gl-4.2),2.6*PX,Math.PI*1.2,Math.PI*1.8);g.stroke();   // medialuna
          for(const x of [d.lx0,d.lx1]){g.beginPath();g.arc(X(x),Z(gl),.7*PX,0,7);g.stroke();}   // córners
        }});
      const t=new THREE.CanvasTexture(c);t.anisotropy=8;
      const m=new THREE.Mesh(new THREE.PlaneGeometry(d.x1-d.x0,d.z1-d.z0),new THREE.MeshLambertMaterial({map:t}));
      m.rotation.x=-Math.PI/2;m.position.set((d.x0+d.x1)/2,d.y,(d.z0+d.z1)/2);m.receiveShadow=true;group.add(m);
      // banderines de córner
      for(const x of [d.lx0,d.lx1])for(const z of [d.lz0,d.lz1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.5,5),M_('pole',()=>new THREE.MeshPhongMaterial({color:0xdadfe3,shininess:90})));p.position.set(x,d.y+.75,z);group.add(p);
        const f=new THREE.Mesh(new THREE.PlaneGeometry(.4,.28),M_('cflag',()=>new THREE.MeshLambertMaterial({color:0xffd21a,side:THREE.DoubleSide})));f.position.set(x+(x<(d.lx0+d.lx1)/2?.2:-.2),d.y+1.35,z);group.add(f);}
    }else if(d.t==='tren'){
      // locomotora «La Posadeña»: caldera redonda, chimenea, domos, ruedas rojas y bielas; son 2 mallas (una por color). La colisión son los bloques del mapa
      // listas por material: hierro negro, acero oscuro, latón, rojo y luz (cada una es una sola malla)
      const negro=[cil(1.3,1.3,16.2,-8.1,2.9,-14,'x'),cil(1.38,1.38,1.4,-16.7,2.9,-14,'x'),cil(.5,.38,2.3,-14.4,5.35,-14),cil(.55,.55,.5,-4.5,4.5,-14),cil(.5,.62,.8,-9,4.6,-14)],acero=[],laton=[],rojo=[],luz=[];
      for(const x of [-13.5,-10.5,-7.5,-4.5,-1.5]){const b=cil(1.35,1.35,.16,x,2.9,-14,'x');acero.push(b);}                                  // fajas de la caldera
      for(const zz of [-15.42,-12.58]){acero.push(cil(.035,.035,14.6,-8.4,3.45,zz,'x'));for(const x of [-15,-11,-7,-3]){acero.push(cil(.03,.03,.45,x,3.25,zz));}}   // pasamanos con sus soportes
      laton.push(cil(.62,.62,.12,-14.4,6.5),cil(.46,.46,.12,-9,5.05),cil(.4,.4,.12,-4.5,4.8));                                         // borde de chimenea y tapas de domos
      // frente: puerta de la caja de humo con aro y bulones, chapa roja con el número, farol con lente, travesaño rojo con topes y trompa
      acero.push(cil(1.3,1.3,.1,-17.45,2.9,-14,'x'));
      const aro=new THREE.TorusGeometry(1.12,.07,8,32);aro.rotateY(Math.PI/2);aro.translate(-17.52,2.9,-14);acero.push(aro);
      for(let k=0;k<10;k++){const an=k/10*Math.PI*2,bo=cil(.06,.06,.1,-17.56,2.9+Math.cos(an)*1.12,-14+Math.sin(an)*1.12,'x');laton.push(bo);}
      rojo.push(cil(.55,.55,.08,-17.52,2.9,-14,'x'));luz.push(cil(.2,.2,.06,-17.57,2.9,-14,'x'));
      negro.push(new THREE.BoxGeometry(.34,.3,.34).translate(-17.0,4.22,-14));
      laton.push(cil(.36,.36,.5,-17.05,4.6,-14,'x'));luz.push(cil(.27,.27,.05,-17.32,4.6,-14,'x'));                                      // farol delantero
      rojo.push(new THREE.BoxGeometry(.4,.7,2.6).translate(-17.6,1.1,-14));                                                            // travesaño
      for(const zz of [-14.95,-13.05]){acero.push(cil(.2,.2,.5,-18.05,1.1,zz,'x'),cil(.32,.32,.08,-18.33,1.1,zz,'x'));}                // topes
      acero.push(new THREE.BoxGeometry(.5,.2,.2).translate(-18.1,.85,-14));                                                            // enganche
      for(let k=-2;k<=2;k++){const b=new THREE.BoxGeometry(.06,.9,.06);b.rotateZ(.75);b.translate(-18.0,.45,-14+k*.5);negro.push(b);}   // trompa
      negro.push(new THREE.BoxGeometry(1,.06,2.7).translate(-18.1,.14,-14));
      // ruedas rojas con llanta, rayos y cubo
      for(const [x,r] of [[-13.5,1.1],[-10.2,1.1],[-6.9,1.1],[-15.7,.65],[1.6,.9],[7.2,.9],[10.2,.8],[12.8,.8],[15.4,.8]])for(const zc of [-15.4,-12.6]){
        const t=new THREE.TorusGeometry(r-.1,.12,6,24);t.translate(x,r+.1,zc);rojo.push(t);
        for(let k=0;k<3;k++){const b=new THREE.BoxGeometry(2*(r-.1),.12,.1);b.rotateZ(k*Math.PI/3);b.translate(x,r+.1,zc);rojo.push(b);}
        rojo.push(cil(.16,.16,.3,x,r+.1,zc,'z'));}
      for(const zb of [-15.75,-12.25]){const b=new THREE.BoxGeometry(6.6,.18,.12);b.translate(-10.2,1.2,zb);acero.push(b);}              // bielas
      const mat=(k,o)=>M_(k,()=>new THREE.MeshPhongMaterial(o));
      for(const [list,m] of [[negro,mat('tr_negro',{color:0x1a1c20,shininess:50})],[acero,mat('tr_acero',{color:0x3a4148,shininess:90})],[laton,mat('tr_laton',{color:0xb58a3c,shininess:110,emissive:0x2a1c08})],[rojo,mat('tr_rojo',{color:0x9a1f18,shininess:30})]]){
        const me=new THREE.Mesh(unir(list),m);me.castShadow=true;me.receiveShadow=true;group.add(me);}
      group.add(new THREE.Mesh(unir(luz),M_('tr_luz',()=>new THREE.MeshBasicMaterial({color:0xfff0c8}))));
    }else if(d.t==='graf'){
      vGf.push(d);   // graffiti (tag de aerosol): todos juntos en un atlas, ver abajo
    }else if(d.t==='cartel'){
      // cartel de chapa con letras (estación, andén): d.txt, colores d.bg / d.fg
      const c=cv(512,Math.round(512*d.h/d.w),(g,w,h)=>{
        g.fillStyle=d.bg||'#1b1b1b';g.fillRect(0,0,w,h);g.strokeStyle=d.fg||'#f1e7d0';g.lineWidth=6;g.strokeRect(6,6,w-12,h-12);
        g.fillStyle=d.fg||'#f1e7d0';g.textAlign='center';g.textBaseline='middle';g.font='bold '+Math.round(h*.52)+'px Arial, Helvetica, sans-serif';g.fillText(d.txt,w/2,h/2+2);});
      // doble cara: se lee desde los dos lados (la de atrás da vuelta y no sale espejada)
      const cm=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}),ry0=d.ry||0,nx=Math.sin(ry0),nz=Math.cos(ry0);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(d.w,d.h),cm);m.position.set(d.x+nx*.015,d.y,d.z+nz*.015);m.rotation.y=ry0;group.add(m);
      const m2=new THREE.Mesh(new THREE.PlaneGeometry(d.w,d.h),cm);m2.position.set(d.x-nx*.015,d.y,d.z-nz*.015);m2.rotation.y=ry0+Math.PI;group.add(m2);
    }else if(d.t==='aviso'){
      // cartel de «prohibido nadar» (cuadrado blanco, círculo rojo tachado y nadador): todos los avisos van en una sola malla, con las dos caras
      for(const sg of [1,-1]){const g=new THREE.PlaneGeometry(1.1,1.1);if(sg<0)g.rotateY(Math.PI);g.translate(0,0,.02*sg);vAv.push(bake(g,d.x,d.y,d.z,d.ry||0,0));}
    }else if(d.t==='portal'){
      // portal de energía pura flotando (sin marco, base ni estructura): vórtice en espiral con núcleo blanco y borde de luz, y partículas cuadradas que derivan. Siempre mira a la cámara
      const am=d.color==='yellow',hex=am?0xffc43a:0x58b4ff,hex2=am?0xfff2c0:0xdff6ff;
      const c0=am?'255,248,215':'235,252,255',c1=am?'255,215,95':'110,225,255',c2=am?'255,150,30':'45,125,255',c3=am?'210,90,10':'20,70,210',ch=am?'255,170,40':'60,150,255';
      const rx=d.r,ry=d.r*1.4,g3=new THREE.Group();g3.position.set(d.x,d.y+ry+.15,d.z);
      const swirl=(arms,rev,tw)=>{const t=new THREE.CanvasTexture(cv(256,256,(g,w,h)=>{
        g.clearRect(0,0,w,h);const rg=g.createRadialGradient(128,128,2,128,128,124);rg.addColorStop(0,'rgba('+c0+',1)');rg.addColorStop(.14,'rgba('+c0+',.92)');rg.addColorStop(.34,'rgba('+c1+',.8)');rg.addColorStop(.66,'rgba('+c2+',.55)');rg.addColorStop(.93,'rgba('+c3+',.5)');rg.addColorStop(1,'rgba('+c3+',0)');
        g.fillStyle=rg;g.beginPath();g.arc(128,128,124,0,7);g.fill();g.lineCap='round';
        for(let k=0;k<arms;k++)for(let u=0;u<1;u+=.01){const r=6+u*114,an=k*Math.PI*2/arms+u*tw*rev;g.strokeStyle='rgba('+c0+','+(.95*(1-u*.8))+')';g.lineWidth=2+(1-u)*10;g.beginPath();g.moveTo(128+Math.cos(an)*r,128+Math.sin(an)*r);g.lineTo(128+Math.cos(an+.08*rev)*(r+1.6),128+Math.sin(an+.08*rev)*(r+1.6));g.stroke();}
        for(const [wd,al] of [[22,.10],[14,.22],[7,.55]]){g.strokeStyle='rgba('+c1+','+al+')';g.lineWidth=wd;g.beginPath();g.arc(128,128,112,0,7);g.stroke();}    // borde de luz
        g.strokeStyle='rgba('+c0+',.9)';g.lineWidth=3;g.beginPath();g.arc(128,128,112,0,7);g.stroke();
      }));t.center.set(.5,.5);return t;};
      const t1=swirl(4,1,5.6),t2=swirl(3,-1,7.4);
      const am1={transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide};
      const m1=new THREE.MeshBasicMaterial(Object.assign({map:t1},am1)),m2=new THREE.MeshBasicMaterial(Object.assign({map:t2},am1));
      const v1=new THREE.Mesh(new THREE.PlaneGeometry(rx*2,ry*2),m1),v2=new THREE.Mesh(new THREE.PlaneGeometry(rx*1.6,ry*1.6),m2);v2.position.z=.03;g3.add(v1,v2);
      const soft=(r0,r1,col)=>new THREE.CanvasTexture(cv(128,128,(g,w,h)=>{const r=g.createRadialGradient(64,64,r0,64,64,64);r.addColorStop(0,'rgba('+col+','+r1+')');r.addColorStop(1,'rgba('+col+',0)');g.fillStyle=r;g.fillRect(0,0,w,h);}));
      const halo=new THREE.Mesh(new THREE.PlaneGeometry(rx*3.4,ry*2.7),new THREE.MeshBasicMaterial(Object.assign({map:soft(4,.5,ch)},am1)));halo.position.z=-.06;g3.add(halo);
      const core=new THREE.Mesh(new THREE.PlaneGeometry(rx*.9,ry*.9),new THREE.MeshBasicMaterial(Object.assign({map:soft(0,.9,c0)},am1)));core.position.z=.06;g3.add(core);
      // partículas cuadradas que derivan alrededor (azules/amarillas y blancas)
      const mkPts=(n,col,sz)=>{const pp=[];for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,k=.85+Math.random()*.75;pp.push(Math.cos(a)*rx*k,Math.sin(a)*ry*k,(Math.random()-.5)*1.1);}
        const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));return new THREE.Points(pg,new THREE.PointsMaterial({color:col,size:sz,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));};
      const pts=mkPts(34,hex,.17),pts2=mkPts(18,hex2,.11);g3.add(pts,pts2);
      group.add(g3);portalAnim.push({g:g3,t1,t2,pts,pts2,m2,ph:Math.random()*6});
    }else if(d.t==='glow'){
      // brillo suave de una luz (farola, farol de pared): todos juntos en una sola malla de puntos
      vGl.push(d);
    }else if(d.t==='enredadera'){
      // enredadera colgando (hojas oscuras): tiras que se juntan en una sola malla
      const g=new THREE.PlaneGeometry(.55,d.len);g.translate(0,-d.len/2,0);vVn.push(bake(g,d.x,d.y,d.z,d.ry||0,0));
    }else if(d.t==='bruma'){
      // bruma baja sobre el río: plano translúcido que se desliza despacio
      const t=M_('bruma',()=>new THREE.CanvasTexture(cv(256,256,(g,w,h)=>{g.clearRect(0,0,w,h);for(let k=0;k<70;k++){const x=Math.random()*w,y=Math.random()*h,r=20+Math.random()*50,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(200,225,225,'+(.25+Math.random()*.3)+')');gr.addColorStop(1,'rgba(200,225,225,0)');g.fillStyle=gr;for(const ox of [-w,0,w])for(const oy of [-h,0,h]){g.save();g.translate(ox,oy);g.beginPath();g.arc(x,y,r,0,7);g.fill();g.restore();}}})));
      t.wrapS=t.wrapT=THREE.RepeatWrapping;const tt=t.clone();tt.needsUpdate=true;tt.repeat.set((d.x1-d.x0)/70,(d.z1-d.z0)/70);animTex.push({t:tt,sx:.004*(d.dir||1),sy:.0025});
      const m=new THREE.Mesh(new THREE.PlaneGeometry(d.x1-d.x0,d.z1-d.z0),new THREE.MeshBasicMaterial({map:tt,transparent:true,opacity:d.o||.2,depthWrite:false,side:THREE.DoubleSide}));
      m.rotation.x=-Math.PI/2;m.position.set((d.x0+d.x1)/2,d.y,(d.z0+d.z1)/2);m.renderOrder=2;group.add(m);
    }else if(d.t==='logo'){
      const c=cv(256,256,(g)=>ucpLogo(g,128,128,124));
      const m=new THREE.Mesh(new THREE.CircleGeometry(d.r,40),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));m.position.set(d.x,d.y,d.z);group.add(m);
    }else if(d.t==='sign'){
      // el cartel azul de la entrada, como en la foto
      const c=cv(1024,216,(g,w,h)=>{
        g.fillStyle='#1f2d4a';g.fillRect(0,0,w,h);g.strokeStyle='#33476e';g.lineWidth=6;g.strokeRect(3,3,w-6,h-6);
        g.strokeStyle='#4aa3df';g.lineWidth=12;g.lineCap='round';
        for(const off of [-10,12]){g.beginPath();g.moveTo(40,96+off);g.bezierCurveTo(80,40+off,110,140+off,150,80+off);g.bezierCurveTo(180,40+off,205,110+off,190,140+off);g.stroke();}
        g.fillStyle='#ffffff';g.font='bold 74px "Share Tech Mono", Arial, sans-serif';g.textBaseline='alphabetic';
        g.font='bold 72px Arial, Helvetica, sans-serif';g.fillText('Universidad de la',250,92);g.fillText('Cuenca del Plata',250,170);
        g.font='16px Arial, sans-serif';g.fillStyle='rgba(255,255,255,.7)';g.fillText('Posadas · Misiones · Corrientes · Formosa · Neuquén · Paraná',250,200);
      });
      const t=new THREE.CanvasTexture(c);t.anisotropy=4;
      const m=new THREE.Mesh(new THREE.PlaneGeometry(d.w,d.h),new THREE.MeshBasicMaterial({map:t}));m.position.set(d.x,d.y,d.z);group.add(m);
    }
  }
  const volcar=(arr,mat)=>{if(!arr.length)return;const m=new THREE.Mesh(unir(arr),mat);group.add(m);};
  volcar(vTr,trunk);volcar(vLf,leaf);volcar(vBu,bushM);
  if(vGf.length){
    // graffitis: cada uno es un cuadrito del atlas; una sola malla y un solo dibujo. Se iluminan con la linterna (con un brillo propio apenas)
    const cols=8,cw=256,chh=128,rows=Math.ceil(vGf.length/cols);
    const atlas=cv(cols*cw,rows*chh,(g)=>{vGf.forEach((d,i)=>{
      const cx=(i%cols)*cw,cy=Math.floor(i/cols)*chh;let sz=84;g.font='italic 900 '+sz+'px "Arial Black",Impact,sans-serif';
      while(g.measureText(d.txt).width>cw*.9&&sz>16){sz-=4;g.font='italic 900 '+sz+'px "Arial Black",Impact,sans-serif';}
      g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=sz*.18;g.strokeStyle='#08080e';g.strokeText(d.txt,cx+cw/2,cy+chh/2-6);
      g.fillStyle=d.fg||'#ff3fd2';g.fillText(d.txt,cx+cw/2,cy+chh/2-6);
      g.fillStyle='rgba(255,255,255,.28)';g.fillText(d.txt,cx+cw/2-2,cy+chh/2-9);
      g.fillStyle=d.fg||'#ff3fd2';for(let k=0;k<3;k++){const x=cx+cw*(.25+k*.25)+((i*7+k*13)%11)-5;g.fillRect(x,cy+chh/2+sz*.3,3,6+((i*5+k*9)%22));}   // chorreaduras
    });});
    const tex=new THREE.CanvasTexture(atlas);
    const P=[],N=[],U=[],X=[],q=new THREE.Quaternion(),e=new THREE.Euler(0,0,0,'YXZ'),v=new THREE.Vector3();
    vGf.forEach((d,i)=>{
      e.set(d.rx||0,d.ry||0,d.rz||0);q.setFromEuler(e);const u0=(i%cols)/cols,v1=1-Math.floor(i/cols)/rows,base=P.length/3;
      for(const [lx,ly,uu,vv] of [[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]]){
        v.set(lx*d.w/2,ly*d.h/2,0).applyQuaternion(q);P.push(d.x+v.x,d.y+v.y,d.z+v.z);
        v.set(0,0,1).applyQuaternion(q);N.push(v.x,v.y,v.z);U.push(u0+uu/cols,v1-(1-vv)/rows);
      }
      X.push(base,base+1,base+2,base,base+2,base+3);
    });
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));gg.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));gg.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));gg.setIndex(X);
    const gm=new THREE.Mesh(gg,new THREE.MeshPhongMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,shininess:0,emissive:0x555555,emissiveMap:tex}));
    gm.renderOrder=1;gm.frustumCulled=false;group.add(gm);
  }
  if(vVn.length)volcar(vVn,M_('vid',()=>new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(cv(32,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#1d3a22';g.lineWidth=2;g.beginPath();g.moveTo(16,0);for(let y=0;y<h;y+=8)g.lineTo(16+Math.sin(y*.13)*5,y);g.stroke();
    for(let y=6;y<h;y+=7){const x=16+Math.sin(y*.13)*5,s=y%14?1:-1;g.fillStyle=(y%3)?'#2c5a30':'#1f4426';g.beginPath();g.ellipse(x+s*5,y,5,2.6,s*.5,0,7);g.fill();}})),transparent:true,alphaTest:.4,side:THREE.DoubleSide})));
  if(vGl.length){const pos=[],col=[];for(const q of vGl){const c=new THREE.Color(q.c||0xffd08a);pos.push(q.x,q.y,q.z);col.push(c.r,c.g,c.b);}
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));gg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    group.add(new THREE.Points(gg,new THREE.PointsMaterial({map:M_('glowTex',()=>new THREE.CanvasTexture(cv(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.5)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h);}))),size:2.6,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));}
  volcar(vAv,M_('aviso',()=>new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv(256,256,(g,w,h)=>{
    g.fillStyle='#f4f4f0';g.fillRect(0,0,w,h);g.strokeStyle='#c9c9c2';g.lineWidth=6;g.strokeRect(3,3,w-6,h-6);
    g.strokeStyle='#d62b2b';g.lineWidth=16;g.beginPath();g.arc(128,110,78,0,7);g.stroke();
    g.fillStyle='#111';g.beginPath();g.arc(98,96,13,0,7);g.fill();                                                   // cabeza del nadador
    g.strokeStyle='#111';g.lineWidth=11;g.lineCap='round';g.beginPath();g.moveTo(108,108);g.lineTo(150,114);g.moveTo(108,108);g.lineTo(138,88);g.lineTo(168,86);g.stroke();   // cuerpo y brazos
    g.lineWidth=7;for(const dy of [128,142]){g.beginPath();g.moveTo(80,dy);g.quadraticCurveTo(100,dy-12,120,dy);g.quadraticCurveTo(140,dy+12,160,dy);g.quadraticCurveTo(172,dy-6,178,dy);g.stroke();}   // olas
    g.strokeStyle='#d62b2b';g.lineWidth=16;g.beginPath();g.moveTo(72,54);g.lineTo(184,166);g.stroke();                // tachado
    g.fillStyle='#d62b2b';g.font='bold 27px Arial, Helvetica, sans-serif';g.textAlign='center';g.fillText('PROHIBIDO NADAR',128,222);
  }))})));volcar(vCo,M_('copa',()=>new THREE.MeshLambertMaterial({color:0x2e5f2a,flatShading:true})));
}

/* ---------- banderas de captura ---------- */
function buildFlag(group,team,base){
  const col=new THREE.Color(TEAMS[team].c);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.06,6,32),new THREE.MeshBasicMaterial({color:col}));ring.rotation.x=Math.PI/2;ring.position.set(base.x,base.y+.04,base.z);group.add(ring);
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.4,6),new THREE.MeshPhongMaterial({color:0xcfc8bc,shininess:80}));pole.position.y=1.2;g.add(pole);
  const clothGeo=new THREE.PlaneGeometry(1.1,.7,8,1);clothGeo.translate(.55,0,0);
  const cloth=new THREE.Mesh(clothGeo,new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide}));cloth.position.y=2.0;g.add(cloth);
  const beamGeo=new THREE.CylinderGeometry(.18,.18,40,8,1,true);beamGeo.translate(0,20,0);
  const beam=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  group.add(g);group.add(beam);
  return {g,cloth,beam,base,pos:clothGeo.attributes.position,x0:Float32Array.from(clothGeo.attributes.position.array)};
}
function updFlags(){
  if(!level||!level.flags.length)return;
  level.flags.forEach((F,i)=>{
    const st=FL[i]||[0,0,F.base.x,F.base.y,F.base.z];
    let x=st[2],y=st[3],z=st[4],vis=true,sc=1;
    if(st[0]===1){
      const c=players.get(st[1]);
      if(st[1]===myId){x=me.s.x;y=me.s.y;z=me.s.z;vis=false;}
      else if(c&&c.model&&c.model.g.visible){x=c.x+Math.sin(c.yaw)*.35;y=c.y+.7;z=c.z+Math.cos(c.yaw)*.35;sc=.75;}
      else vis=false;
    }
    F.g.visible=vis;F.g.position.set(x,y,z);F.g.scale.setScalar(sc);F.g.rotation.y=G.time*.6+i;
    F.beam.position.set(x,y,z);F.beam.visible=!(st[0]===1&&st[1]===myId);
    F.beam.material.opacity=st[0]===0?.14:.25+.15*Math.sin(G.time*8);
    const a=F.pos.array;for(let k=0;k<a.length;k+=3){const u=F.x0[k];a[k+2]=Math.sin(G.time*6+u*5)*.12*u;}F.pos.needsUpdate=true;
  });
}

/* ---------- el boliche: bola de espejos, láseres, pantalla y haces ---------- */
function buildClub(group){
  const club={beams:[],lasers:[],beat:-1};
  const facet=new THREE.CanvasTexture(cv(64,32,(g)=>{for(let y=0;y<32;y+=4)for(let x=0;x<64;x+=4){const v=120+Math.random()*135|0;g.fillStyle='rgb('+v+','+v+','+(v+10)+')';g.fillRect(x,y,4,4);}}));facet.magFilter=THREE.NearestFilter;
  const ball=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshPhongMaterial({map:facet,shininess:150,specular:0xffffff,emissive:0x222233}));
  ball.position.set(0,13.6,0);group.add(ball);club.ball=ball;
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,2.4,6),new THREE.MeshBasicMaterial({color:0x444444}));rod.position.set(0,15.2,0);group.add(rod);
  const cols=[0xff2bd6,0x2be6ff,0x8a4bff,0xffcf3a,0x3aff9c,0xff4a6a];
  for(let i=0;i<8;i++){
    const geo=new THREE.CylinderGeometry(.02,.9,16,10,1,true);geo.translate(0,-8,0);
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:cols[i%cols.length],transparent:true,opacity:.11,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
    m.position.copy(ball.position);group.add(m);club.beams.push({m,a:i/8*Math.PI*2,tilt:.5+Math.random()*.5});
  }
  for(const [x,z,c] of [[-13.25,-8.75,0x3aff9c],[13.25,-8.75,0xff2b4a],[-13.25,8.75,0xff2b4a],[13.25,8.75,0x3aff9c]]){
    const geo=new THREE.BoxGeometry(.035,.035,40);geo.translate(0,0,20);
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    m.position.set(x,11.5,z);group.add(m);club.lasers.push({m,ph:Math.random()*6,base:Math.atan2(-x,-z)});
  }
  const sc=document.createElement('canvas');sc.width=256;sc.height=96;club.screen=sc;club.screenTex=new THREE.CanvasTexture(sc);club.screenTex.magFilter=THREE.NearestFilter;
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(22,8),new THREE.MeshBasicMaterial({map:club.screenTex}));scr.position.set(0,8,-17.97);group.add(scr);
  const sign=cv(512,128,(g)=>{g.font='bold 92px "Black Ops One", Impact, sans-serif';const fw=g.measureText('HUMITA').width;if(fw>480)g.font='bold '+Math.floor(92*480/fw)+'px "Black Ops One", Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor='#ff3fd2';g.shadowBlur=24;g.fillStyle='#ff9be9';g.fillText('HUMITA',256,68);});
  const sm=new THREE.Mesh(new THREE.PlaneGeometry(14,3.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sign),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sm.position.set(0,9.5,31.9);sm.rotation.y=Math.PI;group.add(sm);
  const bottleCols=[0x3aff9c,0xffcf3a,0x2be6ff,0xff4a6a,0xb46cff];
  for(const sx of [-1,1])for(let z=-7;z<=7;z+=1.4){const m=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,.42,6),new THREE.MeshBasicMaterial({color:bottleCols[(Math.abs(z*5)|0)%5],transparent:true,opacity:.8}));m.position.set(sx*16.5,1.32,z);group.add(m);}
  return club;
}
function updClub(dt,beatF){
  const c=level&&level.club;if(!c)return;
  c.ball.rotation.y+=dt*.6;
  for(const b of c.beams){b.a+=dt*.45;b.m.rotation.set(b.tilt*Math.cos(b.a*1.3),b.a,b.tilt*Math.sin(b.a));}
  for(const l of c.lasers){l.m.rotation.set(-.35-.25*Math.sin(G.time*.9+l.ph),l.base+Math.sin(G.time*1.3+l.ph)*.8,0);}
  const beat=Math.floor(beatF);
  if(beat!==c.beat){c.beat=beat;paintLED(beat);}
  const pulse=1-(beatF%1);
  for(const pm of level.pads)pm.m.scale.y=1+pulse*.6;
  c.scrT=(c.scrT||0)-dt;
  if(c.scrT<=0){c.scrT=1/15;const g=c.screen.getContext('2d');g.fillStyle='#07050c';g.fillRect(0,0,256,96);
    for(let i=0;i<32;i++){const h=(Math.sin(G.time*3+i*.7)*.5+.5)*(.35+pulse*.65)*70*(.5+.5*Math.abs(Math.sin(i*1.7)));g.fillStyle=LEDC[(i+beat)%LEDC.length];g.fillRect(i*8+1,92-h,6,h);}
    g.font='bold 24px "Black Ops One", Impact, sans-serif';g.textAlign='center';g.fillStyle='rgba(255,255,255,'+(.55+pulse*.45)+')';g.fillText('HUMITA',128+Math.sin(G.time)*12,36);
    c.screenTex.needsUpdate=true;}
  for(const ml of level.maplights)ml.l.intensity=ml.base*(.75+pulse*.5);
}


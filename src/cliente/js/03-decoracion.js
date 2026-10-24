/* ---------- decoración de La Cuenca: nada de esto choca, es solo visual ---------- */
const decoMat={};
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
  for(const d of list){
    if(d.t==='palm'){
      const tr=new THREE.Mesh(new THREE.CylinderGeometry(.2,.32,d.h,8),trunk);tr.position.set(d.x,d.y+d.h/2,d.z);tr.rotation.z=.05;group.add(tr);
      for(let i=0;i<11;i++){const a=i/11*Math.PI*2,fr=new THREE.Mesh(new THREE.PlaneGeometry(1.3,4.2),leaf);fr.geometry.translate(0,2.1,0);
        fr.position.set(d.x+.2,d.y+d.h,d.z);fr.rotation.set(0,a,0);fr.rotateX(1.05+(i%3)*.18);group.add(fr);}
    }else if(d.t==='bush'){
      for(let k=0;k<3;k++){const b=new THREE.Mesh(new THREE.IcosahedronGeometry(d.r*(.7+k*.15),1),bushM);b.position.set(d.x+(k-1)*d.r*.6,d.y+d.r*.6,d.z+((k*7)%3-1)*d.r*.3);group.add(b);}
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


/* =================== RENDER =================== */
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.autoClear=false;
// sombras del sol (primer paso de los gráficos nuevos): un solo mapa de sombras que cubre todo el mapa,
// se recalcula cada dos cuadros y se puede apagar en Ajustes si la compu sufre
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
const setTimeout0=f=>f();
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x1c1310);
scene.fog=new THREE.FogExp2(0x1c1310,.0105);
const camera=new THREE.PerspectiveCamera(S.fov,1,.05,500);camera.rotation.order='YXZ';
const wScene=new THREE.Scene(),wCam=new THREE.PerspectiveCamera(62,1,.01,10);
// resolución dinámica: si la compu no llega a ~50 cuadros, se baja un poco la resolución (hasta 75%) en vez de que el juego se trabe
const DR={s:1,acc:0,n:0,good:0,upT:0,block:0,fps:0};
function resize(){const w=innerWidth,h=innerHeight;const cap=S.q?Math.max(.5,720/h):Math.max(.4,480/h);renderer.setPixelRatio(Math.min(devicePixelRatio||1,cap)*DR.s);renderer.setSize(w,h,false);camera.aspect=wCam.aspect=w/h;camera.updateProjectionMatrix();wCam.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

/* =================== TEXTURAS PROCEDURALES =================== */
let seed=4242;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
function cv(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;}
function weather(c){try{const g=c.getContext('2d'),w=c.width,h=c.height;if(w<16||h<16)return;
  for(let i=0;i<w*h/90;i++){const r=1+rnd()*Math.max(2,w/16);g.fillStyle='rgba('+(rnd()<.6?'20,14,8':'255,240,220')+','+(.03+rnd()*.05)+')';g.beginPath();g.arc(rnd()*w,rnd()*h,r,0,6.283);g.fill();}
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,.035)');gr.addColorStop(.8,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(10,6,2,.16)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(0,0,0,.07)';g.fillRect(0,0,w,1);g.fillRect(0,0,1,h);}catch(e){}}
function tex(c){weather(c);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
function grain(g,w,h,a){const d=g.getImageData(0,0,w,h);for(let i=0;i<d.data.length;i+=4){const v=(rnd()-.5)*a;d.data[i]+=v;d.data[i+1]+=v;d.data[i+2]+=v*.9;}g.putImageData(d,0,0);}
function panel(g,x,y,w,h,base,hi,lo){g.fillStyle=base;g.fillRect(x,y,w,h);g.fillStyle=hi;g.fillRect(x,y,w,1);g.fillRect(x,y,1,h);g.fillStyle=lo;g.fillRect(x,y+h-1,w,1);g.fillRect(x+w-1,y,1,h);}
function rivets(g,x,y,w,h){const p=[[x+2,y+2],[x+w-4,y+2],[x+2,y+h-4],[x+w-4,y+h-4]];g.fillStyle='#231c16';p.forEach(q=>g.fillRect(q[0]+1,q[1]+1,2,2));g.fillStyle='#8a7a62';p.forEach(q=>g.fillRect(q[0],q[1],2,2));}
function rust(g,w,h,n){for(let i=0;i<n;i++){g.fillStyle='rgba('+(120+rnd()*40|0)+','+(50+rnd()*20|0)+',20,'+(0.12+rnd()*.25)+')';g.fillRect(rnd()*w|0,rnd()*h|0,1+rnd()*2|0,4+rnd()*22|0);}}
const T={};
T.wall=tex(cv(64,64,(g,w,h)=>{g.fillStyle='#2e2721';g.fillRect(0,0,w,h);[[1,1,30,38],[33,1,30,38]].forEach(r=>{panel(g,...r,'#5a4e41','#736451','#2a231d');rivets(g,...r);});panel(g,1,41,62,22,'#463c31','#5a4d3e','#221b15');g.fillStyle='#352d25';for(let y=45;y<62;y+=5)g.fillRect(5,y,54,2);rust(g,w,40,14);grain(g,w,h,22);}));
T.floor=tex(cv(64,64,(g)=>{g.fillStyle='#1d1915';g.fillRect(0,0,64,64);[[0,0],[32,0],[0,32],[32,32]].forEach(p=>panel(g,p[0],p[1],32,32,'#3a332b','#4d4337','#18130f'));g.fillStyle='#4a4035';for(let y=3;y<64;y+=6)for(let x=(y%12?3:6);x<64;x+=6)g.fillRect(x,y,2,1);g.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<8;i++)g.fillRect(rnd()*60|0,rnd()*60|0,3+rnd()*7|0,2);grain(g,64,64,16);}));
T.concrete=tex(cv(64,64,(g)=>{g.fillStyle='#4a4741';g.fillRect(0,0,64,64);for(let i=0;i<300;i++){const v=60+rnd()*30|0;g.fillStyle='rgb('+v+','+(v-3)+','+(v-8)+')';g.fillRect(rnd()*64|0,rnd()*64|0,1+rnd()*3|0,1+rnd()*3|0);}g.fillStyle='#34312c';g.fillRect(0,0,64,1);g.fillRect(0,0,1,64);g.fillRect(0,32,64,1);grain(g,64,64,14);}));
T.grate=tex(cv(32,32,(g)=>{g.fillStyle='#16120f';g.fillRect(0,0,32,32);g.fillStyle='#5c5248';for(let i=0;i<32;i+=4){g.fillRect(i,0,1,32);g.fillRect(0,i,32,1);}g.fillStyle='#7a6d5e';for(let i=0;i<32;i+=8){g.fillRect(i,0,1,32);}panel(g,0,0,32,32,'rgba(0,0,0,0)','#8a7a66','#0d0b09');grain(g,32,32,14);}));
T.metal=tex(cv(64,64,(g)=>{panel(g,0,0,64,64,'#4f4a44','#6b645a','#25211d');panel(g,4,4,56,56,'#57514a','#6f685e','#2e2a25');for(let y=6;y<58;y+=2){g.fillStyle='rgba(255,255,255,'+(rnd()*.04)+')';g.fillRect(6,y,52,1);}rivets(g,0,0,64,64);grain(g,64,64,12);}));
T.tower=tex(cv(64,64,(g)=>{g.fillStyle='#1d2224';g.fillRect(0,0,64,64);panel(g,2,2,60,60,'#2a3134','#3c464a','#11161a');g.fillStyle='#14191c';g.fillRect(0,30,64,4);g.fillStyle='#6fd8ff';g.fillRect(6,31,52,2);g.fillStyle='#3b4a50';for(let i=8;i<60;i+=8)g.fillRect(i,6,2,20);grain(g,64,64,10);}));
const towerEm=tex(cv(64,64,(g)=>{g.fillStyle='#000';g.fillRect(0,0,64,64);g.fillStyle='#6fd8ff';g.fillRect(6,31,52,2);}));
T.trim=tex(cv(32,32,(g)=>{for(let i=-32;i<64;i+=8){g.fillStyle=(i/8)%2?'#1b1612':'#c9a227';g.beginPath();g.moveTo(i,0);g.lineTo(i+8,0);g.lineTo(i+40,32);g.lineTo(i+32,32);g.fill();}grain(g,32,32,26);}));
T.step=tex(cv(32,32,(g)=>{panel(g,0,0,32,32,'#3d362e','#564b3e','#1a1511');g.fillStyle='#c9a227';g.fillRect(0,0,32,3);g.fillStyle='#4f463b';for(let x=2;x<32;x+=4)g.fillRect(x,8,2,20);grain(g,32,32,16);}));
T.crate=tex(cv(32,32,(g)=>{panel(g,0,0,32,32,'#5a4128','#77583a','#2c1e12');g.strokeStyle='#3c2a18';g.lineWidth=3;g.strokeRect(3,3,26,26);g.beginPath();g.moveTo(3,3);g.lineTo(29,29);g.stroke();grain(g,32,32,20);}));
T.rock=tex(cv(64,64,(g)=>{g.fillStyle='#231a16';g.fillRect(0,0,64,64);for(let i=0;i<70;i++){const v=30+rnd()*30|0;g.fillStyle='rgb('+(v+8)+','+v+','+(v-4)+')';g.beginPath();g.arc(rnd()*64,rnd()*64,2+rnd()*6,0,7);g.fill();}grain(g,64,64,18);}));
T.pillar=tex(cv(32,64,(g)=>{g.fillStyle='#2b302a';g.fillRect(0,0,32,64);for(let x=2;x<32;x+=6){g.fillStyle='#41493c';g.fillRect(x,0,3,64);g.fillStyle='#181b16';g.fillRect(x+3,0,1,64);}g.fillStyle='rgba(255,90,20,.25)';g.fillRect(0,54,32,10);grain(g,32,64,18);}));
T.block=tex(cv(64,64,(g)=>{g.fillStyle='#2a2522';g.fillRect(0,0,64,64);panel(g,0,0,64,32,'#322c28','#3f3833','#1a1614');panel(g,0,32,32,32,'#2f2925','#3b3430','#181412');panel(g,32,32,32,32,'#2f2925','#3b3430','#181412');rust(g,64,64,6);grain(g,64,64,14);}));
T.roof=tex(cv(64,64,(g)=>{g.fillStyle='#211c18';g.fillRect(0,0,64,64);for(let y=0;y<64;y+=8){panel(g,0,y,64,8,'#2a241f','#352e27','#141110');}grain(g,64,64,10);}));
// --- boliche ---
T.club=tex(cv(64,64,(g)=>{g.fillStyle='#120e16';g.fillRect(0,0,64,64);for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16)panel(g,x,y,16,16,(x+y)%32?'#1b1622':'#16121c','#2a2333','#0a080d');grain(g,64,64,8);}));
T.black=tex(cv(64,64,(g)=>{g.fillStyle='#0d0b10';g.fillRect(0,0,64,64);for(let x=0;x<64;x+=8){g.fillStyle='#16131b';g.fillRect(x,0,7,64);g.fillStyle='#211c28';g.fillRect(x,0,1,64);}grain(g,64,64,6);}));
T.chrome=tex(cv(32,32,(g)=>{const gr=g.createLinearGradient(0,0,32,32);gr.addColorStop(0,'#8c8a96');gr.addColorStop(.45,'#e6e4f0');gr.addColorStop(.55,'#5d5b66');gr.addColorStop(1,'#b8b6c4');g.fillStyle=gr;g.fillRect(0,0,32,32);grain(g,32,32,8);}));
T.speaker=tex(cv(64,64,(g)=>{g.fillStyle='#111013';g.fillRect(0,0,64,64);panel(g,1,1,62,62,'#18171b','#2a2930','#060507');for(const [x,y,r] of [[32,22,15],[32,50,9]]){g.fillStyle='#050406';g.beginPath();g.arc(x,y,r,0,7);g.fill();g.strokeStyle='#3a3842';g.lineWidth=2;g.beginPath();g.arc(x,y,r-1,0,7);g.stroke();g.fillStyle='#24222a';g.beginPath();g.arc(x,y,r*.35,0,7);g.fill();}grain(g,64,64,6);}));
T.stage=tex(cv(32,32,(g)=>{panel(g,0,0,32,32,'#1d1a22','#2e2a36','#0a090c');g.fillStyle='#ff3fd2';g.fillRect(0,0,32,2);grain(g,32,32,8);}));
T.truss=tex(cv(32,32,(g)=>{g.fillStyle='#0c0b0e';g.fillRect(0,0,32,32);g.strokeStyle='#8a8894';g.lineWidth=2;g.strokeRect(1,1,30,30);g.beginPath();g.moveTo(1,1);g.lineTo(31,31);g.moveTo(31,1);g.lineTo(1,31);g.stroke();}));
T.glass=tex(cv(32,32,(g)=>{const gr=g.createLinearGradient(0,0,0,32);gr.addColorStop(0,'#2be6ff');gr.addColorStop(1,'#123a52');g.fillStyle=gr;g.fillRect(0,0,32,32);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(0,0,32,2);}));
T.mirror=tex(cv(64,64,(g)=>{const gr=g.createLinearGradient(0,0,64,64);gr.addColorStop(0,'#3a3550');gr.addColorStop(.5,'#8d86b0');gr.addColorStop(1,'#2a2640');g.fillStyle=gr;g.fillRect(0,0,64,64);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(10,0,3,64);g.fillRect(40,0,6,64);}));
T.velvet=tex(cv(32,32,(g)=>{g.fillStyle='#3a0d2e';g.fillRect(0,0,32,32);for(let i=0;i<32;i+=8){g.fillStyle='#4f1440';g.fillRect(0,i,32,4);}g.fillStyle='#d4a33a';g.fillRect(0,0,32,1);grain(g,32,32,10);}));
T.lift=tex(cv(32,32,(g)=>{for(let i=-32;i<64;i+=8){g.fillStyle=(i/8)%2?'#1b1612':'#2be6ff';g.beginPath();g.moveTo(i,0);g.lineTo(i+8,0);g.lineTo(i+40,32);g.lineTo(i+32,32);g.fill();}}));
const ledCanvas=cv(64,64,()=>{}),ledTex=new THREE.CanvasTexture(ledCanvas);ledTex.magFilter=THREE.NearestFilter;ledTex.wrapS=ledTex.wrapT=THREE.RepeatWrapping;
const LEDC=['#ff2bd6','#2be6ff','#8a4bff','#ffcf3a','#ff4a6a','#3aff9c'];
function paintLED(beat){const g=ledCanvas.getContext('2d');for(let y=0;y<4;y++)for(let x=0;x<4;x++){const on=((x+y+beat)%3===0)||Math.random()<.25;g.fillStyle=on?LEDC[(x*3+y+beat)%LEDC.length]:'#140f1a';g.fillRect(x*16,y*16,16,16);g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x*16,y*16,16,1);g.fillRect(x*16,y*16,1,16);}ledTex.needsUpdate=true;}
paintLED(0);
// --- universidad: revoque blanco, zócalo azul, baldosas, vereda de ladrillo ---
T.whitewall=tex(cv(64,64,(g)=>{g.fillStyle='#dcdedc';g.fillRect(0,0,64,64);for(let i=0;i<500;i++){const v=200+rnd()*30|0;g.fillStyle='rgba('+v+','+v+','+(v-2)+',.5)';g.fillRect(rnd()*64|0,rnd()*64|0,1+rnd()*2|0,1+rnd()*2|0);}g.fillStyle='rgba(0,0,0,.04)';g.fillRect(0,62,64,2);}));
T.navy=tex(cv(32,32,(g)=>{g.fillStyle='#1d2737';g.fillRect(0,0,32,32);g.fillStyle='#253246';g.fillRect(0,0,32,1);grain(g,32,32,8);}));
T.tiles=tex(cv(64,64,(g)=>{for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){const v=rnd()*14|0;g.fillStyle='rgb('+(200+v)+','+(172+v)+','+(132+v)+')';g.fillRect(x,y,16,16);g.fillStyle='#a2876a';g.fillRect(x,y,16,1);g.fillRect(x,y,1,16);}grain(g,64,64,10);}));
T.brick=tex(cv(64,64,(g)=>{g.fillStyle='#7a3e2e';g.fillRect(0,0,64,64);for(let y=0;y<64;y+=8)for(let x=(y/8)%2?-8:0;x<64;x+=16){const v=rnd()*20|0;g.fillStyle='rgb('+(165+v)+','+(84+v/2)+','+(62+v/3)+')';g.fillRect(x+1,y+1,14,6);}grain(g,64,64,10);}));
T.smooth=tex(cv(64,64,(g)=>{g.fillStyle='#8d8f90';g.fillRect(0,0,64,64);for(let i=0;i<200;i++){const v=120+rnd()*40|0;g.fillStyle='rgba('+v+','+v+','+v+',.35)';g.fillRect(rnd()*64|0,rnd()*64|0,2,2);}g.fillStyle='rgba(0,0,0,.12)';g.fillRect(0,0,64,1);grain(g,64,64,8);}));
T.rail=tex(cv(16,16,(g)=>{g.fillStyle='#5f666c';g.fillRect(0,0,16,16);g.fillStyle='#8a9198';g.fillRect(0,0,16,3);}));
T.fence=(()=>{const c=cv(32,32,(g)=>{g.clearRect(0,0,32,32);g.strokeStyle='#a9b0b5';g.lineWidth=1.5;for(let i=-32;i<64;i+=8){g.beginPath();g.moveTo(i,0);g.lineTo(i+32,32);g.stroke();g.beginPath();g.moveTo(i+32,0);g.lineTo(i,32);g.stroke();}});return tex(c);})();
T.wood=tex(cv(32,32,(g)=>{g.fillStyle='#6e4a2c';g.fillRect(0,0,32,32);for(let y=0;y<32;y+=2){g.fillStyle='rgba('+(90+rnd()*40|0)+',60,30,.35)';g.fillRect(0,y,32,1);}g.fillStyle='#4a301b';g.fillRect(0,31,32,1);}));
T.board=tex(cv(32,32,(g)=>{g.fillStyle='#22382c';g.fillRect(0,0,32,32);g.fillStyle='rgba(255,255,255,.12)';for(let i=0;i<6;i++)g.fillRect(rnd()*28|0,rnd()*28|0,4+rnd()*8|0,1);g.fillStyle='#8a6a44';g.fillRect(0,0,32,2);}));
T.canyon=tex(cv(64,64,(g)=>{const L=['#b0532c','#c4693a','#9a4424','#d08a4a','#a64a28','#c86f3c','#8e3c20','#d49a5a'];for(let y=0;y<64;y+=8){g.fillStyle=L[(y/8)%L.length];g.fillRect(0,y,64,8);}for(let i=0;i<260;i++){g.fillStyle='rgba('+(rnd()<.5?'60,20,10':'240,190,140')+','+(.08+rnd()*.12)+')';g.fillRect(rnd()*64|0,rnd()*64|0,2+rnd()*6|0,1+rnd()*2|0);}}));
T.grass=tex(cv(32,32,(g)=>{g.fillStyle='#5f9a3a';g.fillRect(0,0,32,32);for(let i=0;i<140;i++){g.fillStyle=['#6fae44','#4f8a30','#7cbc4e','#57923a'][rnd()*4|0];g.fillRect(rnd()*32|0,rnd()*32|0,1+rnd()*2|0,1+rnd()*3|0);}}));
T.barn=tex(cv(32,32,(g)=>{g.fillStyle='#a8302a';g.fillRect(0,0,32,32);for(let x=0;x<32;x+=8){g.fillStyle='#7e2018';g.fillRect(x,0,1,32);g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x+1,0,2,32);}for(let i=0;i<40;i++){g.fillStyle='rgba(60,10,8,.25)';g.fillRect(rnd()*32|0,rnd()*32|0,1,2+rnd()*4|0);}}));
T.falls=tex(cv(32,64,(g)=>{g.fillStyle='rgba(120,200,255,.78)';g.fillRect(0,0,32,64);for(let i=0;i<70;i++){g.fillStyle='rgba(235,250,255,'+(.35+rnd()*.5)+')';g.fillRect(rnd()*32|0,rnd()*64|0,1+rnd()*2|0,6+rnd()*18|0);}}));
T.barnB=tex(cv(32,32,(g)=>{g.fillStyle='#2f5fa8';g.fillRect(0,0,32,32);for(let x=0;x<32;x+=8){g.fillStyle='#1f4078';g.fillRect(x,0,1,32);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x+1,0,2,32);}for(let i=0;i<40;i++){g.fillStyle='rgba(10,20,50,.25)';g.fillRect(rnd()*32|0,rnd()*32|0,1,2+rnd()*4|0);}}));
T.hay=tex(cv(32,32,(g)=>{g.fillStyle='#d8b450';g.fillRect(0,0,32,32);for(let i=0;i<120;i++){g.fillStyle=['#e8c868','#c09a3a','#f0d880','#b08a30'][rnd()*4|0];g.fillRect(rnd()*32|0,rnd()*32|0,3+rnd()*6|0,1);}g.fillStyle='#8a6a22';g.fillRect(0,10,32,1);g.fillRect(0,22,32,1);}));
T.soil=tex(cv(32,32,(g)=>{g.fillStyle='#3b2a1c';g.fillRect(0,0,32,32);grain(g,32,32,30);}));
T.roofTiles=tex(cv(32,32,(g)=>{for(let y=0;y<32;y+=6){g.fillStyle=y%12?'#9c4b31':'#8a3f28';g.fillRect(0,y,32,6);g.fillStyle='#6a2c1a';g.fillRect(0,y+5,32,1);for(let x=(y%12?0:4);x<32;x+=8)g.fillRect(x,y,1,6);}}));
T.booth=tex(cv(32,32,(g)=>{g.fillStyle='#dfe3e6';g.fillRect(0,0,32,32);g.fillStyle='#2b3a4c';g.fillRect(6,6,20,12);g.fillStyle='#b9c0c6';for(let x=0;x<32;x+=4)g.fillRect(x,20,1,12);}));
// basalto: piedra negra con grietas de magma que brillan
const basaltCanvas=cv(64,64,(g)=>{g.fillStyle='#17110e';g.fillRect(0,0,64,64);for(let i=0;i<60;i++){const v=22+rnd()*22|0;g.fillStyle='rgb('+(v+6)+','+v+','+(v-3)+')';g.fillRect(rnd()*64|0,rnd()*64|0,2+rnd()*6|0,2+rnd()*6|0);}
  g.lineWidth=1.6;for(let k=0;k<7;k++){g.strokeStyle=k%2?'#ff6a10':'#ffae2a';g.beginPath();let x=rnd()*64,y=rnd()*64;g.moveTo(x,y);for(let j=0;j<5;j++){x+=rnd()*22-11;y+=rnd()*22-11;g.lineTo(x,y);}g.stroke();}});
T.basalt=tex(basaltCanvas);
const basaltEm=tex(cv(64,64,(g)=>{g.drawImage(basaltCanvas,0,0);const d=g.getImageData(0,0,64,64);for(let i=0;i<d.data.length;i+=4){const hot=d.data[i]>150;d.data[i]=hot?d.data[i]:0;d.data[i+1]=hot?d.data[i+1]*.6:0;d.data[i+2]=0;}g.putImageData(d,0,0);}));
const lavaCanvas=cv(64,64,(g)=>{g.fillStyle='#7a1a05';g.fillRect(0,0,64,64);for(let i=0;i<120;i++){const c=['#c23a0a','#ff6a10','#ffae2a','#9a2205','#ff8c1a'][rnd()*5|0];g.fillStyle=c;g.beginPath();g.arc(rnd()*64,rnd()*64,1+rnd()*5,0,7);g.fill();}});
const lavaTex=tex(lavaCanvas);
const MATS={
  wall:{t:T.wall,sc:3,shin:10},floor:{t:T.floor,sc:2,shin:22},concrete:{t:T.concrete,sc:4,shin:4},grate:{t:T.grate,sc:1.2,shin:30},
  metal:{t:T.metal,sc:2,shin:40},tower:{t:T.tower,sc:3,shin:30,em:towerEm},trim:{t:T.trim,sc:1,shin:10},step:{t:T.step,sc:1,shin:14},
  crate:{t:T.crate,sc:1.5,shin:6},rock:{t:T.rock,sc:3,shin:4},basalt:{t:T.basalt,sc:1.8,shin:10,em:basaltEm},pillar:{t:T.pillar,sc:2,shin:12},block:{t:T.block,sc:4,shin:4},roof:{t:T.roof,sc:3,shin:4},
  club:{t:T.club,sc:2,shin:60},black:{t:T.black,sc:2,shin:50},chrome:{t:T.chrome,sc:1,shin:120},speaker:{t:T.speaker,sc:1.5,shin:8},stage:{t:T.stage,sc:1,shin:30},
  truss:{t:T.truss,sc:.75,shin:60},glass:{t:T.glass,sc:1,shin:120,emc:0x0a3a4a},mirror:{t:T.mirror,sc:2,shin:140},velvet:{t:T.velvet,sc:1,shin:20},
  lift:{t:T.lift,sc:1,shin:30,emc:0x0a2a33},led:{t:ledTex,sc:2,shin:90,em:ledTex},
  whitewall:{t:T.whitewall,sc:3,shin:6},navy:{t:T.navy,sc:1,shin:40},tiles:{t:T.tiles,sc:2.4,shin:14},brick:{t:T.brick,sc:2,shin:6},smooth:{t:T.smooth,sc:3,shin:8},
  rail:{t:T.rail,sc:1,shin:70},fence:{t:T.fence,sc:1.2,shin:40,alpha:true},wood:{t:T.wood,sc:1,shin:20},board:{t:T.board,sc:1.5,shin:10},soil:{t:T.soil,sc:1.5,shin:2},
  canyon:{t:T.canyon,sc:6,shin:4},falls:{t:T.falls,sc:3,shin:80,alpha:true,emc:0x1a5a7a},grass:{t:T.grass,sc:2,shin:4},barn:{t:T.barn,sc:2,shin:8},barnB:{t:T.barnB,sc:2,shin:8},hay:{t:T.hay,sc:1.2,shin:4},
  roofTiles:{t:T.roofTiles,sc:1.5,shin:6},booth:{t:T.booth,sc:2,shin:20},
  tube:{t:tex(cv(16,64,(g)=>{g.fillStyle='rgba(120,220,255,.28)';g.fillRect(0,0,16,64);g.fillStyle='rgba(200,245,255,.55)';g.fillRect(0,0,16,2);g.fillRect(0,0,2,64);})),sc:1.3,shin:140,alpha:true,emc:0x0a3040}
};
const NEON={neonP:0xff3fd2,neonC:0x2be6ff,light:0xffd7a0,neonR:0xff3a2a,neonB:0x2a7bff};
const waterCanvas=cv(64,64,(g)=>{g.fillStyle='#1d3a3a';g.fillRect(0,0,64,64);for(let i=0;i<90;i++){g.fillStyle=['#24504c','#2c5e58','#173130','#3a7068'][rnd()*4|0];g.fillRect(rnd()*64|0,rnd()*64|0,4+rnd()*14|0,1+rnd()*2|0);}g.fillStyle='rgba(255,210,150,.25)';for(let i=0;i<14;i++)g.fillRect(rnd()*64|0,rnd()*64|0,3+rnd()*6|0,1);});
const waterTex=tex(waterCanvas);waterTex.magFilter=THREE.LinearFilter;

/* =================== CIELOS =================== */
function skyDusk(){return cv(1024,512,(g,w,h)=>{
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#07060f');gr.addColorStop(.38,'#1b1430');gr.addColorStop(.47,'#5a2a2a');gr.addColorStop(.5,'#c2602a');gr.addColorStop(.52,'#3a1d16');gr.addColorStop(1,'#120c0a');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<500;i++){const y=rnd()*h*.42;g.fillStyle='rgba(255,240,220,'+(rnd()*.9*(1-y/(h*.45)))+')';g.fillRect(rnd()*w|0,y|0,1,1);}
  g.fillStyle='#160d0b';g.beginPath();g.moveTo(0,h*.5);for(let x=0;x<=w;x+=16)g.lineTo(x,h*.5-8-Math.abs(Math.sin(x*.011)*22+Math.sin(x*.043)*9));g.lineTo(w,h*.56);g.lineTo(0,h*.56);g.fill();
  g.fillStyle='#0f0908';g.fillRect(300,h*.5-26,260,26);
  for(let x=304;x<560;x+=18){g.fillStyle='#1a100c';g.fillRect(x,h*.5-24,8,22);g.fillStyle='rgba(255,170,90,.55)';g.fillRect(x+3,h*.5-20,2,3);}
  g.strokeStyle='#120a08';g.lineWidth=2;for(const tx of [120,700,860]){g.beginPath();g.moveTo(tx-10,h*.5);g.lineTo(tx,h*.5-60);g.lineTo(tx+10,h*.5);g.moveTo(tx-14,h*.5-46);g.lineTo(tx+14,h*.5-46);g.stroke();}
});}
function skyNight(){return cv(1024,512,(g,w,h)=>{
  // noche de Posadas: costanera, el río y el puente a Encarnación
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#03020a');gr.addColorStop(.4,'#140b2a');gr.addColorStop(.49,'#3a1648');gr.addColorStop(.5,'#0a0712');gr.addColorStop(1,'#050308');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<700;i++){const y=rnd()*h*.45;g.fillStyle='rgba(230,220,255,'+(rnd()*.9*(1-y/(h*.46)))+')';g.fillRect(rnd()*w|0,y|0,1,1);}
  for(let x=0;x<w;x+=6){const bh=6+rnd()*rnd()*60;g.fillStyle='#08060d';g.fillRect(x,h*.5-bh,6,bh);for(let k=0;k<bh/5;k++)if(rnd()<.35){g.fillStyle=['#ffcf7a','#ff7ad6','#7ad6ff'][rnd()*3|0];g.fillRect(x+1+(rnd()*4|0),h*.5-bh+k*5+1,1,1);}}
  g.strokeStyle='#120c1c';g.lineWidth=2;g.beginPath();g.moveTo(560,h*.5-4);g.lineTo(900,h*.5-4);g.stroke();
  for(const px of [640,820]){g.beginPath();g.moveTo(px,h*.5-4);g.lineTo(px,h*.5-48);g.stroke();for(let k=-6;k<=6;k++){g.beginPath();g.moveTo(px,h*.5-46);g.lineTo(px+k*12,h*.5-6);g.stroke();}}
  for(let x=560;x<900;x+=8){g.fillStyle='rgba(255,200,120,.7)';g.fillRect(x,h*.5-6,1,1);}
  g.fillStyle='rgba(255,63,210,.12)';g.fillRect(0,h*.48,w,h*.03);
});}


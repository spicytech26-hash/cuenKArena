/* =================== MENÚ · FONDO ANIMADO (brasas, murciélagos, relámpagos, lluvia de sangre y ojos en la oscuridad) =================== */
// Se dibuja solo mientras el menú está abierto: al cerrarlo el bucle se corta solo y showMenu() lo vuelve a arrancar.
// Paralaje: el mouse mueve apenas la luna y el logo (variables --mx / --my del menú).
(function(){
  const m=$('menu');let raf=0,tx=0,ty=0;
  addEventListener('mousemove',e=>{if(m.hidden||raf)return;tx=e.clientX/innerWidth*2-1;ty=e.clientY/innerHeight*2-1;
    raf=requestAnimationFrame(()=>{raf=0;m.style.setProperty('--mx',tx.toFixed(3));m.style.setProperty('--my',ty.toFixed(3));});},{passive:true});
})();
let mFxOn=false;
function mFxGo(){
  const cv=$('mFx');
  if(mFxOn||!cv||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
  const g=cv.getContext('2d');if(!g)return;
  mFxOn=true;
  const menu=$('menu');
  let w=0,h=0,last=performance.now(),flash=0,bolt=null,nextFlash=last+3500+Math.random()*5000,nextBat=last+1200,nextRain=last+800,nextEyes=last+4000;
  const em=[],bats=[],rain=[],eyes=[];
  function size(){
    const dpr=Math.min(1.5,window.devicePixelRatio||1);w=cv.clientWidth;h=cv.clientHeight;
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);g.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.max(30,Math.min(110,Math.round(w*h/14000)));
    while(em.length<n)em.push(newEmber(true));
    em.length=n;
  }
  function newEmber(any){
    const slime=Math.random()<.1,red=!slime&&Math.random()<.3;
    return {x:Math.random()*w,y:any?Math.random()*h:h+10,vy:-(22+Math.random()*70),r:.8+Math.random()*2.4,ph:Math.random()*6.28,sw:6+Math.random()*26,hue:slime?95:red?4:18+Math.random()*28,a:.35+Math.random()*.55};
  }
  function newBat(){
    const dir=Math.random()<.5?1:-1;
    return {x:dir>0?-90:w+90,y:h*(.08+Math.random()*.4),vx:dir*(110+Math.random()*100),dir,s:9+Math.random()*8,ph:Math.random()*6.28,wob:Math.random()*6.28};
  }
  // silueta de murciélago en unidades de "ala": s las escala; f (-1..1) es el aleteo
  function drawBat(b,t){
    const f=Math.sin(t*.018+b.ph);
    g.save();g.translate(b.x,b.y+Math.sin(t*.002+b.wob)*14);g.scale(b.dir*b.s,b.s);g.fillStyle='#240b1c';
    g.beginPath();g.moveTo(0,0);
    g.quadraticCurveTo(1.2,-1.6-f*1.4,3.2,-1-f*2.2);g.quadraticCurveTo(2.5,-.2-f*1.2,2.2,.5-f*.8);g.quadraticCurveTo(1.6,.1,1,.9-f*.4);g.quadraticCurveTo(.5,.3,0,.9);
    g.quadraticCurveTo(-.5,.3,-1,.9-f*.4);g.quadraticCurveTo(-1.6,.1,-2.2,.5-f*.8);g.quadraticCurveTo(-2.5,-.2-f*1.2,-3.2,-1-f*2.2);g.quadraticCurveTo(-1.2,-1.6-f*1.4,0,0);
    g.fill();
    g.beginPath();g.arc(0,-.15,.5,0,6.3);g.moveTo(-.4,-.45);g.lineTo(-.3,-1);g.lineTo(-.05,-.55);g.moveTo(.4,-.45);g.lineTo(.3,-1);g.lineTo(.05,-.55);g.fill();
    g.restore();
  }
  // rayo: línea quebrada de arriba hacia abajo, con una rama
  function newBolt(){
    const pts=[];let x=w*(.1+Math.random()*.8),y=0;pts.push([x,y]);
    while(y<h*(.45+Math.random()*.3)){x+=(Math.random()-.5)*70;y+=24+Math.random()*34;pts.push([x,y]);}
    const k=2+Math.floor(Math.random()*(pts.length-3)),br=[pts[k].slice()];let bx=pts[k][0],by=pts[k][1];
    for(let i=0;i<4;i++){bx+=(Math.random()<.5?-1:1)*(10+Math.random()*34);by+=18+Math.random()*26;br.push([bx,by]);}
    return {pts,br};
  }
  function strokePts(p){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.stroke();}
  function frame(now){
    if(menu.hidden){mFxOn=false;removeEventListener('resize',size);g.clearRect(0,0,w,h);return;}
    const dt=Math.min(.05,(now-last)/1000);last=now;
    g.clearRect(0,0,w,h);
    // relámpago: destello rojizo-violeta + rayo; el logo se enciende un instante
    if(now>nextFlash){flash=1;bolt=newBolt();nextFlash=now+5000+Math.random()*8000;menu.classList.add('zap');setTimeout(()=>menu.classList.remove('zap'),140);}
    if(flash>.01){
      g.fillStyle='rgba(200,150,255,'+(flash*flash*.14).toFixed(3)+')';g.fillRect(0,0,w,h);
      if(bolt&&flash>.25){
        g.lineJoin='round';g.lineCap='round';
        g.strokeStyle='rgba(190,120,255,'+(flash*.35).toFixed(3)+')';g.lineWidth=9;strokePts(bolt.pts);strokePts(bolt.br);
        g.strokeStyle='rgba(255,255,255,'+Math.min(1,flash*1.1).toFixed(3)+')';g.lineWidth=2.2;strokePts(bolt.pts);g.lineWidth=1.4;strokePts(bolt.br);
      }
      flash*=Math.pow(.015,dt);
    }
    // murciélagos
    if(now>nextBat&&bats.length<4){bats.push(newBat());nextBat=now+3000+Math.random()*5000;}
    for(let i=bats.length-1;i>=0;i--){const b=bats[i];b.x+=b.vx*dt;if(b.x<-140||b.x>w+140){bats.splice(i,1);continue;}drawBat(b,now);}
    // ojos rojos que se abren y parpadean en la oscuridad
    if(now>nextEyes&&eyes.length<2){eyes.push({x:w*(.04+Math.random()*.92),y:h*(.58+Math.random()*.34),t0:now,life:2600+Math.random()*1600,sp:10+Math.random()*10});nextEyes=now+5000+Math.random()*8000;}
    for(let i=eyes.length-1;i>=0;i--){
      const e=eyes[i],u=(now-e.t0)/e.life;if(u>=1){eyes.splice(i,1);continue;}
      let a=Math.min(1,u*5,(1-u)*5);if(u>.4&&u<.5)a*=.1;   // parpadeo
      for(const dx of [-e.sp/2,e.sp/2]){
        const gr=g.createRadialGradient(e.x+dx,e.y,0,e.x+dx,e.y,12);gr.addColorStop(0,'rgba(255,60,30,'+(a*.9).toFixed(3)+')');gr.addColorStop(1,'rgba(255,0,0,0)');
        g.fillStyle=gr;g.fillRect(e.x+dx-12,e.y-12,24,24);
        g.fillStyle='rgba(255,200,170,'+a.toFixed(3)+')';g.fillRect(e.x+dx-2.5,e.y-1,5,2);
      }
    }
    // lluvia de sangre: gotas finas que caen rápido y salpican abajo
    if(now>nextRain){const n=1+Math.floor(Math.random()*3);for(let i=0;i<n;i++)rain.push({x:Math.random()*w,y:-20,v:380+Math.random()*320,len:14+Math.random()*30});nextRain=now+600+Math.random()*1400;}
    g.lineCap='round';
    for(let i=rain.length-1;i>=0;i--){
      const r=rain[i];r.y+=r.v*dt;
      if(r.y>h-4){for(let k=0;k<4;k++)em.length<140&&em.push({x:r.x,y:h-4,vy:-(40+Math.random()*120),r:1+Math.random()*1.4,ph:0,sw:(Math.random()-.5)*60,hue:2,a:.9});rain.splice(i,1);continue;}
      const gr=g.createLinearGradient(0,r.y-r.len,0,r.y);gr.addColorStop(0,'rgba(200,10,10,0)');gr.addColorStop(1,'rgba(230,20,16,.85)');
      g.strokeStyle=gr;g.lineWidth=2;g.beginPath();g.moveTo(r.x,r.y-r.len);g.lineTo(r.x,r.y);g.stroke();
    }
    // brasas que suben (las verdes son "ectoplasma", las rojas salpicaduras)
    g.globalCompositeOperation='lighter';
    for(let i=em.length-1;i>=0;i--){
      const e=em[i];e.y+=e.vy*dt;e.x+=Math.sin(now*.001+e.ph)*e.sw*dt;
      if(e.y<-12){if(em.length>Math.max(30,Math.min(110,Math.round(w*h/14000)))){em.splice(i,1);}else Object.assign(e,newEmber(false));continue;}
      const fade=Math.min(1,e.y/(h*.35)),col=e.hue+',100%,'+(e.hue>80?'60%':'55%');
      g.fillStyle='hsla('+col+','+(e.a*.18*fade).toFixed(3)+')';g.beginPath();g.arc(e.x,e.y,e.r*4,0,6.3);g.fill();
      g.fillStyle='hsla('+col+','+(e.a*fade).toFixed(3)+')';g.beginPath();g.arc(e.x,e.y,e.r,0,6.3);g.fill();
    }
    g.globalCompositeOperation='source-over';
    requestAnimationFrame(frame);
  }
  size();addEventListener('resize',size);requestAnimationFrame(frame);
}
mFxGo();

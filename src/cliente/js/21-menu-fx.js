/* =================== MENÚ · FONDO ANIMADO (brasas, murciélagos y relámpagos lejanos) =================== */
// Se dibuja solo mientras el menú está abierto: al cerrarlo el bucle se corta solo y showMenu() lo vuelve a arrancar.
let mFxOn=false;
function mFxGo(){
  const cv=$('mFx');
  if(mFxOn||!cv||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
  const g=cv.getContext('2d');if(!g)return;
  mFxOn=true;
  let w=0,h=0,last=performance.now(),flash=0,nextFlash=last+5000+Math.random()*7000,nextBat=last+1500;
  const em=[],bats=[];
  function size(){
    const dpr=Math.min(1.5,window.devicePixelRatio||1);w=cv.clientWidth;h=cv.clientHeight;
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);g.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.max(24,Math.min(80,Math.round(w*h/18000)));
    while(em.length<n)em.push(newEmber(true));
    em.length=n;
  }
  function newEmber(any){
    const slime=Math.random()<.12;
    return {x:Math.random()*w,y:any?Math.random()*h:h+10,vy:-(18+Math.random()*52),r:.8+Math.random()*2.2,ph:Math.random()*6.28,sw:6+Math.random()*22,hue:slime?95:18+Math.random()*28,a:.35+Math.random()*.55};
  }
  function newBat(){
    const dir=Math.random()<.5?1:-1;
    return {x:dir>0?-90:w+90,y:h*(.08+Math.random()*.38),vx:dir*(90+Math.random()*80),dir,s:9+Math.random()*7,ph:Math.random()*6.28,wob:Math.random()*6.28};
  }
  // silueta de murciélago en unidades de "ala": s las escala; f (-1..1) es el aleteo
  function drawBat(b,t){
    const f=Math.sin(t*.016+b.ph);
    g.save();g.translate(b.x,b.y+Math.sin(t*.002+b.wob)*14);g.scale(b.dir*b.s,b.s);g.fillStyle='#1c0b2b';
    g.beginPath();g.moveTo(0,0);
    g.quadraticCurveTo(1.2,-1.6-f*1.4,3.2,-1-f*2.2);g.quadraticCurveTo(2.5,-.2-f*1.2,2.2,.5-f*.8);g.quadraticCurveTo(1.6,.1,1,.9-f*.4);g.quadraticCurveTo(.5,.3,0,.9);
    g.quadraticCurveTo(-.5,.3,-1,.9-f*.4);g.quadraticCurveTo(-1.6,.1,-2.2,.5-f*.8);g.quadraticCurveTo(-2.5,-.2-f*1.2,-3.2,-1-f*2.2);g.quadraticCurveTo(-1.2,-1.6-f*1.4,0,0);
    g.fill();
    g.beginPath();g.arc(0,-.15,.5,0,6.3);g.moveTo(-.4,-.45);g.lineTo(-.3,-1);g.lineTo(-.05,-.55);g.moveTo(.4,-.45);g.lineTo(.3,-1);g.lineTo(.05,-.55);g.fill();
    g.restore();
  }
  function frame(now){
    if($('menu').hidden){mFxOn=false;removeEventListener('resize',size);g.clearRect(0,0,w,h);return;}
    const dt=Math.min(.05,(now-last)/1000);last=now;
    g.clearRect(0,0,w,h);
    // relámpago lejano: un destello violeta que se apaga rápido
    if(now>nextFlash){flash=1;nextFlash=now+6000+Math.random()*9000;}
    if(flash>.01){g.fillStyle='rgba(190,160,255,'+(flash*flash*.13).toFixed(3)+')';g.fillRect(0,0,w,h);flash*=Math.pow(.02,dt);}
    // murciélagos
    if(now>nextBat&&bats.length<3){bats.push(newBat());nextBat=now+4500+Math.random()*7000;}
    for(let i=bats.length-1;i>=0;i--){const b=bats[i];b.x+=b.vx*dt;if(b.x<-140||b.x>w+140){bats.splice(i,1);continue;}drawBat(b,now);}
    // brasas que suben (las verdes son "ectoplasma")
    g.globalCompositeOperation='lighter';
    for(const e of em){
      e.y+=e.vy*dt;e.x+=Math.sin(now*.001+e.ph)*e.sw*dt;
      if(e.y<-12){Object.assign(e,newEmber(false));continue;}
      const fade=Math.min(1,e.y/(h*.35)),col=e.hue+',100%,'+(e.hue>80?'60%':'58%');
      g.fillStyle='hsla('+col+','+(e.a*.18*fade).toFixed(3)+')';g.beginPath();g.arc(e.x,e.y,e.r*4,0,6.3);g.fill();
      g.fillStyle='hsla('+col+','+(e.a*fade).toFixed(3)+')';g.beginPath();g.arc(e.x,e.y,e.r,0,6.3);g.fill();
    }
    g.globalCompositeOperation='source-over';
    requestAnimationFrame(frame);
  }
  size();addEventListener('resize',size);requestAnimationFrame(frame);
}
mFxGo();

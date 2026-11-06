/* =================== BUCLE PRINCIPAL =================== */
let last=performance.now(),attractT=0;
function attract(dt){attractT+=dt*.06;const club=level&&level.club;const R0=club?13:22;camera.position.set(Math.cos(attractT)*R0,club?6:9+Math.sin(attractT*.7)*2,Math.sin(attractT)*R0*(club?.8:1));camera.lookAt(0,club?7:4,0);camera.rotation.order='YXZ';sky.position.copy(camera.position);}
function frame(now){
  requestAnimationFrame(frame);
  const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;G.time+=dt;
  // la resolución dinámica solo mira cuadros "normales": un tirón suelto (morir, abrir la tienda, cambiar de mapa) no la baja,
  // y al cambiar de estado (vivo/muerto, tienda, pausa, fin de partida) se vuelve a empezar la cuenta
  const drSt=(me.alive?1:0)|(G.shopOn?2:0)|(paused?4:0)|(matchState==='inter'?8:0);if(drSt!==DR.st){DR.st=drSt;DR.acc=DR.n=0;}
  if(inGame&&!paused&&raw<.1&&!G.shopOn){DR.acc+=raw;DR.n++;
    if(DR.acc>=1){const avg=DR.acc/DR.n,t=performance.now();DR.fps=Math.round(1/avg);DR.acc=DR.n=0;
      if(avg>1/52&&DR.s>.6){if(t-DR.upT<9000)DR.block=t+45000;DR.s=Math.max(.6,DR.s-.1);DR.good=0;resize();}
      else if(avg<1/57&&DR.s<1&&t>DR.block){if(++DR.good>=3){DR.good=0;DR.s=Math.min(1,DR.s+.05);DR.upT=t;resize();}}
      else DR.good=0;
      if(S.fpsOn){const e=$('fpsBox');e.hidden=false;e.textContent=DR.fps+' FPS'+(DR.s<1?' · res '+Math.round(DR.s*100)+'%':'');}}}
  if(net)net.update(dt);
  updMovers();
  if(inGame&&!paused){
    updMe(dt);updProjs(dt);updFires(dt);updCards(dt);updRemote(dt);updMiModelo(dt);updCamera(dt);updViewmodel(dt);updNight(dt);
    G.pingT-=dt;if(online&&G.pingT<=0&&net){G.pingT=2;net.send({t:'ping',c:performance.now(),r:ping});}
    if(Math.floor(G.time*2)!==Math.floor((G.time-dt)*2))updateHUD();
  }else if(!inGame){attract(dt);vms.forEach(v=>v.visible=false);flashMesh.visible=false;}
  updClub(dt,beatNow());musicTick();updFlags();
  updEffects(dt);renderLocker(dt);
  updLightSlots(dt);
  if(inGame&&paused&&(G.pf=((G.pf||0)+1)%3))return;   // en pausa la escena está quieta: se redibuja a 1/3 de los cuadros
  if(G.shopOn)return;   // con la tienda abierta la escena 3D está tapada: no se dibuja (así abrir B no pesa)
  renderer.clear();renderer.render(scene,camera);
  if(inGame&&!me.alive&&G.pov)povGun(paused?0:dt);   // arma del que te mató (o del que mirás) en primera persona
  if(inGame&&(me.alive||G.pov)&&TP.blend<.5){renderer.clearDepth();renderer.render(wScene,wCam);}   // en tercera persona no hay arma ni manos en pantalla
  drawMerc();   // el Mercader del Umbral, cuando te está ofreciendo cartas
}
requestAnimationFrame(frame);
setTimeout(warmIcons,2500);   // los íconos de la tienda se arman mientras estás en el menú
})();

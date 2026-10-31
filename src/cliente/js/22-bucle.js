/* =================== BUCLE PRINCIPAL =================== */
let last=performance.now(),attractT=0;
function attract(dt){attractT+=dt*.06;const club=level&&level.club;const R0=club?13:22;camera.position.set(Math.cos(attractT)*R0,club?6:9+Math.sin(attractT*.7)*2,Math.sin(attractT)*R0*(club?.8:1));camera.lookAt(0,club?7:4,0);camera.rotation.order='YXZ';sky.position.copy(camera.position);}
function frame(now){
  requestAnimationFrame(frame);
  const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;G.time+=dt;
  if(inGame&&!paused&&raw<.5){DR.acc+=raw;DR.n++;
    if(DR.acc>=1.5){const avg=DR.acc/DR.n,t=performance.now();DR.fps=Math.round(1/avg);DR.acc=DR.n=0;
      if(avg>1/50&&DR.s>.75){if(t-DR.upT<9000)DR.block=t+45000;DR.s=Math.max(.75,DR.s-.08);DR.good=0;resize();}
      else if(avg<1/57&&DR.s<1&&t>DR.block){if(++DR.good>=3){DR.good=0;DR.s=Math.min(1,DR.s+.05);DR.upT=t;resize();}}
      else DR.good=0;
      if(S.fpsOn){const e=$('fpsBox');e.hidden=false;e.textContent=DR.fps+' FPS'+(DR.s<1?' · res '+Math.round(DR.s*100)+'%':'');}}}
  if(net)net.update(dt);
  updMovers();
  if(inGame&&!paused){
    updMe(dt);updProjs(dt);updFires(dt);updRemote(dt);updCamera(dt);updViewmodel(dt);
    G.pingT-=dt;if(online&&G.pingT<=0&&net){G.pingT=2;net.send({t:'ping',c:performance.now(),r:ping});}
    if(Math.floor(G.time*2)!==Math.floor((G.time-dt)*2))updateHUD();
  }else if(!inGame){attract(dt);vms.forEach(v=>v.visible=false);flashMesh.visible=false;}
  updClub(dt,beatNow());musicTick();updFlags();
  updEffects(dt);renderLocker(dt);
  updLightSlots(dt);
  renderer.clear();renderer.render(scene,camera);
  if(inGame&&!me.alive&&G.pov)povGun(paused?0:dt);   // arma del que te mató (o del que mirás) en primera persona
  if(inGame&&(me.alive||G.pov)){renderer.clearDepth();renderer.render(wScene,wCam);}
}
requestAnimationFrame(frame);
})();

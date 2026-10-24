/* ---------- mensajes del servidor ---------- */
function onMsg(m){
  switch(m.t){
    case 'welcome':
      myId=m.id;fragLimit=m.fl;timeLeft=m.tl;matchState=m.state;
      MODE=m.mode||'arena';myTeam=m.team!=null?m.team:-1;FL=m.fs||[];TS=m.ts||[0,0];capLimit=m.cl||5;
      loadMap(m.map);applyMode();
      if(typeof m.tm==='number'&&online)CLK.off=m.tm-performance.now()/1000-.05;
      m.roster.forEach(r=>{if(r[0]!==myId)ensurePlayer(r[0],r[1],r[2],r[3],r[4],r[5]);});
      syncItems(m);clearShards();if(m.sh)for(const s of m.sh)addShard(s[0],s[1],s[2],s[3],s[1],s[2],s[3],s[4]);
      sysChat((online?'Conectado a '+location.host:'Práctica · '+S.bots+' bots')+' · '+C.MODES[MODE].name+' · '+W.name+(C.MODES[MODE].shop?' · B abre la tienda':''));
      if(MODE==='ctf'&&myTeam>=0)announce('EQUIPO '+TEAMS[myTeam].name.toUpperCase(),'Robá la bandera rival y traela a tu base');
      else if(MODE==='tdm'&&myTeam>=0)announce('EQUIPO '+TEAMS[myTeam].name.toUpperCase(),m.state==='play'?'Cada baja suma para tu equipo':'Esperando jugadores · calentamiento');
      else if(MODE==='gungame')announce('GUNGAME','Cada baja te da el arma siguiente · '+GG.length+' niveles');
      else if(MODE==='snipers'&&myTeam>=0)announce('EQUIPO '+TEAMS[myTeam].name.toUpperCase(),'Francotirador de un tiro · cuchillo para correr · racha de 6: escopeta');
      break;
    case 'full': toast('El servidor está lleno');leaveGame();showMenu();break;
    case 'vote': renderVote(m);break;
    case 'kicked': renderVote(null);leaveGame();showMenu();kickNotice(m);break;
    case 'spawn':
      me.s={x:m.p[0],y:m.p[1],z:m.p[2],vx:0,vy:0,vz:0,on:true};me.yaw=m.yaw;me.pitch=0;me.alive=true;me.deadT=0;me.raise=1;me.hp=100;
      if(m.ow)me.ow=m.ow.slice();if(m.am)me.am=Object.assign({},m.am);if(m.ar!=null)me.ar=m.ar;
      me.mag=fullMags();me.rel=0;me.scope=false;me.inspT=9;me.lastW=me.w===0?C.primaryOf(m.ow||me.ow):0;
      if(MODE==='gungame'&&m.w!=null)me.w=m.w;
      else{me.w=[6,5,3,2,4,1].find(i=>me.ow[i]&&hasAmmo(i));if(me.w==null)me.w=0;}
      $('deathBox').hidden=true;showWeapon();SFX.respawn(1);updateHUD();
      break;
    case 'you': {
      const before=me.ow.slice();
      me.hp=m.hp;me.ar=m.ar;me.am=Object.assign({},m.am);me.ow=m.ow.slice();me.q=m.q;
      if(m.cr!=null){me.cr=m.cr;me.unl=m.unl.slice();me.perk=Object.assign({},m.perk);}
      if(m.lvl!=null)me.lvl=m.lvl;
      if(!m.al&&me.alive)me.alive=false;
      if(MODE==='gungame'&&(me.lvlSwitch||!me.ow[me.w])&&me.ow[GG[Math.min(me.lvl,GG.length-1)]]){me.lvlSwitch=false;const nw=GG[Math.min(me.lvl,GG.length-1)];if(nw!==me.w){me.w=nw;me.raise=1;me.scope=false;me.cool=Math.max(me.cool,.25);if(WEAPONS[nw].mag){me.mag[nw]=WEAPONS[nw].mag;me.rel=0;}showWeapon();}}
      else if(!me.ow[me.w]){const pr=C.primaryOf(me.ow),i=pr>=0?pr:me.ow.findIndex(Boolean);if(i>=0){me.lastW=me.w;me.w=i;me.raise=1;me.scope=false;me.cool=Math.max(me.cool,.25);showWeapon();}}
      else if(MODE!=='gungame')for(let i=WEAPONS.length-1;i>=2;i--)if(me.ow[i]&&!before[i]&&me.alive&&i>me.w&&!mouseDown){selectWeapon(i,true);break;}
      if(me.grabW!=null&&me.ow[me.grabW]&&me.alive){const g=me.grabW;me.grabW=null;selectWeapon(g,true);}
      updateHUD();if(!$('shop').hidden)renderShop();break;
    }
    case 'sn': {
      const now=performance.now()/1000,sample=m.tm-now;
      if(CLK.off===null||sample>CLK.off)CLK.off=sample;else CLK.off+=(sample-CLK.off)*.003;
      const dev=CLK.off-sample;CLK.jit=CLK.jit*.92+dev*.08;
      CLK.delay=online?Math.min(.3,Math.max(.07,.055+CLK.jit*2.2)):.06;
      for(const r of m.ps){
        if(r[0]===myId)continue;
        const p=ensurePlayer(r[0]);
        p.buf.push({t:m.tm,x:r[1],y:r[2],z:r[3],yaw:r[4],pitch:r[5],w:r[6],fl:r[7],vx:r[8]||0,vy:r[9]||0,vz:r[10]||0});
        if(p.buf.length>40)p.buf.shift();
      }
      break;
    }
    case 'sc':
      scores=m.l;timeLeft=m.tl;fragLimit=m.fl;
      if(m.st!==matchState&&m.st==='count')SFX.start();
      matchState=m.st;LOBBY={cd:m.cd||0,hn:m.hn||0,mp:m.mp||0};
      if(m.ts)TS=m.ts;if(m.fs)FL=m.fs;if(m.cl)capLimit=m.cl;
      for(const r of m.l)if(r[0]!==myId)ensurePlayer(r[0],r[1],r[6],r[5],undefined,r[9]);
      updateHUD();if(!$('board').hidden)renderBoard();
      break;
    case 'end':
      matchState='inter';scores=m.l;closeShop(true);
      $('interT').textContent=m.w?m.w+' GANA LA PARTIDA':teamsMode()?'EMPATE':'FIN DE LA PARTIDA';
      $('interT').style.color=teamsMode()&&m.wt>=0?TEAMS[m.wt].c:'';
      $('interS').textContent=m.mv?'':'Próximo mapa: '+(m.nextName||'');G.myMapVote=null;renderMapVote(m.mv);
      renderEnd(m);
      if(online&&ACC){xpCard(ACC);if(G.pendXP){animXP(G.pendXP);G.pendXP=null;}}
      else $('interXP').innerHTML='<div class="xpNote">'+(online?(GCID?'Iniciá sesión con Google para ganar experiencia y subir de nivel':''):'En práctica no se gana experiencia')+'</div>';
      G.interEnd=performance.now()/1000+(m.secs||25);setTxt('interN',String(m.secs||25));
      $('inter').hidden=false;$('board').hidden=true;SFX.start();
      $('bStay').disabled=false;$('bStay').textContent='Jugar de nuevo';$('interReady').textContent=online?'Si todos aprietan «Jugar de nuevo», arranca enseguida':'';
      G.interFree=true;selfUnlock();
      break;
    case 'ready': if(online)$('interReady').innerHTML='<b>'+m.n+'/'+m.of+'</b> jugadores listos';break;
    case 'mv': G.myMapVote=m.me;renderMapVote(m);break;
    case 'start':
      clearShards();renderMapVote(null);
      matchState='play';$('inter').hidden=true;$('board').hidden=true;$('bStay').disabled=false;$('bStay').textContent='Jugar de nuevo';
      if(!document.pointerLockElement&&$('menu').hidden&&inGame){announce('¡ARRANCÓ!','Hacé click para jugar');}
      if(m.fs)FL=m.fs;if(m.ts)TS=m.ts;me.lvl=0;
      if(m.map&&m.map!==W.id){loadMap(m.map);projs.forEach(p=>scene.remove(p.m));projs.length=0;}
      syncItems(m);
      announce(W.name.toUpperCase(),MODE==='ctf'?'primero a '+capLimit+' capturas':(MODE==='tdm'||MODE==='snipers')?'primer equipo en llegar a '+fragLimit+' bajas':MODE==='gungame'?'primero en completar los '+GG.length+' niveles':'primero a '+fragLimit+' frags');SFX.start();
      break;
    case 'pong': ping=Math.round(performance.now()-m.c);break;
    case 'xp': {
      const pf=m.perfil,up=pf.nivel>m.antes;
      if(!$('inter').hidden){if(!$('interXP').querySelector('.xpCard'))xpCard(ACC||pf);animXP(m);}
      else if(matchState==='inter')G.pendXP=m;
      else{announce('+'+m.gain+' XP',up?'¡Nivel '+pf.nivel+'!':'nivel '+pf.nivel);if(up)SFX.hunt();else SFX.cash();}
      ACC=pf;renderAcct();
      break;
    }
    case 'ev': onEvent(m);break;
  }
}
function onEvent(m){
  switch(m.e){
    case 'team': ensurePlayer(m.id,null,m.c,undefined,undefined,m.tm);feedLine('<b style="color:'+m.c+'">'+esc(nameOf(m.id))+'</b> <i>pasó al equipo '+TEAMS[m.tm].name.toLowerCase()+'</i>');break;
    case 'flag': FL=m.fs;TS=m.ts;onFlag(m);break;
    case 'fire': fxFire(m);break;
    case 'grab': me.grabW=m.w;break;
    case 'unlock': announce('¡RACHA DE 6!','Desbloqueaste la escopeta doble · tecla 2');SFX.hunt();break;
    case 'gdirect': announce('¡GRANADA DIRECTA!',m.n?'+'+m.n+' ¤':'');SFX.hunt();break;
    case 'hunt': announce('¡TIRO DE CAZADOR!',m.d+' m'+(m.air?' · en pleno salto':'')+(m.n?' · +'+m.n+' ¤':''));SFX.hunt();break;
    case 'lvl': {
      me.lvl=m.n;const wn=WEAPONS[m.w].name;
      if(m.down){announce('BAJASTE AL NIVEL '+(m.n+1),(m.why?m.why+' · ':'')+wn);SFX.lvlDown();}
      else{announce(m.n===GG.length-1?'¡ÚLTIMA ARMA!':'NIVEL '+(m.n+1),wn);SFX.lvl();me.lvlSwitch=true;}
      updateHUD();break;
    }
    case 'join': ensurePlayer(m.id,m.n,m.c,m.bot,m.s,m.tm);feedLine('<b style="color:'+m.c+'">'+esc(m.n)+'</b> <i>'+(m.bot?'(bot) ':'')+'entró a la arena</i>');break;
    case 'leave': feedLine('<b style="color:'+colorOf(m.id)+'">'+esc(m.n)+'</b> <i>se fue</i>');removePlayer(m.id);break;
    case 'skin': if(m.id!==myId)ensurePlayer(m.id,null,null,undefined,m.s);break;
    case 'shot': {
      const p=players.get(m.id);const o=m.o,d=m.d,W_=WEAPONS[m.w];
      const h=C.raycast(W,o[0],o[1],o[2],d[0],d[1],d[2],W_.range||300),L=h?h.t:(W_.range||300);
      const end=[o[0]+d[0]*L,o[1]+d[1]*L,o[2]+d[2]*L];
      const gp=p&&p.model?gunTip(p):o;
      if(W_.melee){SFX[7](vAt(o[0],o[1],o[2]));if(p)p.fire=.2;break;}
      if(m.w===6)fxRail(gp,end,p?new THREE.Color(p.color).getHex():0xa8e6ff);
      else{fxTracer(gp,end);if(h)fxSparks(end[0]-d[0]*.05,end[1]-d[1]*.05,end[2]-d[2]*.05,h.n,W_.pel>1?8:5);}
      flashLight(gp[0],gp[1],gp[2],0xffaa50,.06);
      SFX[m.w](vAt(o[0],o[1],o[2]));
      if(p)p.fire=.1;
      break;
    }
    case 'proj': {
      if(m.own===myId)break;
      spawnProjVis(m.k,m.p,m.v,false,m.pid,m.own);
      const p=players.get(m.own);if(p)p.fire=.1;
      SFX[m.k==='rocket'?5:m.k==='bullet'?9:m.k==='molotov'?10:4](vAt(m.p[0],m.p[1],m.p[2]));
      break;
    }
    case 'boom': {
      if(m.own===myId)break;
      const i=projs.findIndex(q=>q.pid===m.pid);if(i>=0){scene.remove(projs[i].m);projs.splice(i,1);}
      if(m.k==='bullet'){if(m.hit)fxBlood(m.p[0],m.p[1],m.p[2],22);else fxSparks(m.p[0],m.p[1],m.p[2],[0,1,0],10);break;}
      if(m.k==='molotov'){fxGlass(m.p[0],m.p[1],m.p[2]);break;}
      fxExplosion(m.p[0],m.p[1],m.p[2]);break;
    }
    case 'dmg':
      G.hurt=Math.min(1,G.hurt+m.n/40+.15);me.roll=(Math.random()<.5?-1:1)*Math.min(.1,m.n/200);
      if(m.k){me.s.vx+=m.k[0];me.s.vy+=m.k[1];me.s.vz+=m.k[2];if(m.k[1]>0)me.s.on=false;}
      if(m.from){G.dmgT=1;G.dmgAng=Math.atan2(-(m.from[0]-me.s.x),-(m.from[2]-me.s.z));}
      if(Math.random()<.7||m.n>15)SFX.hurt();
      break;
    case 'hit':{
      showDamage(m.n,!!m.k,!!m.h);
      if(m.h&&!(G.predHit>0&&G.predHS))SFX.head();
      G.hitT=.18;$('hitm').classList.toggle('kill',!!m.k);if(!(G.predHit>0)||m.k)SFX.hit(m.n);
      const t=players.get(m.id);if(t&&t.model)t.pain=.12;
      break;}
    case 'kill': onKill(m);break;
    case 'cr': {
      const el=$('crPop');el.innerHTML='+'+m.n+' ¤'+(m.why?'<small>'+esc(m.why)+'</small>':'');el.classList.remove('show');void el.offsetWidth;el.classList.add('show');SFX.cash();
      break;
    }
    case 'buy': {
      const it=C.SHOP.find(s=>s.id===m.id);
      if(m.ok){SFX.buy();shopMsg((it?it.name:'')+' comprado','ok');}
      else{SFX.deny();shopMsg(m.why||'No se pudo comprar','bad');}
      break;
    }
    case 'shard': for(const s of m.l)addShard(s[0],s[1],s[2],s[3],s[4],s[5],s[6]);break;
    case 'shx': removeShard(m.id,m.by);break;
    case 'item': {
      const o=level.items[m.i];if(!o)break;setItemType(o,m.ty);o.g.visible=!!m.up;
      if(m.sw){if(m.by===myId)SFX.pick&&SFX.pick();break;}
      if(m.up)fxTele(o.it.x,o.it.y,o.it.z,1,.8,.4);
      if(!m.up&&m.by===myId)onPickup(o.ty);
      else if(!m.up){const v=vAt(o.it.x,o.it.y,o.it.z);if(v>.3)tn({type:'square',f0:600,f1:1250,dur:.1,vol:.05*v});}
      break;
    }
    case 'tp': fxTele(m.p[0],m.p[1],m.p[2]);SFX.tele(vAt(m.p[0],m.p[1],m.p[2])*.7);break;
    case 'pad': SFX.pad(vAt(m.p[0],m.p[1],m.p[2]));break;
    case 'chat': {const p=players.get(m.id),tm=teamsMode()?(m.id===myId?myTeam:p?p.team:-1):-1;
      chatLine((tm>=0?'<span class="tdot" style="background:'+TEAMS[tm].c+'"></span>':'')+'<b style="color:'+chatColor(m.id,m.n)+'">'+esc(m.n)+':</b> '+esc(m.m));SFX.chat();break;}
    case 'sys': sysChat(m.m);break;
  }
}
function onKill(m){
  const W_=m.w>=0?WEAPONS[m.w]:null;
  const vn='<b style="color:'+colorOf(m.v)+'">'+esc(nameOf(m.v))+'</b>';
  let line;
  if(m.how==='lava')line=vn+' <i>se derritió en la lava</i>';
  else if(m.how==='water')line=vn+' <i>se lo llevó el río</i>';
  else if(m.how==='void')line=vn+' <i>cayó al vacío</i>';
  else if(!m.k||m.k===m.v)line=vn+' <i>se voló a sí mismo</i>';
  else if(m.ns)line='<b style="color:'+colorOf(m.k)+'">'+esc(nameOf(m.k))+'</b> <i>mató</i> <b class="ns">SIN USAR MIRA</b> <i>a</i> '+vn;
  else if(W_&&W_.melee)line='<b style="color:'+colorOf(m.k)+'">'+esc(nameOf(m.k))+'</b> <i>le entró a pelo a</i> '+vn;
  else line='<b style="color:'+colorOf(m.k)+'">'+esc(nameOf(m.k))+'</b> <i>'+(W_?W_.name:'')+'</i> '+vn;
  if(m.ns)sysChat(nameOf(m.k)+' mató SIN USAR MIRA a '+nameOf(m.v));
  feedLine(line,m.k===myId||m.v===myId);
  if(m.v===myId){
    me.alive=false;me.deadT=0;me.killer=m.k;me.respawnAsk=false;me.deathPos=[me.s.x,me.s.y,me.s.z];
    $('deathBy').textContent=m.how==='water'?'Te llevó el río':m.how==='lava'?'Te derretiste en la lava':m.how==='void'?'Caíste al vacío':(!m.k||m.k===myId)?'Te volaste a vos mismo':'Te eliminó '+nameOf(m.k)+(m.ns?' SIN USAR MIRA':W_?' con '+W_.name:'');
    $('deathBox').hidden=false;$('deathHint').textContent='';
    if(m.gib)fxGib(me.s.x,me.s.y,me.s.z);else fxBlood(me.s.x,me.s.y+1,me.s.z,20);
    SFX.die(1);
  }else{
    const p=players.get(m.v);
    if(p){p.alive=false;p.deadT=0;p.gib=!!m.gib;if(m.gib){fxGib(m.p[0],m.p[1],m.p[2]);if(p.model)p.model.g.visible=false;}else fxBlood(m.p[0],m.p[1]+1.1,m.p[2],18);SFX.die(vAt(m.p[0],m.p[1],m.p[2]));}
    if(m.k===myId){const mine=scores.find(s=>s[0]===myId);announce(m.ns?'¡SIN MIRA! ELIMINASTE A '+nameOf(m.v).toUpperCase():'ELIMINASTE A '+nameOf(m.v).toUpperCase(),((mine?mine[2]:0)+1)+(MODE==='gungame'?' bajas':' frags'));SFX.frag();}
  }
}
function onFlag(m){
  const tn=TEAMS[m.f].name.toUpperCase(),other=TEAMS[1-m.f],mine=m.f===myTeam,who='<b style="color:'+colorOf(m.id)+'">'+esc(m.n)+'</b>';
  const fl='<b style="color:'+TEAMS[m.f].c+'">bandera '+['roja','azul'][m.f]+'</b>';
  if(m.a==='take'){
    feedLine(who+' <i>robó la</i> '+fl,m.id===myId);SFX.flagTake();
    if(m.id===myId)announce('¡TENÉS LA BANDERA!','Llevala hasta tu base');
    else if(mine)announce('¡SE ROBARON TU BANDERA!','Frená a '+m.n);
    else announce('TU EQUIPO TIENE LA BANDERA','Cubrí a '+m.n);
  }else if(m.a==='cap'){
    feedLine(who+' <i>capturó la</i> '+fl,m.id===myId);SFX.flagCap();
    announce('¡PUNTO PARA EL EQUIPO '+other.name.toUpperCase()+'!',TS[0]+' – '+TS[1]);
  }else if(m.a==='drop'){
    feedLine(who+' <i>soltó la</i> '+fl);
    if(mine)announce('TU BANDERA QUEDÓ TIRADA','Tocala para devolverla');
  }else if(m.a==='return'){
    feedLine((m.n?who+' <i>devolvió la</i> ':'<i>volvió a su base la</i> ')+fl);SFX.flagRet();
  }
  updateHUD();
}
function onPickup(type){
  const inf=C.ITEMS[type];
  G.pick=.5;$('pick').textContent='Recogiste: '+inf.name+(inf.ammo&&inf.weapon==null?' +'+inf.n:'');$('pick').classList.remove('show');void $('pick').offsetWidth;$('pick').classList.add('show');
  if(type==='quad'){SFX.quad();announce('DAÑO CUÁDRUPLE','30 segundos');}
  else if(type==='mega')SFX.mega();else if(type==='armor'||type==='armorH')SFX.armor();else if(inf.weapon!=null)SFX.weapon();else SFX.pick();
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function feedLine(html,mine){const d=document.createElement('div');d.innerHTML=html;if(mine)d.className='me';const f=$('feed');f.appendChild(d);while(f.children.length>6)f.firstChild.remove();setTimeout(()=>d.remove(),5200);}
function chatLine(html,cls){const d=document.createElement('div');d.innerHTML=html;if(cls)d.className=cls;const L=d.textContent.length;if(L>80)d.style.animationDuration=Math.min(22,9+L/25)+'s';const f=$('chatLog');f.appendChild(d);while(f.children.length>8)f.firstChild.remove();}
// cada impacto suma; si en 0,9 s no le volvés a pegar, aparece el total de la ráfaga
const DMG={sum:0,t:0,timer:0};
function showDamage(n,kill,head){
  if(!n)return;DMG.sum+=n;
  const p=$('dmgPop');p.textContent=(head?'¡CABEZA! ':'')+'-'+n;p.classList.toggle('hs',head);p.classList.remove('show');void p.offsetWidth;p.classList.add('show');
  const t=$('dmgTot');t.className='on';t.innerHTML='<b>'+DMG.sum+'</b>';
  clearTimeout(DMG.timer);
  DMG.timer=setTimeout(()=>{t.className='';void t.offsetWidth;t.innerHTML='TOTAL <b>'+DMG.sum+'</b>'+(kill?' · ELIMINADO':'');t.className='done';DMG.sum=0;},kill?150:900);
}
function sysChat(t){chatLine(esc(t),'sys');}
function announce(t,s){const a=$('cMsg'),b=$('cSub');a.textContent=t;b.textContent=s||'';[a,b].forEach(e=>{e.classList.remove('show');void e.offsetWidth;e.classList.add('show');});}


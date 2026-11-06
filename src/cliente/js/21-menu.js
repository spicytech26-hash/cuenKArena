/* =================== MENÚ =================== */
// botones de mapa en Ajustes: salen solos de los mapas de la Arena (un mapa nuevo aparece sin tocar el HTML)
// cada mapa con su foto (si hay maps/id.jpg; si no, queda solo el nombre)
$('sMap').innerHTML=C.MODES.arena.maps.map(id=>'<button type="button" data-v="'+id+'"><img src="maps/'+id+'.jpg" alt="" loading="lazy" onerror="this.remove()"><span>'+esc(C.MAPS[id].name.split(' · ').pop())+'</span></button>').join('');
function showMenu(){const m=$('menu');m.hidden=false;m.classList.toggle('fast',!!inGame);   // en pausa el menú aparece al toque (sin la entrada lenta del inicio)
  if(!inGame){m.classList.remove('go');void m.offsetWidth;m.classList.add('go');}mFxGo();$('hud').hidden=true;if(document.pointerLockElement)document.exitPointerLock();}
function hideMenu(){$('menu').hidden=true;$('hud').hidden=false;['settings','lockerPanel','modePanel','limitPanel'].forEach(id=>$(id).hidden=true);['bSet','bLocker'].forEach(id=>$(id).setAttribute('aria-expanded','false'));updateHUD();}
function openPause(){
  if(!inGame)return;
  if(navigator.keyboard&&navigator.keyboard.unlock)navigator.keyboard.unlock();   // así el próximo Esc sale de pantalla completapaused=!online;mouseDown=false;for(const k in keys)keys[k]=false;
  $('mKick').textContent=(online?'Partida online en curso · ':'Práctica en pausa · ')+C.MODES[MODE].name+' · '+W.name;
  $('bOffline').textContent=online?'Práctica con bots':'Reiniciar práctica';
  $('bOnline').textContent=online?'Volver a la partida':'Jugar online';$('bOnline').disabled=!(online||serverOK);
  $('limitPanel').hidden=!(MODE==='tdm'&&(!online||matchState!=='play'));syncLimits();
  // votación: solo online y con al menos otras dos personas
  const others=online?scores.filter(r=>!r[5]&&r[0]!==myId):[];
  $('kickPanel').hidden=!(online&&others.length>=1);
  $('kickSel').innerHTML=others.map(r=>'<option value="'+r[0]+'">'+esc(r[1])+'</option>').join('');
  showMenu();
}
// marcas de caída del rifle de caza: a qué altura de la retícula hay que poner al blanco según la distancia
(function(){
  const g=$('bdc'),W9=WEAPONS[9],half=Math.tan((W9.zoom||42)/2*Math.PI/180);let h='';
  for(const d of [25,50,75,100]){const t=d/W9.speed,drop=.5*W9.drop*t*t,y=Math.tan(Math.atan2(drop,d))/half*50;
    const w=d===50||d===100?5:3.4;h+='<line x1="'+(-w)+'" y1="'+y.toFixed(2)+'" x2="'+w+'" y2="'+y.toFixed(2)+'"/><text x="'+(w+1)+'" y="'+(y+.8).toFixed(2)+'" stroke="none">'+d+'</text>';}
  g.innerHTML=h;
})();
function syncLimits(){
  for(const [seg,inp,val] of [['mLimit','mLimitN',S.tdmLimit],['pLimit','pLimitN',inGame&&MODE==='tdm'?fragLimit:S.tdmLimit]]){
    [...$(seg).querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===val)));$(inp).value=val;}
}
function setLimit(n,sendIt){n=Math.max(5,Math.min(500,Math.round(+n||0)));if(!n)return;S.tdmLimit=n;saveS();if(sendIt&&net&&inGame&&MODE==='tdm')net.send({t:'limit',n});syncLimits();SFX.ui();}
$('mLimit').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v)setLimit(v,false);});
$('mLimitN').addEventListener('change',e=>setLimit(e.target.value,false));
$('pLimit').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v)setLimit(v,true);});
$('pLimitN').addEventListener('change',e=>setLimit(e.target.value,true));
function resumeGame(){paused=false;hideMenu();if(document.fullscreenElement&&navigator.keyboard&&navigator.keyboard.lock)navigator.keyboard.lock(LOCK_KEYS).catch(()=>{});lockPointer();setTimeout(()=>{if(inGame&&$('menu').hidden&&document.pointerLockElement!==canvas)announce('','Hacé click para seguir jugando');},250);}
document.addEventListener('pointerlockerror',()=>{if(inGame&&$('menu').hidden)announce('','Hacé click para seguir jugando');});
// asistente de inicio: (solo práctica) cantidad de bots → modo → mapa. Online: modo → mapa (solo si la sala está vacía)
let pickOnline=true;
const WZ={step:'mode',mode:'',rooms:null};
function wzShow(step){
  WZ.step=step;
  [['bots','wsBots'],['mode','wsMode'],['map','wsMap']].forEach(([k,id])=>{$(id).hidden=k!==step;});
  const steps=pickOnline?[['mode','Modo'],['map','Mapa']]:[['bots','Bots'],['mode','Modo'],['map','Mapa']],cur=steps.findIndex(x=>x[0]===step);
  $('wizCrumbs').innerHTML=steps.map((x,i)=>'<li class="'+(i===cur?'on':i<cur?'ok':'')+'">'+(i+1)+' · '+x[1]+'</li>').join('');
  $('modeTitle').textContent=step==='bots'?'Práctica con bots':step==='mode'?'Elegí el modo · '+(pickOnline?'online':'práctica con '+S.bots+(S.bots===1?' bot':' bots')):'Elegí el mapa · '+C.MODES[WZ.mode].name;
  $('wmBack').hidden=pickOnline;$('modeSkillRow').hidden=!pickOnline;
}
function openModePicker(isOnline){
  pickOnline=isOnline;saveName();WZ.rooms=null;
  ['settings','lockerPanel'].forEach(x=>$(x).hidden=true);['bSet','bLocker'].forEach(x=>$(x).setAttribute('aria-expanded','false'));
  $('modePanel').hidden=false;$('limitPanel').hidden=true;syncLimits();syncSettings();
  $('modeNote').innerHTML=isOnline?'Cada modo es una sala aparte del servidor: entrás con los que estén jugando ese modo (si la sala está vacía, elegís el mapa). Team Deathmatch arranca cuando hay 4 jugadores; el primero en entrar elige las bajas para ganar. La dificultad elegida se aplica a los bots de la sala; cualquiera la puede cambiar después con <b>/skill 0-3</b> en el chat.':'Los bots se suman a tu partida. En Captura la bandera se reparten entre los dos equipos. La dificultad y los bots se pueden cambiar en plena partida desde Ajustes.';
  const grid=$('modeGrid');
  grid.innerHTML=C.MODE_IDS.map(id=>{const md=C.MODES[id];return '<button type="button" class="mcard" data-m="'+id+'" style="--bg:url(maps/'+md.maps[0]+'.jpg)"><span class="mn">'+md.name+'</span><span class="md">'+md.desc+'</span><span class="mp" id="mp_'+id+'"></span><span class="mm">'+md.maps.map(k=>esc(C.MAPS[k].name)).join(' · ')+'</span></button>';}).join('');
  wzShow(isOnline?'mode':'bots');
  const f=isOnline?(grid.querySelector('.mcard[data-m="'+S.mode+'"]')||grid.firstChild):$('wbOk');if(f)f.focus();
  if(isOnline&&/^https?:$/.test(location.protocol))fetch('/status',{cache:'no-store'}).then(r=>r.json()).then(j=>{WZ.rooms=j.salas||null;for(const id in (j.salas||{})){const e=$('mp_'+id);if(e){const n=j.salas[id].humanos;e.textContent=n?n+' jugando ahora':'Sala vacía';}}}).catch(()=>{});
}
function wzBots(n){S.bots=Math.max(0,Math.min(15,Math.round(+n)||0));saveS();syncSettings();}
$('wbMinus').addEventListener('click',()=>{wzBots(S.bots-1);SFX.ui();});
$('wbPlus').addEventListener('click',()=>{wzBots(S.bots+1);SFX.ui();});
$('wbR').addEventListener('input',e=>wzBots(e.target.value));
$('wbChips').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v!=null){wzBots(v);SFX.ui();}});
$('wbSkill').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.skill=+v;saveS();syncSettings();SFX.ui();});
$('wbOk').addEventListener('click',()=>{wzShow('mode');const f=$('modeGrid').firstChild;if(f)f.focus();SFX.ui();});
$('wmBackBtn').addEventListener('click',()=>{wzShow('bots');SFX.ui();});
$('wpBack').addEventListener('click',()=>{wzShow('mode');SFX.ui();});
function wzStart(mode,map){
  $('modePanel').hidden=true;
  if(map){
    if(pickOnline){const room=WZ.rooms&&WZ.rooms[mode];if(room&&room.mapa!==C.MAPS[map].name)G.pendMap=map;}
    else{pickedMap=map;if(C.MODES.arena.maps.includes(map)){S.map=map;saveS();syncSettings();}}
  }
  startGame(pickOnline,mode);
}
function wzMode(id){
  WZ.mode=id;const md=C.MODES[id],room=WZ.rooms&&WZ.rooms[id];
  // un solo mapa, o sala online con gente (se juega el mapa que está en curso): no hay nada que elegir
  if(md.maps.length<2){wzStart(id,md.maps[0]);return;}
  if(pickOnline&&(!room||room.humanos>0)){wzStart(id,null);return;}
  $('mapGrid').innerHTML=md.maps.map(k=>'<button type="button" class="mapcard" data-k="'+k+'"><img src="maps/'+k+'.jpg" alt="" onerror="this.parentNode.classList.add(\'nofoto\');this.remove()"><span class="mname">'+esc(C.MAPS[k].name.split(' · ').pop())+'</span><span class="mgo">Jugar ›</span></button>').join('');
  $('mapNote').textContent=pickOnline?'La sala está vacía, así que el mapa lo elegís vos. Cuando entre más gente se sigue en el mismo.':'Elegí dónde querés jugar: la partida empieza al instante.';
  wzShow('map');SFX.ui();
  const f=$('mapGrid').firstChild;if(f)f.focus();
}
$('modeGrid').addEventListener('click',e=>{const b=e.target.closest('.mcard');if(b)wzMode(b.dataset.m);});
$('mapGrid').addEventListener('click',e=>{const b=e.target.closest('.mapcard');if(b)wzStart(WZ.mode,b.dataset.k);});
$('mSkill').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.skill=+v;saveS();syncSettings();SFX.ui();});
$('bOnline').addEventListener('click',()=>{if(inGame&&online){resumeGame();return;}openModePicker(true);});
$('bOffline').addEventListener('click',()=>{openModePicker(false);});
$('bLeave').addEventListener('click',()=>{leaveGame();$('mKick').textContent='Arena · Gungame · Team Deathmatch · Captura la bandera';$('bOnline').textContent='Jugar online';$('bOnline').disabled=!serverOK;$('bOffline').textContent='Práctica con bots';});
function togglePanel(btn,id){const p=$(id),open=p.hidden;['settings','lockerPanel','modePanel'].forEach(x=>$(x).hidden=true);['bSet','bLocker'].forEach(x=>$(x).setAttribute('aria-expanded','false'));p.hidden=!open;$(btn).setAttribute('aria-expanded',String(open));}
$('bSet').addEventListener('click',()=>togglePanel('bSet','settings'));
$('bLocker').addEventListener('click',()=>{togglePanel('bLocker','lockerPanel');lockerInit();syncLocker();lkAdding=false;renderCombos();});
function saveName(){const n=$('pName').value.trim().slice(0,16);if(n&&n!==S.name){S.name=n;saveS();rebuildLockModel();acctSave();}}
$('pName').addEventListener('change',saveName);$('pName').addEventListener('input',()=>{const pl=$('lockPlate');if(pl)pl.textContent=$('pName').value.trim().slice(0,16)||'Jugador';});
$('pName').addEventListener('keydown',e=>{if(e.key==='Enter'){saveName();e.target.blur();}});
function syncSettings(){
  $('pName').value=S.name;
  $('wbN').textContent=S.bots;$('wbR').value=S.bots;[...$('wbChips').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.bots)));[...$('wbSkill').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.skill)));
  $('sSens').value=S.sens;if(document.activeElement!==$('sSensN'))$('sSensN').value=(+S.sens).toFixed(2);
  $('sSensZ').value=S.sensZ;if(document.activeElement!==$('sSensZN'))$('sSensZN').value=(+S.sensZ).toFixed(2);sensInfo();
  $('sFov').value=S.fov;$('oFov').textContent=S.fov+'°';
  $('sVol').value=S.vol;$('oVol').textContent=Math.round(S.vol*100)+'%';
  $('sMus').value=S.music;$('oMus').textContent=Math.round(S.music*100)+'%';
  $('sInv').checked=S.invY;$('sHop').checked=S.hop;$('sFs').checked=S.fs;$('sImg').checked=S.showImg!==false;$('sFps').checked=!!S.fpsOn;
  $('sMerc').checked=S.merc!==false;$('sMred').checked=!!S.mred;$('oBots').textContent=S.bots;
  [...$('sSkill').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.skill)));
  [...$('mSkill').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.skill)));
  [...$('sMap').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.map)));
  [...$('sQ').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.q)));
  [...$('sView').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.view)));[...$('sShoulder').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===(S.shoulder||1))));[...$('sTpd').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===(S.tpd||1))));
  [...$('sSh').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===(S.sh===0?0:1))));
}
// sensibilidad: control deslizante + valor exacto, y aparte la de la mira con zoom (S.sensZ, 1 = igual que sin mira)
const SENS_K=.0022,SENS_DPI=800;
function sensRatio(){const z=(WEAPONS[8]&&WEAPONS[8].zoom)||22;return Math.tan(z*Math.PI/360)/Math.tan(S.fov*Math.PI/360);}
function sensInfo(){
  const full=2*Math.PI/(SENS_K*S.sens),zr=sensRatio()*S.sensZ,cm=n=>(n/SENS_DPI*2.54).toFixed(1).replace('.',',');
  $('sensInfo').innerHTML='Una vuelta completa (360°): <b>'+Math.round(full)+'</b> puntos de mouse · unos <b>'+cm(full)+' cm</b> con 800 DPI<br>Al apuntar: <b>'+Math.round(full/zr)+'</b> puntos · unos <b>'+cm(full/zr)+' cm</b> · en 1,00 el movimiento en pantalla se siente igual que sin mira';
}
function setSens(v){v=+v;if(!(v>0))return;S.sens=Math.round(Math.max(.05,Math.min(10,v))*100)/100;saveS();syncSettings();}
function setSensZ(v){v=+v;if(!(v>0))return;S.sensZ=Math.round(Math.max(.1,Math.min(5,v))*100)/100;saveS();syncSettings();}
$('sSens').addEventListener('input',e=>setSens(e.target.value));
$('sSensN').addEventListener('input',e=>setSens(e.target.value));
$('sSensN').addEventListener('change',()=>{$('sSensN').value=(+S.sens).toFixed(2);});
$('sSensZ').addEventListener('input',e=>setSensZ(e.target.value));
$('sSensZN').addEventListener('input',e=>setSensZ(e.target.value));
$('sSensZN').addEventListener('change',()=>{$('sSensZN').value=(+S.sensZ).toFixed(2);});
// zona de prueba: mové el mouse (click derecho = con zoom) y se ve cuánto gira la vista con tus valores actuales
(function(){
  const pad=$('sensPad'),PPD=4;let yaw=0,px=0,py=0,zoom=false;
  function mode(z){zoom=z;pad.classList.toggle('zoom',z);$('padMode').textContent=z?'Al apuntar':'Normal';}
  pad.addEventListener('mousemove',e=>{
    if(!!(e.buttons&2)!==zoom)mode(!zoom);
    const r=zoom?sensRatio():1,kd=SENS_K*S.sens*(zoom?r*S.sensZ:1)*180/Math.PI;   // grados por punto de mouse
    yaw+=e.movementX*kd;px=(px-e.movementX*kd*PPD/r)%60;py=(py-e.movementY*kd*PPD/r*(S.invY?-1:1))%24;
    pad.style.setProperty('--px',px.toFixed(1)+'px');pad.style.setProperty('--py',py.toFixed(1)+'px');
    $('padDeg').textContent=Math.round(((yaw%360)+360)%360)+'°';
  });
  pad.addEventListener('mousedown',e=>{if(e.button===2)mode(true);});
  pad.addEventListener('mouseup',e=>{if(e.button===2)mode(false);});
  pad.addEventListener('mouseleave',()=>mode(false));
  pad.addEventListener('contextmenu',e=>e.preventDefault());
  pad.addEventListener('dblclick',()=>{yaw=0;$('padDeg').textContent='0°';});
})();
// secciones de Ajustes
function setTab(t){[...$('sTabs').children].forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));document.querySelectorAll('#settings .sec').forEach(x=>x.hidden=x.dataset.sec!==t);}
$('sTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.tab){setTab(b.dataset.tab);SFX.ui();}});
$('sFov').addEventListener('input',e=>{S.fov=+e.target.value;saveS();syncSettings();});
$('sVol').addEventListener('input',e=>{S.vol=+e.target.value;if(master)master.gain.value=S.vol;saveS();syncSettings();});
$('sMus').addEventListener('input',e=>{S.music=+e.target.value;if(musicGain)musicGain.gain.value=S.music*.5;saveS();syncSettings();});
$('sInv').addEventListener('change',e=>{S.invY=e.target.checked;saveS();});
$('sHop').addEventListener('change',e=>{S.hop=e.target.checked;saveS();});
$('sFs').addEventListener('change',e=>{S.fs=e.target.checked;saveS();});
$('sFps').addEventListener('change',e=>{S.fpsOn=e.target.checked;saveS();if(!S.fpsOn)$('fpsBox').hidden=true;});
$('sMerc').addEventListener('change',e=>{S.merc=e.target.checked;saveS();if(!mercVa())mercClose();$('cards').classList.toggle('sinmerc',!mercVa());});
$('sMred').addEventListener('change',e=>{S.mred=e.target.checked;saveS();});
$('sImg').addEventListener('change',e=>{S.showImg=e.target.checked;saveS();for(const p of players.values())if(p.model){scene.remove(p.model.g);p.model=null;ensurePlayer(p.id);}});
// pantalla completa + bloqueo de teclado: así Ctrl+W agacha y avanza en vez de cerrar la pestaña
// teclas que se bloquean en pantalla completa (Esc no saca de la pantalla completa, abre el menú; Ctrl+W no cierra la pestaña).
// F11 NO está en la lista: siempre sale de la pantalla completa
const LOCK_KEYS=['Escape','Tab','Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR','KeyF','KeyT','KeyN','KeyB','KeyG','KeyV','KeyY','KeyC','ControlLeft','ShiftLeft','Digit1','Digit2','Digit3','Digit4'];
addEventListener('keydown',e=>{if(e.code==='F11'&&document.fullscreenElement){e.preventDefault();e.stopImmediatePropagation();try{if(navigator.keyboard&&navigator.keyboard.unlock)navigator.keyboard.unlock();}catch(_){}document.exitFullscreen().catch(()=>{});}},true);
function goFullscreen(){
  if(!S.fs||document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  try{const pr=document.documentElement.requestFullscreen({navigationUI:'hide'});if(pr&&pr.then)pr.then(()=>{if(navigator.keyboard&&navigator.keyboard.lock)navigator.keyboard.lock(LOCK_KEYS).catch(()=>{});}).catch(()=>{});}catch(e){}
}
// si igual se aprieta Ctrl+W fuera de pantalla completa, el navegador pregunta antes de cerrar
addEventListener('beforeunload',e=>{if(inGame){e.preventDefault();e.returnValue='';}});
$('bMinus').addEventListener('click',()=>changeBots(-1));$('bPlus').addEventListener('click',()=>changeBots(1));
$('sSkill').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.skill=+v;saveS();syncSettings();if(net&&!online)net.send({t:'cfg',skill:S.skill});});
$('sMap').addEventListener('click',e=>{const b=e.target.closest('button'),v=b&&b.dataset.v;if(!v)return;S.map=v;saveS();syncSettings();if(net&&!online)net.send({t:'cfg',map:v});else if(!inGame)loadMap(v);});
$('sSh').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.sh=+v;saveS();syncSettings();if(level&&level.sun){level.sun.castShadow=!!S.sh;renderer.shadowMap.needsUpdate=true;}scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});SFX.ui();});
$('sView').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.view=v;saveS();syncSettings();});
$('sShoulder').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.shoulder=+v;saveS();syncSettings();});
$('sTpd').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.tpd=+v;saveS();syncSettings();});
$('sQ').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.q=+v;saveS();syncSettings();resize();});
syncSettings();probeServer();loadMap(S.map);initAccounts();syncChest();



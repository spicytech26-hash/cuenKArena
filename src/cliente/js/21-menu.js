/* =================== MENÚ =================== */
// botones de mapa en Ajustes: salen solos de los mapas de la Arena (un mapa nuevo aparece sin tocar el HTML)
$('sMap').innerHTML=C.MODES.arena.maps.map(id=>'<button type="button" data-v="'+id+'">'+esc(C.MAPS[id].name.split(' · ').pop())+'</button>').join('');
function showMenu(){$('menu').hidden=false;$('hud').hidden=true;if(document.pointerLockElement)document.exitPointerLock();}
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
let pickOnline=true;
function openModePicker(isOnline){
  pickOnline=isOnline;saveName();
  ['settings','lockerPanel'].forEach(x=>$(x).hidden=true);['bSet','bLocker'].forEach(x=>$(x).setAttribute('aria-expanded','false'));
  $('modePanel').hidden=false;$('limitPanel').hidden=true;syncLimits();
  $('modeTitle').textContent='Elegí el modo · '+(isOnline?'online':'práctica con '+S.bots+' bots');
  $('modeNote').innerHTML=isOnline?'Cada modo es una sala aparte del servidor: entrás con los que estén jugando ese modo. Team Deathmatch arranca cuando hay 4 jugadores; el primero en entrar elige las bajas para ganar. La dificultad elegida se aplica a los bots de la sala; cualquiera la puede cambiar después con <b>/skill 0-3</b> en el chat.':'Los bots se suman a tu partida. En Captura la bandera se reparten entre los dos equipos. La dificultad se puede cambiar en plena partida desde Ajustes.';
  const grid=$('modeGrid');
  grid.innerHTML=C.MODE_IDS.map(id=>{const md=C.MODES[id];return '<button type="button" class="mcard" data-m="'+id+'"><span class="mn">'+md.name+'</span><span class="md">'+md.desc+'</span><span class="mp" id="mp_'+id+'"></span><span class="mm">'+md.maps.map(k=>esc(C.MAPS[k].name)).join(' · ')+'</span></button>';}).join('');
  const cards=[...grid.querySelectorAll('.mcard')];const def=cards.find(b=>b.dataset.m===S.mode)||cards[0];if(def)def.focus();
  if(isOnline&&/^https?:$/.test(location.protocol))fetch('/status',{cache:'no-store'}).then(r=>r.json()).then(j=>{for(const id in (j.salas||{})){const e=$('mp_'+id);if(e){const n=j.salas[id].humanos;e.textContent=n?n+(n===1?' jugando ahora':' jugando ahora'):'Sala vacía';}}}).catch(()=>{});
}
$('modeGrid').addEventListener('click',e=>{const b=e.target.closest('.mcard');if(!b)return;$('modePanel').hidden=true;startGame(pickOnline,b.dataset.m);});
$('mSkill').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.skill=+v;saveS();syncSettings();SFX.ui();});
$('bOnline').addEventListener('click',()=>{if(inGame&&online){resumeGame();return;}openModePicker(true);});
$('bOffline').addEventListener('click',()=>{openModePicker(false);});
$('bLeave').addEventListener('click',()=>{leaveGame();$('mKick').textContent='Arena · Gungame · Team Deathmatch · Captura la bandera';$('bOnline').textContent='Jugar online';$('bOnline').disabled=!serverOK;$('bOffline').textContent='Práctica con bots';});
function togglePanel(btn,id){const p=$(id),open=p.hidden;['settings','lockerPanel','modePanel'].forEach(x=>$(x).hidden=true);['bSet','bLocker'].forEach(x=>$(x).setAttribute('aria-expanded','false'));p.hidden=!open;$(btn).setAttribute('aria-expanded',String(open));}
$('bSet').addEventListener('click',()=>togglePanel('bSet','settings'));
$('bLocker').addEventListener('click',()=>{togglePanel('bLocker','lockerPanel');lockerInit();syncLocker();});
function saveName(){const n=$('pName').value.trim().slice(0,16);if(n&&n!==S.name){S.name=n;saveS();rebuildLockModel();acctSave();}}
$('pName').addEventListener('change',saveName);
$('pName').addEventListener('keydown',e=>{if(e.key==='Enter'){saveName();e.target.blur();}});
function syncSettings(){
  $('pName').value=S.name;
  $('sSens').value=S.sens;$('oSens').textContent=(+S.sens).toFixed(2);
  $('sFov').value=S.fov;$('oFov').textContent=S.fov+'°';
  $('sVol').value=S.vol;$('oVol').textContent=Math.round(S.vol*100)+'%';
  $('sMus').value=S.music;$('oMus').textContent=Math.round(S.music*100)+'%';
  $('sInv').checked=S.invY;$('sHop').checked=S.hop;$('sFs').checked=S.fs;$('sImg').checked=S.showImg!==false;$('sFps').checked=!!S.fpsOn;$('oBots').textContent=S.bots;
  [...$('sSkill').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.skill)));
  [...$('mSkill').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.skill)));
  [...$('sFl').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.fl)));
  [...$('sMap').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.map)));
  [...$('sQ').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.q)));
  [...$('sSh').children].forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===(S.sh===0?0:1))));
}
$('sSens').addEventListener('input',e=>{S.sens=+e.target.value;saveS();syncSettings();});
$('sFov').addEventListener('input',e=>{S.fov=+e.target.value;saveS();syncSettings();});
$('sVol').addEventListener('input',e=>{S.vol=+e.target.value;if(master)master.gain.value=S.vol;saveS();syncSettings();});
$('sMus').addEventListener('input',e=>{S.music=+e.target.value;if(musicGain)musicGain.gain.value=S.music*.5;saveS();syncSettings();});
$('sInv').addEventListener('change',e=>{S.invY=e.target.checked;saveS();});
$('sHop').addEventListener('change',e=>{S.hop=e.target.checked;saveS();});
$('sFs').addEventListener('change',e=>{S.fs=e.target.checked;saveS();});
$('sFps').addEventListener('change',e=>{S.fpsOn=e.target.checked;saveS();if(!S.fpsOn)$('fpsBox').hidden=true;});
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
$('sFl').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.fl=+v;saveS();syncSettings();if(net&&!online)net.send({t:'cfg',fl:S.fl});});
$('sMap').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(!v)return;S.map=v;saveS();syncSettings();if(net&&!online)net.send({t:'cfg',map:v});else if(!inGame)loadMap(v);});
$('sSh').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.sh=+v;saveS();syncSettings();if(level&&level.sun){level.sun.castShadow=!!S.sh;renderer.shadowMap.needsUpdate=true;}scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});SFX.ui();});
$('sQ').addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v==null)return;S.q=+v;saveS();syncSettings();resize();});
syncSettings();probeServer();loadMap(S.map);initAccounts();syncChest();



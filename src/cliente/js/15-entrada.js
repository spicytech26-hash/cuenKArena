/* =================== ENTRADA =================== */
// movimiento crudo del mouse (sin la aceleración de Windows/macOS) cuando el navegador lo permite; si no, el bloqueo común
let rawOK=true;
function lockPointer(){
  try{
    const r=rawOK?canvas.requestPointerLock({unadjustedMovement:true}):canvas.requestPointerLock();
    if(r&&r.catch)r.catch(err=>{if(rawOK&&err&&err.name==='NotSupportedError'){rawOK=false;lockPointer();}});
  }catch(e){try{canvas.requestPointerLock();}catch(_){}}
}
// Chrome a veces manda un movimiento falso enorme con el mouse bloqueado (la mira "se teletransporta"):
// se descarta si es mucho más grande que lo que venía moviéndose y que cualquier movimiento humano posible en un evento
const mouseF={ema:0,skip:0,t:0};
// Chrome junta en un solo evento todo lo que se movió el mouse en el cuadro, así que un giro rápido real puede
// traer cientos de píxeles: solo se descarta algo absurdo (más de 1200 px y 8 veces lo que venía) y nunca dos seguidos.
function mouseSpike(dx,dy){
  const m=Math.abs(dx)+Math.abs(dy),now=performance.now();
  if(now-mouseF.t>250){mouseF.t=now;mouseF.ema=m;mouseF.skip=0;return false;}   // después de una pausa, se acepta tal cual
  mouseF.t=now;
  if(m>1200&&m>mouseF.ema*8&&mouseF.skip<1){mouseF.skip++;return true;}
  mouseF.skip=0;mouseF.ema=mouseF.ema*.7+m*.3;return false;
}
// las sueltas de mouse que provoca el propio juego (abrir chat o tienda, fin de partida) no abren la pausa
let selfUnlockT=0;function selfUnlock(){selfUnlockT=performance.now();if(document.pointerLockElement)document.exitPointerLock();}
document.addEventListener('pointerlockchange',()=>{if(performance.now()-selfUnlockT<800)return;if(document.pointerLockElement!==canvas&&inGame&&$('menu').hidden&&!chatOpen&&$('shop').hidden&&!kickOpen()&&$('inter').hidden)openPause();});
$('bStay').addEventListener('click',()=>{
  // en el fin de partida: avisa que estás listo; en práctica arranca otra al instante
  if(matchState==='inter'&&net){net.send({t:'ready'});$('bStay').disabled=true;$('bStay').textContent='¡Listo!';if(!online)$('interReady').textContent='Arrancando…';SFX.ui();return;}
  lockPointer();SFX.ui();
});
$('bQuit').addEventListener('click',()=>{leaveGame();$('mKick').textContent='Arena · Gungame · Team Deathmatch · Captura la bandera';$('bOnline').textContent='Jugar online';$('bOnline').disabled=!serverOK;$('bOffline').textContent='Práctica con bots';showMenu();});
// los avisos con animación no se repiten al volver de la pausa
['cMsg','cSub','crPop','pick'].forEach(id=>$(id).addEventListener('animationend',()=>$(id).classList.remove('show')));
canvas.addEventListener('mousedown',e=>{
  if(!inGame||!$('menu').hidden||!$('shop').hidden)return;
  if(chatOpen)closeChat(false,false);
  if(!$('inter').hidden)return;   // en el fin de partida el mouse queda libre para los botones
  if(document.pointerLockElement!==canvas){lockPointer();return;}
  if(e.button===0){mouseDown=true;}
  // click derecho corto = la mira queda puesta (otro click la saca); mantenido = se saca al soltar
  if(e.button===2&&me.alive&&WEAPONS[me.w].scope){if(me.scope){me.scope=false;me.scopeHold=0;}else{me.scope=true;me.scopeHold=performance.now();SFX.ui();}}
});
addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2&&me.scope&&me.scopeHold&&performance.now()-me.scopeHold>280)me.scope=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousemove',e=>{
  if(!inGame||document.pointerLockElement!==canvas||!me.alive)return;
  if(mouseSpike(e.movementX,e.movementY))return;
  // con mira, la sensibilidad baja en proporción al zoom: el movimiento en pantalla se siente igual que sin mira
  const sc=me.scope&&WEAPONS[me.w].scope?Math.tan((WEAPONS[me.w].zoom||22)*Math.PI/360)/Math.tan(S.fov*Math.PI/360):1;
  const k=.0022*S.sens*sc;me.yaw-=e.movementX*k;me.pitch=Math.max(-1.55,Math.min(1.55,me.pitch-e.movementY*k*(S.invY?-1:1)));
});
addEventListener('wheel',e=>{if(inGame&&$('menu').hidden&&$('shop').hidden&&!chatOpen&&Math.abs(e.deltaY)>2)cycleWeapon(e.deltaY>0?1:-1);},{passive:true});
let chatOpen=false,voteNow=null,voteMax=30;
/* ---------- menú de Y: elegir a quién echar ---------- */
let kmSel=0,kmList=[];
function kickOpen(){return !$('kickMenu').hidden;}
function openKick(){
  if(!inGame||!online){announce('SOLO ONLINE','En la práctica los bots se sacan con − en el menú');SFX.deny();return;}
  if(!$('shop').hidden)closeShop(true);
  $('kickMenu').hidden=false;mouseDown=false;for(const k in keys)keys[k]=false;selfUnlock();
  kmSel=0;$('kmMsg').textContent='';renderKick();SFX.ui();
}
function closeKick(silent){if(!kickOpen())return;$('kickMenu').hidden=true;if(!silent&&inGame){lockPointer();SFX.ui();}}
function renderKick(){
  kmList=scores.filter(r=>!r[5]&&r[0]!==myId).slice(0,9);
  const humans=scores.filter(r=>!r[5]).length;
  $('kmList').innerHTML=kmList.length?kmList.map((r,i)=>'<button type="button" class="kmP'+(r[0]===kmSel?' sel':'')+'" data-id="'+r[0]+'" style="--pc:'+chatColor(r[0],r[1])+'"><kbd>'+(i+1)+'</kbd><span class="n">'+esc(r[1])+'</span><span class="s">'+r[2]+' / '+r[3]+'</span></button>').join('')
    :'<div class="kmEmpty">No hay otras personas en la partida (a los bots no se los vota).</div>';
  $('kmList').querySelectorAll('.kmP').forEach(b=>b.onclick=()=>kickPick(+b.dataset.id));
  const sel=kmList.find(r=>r[0]===kmSel);$('kmConfirm').hidden=!sel;if(sel)$('kmName').textContent=sel[1];
  if(kmList.length&&humans<3)$('kmMsg').textContent='Hacen falta al menos 3 personas en la partida para votar.';
}
function kickPick(id){kmSel=id;$('kmMsg').textContent='';renderKick();SFX.ui();}
function kickSend(){if(!kmSel||!net)return;net.send({t:'kick',id:kmSel});closeKick();}
$('kmYes').onclick=kickSend;$('kmNo').onclick=()=>{kmSel=0;renderKick();SFX.ui();};
$('kickMenu').addEventListener('mousedown',e=>{if(e.target===$('kickMenu'))closeKick(true);});
$('bKick').addEventListener('click',()=>{const id=+$('kickSel').value;if(id&&net){net.send({t:'kick',id});SFX.ui();}});
function renderVote(m){
  voteNow=m&&m.on?m:null;const b=$('voteBox');
  if(!voteNow){b.hidden=true;return;}
  if(b.hidden){SFX.voteStart();voteMax=Math.max(m.left,1);}
  b.hidden=false;b.classList.toggle('me',m.me===2);
  const tot=Math.max(m.need*2-1,m.y+m.n,1),pc=v=>Math.min(100,v/tot*100),nd=m.need/tot*100;
  const row=(cls,lbl,k,v,on)=>'<div class="vrow '+cls+(on?' on':'')+'"><span>'+(k?'<span class="k">'+k+'</span>':'')+lbl+'</span><div class="vbar"><i style="width:'+pc(v)+'%"></i>'+(cls==='yes'?'<span class="need" style="left:'+nd+'%"></span>':'')+'</div><b style="color:#e8f2ff">'+v+'</b></div>';
  const foot=m.me===2?'<span style="color:#ff9a7a">¡Votan para echarte!</span>':m.me===1?'Votaste que sí':m.me===-1?'Votaste que no':'Apretá Y o N para votar';
  b.innerHTML='<div class="vt"><span>VOTACIÓN</span><span>'+m.left+' s</span></div><div class="vtime"><i style="width:'+(m.left/voteMax*100)+'%"></i></div>'
    +'<div class="vq">¿Echar a <b>'+esc(m.name)+'</b>?</div><div class="vby">lo pidió '+esc(m.by)+' · hacen falta '+m.need+' sí</div>'
    +row('yes','Sí',m.me===0?'Y':'',m.y,m.me===1)+row('no','No',m.me===0?'N':'',m.n,m.me===-1)+'<div class="vfoot">'+foot+'</div>';
}
let chatDraft='';
function openChat(){chatOpen=true;$('chat').classList.add('open');const i=$('chatIn');i.hidden=false;i.value=chatDraft;i.focus();for(const k in keys)keys[k]=false;mouseDown=false;selfUnlock();}
// relock=false cuando el que cierra es un clic en el juego (ese mismo clic ya pide el mouse)
function closeChat(send,relock=true){if(!chatOpen)return;const i=$('chatIn');const txt=i.value.trim();if(send&&txt&&net)net.send({t:'chat',m:txt});chatDraft=send?'':i.value;chatOpen=false;i.hidden=true;$('chat').classList.remove('open');i.blur();if(inGame&&relock)lockPointer();}
// si el chat pierde el foco (clic afuera, Alt+Tab) se cierra solo: nunca te deja trabado
$('chatIn').addEventListener('blur',()=>{if(chatOpen)setTimeout(()=>{if(chatOpen&&document.activeElement!==$('chatIn'))closeChat(false,false);},0);});
$('chatIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();closeChat(true);}else if(e.key==='Escape'){e.preventDefault();closeChat(false,false);if(inGame)announce('','Hacé click para volver al juego');}});
addEventListener('keydown',e=>{
  if(chatOpen){if(document.activeElement===$('chatIn'))return;closeChat(false);}
  if(kickOpen()){e.preventDefault();
    if(e.code==='KeyY'||(e.code==='Escape'&&!kmSel)){closeKick(e.code==='Escape');if(e.code==='Escape'&&inGame)announce('','Hacé click para volver al juego');}
    else if(e.code==='Escape'){kmSel=0;renderKick();}
    else if(e.code==='Enter')kickSend();
    else{const d=/^(?:Digit|Numpad)([1-9])$/.exec(e.code);if(d&&kmList[d[1]-1])kickPick(kmList[d[1]-1][0]);}
    return;}
  if(!$('shop').hidden){if(e.code==='KeyB'){e.preventDefault();closeShop();}else if(e.code==='Escape'){e.preventDefault();closeShop(true);SFX.ui();if(inGame)announce('','Hacé click para volver al juego');}return;}
  if(!inGame||!$('menu').hidden){if(e.code==='Escape'&&inGame&&!$('menu').hidden&&document.activeElement!==$('pName')){e.preventDefault();resumeGame();}return;}
  if(e.code==='Escape'){e.preventDefault();if(!$('inter').hidden)return;if(document.pointerLockElement)document.exitPointerLock();openPause();return;}
  keys[e.code]=true;
  if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)||e.ctrlKey)e.preventDefault();
  // 1 arma principal · 2 pistola · 3 cuchillo · 4 molotov (en Gungame: 1 el arma del nivel, 3 el cuchillo)
  const ggW=MODE==='gungame'?me.ow.findIndex((v,i)=>v&&i!==7):-1;
  const n=MODE==='snipers'?{Digit1:8,Digit2:2,Digit3:7,Numpad1:8,Numpad2:2,Numpad3:7}[e.code]:MODE==='gungame'?{Digit1:ggW,Digit3:7,Numpad1:ggW,Numpad3:7}[e.code]:{Digit1:C.primaryOf(me.ow),Digit2:0,Digit3:7,Digit4:10,Numpad1:C.primaryOf(me.ow),Numpad2:0,Numpad3:7,Numpad4:10}[e.code];
  if(e.code==='KeyE'&&!e.repeat&&net&&me.alive&&MODE!=='gungame')net.send({t:'grab'});
  if(e.code==='KeyR')startReload(me.w);
  if(e.code==='KeyV')selectWeapon(7);if(n!==undefined&&n>=0)selectWeapon(n);
  if(e.code==='KeyG')selectWeapon(10);
  // Y: si hay una votación sin tu voto, Y es "sí"; si no, abre el menú para echar a alguien
  if(voteNow&&voteNow.me===0&&(e.code==='KeyY'||e.code==='KeyN')&&!e.repeat){net.send({t:'vote',y:e.code==='KeyY'});SFX.ui();}
  else if(e.code==='KeyY'&&!e.repeat&&online){e.preventDefault();openKick();}
  if(e.code==='KeyQ')quickSwitch();
  if(e.code==='KeyF'&&!e.repeat)inspect();
  if(e.code==='KeyB'&&!e.repeat){e.preventDefault();openShop();}
  if(e.code==='KeyT'||e.code==='Enter'){e.preventDefault();openChat();}
  if(e.code==='Tab'){$('board').hidden=false;renderBoard();}
  if(!online&&!e.repeat&&(e.code==='Equal'||e.code==='NumpadAdd'||e.key==='+'))changeBots(1);
  if(!online&&!e.repeat&&(e.code==='Minus'||e.code==='NumpadSubtract'||e.key==='-'))changeBots(-1);

});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Tab'&&matchState!=='inter')$('board').hidden=true;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouseDown=false;});
function changeBots(d){S.bots=Math.max(0,Math.min(15,S.bots+d));saveS();syncSettings();if(net&&!online){net.send({t:'cfg',bots:S.bots});sysChat('Bots en la arena: '+S.bots);}}


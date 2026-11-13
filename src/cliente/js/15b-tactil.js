/* =================== CONTROLES TÁCTILES (celulares y tablets) ===================
   Se prenden solos en pantallas táctiles (TACTIL, ver 00-inicio-ajustes.js) o al primer toque.
   Mitad izquierda: palanca flotante para moverse (analógica). Mitad derecha: arrastrar para mirar.
   Botones: disparar (mantener; arrastrando también se apunta), saltar, agacharse/deslizar, recargar,
   cambiar de arma, mira, agarrar (E), tienda, tabla, chat y pausa. No hace falta bloquear el mouse.
   Todo termina en las mismas variables que usa el teclado (keys, mouseDown, me.yaw…): el juego no distingue. */
const TC={on:false,f:0,s:0,stick:null,look:new Map(),btn:new Map(),SENS:2.3,R:58};
function tcOn(){
  if(TC.on)return;TC.on=true;document.body.classList.add('tactil');
  $('tc').hidden=false;tcSync();
}
function tcSync(){
  if(!TC.on)return;
  const W_=WEAPONS[me.w]||{};
  $('tcAim').hidden=!W_.scope;$('tcShop').hidden=!(C.MODES[MODE]&&C.MODES[MODE].shop);$('tcLuz').hidden=!NIGHT;
  $('tcAim').classList.toggle('on',!!me.scope);
  $('tcResume').hidden=!(inGame&&!$('menu').hidden);
}
const tcFree=()=>inGame&&$('menu').hidden&&$('shop').hidden&&!chatOpen&&$('inter').hidden&&!kickOpen()&&!mapMenuOpen();
// qué hace cada botón al apretar (d = true) y al soltar
const TCB={
  fire:d=>{mouseDown=d&&me.alive;if(d&&!me.alive)spClick();},
  jump:d=>{keys.Space=d;if(d&&!me.alive)spSpace();},
  duck:d=>{keys.KeyC=d;},
  rel:d=>{if(d)startReload(me.w);},
  swap:d=>{if(d){cycleWeapon(1);tcSync();}},
  aim:d=>{if(d&&me.alive&&WEAPONS[me.w].scope){me.scope=!me.scope;me.scopeHold=0;SFX.ui();tcSync();}},
  use:d=>{if(d)wheelKey(true,false);else wheelKey(false);},
  shop:d=>{if(d)openShop();},
  tab:d=>{if(d){const b=$('board');b.hidden=!b.hidden;if(!b.hidden)renderBoard();}},
  chat:d=>{if(d)openChat();},
  luz:d=>{if(d)nightToggle();},
  menu:d=>{if(d)openPause();}
};
function tcStickSet(t){
  const st=TC.stick,dx=t.clientX-st.x,dy=t.clientY-st.y,l=Math.hypot(dx,dy),k=l>TC.R?TC.R/l:1;
  const nx=dx*k/TC.R,ny=dy*k/TC.R,dead=.14,m=Math.hypot(nx,ny);
  TC.s=m<dead?0:nx;TC.f=m<dead?0:-ny;
  $('tcKnob').style.transform='translate('+(dx*k)+'px,'+(dy*k)+'px)';
}
function tcLook(dx,dy){
  if(!me.alive){spLook(dx*1.4,dy*1.4);return;}
  const sc=me.scope&&WEAPONS[me.w].scope?Math.tan((WEAPONS[me.w].zoom||22)*Math.PI/360)/Math.tan(S.fov*Math.PI/360)*(S.sensZ>0?S.sensZ:1):1;
  const k=.0022*S.sens*TC.SENS*sc;me.yaw-=dx*k;me.pitch=Math.max(-1.55,Math.min(1.55,me.pitch-dy*k*(S.invY?-1:1)));
}
function tcStart(e){
  tcOn();
  if(!inGame)return;
  e.preventDefault();
  for(const t of e.changedTouches){
    const el=document.elementFromPoint(t.clientX,t.clientY),b=el&&el.closest&&el.closest('[data-tc]'),id=t.identifier;
    if(b){const k=b.dataset.tc;TC.btn.set(id,{k,b,x:t.clientX,y:t.clientY});b.classList.add('ap');if(k==='menu'||tcFree()||k==='tab')TCB[k](true);if(k==='fire')TC.look.set(id,{x:t.clientX,y:t.clientY});continue;}
    if(!tcFree())continue;
    if(t.clientX<innerWidth*.42&&!TC.stick){
      TC.stick={id,x:t.clientX,y:t.clientY};const p=$('tcStick');p.style.left=t.clientX+'px';p.style.top=t.clientY+'px';p.classList.add('on');tcStickSet(t);
    }else{TC.look.set(id,{x:t.clientX,y:t.clientY,t0:performance.now(),mv:0});}
  }
}
function tcMove(e){
  if(!inGame)return;
  e.preventDefault();
  for(const t of e.changedTouches){
    const id=t.identifier;
    if(TC.stick&&TC.stick.id===id){tcStickSet(t);continue;}
    const l=TC.look.get(id);
    if(l){const dx=t.clientX-l.x,dy=t.clientY-l.y;l.x=t.clientX;l.y=t.clientY;l.mv=(l.mv||0)+Math.abs(dx)+Math.abs(dy);if(tcFree())tcLook(dx,dy);}
  }
}
function tcEnd(e){
  for(const t of e.changedTouches){
    const id=t.identifier;
    if(TC.stick&&TC.stick.id===id){TC.stick=null;TC.f=TC.s=0;$('tcStick').classList.remove('on');$('tcKnob').style.transform='';}
    const b=TC.btn.get(id);if(b){TC.btn.delete(id);b.b.classList.remove('ap');TCB[b.k](false);}
    const l=TC.look.get(id);
    if(l){TC.look.delete(id);if(!b&&!me.alive&&inGame&&l.mv<12&&performance.now()-l.t0<350)spClick();}   // muerto: un toque corto pasa a mirar a otro jugador
  }
  if(inGame)e.preventDefault();
}
{
  const L=$('tc');
  L.addEventListener('touchstart',tcStart,{passive:false});L.addEventListener('touchmove',tcMove,{passive:false});
  L.addEventListener('touchend',tcEnd,{passive:false});L.addEventListener('touchcancel',tcEnd,{passive:false});
  L.addEventListener('contextmenu',e=>e.preventDefault());
  // el primer toque en cualquier lado prende los controles (por si el navegador no avisó que la pantalla es táctil)
  addEventListener('touchstart',()=>tcOn(),{passive:true,once:true});
  if(TACTIL)tcOn();
  // en la pausa y fuera de la partida el menú es HTML normal; este botón vuelve al juego sin teclado
  $('tcResume').addEventListener('click',()=>{resumeGame();tcSync();});
  $('shopX').addEventListener('click',()=>closeShop());
  // las cartas de mejora se eligen tocándolas
  $('cardsBody').addEventListener('click',e=>{const c=e.target.closest('.ccard');if(c&&cardsOpen())pickCard(+c.dataset.i);});
  // pantalla completa y apaisado al entrar a la partida (donde el navegador lo permite)
  setInterval(()=>{if(TC.on)tcSync();},400);
}
function tcLandscape(){if(!TC.on)return;try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}

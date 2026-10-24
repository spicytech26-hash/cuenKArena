/* =================== ESTADO =================== */
const me={s:{x:0,y:0,z:0,vx:0,vy:0,vz:0,on:true},yaw:0,pitch:0,alive:false,hp:100,ar:0,am:C.AMMO0(0),ow:[1,1,0,0,0,0,0,1,0],mag:{2:2},rel:0,relW:-1,scope:false,lvlSwitch:false,w:1,q:0,deadT:0,killer:0,lvl:0,
  cr:C.ECON.START,unl:[1,1,0,0,0,0,0,1,0],eyeC:K.EYE,mt:9,mdir:1,ads:0,perk:{ar:0,am:0},cool:0,held:false,kick:0,raise:0,flash:0,bob:0,dip:0,roll:0,tilt:0,padT:0,stepT:0,lastW:0,heat:0};
const players=new Map();
let myId=0,net=null,online=false,inGame=false,paused=false,shake=0;
let scores=[],timeLeft=600,fragLimit=20,matchState='play',ping=0;
const projs=[];
const keys={};let mouseDown=false;
const G={hurt:0,pick:0,hitT:0,time:0,lava:0,sendT:0,pingT:0,dmgT:0,dmgAng:0,fpsN:0,fpsT:0};
// reloj: estimación de la hora del servidor y colchón de interpolación adaptativo
const CLK={off:null,jit:.02,delay:.1};
function serverNow(){if(!online&&net&&net.game)return net.game.time+(net.acc||0);return performance.now()/1000+(CLK.off===null?0:CLK.off);}

function ensurePlayer(id,name,color,bot,skin,team){
  let p=players.get(id);
  if(!p){p={id,name:name||'…',color:color||'#ffffff',skin:skin||{c:color||'#ffffff',v:'#ffffff',a:0},bot:!!bot,team:-1,buf:[],alive:false,model:null,deadT:0,w:1,fl:0,spd:0,phase:0,x:0,y:0,z:0,yaw:0,pitch:0,gib:false};players.set(id,p);}
  const teams=teamsMode();
  let rebuild=false;
  if(name&&name!==p.name){p.name=name;rebuild=true;}
  if(team!=null&&team!==p.team){p.team=team;rebuild=true;}
  if(skin&&JSON.stringify(skin)!==JSON.stringify(p.skin)){p.skin=skin;if(!teams)p.color=skin.c;rebuild=true;}
  if(color&&color!==p.color){p.color=color;if(!teams)p.skin=Object.assign({},p.skin,{c:color});rebuild=true;}
  if(bot!==undefined)p.bot=!!bot;
  if(rebuild&&p.model){scene.remove(p.model.g);p.model=null;}
  if(!p.model&&id!==myId){
    // en equipos la armadura toma el color del equipo; visor y accesorio siguen siendo los tuyos
    p.model=buildPlayer(teams?Object.assign({},p.skin,{c:p.color}):p.skin,p.name);p.model.g.visible=false;scene.add(p.model.g);
    if(teams&&p.team===myTeam&&p.model.tag){p.model.tag.material.depthTest=false;p.model.tag.renderOrder=10;}
  }
  return p;
}
function removePlayer(id){const p=players.get(id);if(!p)return;if(p.model)scene.remove(p.model.g);players.delete(id);}
const nameOf=id=>id===myId?S.name:(players.get(id)||{}).name||'¿?';
// color del nombre en el chat: uno distinto para cada jugador (en el orden en que van hablando), siempre legible
const CHAT_COLS=['#ffb547','#5fd0ff','#8cf06a','#ff7aa8','#c39bff','#ffe066','#4ff0c8','#ff8f5a','#9fb6ff','#f2a5ff','#b6f2a0','#7fe0ff','#ffd0a0','#ff6b6b'];
const chatCols=new Map();
function chatColor(id,name){const k=name||id;if(!chatCols.has(k))chatCols.set(k,CHAT_COLS[chatCols.size%CHAT_COLS.length]);return chatCols.get(k);}
const colorOf=id=>id===myId?(teamsMode()&&myTeam>=0?TEAMS[myTeam].c:S.skin.c):(players.get(id)||{}).color||'#eadcc4';

/* =================== RED =================== */
class LocalNet{
  constructor(mode){const md=C.MODES[mode];this.game=new C.Game({online:false,mode,bots:S.bots,botSkill:S.skill,fraglimit:mode==='tdm'?S.tdmLimit:S.fl,timelimit:1200,map:md.maps.includes(S.map)?S.map:md.maps[0]});this.acc=0;this.id=this.game.addClient(m=>onMsg(m));}
  send(m){this.game.onMessage(this.id,m);}
  update(dt){if(paused)return;this.acc+=dt;let n=0;while(this.acc>=1/40&&n<3){this.game.tick(1/40);this.acc-=1/40;n++;}if(this.acc>1/40)this.acc=0;} // si un cuadro se atrasa, no se encadenan pasos extra
  close(){}
}
class WSNet{
  constructor(url,onOpen,onFail){this.ok=false;this.ws=new WebSocket(url);
    this.ws.onopen=()=>{this.ok=true;onOpen();};
    this.ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch(_){return;}onMsg(m);};
    this.ws.onclose=()=>{if(this.closing)return;onFail(this.ok);};
    this.ws.onerror=()=>{};}
  send(m){if(this.ws.readyState===1)this.ws.send(JSON.stringify(m));}
  update(){}
  close(){this.closing=true;try{this.ws.close();}catch(e){}}
}
const wsURL=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
let serverOK=false;
function probeServer(){
  if(!/^https?:$/.test(location.protocol)||!location.host){setNet(false);return;}
  let done=false,ws;
  try{ws=new WebSocket(wsURL);}catch(e){setNet(false);return;}
  const t=setTimeout(()=>{if(!done){done=true;try{ws.close();}catch(e){}setNet(false);}},4000);
  ws.onopen=()=>{if(done)return;done=true;clearTimeout(t);ws.close();setNet(true);};
  ws.onerror=()=>{if(done)return;done=true;clearTimeout(t);setNet(false);};
}
function setNet(ok){serverOK=ok;$('bOnline').disabled=!ok;$('netDot').className='dot '+(ok?'ok':'no');
  $('netTxt').innerHTML=ok?'Servidor en línea. Compartí esta dirección con tus amigos: <b>'+location.host+'</b>':'No hay servidor online desde acá. Probá la <b>práctica con bots</b>; para jugar con amigos, entrá desde la dirección de tu servidor de CuenkArena.';}

function startGame(isOnline,mode,auto){
  if(!auto){clearTimeout(G.reT);G.reTry=0;}
  audioInit();if(AC&&AC.state==='suspended')AC.resume();
  leaveGame();
  mode=C.MODES[mode]?mode:'arena';S.mode=mode;saveS();
  goFullscreen();
  ['cMsg','cSub','crPop','pick'].forEach(id=>{$(id).classList.remove('show');});
  online=isOnline;myId=0;CLK.off=null;CLK.jit=.02;MODE=mode;myTeam=-1;FL=[];TS=[0,0];me.lvl=0;
  players.forEach((p,id)=>removePlayer(id));projs.forEach(p=>scene.remove(p.m));projs.length=0;
  scores=[];$('feed').innerHTML='';$('chatLog').innerHTML='';
  const join=()=>{net.send({t:'join',cid:CID,name:S.name,skin:S.skin,skill:S.skill,fl:S.tdmLimit,tok:isOnline&&ACC?ACCTOK:undefined});};
  if(isOnline){
    const tries=G.reTry||0;G.reTry=0;
    net=new WSNet(wsURL+'?mode='+mode,()=>{G.reTry=0;join();},(wasOk)=>{
      net=null;inGame=false;
      // si se corta en medio de la partida (el servidor se reinicia al publicar una actualización), se reintenta solo
      if((wasOk||tries)&&tries<20){showMenu();toast('Se cortó la conexión · reconectando'+(tries?' (intento '+(tries+1)+')':'')+'…');
        clearTimeout(G.reT);G.reT=setTimeout(()=>{if(!inGame&&!$('menu').hidden){G.reTry=tries+1;startGame(true,mode,true);}},tries?3000:1200);return;}
      showMenu();toast(wasOk?'Se cortó la conexión con el servidor':'No se pudo conectar al servidor');});
  }else{net=new LocalNet(mode);join();}
  inGame=true;paused=false;$('bLeave').hidden=false;$('tPingBox').hidden=!isOnline;
  hideMenu();lockPointer();
}
function leaveGame(){
  if(net){net.close();net=null;}renderVote(null);
  inGame=false;me.alive=false;$('bLeave').hidden=true;$('hud').hidden=true;$('board').hidden=true;$('inter').hidden=true;closeShop(true);
  if(level)for(const o of level.items)o.g.visible=true;
}
// cartel flotante cuando te echan por votación (1ª vez: podés volver; 2ª: cuenta regresiva hasta que termina la partida)
let kickTimer=0;
function kickNotice(m){
  const el=$('kickNote');clearInterval(kickTimer);el.hidden=false;
  const close=()=>{clearInterval(kickTimer);el.hidden=true;};el.querySelector('button').onclick=close;
  const tx=el.querySelector('.kt'),sub=el.querySelector('.ks');
  if((m.n||1)<2){
    tx.textContent='Te echaron por primera vez: podés volver a unirte';
    sub.textContent='Una segunda echada no te dejará entrar hasta que termine la partida.';
    toast('Te echaron de la partida por votación');kickTimer=setTimeout(close,12000);return;
  }
  const end=performance.now()+(m.left||0)*1000;
  const tick=()=>{const s=Math.max(0,Math.ceil((end-performance.now())/1000));
    if(s<=0){clearInterval(kickTimer);tx.textContent='La partida terminó: ya podés volver a entrar';sub.textContent='';toast('Ya podés volver a la partida online');kickTimer=setTimeout(close,8000);return;}
    tx.textContent=(m.again?'Todavía no podés entrar: ':'Te echaron por segunda vez: ')+'no podés volver hasta que termine la partida';
    sub.textContent='Faltan '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+' para que termine (puede terminar antes si alguien llega al límite de bajas).';
    toast('Echado hasta que termine la partida');};
  tick();kickTimer=setInterval(tick,250);
}
function toast(t){$('netTxt').textContent=t;$('netDot').className='dot no';}


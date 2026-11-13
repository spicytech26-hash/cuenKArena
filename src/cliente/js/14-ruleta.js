/* =================== RULETA DE ARMAS (mantener E) ===================
   Inventario al estilo Doom Eternal: todo lo que comprás en la tienda se suma acá. En las manos llevás solo tres
   cosas: la principal (ranura 1), la pistola (2) y el cuchillo (3, más la molotov en el 4). La ruleta cambia la principal
   por otra del inventario; la pistola y el cuchillo no se tocan. El que decide el cambio es el servidor (mensaje `equip`).
   Tocar E sigue agarrando el arma tirada en el piso. Mientras está abierta el mouse mueve la selección en vez de la cámara. */
const WH={open:false,tm:null,down:false,x:0,y:0,sel:-1,list:[],R:128};
function wheelList(){
  const l=[1];C.PRIMARY.forEach(w=>{if(w!==1&&me.unl[w])l.push(w);});
  const cur=C.primaryOf(me.ow);if(cur>=0&&!l.includes(cur))l.push(cur);   // un arma agarrada del piso también aparece (si la cambiás, se pierde)
  return l;
}
function wheelOk(){return inGame&&me.alive&&C.MODES[MODE].shop&&MODE!=='gungame'&&$('shop').hidden&&!chatOpen&&$('menu').hidden&&!kickOpen()&&!mapMenuOpen();}
function openWheel(){
  WH.tm=null;if(!WH.down||!wheelOk())return;
  const ic=shopIcons(),l=wheelList(),n=l.length,cur=C.primaryOf(me.ow);
  WH.list=l;WH.open=true;WH.x=WH.y=0;WH.sel=-1;
  const box=$('wheel');
  box.innerHTML='<div class="wring"></div><div class="wptr"></div><div class="wmid"><b id="wmN">'+esc(WEAPONS[cur>=0?cur:1].name)+'</b><small id="wmS">Mové el mouse y soltá E</small></div>'+
    l.map((w,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,x=Math.cos(a)*WH.R,y=Math.sin(a)*WH.R,W_=WEAPONS[w];
      return '<div class="wslot'+(w===cur?' cur':'')+'" data-i="'+i+'" style="left:calc(50% + '+x.toFixed(1)+'px);top:calc(50% + '+y.toFixed(1)+'px)"><img alt="" src="'+(ic['w'+w]||'')+'"><span>'+esc(W_.name)+'</span><i>'+(W_.ammo?me.am[W_.ammo]:'')+'</i></div>';}).join('')+
    '<div class="wfix">En las manos siguen: <b>'+esc(WEAPONS[0].name)+'</b> · <b>'+esc(WEAPONS[7].name)+'</b></div>';
  box.hidden=false;SFX.ui();
}
function wheelMove(dx,dy){
  WH.x+=dx;WH.y+=dy;const m=Math.hypot(WH.x,WH.y),MX=110;if(m>MX){WH.x*=MX/m;WH.y*=MX/m;}
  const n=WH.list.length;let s=-1;
  if(Math.hypot(WH.x,WH.y)>38){const a=Math.atan2(WH.y,WH.x)+Math.PI/2;s=Math.round(((a%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*n)%n;}
  if(s!==WH.sel){WH.sel=s;[...$('wheel').querySelectorAll('.wslot')].forEach((e,i)=>e.classList.toggle('sel',i===s));
    const w=s>=0?WH.list[s]:C.primaryOf(me.ow);$('wmN').textContent=WEAPONS[w>=0?w:1].name;$('wmS').textContent=s<0?'Mové el mouse y soltá E':w===C.primaryOf(me.ow)?'Ya la tenés en las manos':'Soltá E para equiparla';SFX.click();}
  const p=document.querySelector('#wheel .wptr');if(p)p.style.transform='rotate('+(Math.atan2(WH.y,WH.x)*180/Math.PI+90)+'deg) scaleY('+Math.min(1,Math.hypot(WH.x,WH.y)/MX)+')';
}
function closeWheel(apply){
  if(WH.tm){clearTimeout(WH.tm);WH.tm=null;}
  if(!WH.open)return;WH.open=false;$('wheel').hidden=true;
  if(apply&&WH.sel>=0&&net){const w=WH.list[WH.sel];if(w!==C.primaryOf(me.ow))net.send({t:'equip',w});}
}
// E: si se suelta rápido es "agarrar"; si se mantiene, se abre la ruleta
function wheelKey(down,rep){
  if(down){if(rep||WH.down)return;WH.down=true;WH.t0=performance.now();
    if(MODE==='gungame'||!me.alive||!C.MODES[MODE].shop)return;
    WH.tm=setTimeout(openWheel,200);}
  else{const was=WH.down;WH.down=false;
    if(WH.open){closeWheel(true);return;}
    if(WH.tm){clearTimeout(WH.tm);WH.tm=null;}
    if(was&&net&&me.alive&&MODE!=='gungame'&&performance.now()-WH.t0<400)net.send({t:'grab'});}
}

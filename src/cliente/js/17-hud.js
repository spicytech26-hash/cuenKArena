/* =================== HUD =================== */
const hudCache={};
function setTxt(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v;}}
function updateHUD(){
  const W_=WEAPONS[me.w];setTxt('hWName',W_.name);
  const gg=MODE==='gungame'||!!(C.MODES[MODE]&&C.MODES[MODE].inf),ctf=MODE==='ctf',tm=teamsMode();
  const a=W_.mag?(me.rel>0&&me.relW===me.w?'···':(me.mag[me.w]==null?W_.mag:me.mag[me.w])+'|'+(gg?'∞':me.am[W_.ammo])):W_.ammo&&!gg?me.am[W_.ammo]:'∞';setTxt('hAmmo',String(a));$('hAmmo').classList.toggle('low',!!W_.ammo&&!gg&&me.am[W_.ammo]<=(W_.ammo==='bullets'?20:3));
  const hp=Math.max(0,Math.ceil(me.hp));setTxt('hHp',String(hp));$('hHp').classList.toggle('low',hp<=25);$('hHp').classList.toggle('over',hp>100);
  setTxt('hAr',String(Math.ceil(me.ar)));
  const idx=scores.findIndex(s=>s[0]===myId);const mine=idx>=0?scores[idx]:null;
  setTxt('tFrags',mine?String(mine[2]):'0');setTxt('tRank',idx>=0?(idx+1)+'º/'+scores.length:'–');
  setTxt('tCr','¤ '+me.cr.toLocaleString('es-AR'));
  if(gg){setTxt('tLvl',Math.min(GG.length,me.lvl+1)+'/'+GG.length);setTxt('tNext',me.lvl+1<GG.length?WEAPONS[GG[me.lvl+1]].name:'¡ganar!');}
  if(tm){setTxt('tsR',String(TS[0]));setTxt('tsB',String(TS[1]));setTxt('ctfMid','a '+(ctf?capLimit:fragLimit));$('ctfR').classList.toggle('mine',myTeam===0);$('ctfB').classList.toggle('mine',myTeam===1);}
  if(MODE==='tdm'||MODE==='snipers'){setTxt('fsR','bajas');setTxt('fsB','bajas');}
  const lob=MODE==='tdm'&&(matchState==='lobby'||matchState==='count');$('lobbyBox').hidden=!lob;
  if(lob){setTxt('lobbyT',matchState==='count'?'ARRANCA EN '+LOBBY.cd:'ESPERANDO JUGADORES · '+LOBBY.hn+'/'+LOBBY.mp);setTxt('lobbyS','Calentamiento: las bajas no cuentan · '+fragLimit+' bajas para ganar · Esc para cambiar el límite');}
  if(ctf){
    const lab=(i)=>{const f=FL[i];if(!f||f[0]===0)return ['en base',false];if(f[0]===2)return ['tirada',true];return [f[1]===myId?'¡la tenés!':'robada · '+nameOf(f[1]),true];};
    [['fsR',0],['fsB',1]].forEach(([id,i])=>{const [t,al]=lab(i);setTxt(id,t);$(id).classList.toggle('alert',al);});
    $('ctfR').classList.toggle('mine',myTeam===0);$('ctfB').classList.toggle('mine',myTeam===1);
    const carry=myTeam>=0&&FL[1-myTeam]&&FL[1-myTeam][0]===1&&FL[1-myTeam][1]===myId;
    $('carry').hidden=!(carry&&me.alive);if(carry)$('carry').style.background=TEAMS[1-myTeam].c;
  }
  const tl=Math.max(0,timeLeft);setTxt('tTime',Math.floor(tl/60)+':'+String(tl%60).padStart(2,'0'));
  setTxt('tPing',ping?ping+' ms':'–');
  $('quadChip').hidden=!(me.q>0&&me.alive);setTxt('quadT',String(me.q));
  // cuatro ranuras: 1 principal, 2 pistola, 3 cuchillo, 4 molotov (solo si tenés)
  const sl=$('slots');if(sl.children.length!==4)sl.innerHTML=[1,2,3,4].map(k=>'<div class="slot"><i>'+k+'</i><span></span><span></span></div>').join('');
  const prim=C.primaryOf(me.ow),ws=gg?[me.ow.findIndex((v,i)=>v&&i!==7),-1,7,-1]:[prim,0,7,10];
  ws.forEach((w,k)=>{const d=sl.children[k],W_=WEAPONS[w],has=w>=0&&!!me.ow[w];d.hidden=!has;if(!has)return;
    d.children[1].textContent=W_.name;d.classList.add('own');d.classList.toggle('on',w===me.w);d.lastChild.textContent=W_.ammo&&!gg?me.am[W_.ammo]:'∞';});
}
function renderBoard(){
  const tl=Math.max(0,timeLeft),gg=MODE==='gungame',ctf=MODE==='ctf',tm=teamsMode();
  $('bTitle').textContent=C.MODES[MODE].name+' · '+W.name;
  const goal=ctf?'primero a '+capLimit+' capturas':MODE==='tdm'?'primer equipo a '+fragLimit+' bajas'+(matchState==='play'?'':' · esperando jugadores'):gg?'primero en completar '+GG.length+' niveles':'primero a '+fragLimit+' frags';
  $('bMeta').textContent=(online?'Online':'Práctica')+' · '+goal+' · quedan '+Math.floor(tl/60)+':'+String(tl%60).padStart(2,'0');
  $('thX').textContent=gg?'Nivel':ctf?'Capturas':'Créditos';
  const row=(s,i)=>'<tr class="'+(s[0]===myId?'me':'')+'"><td>'+(i+1)+'</td><td>'+(s[11]>0?medalSVG(s[11],20):'')+'<span class="sw" style="background:'+esc(s[6])+'"></span>'+esc(s[1])+(s[5]?'<span class="tag">bot</span>':'')+'</td><td>'+s[2]+'</td><td>'+s[3]+'</td>'+
    (gg?'<td>'+Math.min(GG.length,(s[8]||0)+1)+' · '+WEAPONS[GG[Math.min(GG.length-1,s[8]||0)]].name+'</td>':ctf?'<td>'+(s[10]||0)+'</td>':'<td class="cash">¤ '+(s[7]||0)+'</td>')+
    '<td>'+(s[5]||!online?'–':s[4]||'–')+'</td></tr>';
  if(tm)$('bBody').innerHTML=[0,1].map(t=>'<tr class="team"><td></td><td colspan="5" style="color:'+TEAMS[t].c+'">Equipo '+TEAMS[t].name+' · '+TS[t]+'</td></tr>'+scores.filter(s=>s[9]===t).map(row).join('')).join('');
  else $('bBody').innerHTML=scores.map(row).join('');
}
function applyMode(){
  const gg=MODE==='gungame',tm=teamsMode();
  $('tCrBox').hidden=!C.MODES[MODE].shop;$('shopHint').hidden=!C.MODES[MODE].shop;$('kickHint').hidden=!online;$('tLvlBox').hidden=!gg;$('tNextBox').hidden=!gg;
  $('ctfBox').hidden=!tm;$('carry').hidden=true;$('tRank').parentElement.hidden=tm;$('lobbyBox').hidden=true;
  $('slots').innerHTML='';updateHUD();
}


(function(){
'use strict';
const $=id=>document.getElementById(id);
const C=window.CUENK,K=C.K,WEAPONS=C.WEAPONS;
if(!C||!window.THREE){document.body.textContent='No se pudo cargar el juego.';return;}
let W=C.MAPS.represa;
let MODE='arena',myTeam=-1,FL=[],TS=[0,0],capLimit=3,LOBBY={cd:0,hn:0,mp:0};
const teamsMode=()=>!!(C.MODES[MODE]&&C.MODES[MODE].teams);
const liveState=()=>matchState==='play'||matchState==='lobby'||matchState==='count';
const GG=C.GG,TEAMS=C.TEAMS;

/* =================== AJUSTES =================== */
const S={sens:1,fov:95,vol:.5,music:.45,invY:false,hop:true,name:'',skin:{c:C.COLORS[0],v:'#ffffff',a:0},bots:5,skill:1,fl:20,map:'represa',q:1,mode:'arena',tdmLimit:50,fs:true,showImg:true,mira:{s:'cruz',c:'#ffffff',z:1}};
try{const saved=JSON.parse(localStorage.getItem('cuenk_settings')||'{}');if(saved.color&&!saved.skin)saved.skin={c:saved.color,v:'#ffffff',a:0};Object.assign(S,saved);}catch(e){}
if(S.map==='sagrado'||S.map==='salvaje')S.map='panymanteca';
// mapa del editor: se juega solo en esta pestaña; si el mapa guardado ya no existe se vuelve a La Represa
const EDITOR_MAP=self.CK_MAPA_EDITOR&&C.MAPS[self.CK_MAPA_EDITOR.id]?self.CK_MAPA_EDITOR.id:null;
if(!C.MAPS[S.map])S.map='represa';
if(!S.mira||typeof S.mira!=='object')S.mira={s:'cruz',c:'#ffffff',z:1};
if(!S.skin||typeof S.skin!=='object')S.skin={c:C.COLORS[0],v:'#ffffff',a:0};
// identificador al azar de este navegador (solo sirve para que un jugador echado por votación no vuelva enseguida)
let CID='';try{CID=localStorage.getItem('cuenk_cid')||'';if(!CID){CID=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('cuenk_cid',CID);}}catch(e){CID=Math.random().toString(36).slice(2);}
const MAP0=S.map;if(EDITOR_MAP)S.map=EDITOR_MAP;
function saveS(){try{localStorage.setItem('cuenk_settings',JSON.stringify(EDITOR_MAP&&S.map===EDITOR_MAP?Object.assign({},S,{map:MAP0}):S));}catch(e){}}
if(!S.name)S.name='Jugador'+(100+Math.floor(Math.random()*900));


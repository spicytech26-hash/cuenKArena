/* =================== VOTACIÓN PARA CAMBIAR DE MAPA (Y) ===================
   Y abre la lista de mapas del modo; al elegir uno se abre una votación y el mapa cambia solo si votan que sí TODAS las personas
   de la partida (Y = sí, N = no). Si estás solo, cambia al instante. El que decide es el servidor (mensaje `mapchg`). */
let mmList=[];
function mapMenuOpen(){return !$('mapMenu').hidden;}
function openMapMenu(){
  if(!inGame||matchState==='inter')return;
  closeWheel(false);if(!$('shop').hidden)closeShop(true);if(kickOpen())closeKick(true);
  mmList=C.MODES[MODE].maps.filter(id=>id!==W.id&&C.MAPS[id]);
  $('mapMenu').hidden=false;mouseDown=false;for(const k in keys)keys[k]=false;selfUnlock();
  $('mmMsg').textContent=mmList.length?'':'En este modo no hay otro mapa para elegir.';
  $('mmList').textContent='';
  mmList.forEach((id,i)=>{
    const b=document.createElement('button');b.type='button';b.className='mmC';
    const ph=document.createElement('span');ph.className='ph';const im=new Image();im.alt='';im.src='maps/'+id+'.jpg';im.addEventListener('error',()=>im.remove());ph.appendChild(im);
    const k=document.createElement('kbd');k.textContent=String(i+1);ph.appendChild(k);
    const n=document.createElement('span');n.className='n';n.textContent=C.MAPS[id].name;
    b.append(ph,n);b.addEventListener('click',()=>mapPick(id));$('mmList').appendChild(b);
  });
  SFX.ui();
}
function closeMapMenu(silent){if(!mapMenuOpen())return;$('mapMenu').hidden=true;if(!silent&&inGame){lockPointer();SFX.ui();}}
function mapPick(id){if(!net)return;net.send({t:'mapchg',m:id});closeMapMenu(true);SFX.ui();if(inGame)announce('','Hacé click para volver al juego');}
$('mapMenu').addEventListener('mousedown',e=>{if(e.target===$('mapMenu'))closeMapMenu(true);});

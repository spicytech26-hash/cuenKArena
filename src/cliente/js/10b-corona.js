/* ---------- La Corona (solo Arena): modelo en código, haz de luz y avisos del HUD ----------
   Todo lo decide el servidor (ver src/nucleo/07-partida/6c-corona.js): acá solo se dibuja.
   El estado llega entero en `welcome` y en `sc` (una vez por segundo, para resincronizar) y
   los cambios por avisos `crw`. El progreso de los 15 s se calcula con el reloj del servidor.
   El modelo está normalizado (aro de radio 1, apoyado en y = 0) y se usa en dos lugares:
   suelto en el piso (hijo de la escena, tamaño CMOD.SUELO) o **colgado del hueso de la cabeza**
   del portador, como la gorra del robot (tamaño CMOD.CABEZA), así acompaña la animación. */
const CRW={have:false,g:null,beam:null,by:0,x:0,y:0,z:0,t0:0,lost:0,ph:0,mats:[],geos:[]};
const CMOD={SUELO:.26,CABEZA:.105,CABY:.048,BOB:.12,GIRO:1.1,RAYO:13};
const CRW_V=new THREE.Vector3();   // una sola, para no pedir memoria por cuadro
const crwProg=()=>CRW.by?Math.max(0,serverNow()-CRW.t0):0;   // cuánto lleva seguido el portador
// mientras la tormenta está activa la corona paga el doble de seguido (igual que en el núcleo)
const crwEvery=()=>STM.i&&serverNow()>=STM.i[0]?Math.min(C.CROWN.EVERY,C.STORM.CROWN_EVERY):C.CROWN.EVERY;

function buildCrown(){
  const g=new THREE.Group(),alta=!!S.q,geos=[],mats=[];
  const mat=o=>{const m=new THREE.MeshPhongMaterial(o);mats.push(m);return m;};
  const geo=o=>{geos.push(o);return o;};
  const oro=mat({color:0xc9a84e,emissive:0x1e3a26,shininess:150,specular:0xfff0c0,side:THREE.DoubleSide});
  const oroV=mat({color:0x8c6b2a,emissive:0x16281a,shininess:80,specular:0xd8c070,flatShading:true});   // oro gastado, con verdín
  const verde=mat({color:0x8dff3a,emissive:0x2f7a12,shininess:130,specular:0xffffff,flatShading:true});
  const viola=mat({color:0xb77bff,emissive:0x4a1a8a,shininess:130,specular:0xffffff,flatShading:true});
  // el aro entero en un solo torno: reborde abajo, cintura y vuelo arriba (una sola llamada de dibujo)
  const perfil=[[.96,0],[1.07,.035],[1.08,.075],[.99,.125],[.99,.25],[1.12,.33],[1.04,.37]].map(q=>new THREE.Vector2(q[0],q[1]));
  g.add(new THREE.Mesh(geo(new THREE.LatheGeometry(perfil,16)),oro));
  const n=5, puaG=geo(new THREE.ConeGeometry(.17,.46,6)), puaCh=alta?geo(new THREE.ConeGeometry(.1,.22,6)):null,
        perla=alta?geo(new THREE.OctahedronGeometry(.085,0)):null;
  for(let i=0;i<n;i++){
    const a=i/n*6.2832, x=Math.cos(a)*.99, z=Math.sin(a)*.99;
    const p=new THREE.Mesh(puaG,oroV);p.position.set(x,.56,z);g.add(p);                       // púa grande
    if(!alta)continue;
    const j=new THREE.Mesh(perla,i%2?verde:viola);j.position.set(x,.85,z);g.add(j);           // perla en la punta
    const b=a+3.1416/n, ch=new THREE.Mesh(puaCh,oroV);
    ch.position.set(Math.cos(b)*1.0,.44,Math.sin(b)*1.0);g.add(ch);                           // púa chica entre las grandes
  }
  if(alta){                                                                                   // gema del frente, sobre el aro
    const f=new THREE.Mesh(geo(new THREE.OctahedronGeometry(.15,0)),verde);
    f.position.set(0,.2,1.0);f.scale.set(1,1.15,.55);g.add(f);
  }
  CRW.geos=geos;CRW.mats=mats;
  return g;
}
function crownEnsure(){
  if(CRW.g)return;
  CRW.g=buildCrown();CRW.g.scale.setScalar(CMOD.SUELO);scene.add(CRW.g);   // arranca suelta, con el tamaño del piso
  const gb=new THREE.CylinderGeometry(.42,.72,CMOD.RAYO,8,1,true);
  const mb=new THREE.MeshBasicMaterial({color:0x9b4dff,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  CRW.geos.push(gb);CRW.mats.push(mb);
  CRW.beam=new THREE.Mesh(gb,mb);scene.add(CRW.beam);
}
function clearCrown(){
  CRW.have=false;CRW.by=0;CRW.t0=0;CRW.lost=0;
  if(CRW.g){
    if(CRW.g.parent)CRW.g.parent.remove(CRW.g);
    if(CRW.beam)scene.remove(CRW.beam);
    CRW.geos.forEach(o=>o.dispose());CRW.mats.forEach(o=>o.dispose());
    CRW.geos=[];CRW.mats=[];CRW.g=null;CRW.beam=null;
  }
  const b=$('crwBox'),d=$('crwDir'),m=$('crwMine');if(b)b.hidden=true;if(d)d.hidden=true;if(m)m.hidden=true;
}
// estado completo: [x, y, z, portador, t0, perdida]
function setCrownState(cw){
  if(!cw){clearCrown();return;}
  if(!cw[0]&&!cw[1]&&!cw[2]&&!cw[3]){CRW.have=false;if(CRW.g)CRW.g.visible=false;return;}   // todavía no apareció
  CRW.have=true;crownEnsure();
  CRW.x=cw[0];CRW.y=cw[1];CRW.z=cw[2];CRW.by=cw[3]|0;CRW.t0=cw[4]||0;CRW.lost=cw[5]?1:0;
}
function crownEvent(m){
  switch(m.a){
    case 'off': clearCrown();break;
    case 'spawn': case 'move':
      CRW.have=true;crownEnsure();CRW.by=0;CRW.t0=0;CRW.lost=0;
      CRW.x=m.p[0];CRW.y=m.p[1];CRW.z=m.p[2];
      if(m.a==='spawn'){announce('LA CORONA','apareció en el mapa · cada '+C.CROWN.EVERY+' s con ella: 1 punto y '+C.CROWN.CASH+' créditos');SFX.start();}
      else sysChat('La corona se movió de lugar: nadie la levantaba');
      break;
    case 'take':
      CRW.have=true;crownEnsure();CRW.by=m.id|0;CRW.t0=m.t0||serverNow();CRW.lost=0;
      if(m.id===myId){announce('LLEVÁS LA CORONA','aguantala '+C.CROWN.EVERY+' s para sumar');SFX.flagTake();}
      else{feedLine('<b>'+esc(m.n)+'</b> <i>se puso la corona</i>');if(vAt(CRW.x,CRW.y,CRW.z)>.25)SFX.flagTake();}
      break;
    case 'drop':
      CRW.by=0;CRW.t0=0;CRW.lost=m.v?1:0;
      CRW.x=m.p[0];CRW.y=m.p[1];CRW.z=m.p[2];
      if(m.id===myId){announce('PERDISTE LA CORONA',m.v?'se cayó al vacío':'quedó en el piso');SFX.flagRet();}
      else if(m.v)sysChat('La corona se cayó al vacío: vuelve en '+C.CROWN.VOID+' s');
      break;
    case 'pay':
      if(m.t0!=null)CRW.t0=m.t0;
      if(m.id===myId){G.pick=.3;$('pick').textContent='+'+m.pts+' punto · ¤ '+m.cr+' por la corona';
        $('pick').classList.remove('show');void $('pick').offsetWidth;$('pick').classList.add('show');SFX.cash();}
      break;
    case 'regi':
      if(m.id===myId){announce('¡REGICIDIO!','+'+m.pts+' puntos por bajar al de la corona');SFX.lvl();}
      else feedLine('<b>'+esc(m.n)+'</b> <i>le bajó la corona a</i> <b>'+esc(m.v)+'</b>');
      break;
  }
}
/* el hueso de la cabeza del portador, o null si no hay modelo a la vista */
function crownHead(id){
  if(id===myId)return TP.model&&TP.blend>=.5?TP.model.head:null;   // la propia solo en tercera persona
  const p=players.get(id);
  return p&&p.alive&&p.model&&p.model.g.visible?p.model.head:null;
}
/* ---- cada cuadro: dónde va el modelo y los avisos del HUD ---- */
function updCrown(dt){
  const box=$('crwBox');
  if(!CRW.have||!C.MODES[MODE].crown){
    if(box&&!box.hidden){box.hidden=true;$('crwDir').hidden=true;$('crwMine').hidden=true;}
    if(CRW.g){CRW.g.visible=false;CRW.beam.visible=false;}
    return;
  }
  crownEnsure();
  CRW.ph+=dt;
  const g=CRW.g,mia=CRW.by===myId,prg=crwProg();
  // --- el modelo: colgado de la cabeza del portador, o suelto en el piso ---
  const cab=CRW.lost?null:CRW.by?crownHead(CRW.by):null;
  const destino=cab||scene;
  if(g.parent!==destino){
    if(g.parent)g.parent.remove(g);
    destino.add(g);
    if(cab){g.scale.setScalar(CMOD.CABEZA);g.position.set(0,CMOD.CABY,0);g.rotation.set(0,0,0);}
    else g.scale.setScalar(CMOD.SUELO);
  }
  let bx=CRW.x,by=CRW.y,bz=CRW.z;                                  // dónde arranca el haz de luz
  if(CRW.lost){g.visible=false;}
  else if(CRW.by){
    if(cab){g.visible=true;}                                       // la lleva puesta: la mueve el esqueleto
    else g.visible=false;                                          // es la mía en primera persona, o no tengo su modelo
    if(mia){bx=me.s.x;by=me.s.y+C.CROWN.HEAD;bz=me.s.z;}
    else{const p=players.get(CRW.by);if(p){bx=p.x;by=p.y+C.CROWN.HEAD;bz=p.z;}}
  }else{
    g.visible=true;by=CRW.y+Math.sin(CRW.ph*2.2)*CMOD.BOB;
    g.position.set(CRW.x,by,CRW.z);g.rotation.y+=dt*CMOD.GIRO;
  }
  CRW.beam.visible=!CRW.lost&&!mia;
  if(CRW.beam.visible)CRW.beam.position.set(bx,by+CMOD.RAYO/2-.1,bz);
  // --- el HUD ---
  if(box.hidden)box.hidden=false;
  const every=crwEvery(),prog=Math.max(0,Math.min(1,prg/every));
  const bar=$('crwBar');if(bar._v!==Math.round(prog*60)){bar._v=Math.round(prog*60);bar.style.transform='scaleX('+prog.toFixed(3)+')';}
  box.classList.toggle('mia',mia);
  box.classList.toggle('libre',!CRW.by&&!CRW.lost);
  setTxt('crwWho',CRW.lost?'SE PERDIÓ':CRW.by?(mia?'LA TENÉS VOS':nameOf(CRW.by)):'SIN DUEÑO');
  setTxt('crwSub',CRW.lost?'vuelve en un rato':CRW.by?Math.max(0,Math.ceil(every-prg))+' s para el punto':'andá a buscarla');
  const mine=$('crwMine');if(mine.hidden===mia)mine.hidden=!mia;
  if(mia)setTxt('crwMineT',String(Math.max(0,Math.ceil(every-prg))));
  // --- flecha cuando queda fuera de pantalla ---
  const dir=$('crwDir');
  if(mia||CRW.lost||!me.alive){if(!dir.hidden)dir.hidden=true;return;}
  CRW_V.set(bx,by,bz).project(camera);
  if(CRW_V.z<1&&Math.abs(CRW_V.x)<.92&&Math.abs(CRW_V.y)<.92){if(!dir.hidden)dir.hidden=true;return;}
  if(dir.hidden)dir.hidden=false;
  const rot=-(Math.atan2(-(bx-me.s.x),-(bz-me.s.z))-me.yaw);
  if(dir._r!==Math.round(rot*40)){dir._r=Math.round(rot*40);dir.style.transform='rotate('+rot.toFixed(3)+'rad)';}
}

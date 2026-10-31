/* ---------- texturas «Unreal Tournament lovecraftiano»: solo para los mapas con theme.tex==='ut' ----------
   Más detalle y más realismo que las texturas de siempre: ladrillo mugriento con musgo viscoso, hormigón húmedo con grietas,
   metal oxidado con pátina verdosa, madera podrida, yeso con manchas de humedad y runas apenas visibles. Se generan una sola
   vez (al cargar el primer mapa que las pide) y el resto de los mapas sigue con sus texturas. */
let UTset=null;
function buildUT(){
  let sd=9157;const R=()=>{sd=(sd*16807)%2147483647;return (sd-1)/2147483646;};
  // ruido de valores periódico (se repite sin costuras) en varias octavas
  const grids=[4,8,16,32,64].map(n=>{const a=new Float32Array(n*n);for(let i=0;i<a.length;i++)a[i]=R();return {n,a};});
  const vn=(gr,x,y)=>{x-=Math.floor(x);y-=Math.floor(y);const n=gr.n,a=gr.a,fx=x*n,fy=y*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),i0=ix%n,i1=(ix+1)%n,j0=iy%n,j1=(iy+1)%n;
    return (a[j0*n+i0]*(1-sx)+a[j0*n+i1]*sx)*(1-sy)+(a[j1*n+i0]*(1-sx)+a[j1*n+i1]*sx)*sy;};
  const fbm=(x,y,o)=>{o=o||5;let t=0,a=.5,tot=0;for(let k=0;k<o;k++){t+=a*vn(grids[k],x,y);tot+=a;a*=.5;}return t/tot;};
  const hs=(i,j)=>{const v=Math.sin(i*127.1+j*311.7)*43758.5453;return v-Math.floor(v);};
  const mx=(a,b,t)=>a+(b-a)*t,cl=v=>v<0?0:v>255?255:v,pos=v=>v>0?v:0;
  const mk=(w,h,fn,post)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),d=g.createImageData(w,h),p=d.data;
    let sc=null,sg=null,sdt=null;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=fn(x,y,x/w,y/h),i=(y*w+x)*4;p[i]=cl(o[0]);p[i+1]=cl(o[1]);p[i+2]=cl(o[2]);p[i+3]=o[3]==null?255:o[3];
      if(o[4]!=null){if(!sc){sc=document.createElement('canvas');sc.width=w;sc.height=h;sg=sc.getContext('2d');sdt=sg.createImageData(w,h);}const v=cl(o[4]);sdt.data[i]=sdt.data[i+1]=sdt.data[i+2]=v;sdt.data[i+3]=255;}}
    g.putImageData(d,0,0);if(post)post(g,w,h);
    const mkT=cc=>{const t=new THREE.CanvasTexture(cc);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=8;return t;};
    const t=mkT(c);if(sc){sg.putImageData(sdt,0,0);t.userData.spec=mkT(sc);}return t;};   // t.userData.spec: qué zonas son húmedas/brillantes
  const crack=(g,w,h,n,a)=>{g.lineCap='round';for(let k=0;k<n;k++){let x=R()*w,y=R()*h,an=R()*6.28;g.strokeStyle='rgba(8,6,6,'+(a||.7)+')';g.lineWidth=.8+R()*1.2;g.beginPath();g.moveTo(x,y);const L=14+R()*16;for(let s=0;s<L;s++){an+=(R()-.5)*1.1;x+=Math.cos(an)*(3+R()*5);y+=Math.sin(an)*(3+R()*5);g.lineTo(x,y);}g.stroke();}};
  // runa circular apenas insinuada (guiño a los mitos)
  const glyph=(g,x,y,r,col)=>{g.strokeStyle=col;g.lineWidth=1.2;g.beginPath();g.arc(x,y,r,0,7);g.stroke();g.beginPath();g.arc(x,y,r*.35,0,7);g.stroke();for(let k=0;k<5;k++){const an=k*1.2566+.3;g.beginPath();g.moveTo(x+Math.cos(an)*r*.3,y+Math.sin(an)*r*.3);g.lineTo(x+Math.cos(an+2.5)*r*.9,y+Math.sin(an+2.5)*r*.9);g.stroke();}};

  const brick=mk(240,240,(x,y,u,v)=>{
    const bh=20,bw=60,row=Math.floor(y/bh),yy=y%bh,xo=(x+(row%2)*bw/2)%240,col=Math.floor(xo/bw),xx=xo%bw,n=fbm(u*6,v*6),n2=fbm(u*22+row,v*22);
    if(yy<3||xx<3){const m=.75+.5*n2;return [66*m,60*m,54*m,255,18];}
    const h=hs(row,col),dist=Math.min(yy-3,xx-3,bh-1-yy,bw-1-xx),bev=.78+.22*Math.min(1,dist/3);
    let r=108+h*52,g=50+h*24,b=38+h*14;const sh=(.62+.7*n)*bev*(.9+.2*n2);r*=sh;g*=sh;b*=sh;
    const gm=pos(fbm(u*14,v*1.6)-.48)*1.8*(.3+.7*v);r*=1-gm*.55;g*=1-gm*.5;b*=1-gm*.45;                    // churretes de mugre
    const ms=pos(fbm(u*9+4,v*2.2)-.6)*3*(.2+.9*v);r=mx(r,34,ms*.8);g=mx(g,58,ms*.8);b=mx(b,36,ms*.8);        // musgo viscoso
    const sal=pos(fbm(u*10+9,v*3)-.62)*(1-v)*1.6,chip=(dist<1.5&&hs(x,y)>.8)?.55:1;r=mx(r,200,sal*.25)*chip;g=mx(g,200,sal*.25)*chip;b=mx(b,190,sal*.25)*chip;   // salitre y bordes desportillados
    const l=(r+g+b)/3;return [mx(r,l,.18),mx(g,l,.12),mx(b,l,.1),255,28+gm*150+ms*170];
  },(g,w,h)=>{crack(g,w,h,4,.6);glyph(g,60+R()*120,60+R()*120,16,'rgba(20,10,8,.35)');});

  const concrete=mk(256,256,(x,y,u,v)=>{
    const n=fbm(u*5,v*5),n2=fbm(u*28,v*28,4),st=fbm(u*3+7,v*3),b=88+n*40+n2*18,joint=(x%128<2||y%128<2)?.55:1,w=pos(st-.55)*2.2,alg=pos(fbm(u*7+2,v*7)-.62)*3;
    let r=b*.98*(1-w*.45),g=b*(1-w*.3),bl=b*.96*(1-w*.2);r=mx(r,40,alg*.6);g=mx(g,64,alg*.6);bl=mx(bl,44,alg*.6);return [r*joint,g*joint,bl*joint*1.03,255,30+w*170+alg*70];
  },(g,w,h)=>crack(g,w,h,5,.55));

  const tiles=mk(256,256,(x,y,u,v)=>{
    const t=64,tx=Math.floor(x/t),ty=Math.floor(y/t),xx=x%t,yy=y%t,h=hs(tx,ty),n=fbm(u*8,v*8),n2=fbm(u*30,v*30,4);
    if(xx<3||yy<3){const m=.7+.5*n2,mo=pos(fbm(u*12+3,v*12)-.55)*3;return [mx(58*m,38,mo*.7),mx(52*m,60,mo*.7),mx(46*m,36,mo*.7),255,16+mo*100];}
    let r=176+h*26,g=88+h*14,b=58+h*10;const sh=.66+.55*n;r*=sh;g*=sh;b*=sh;const dirt=pos(fbm(u*5+9,v*5)-.5)*1.6;r*=1-dirt*.35;g*=1-dirt*.3;b*=1-dirt*.2;
    const bev=.86+.14*Math.min(1,Math.min(xx-3,yy-3,t-1-xx,t-1-yy)/4);return [r*bev,g*bev,b*bev,255,38+dirt*150+n*30];
  },(g,w,h)=>crack(g,w,h,6,.5));

  const wood=mk(128,128,(x,y,u,v)=>{
    const pl=Math.floor(y/32),yy=y%32,h=hs(pl,3),n=fbm(u*4+h*5,v*2+pl);if(yy<2)return [26,18,12];
    const grain=Math.sin((yy*.9+fbm(u*3,v*3+pl)*14)*1.2)*.5+.5,k=.7+.3*grain+(n-.5)*.5,gray=pos(fbm(u*6+5,v*6)-.45)*1.4;
    return [mx((110+h*30)*k,92,gray*.5),mx((76+h*20)*k,86,gray*.5),mx((46+h*12)*k,76,gray*.5)];
  },(g,w,h)=>{g.fillStyle='rgba(20,14,10,.55)';for(let k=0;k<5;k++){g.beginPath();g.ellipse(R()*w,(1+Math.floor(R()*4))*32-16,2+R()*2,1.5+R()*1.5,0,0,7);g.fill();}});

  const crate=mk(128,128,(x,y,u,v)=>{
    const e=Math.min(x,y,127-x,127-y),fr=e<14,dg=Math.abs(x-y)<8,n=fbm(u*5,v*5),n2=fbm(u*26,v*3),grain=.78+.22*Math.sin(x*1.6+n2*9);
    let r=104+n*34,g=72+n*22,b=42+n*12;
    if(fr||dg){r*=.82*grain;g*=.82*grain;b*=.82*grain;if(e<2||(!fr&&Math.abs(Math.abs(x-y)-8)<1.2)){r*=.4;g*=.4;b*=.4;}}else{r*=grain;g*=grain;b*=grain;if(x%32<2){r*=.45;g*=.45;b*=.45;}}
    return [r,g,b];
  },(g)=>{g.fillStyle='rgba(18,14,12,.8)';for(const q of [[8,8],[120,8],[8,120],[120,120]]){g.beginPath();g.arc(q[0],q[1],2.5,0,7);g.fill();}});

  const grate=mk(64,64,(x,y,u,v)=>{
    if(!(x%8<2||y%8<2))return [14,12,12];const n=fbm(u*6,v*6),rust=pos(fbm(u*9+1,v*9)-.5)*2.4;return [mx(92+n*30,150,rust*.8),mx(86+n*24,70,rust*.8),mx(80+n*20,32,rust*.8)];});

  const metal=mk(128,128,(x,y,u,v)=>{
    const seam=(x%64<2||y%64<2),n=fbm(u*4,v*4),n2=fbm(u*24,v*24,4);let b=76+n*38+n2*14;if(seam)b*=.45;
    const rust=pos(fbm(u*6+3,v*6)-.52)*2.6,ver=pos(fbm(u*5+8,v*5+2)-.62)*3;let r=b,g=b*1.02,bl=b*1.04;
    r=mx(r,170,rust*.75);g=mx(g,82,rust*.75);bl=mx(bl,34,rust*.75);r=mx(r,48,ver*.6);g=mx(g,110,ver*.6);bl=mx(bl,96,ver*.6);return [r,g,bl,255,120-rust*105+(seam?-40:0)+n2*30];  // óxido mate y pátina verdosa
  },(g)=>{g.fillStyle='rgba(30,26,22,.9)';g.strokeStyle='rgba(150,140,126,.5)';for(const a of [8,56,72,120])for(const b of [8,56,72,120]){g.beginPath();g.arc(a,b,2.2,0,7);g.fill();g.stroke();}});

  const grass=mk(128,128,(x,y,u,v)=>{
    const n=fbm(u*5,v*5),n2=fbm(u*30,v*30,4),p=fbm(u*3+6,v*3+2);let r=44+n*44+n2*22,g=76+n*58+n2*26,b=34+n*16;
    const soil=pos(p-.6)*3;r=mx(r,78,soil*.7);g=mx(g,60,soil*.7);b=mx(b,40,soil*.7);const dark=pos(fbm(u*8+2,v*8)-.58)*2.5;r*=1-dark*.4;g*=1-dark*.3;return [r*.92,g*.95,b*1.05];
  },(g,w,h)=>{for(let k=0;k<260;k++){const x=R()*w,y=R()*h;g.strokeStyle='rgba('+(30+R()*30|0)+','+(70+R()*50|0)+',30,'+(.25+R()*.35)+')';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+(R()-.5)*3,y-3-R()*5);g.stroke();}});

  const smooth=mk(128,128,(x,y,u,v)=>{
    const n=fbm(u*4,v*4),n2=fbm(u*30,v*30,4),pore=n2>.74?.7:1,b=118+n*34,st=pos(fbm(u*3+4,v*5)-.55)*2;return [b*pore*(1-st*.3),b*pore*(1-st*.15),b*pore*(1-st*.2)*1.02,255,40+st*90];});

  const whitewall=mk(128,128,(x,y,u,v)=>{
    const n=fbm(u*4,v*4),n2=fbm(u*28,v*28,4),b=178+n*26-n2*10,dirt=(.12+.5*v)*pos(fbm(u*6,v*2)-.38)*1.7,damp=pos(fbm(u*5+3,v*4)-.6)*3;
    return [mx(b*(1-dirt*.5),96,damp*.6),mx(b*(1-dirt*.46),108,damp*.6),mx(b*(1-dirt*.42),84,damp*.6),255,12+damp*100];
  },(g,w,h)=>{crack(g,w,h,3,.45);glyph(g,40+R()*50,40+R()*50,14,'rgba(40,50,40,.28)');});

  const roof=mk(128,128,(x,y,u,v)=>{
    const wv=Math.sin(x*Math.PI*2/16)*.5+.5,n=fbm(u*5,v*5),rust=pos(fbm(u*7+2,v*3)-.5)*2.4,b=(60+wv*46)*(.8+n*.5);return [mx(b*.98,150,rust*.7),mx(b*1.01,76,rust*.7),mx(b*1.06,34,rust*.7),255,95-rust*80+wv*30];});

  const step=mk(64,64,(x,y,u,v)=>{
    const dx=(x%16)-8,dy=(y%16)-8,dia=Math.abs(dx)+Math.abs(dy)<6?1:0,n=fbm(u*5,v*5),rust=pos(fbm(u*8+1,v*8)-.55)*2.4,b=70+n*26+dia*22;return [mx(b,140,rust*.7),mx(b*.97,70,rust*.7),mx(b*.93,32,rust*.7),255,110+dia*40-rust*90];});

  const rock=mk(128,128,(x,y,u,v)=>{
    const n=fbm(u*5,v*5),n2=fbm(u*22,v*22,4),w=pos(fbm(u*4+3,v*4)-.5)*2,b=48+n*52+n2*20;return [b*(1-w*.3),b*1.02*(1-w*.15),b*1.1,255,60+w*170];},(g,w,h)=>crack(g,w,h,6,.7));

  const black=mk(64,64,(x,y,u,v)=>{const n=fbm(u*6,v*6),s=fbm(u*30,v*3),b=16+n*20+s*10;return [b,b*1.02,b*1.12];});
  const navy=mk(64,64,(x,y,u,v)=>{const n=fbm(u*5,v*5);return [20+n*22,30+n*26,50+n*36];},(g,w,h)=>crack(g,w,h,2,.5));
  const roofTiles=mk(128,128,(x,y,u,v)=>{
    const row=Math.floor(y/16),yy=y%16,xo=(x+(row%2)*8)%128,col=Math.floor(xo/16),h=hs(row,col),n=fbm(u*5,v*5),moss=pos(fbm(u*8+2,v*8)-.58)*3,sh=.55+.7*n+(yy<3?-.3:0)+(yy>12?.12:0);
    return [mx((146+h*30)*sh,34,moss*.7),mx((64+h*16)*sh,60,moss*.7),mx((44+h*10)*sh,34,moss*.7)];});
  const soil=mk(64,64,(x,y,u,v)=>{const n=fbm(u*6,v*6),n2=fbm(u*26,v*26,4);return [54+n*34+n2*14,38+n*24+n2*10,26+n*16+n2*8];});
  const barn=mk(64,64,(x,y,u,v)=>{
    const n=fbm(u*4,v*8),pk=x%16<1.5,peel=pos(fbm(u*8+1,v*8)-.58)*3;let r=130+n*30,g=36+n*14,b=30+n*10;if(pk){r*=.35;g*=.35;b*=.35;}return [mx(r,118,peel*.6)*.9,mx(g,92,peel*.6),mx(b,70,peel*.6)];});
  // baranda: poste y travesaños opacos, el resto transparente (se ve a través, pero el bloque es sólido)
  const rail=mk(32,32,(x,y,u,v)=>{
    const post=(x%8)<2.5,hb=(y<3||y>28||(y>13&&y<17));if(!(post||hb))return [0,0,0,0];
    const n=fbm(u*5,v*5),rust=pos(fbm(u*9,v*9)-.5)*2.4;return [mx(86+n*34,150,rust*.7),mx(82+n*28,74,rust*.7),mx(78+n*24,34,rust*.7),255,70-rust*50];});
  // el río: negro verdoso, quieto, con ondas y sinuosidades apenas visibles
  const water=mk(128,128,(x,y,u,v)=>{
    const n=fbm(u*4,v*4),n2=fbm(u*14+n*2,v*14),rip=Math.sin((n2*14+u*20)*1.5)*.5+.5,b=.5*n+.5*rip;return [12+b*20,28+b*34,30+b*34];
  },(g,w,h)=>{g.strokeStyle='rgba(60,110,100,.22)';g.lineWidth=1.4;for(let k=0;k<7;k++){const x=R()*w,y=R()*h;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+20,y-14,x+40,y+14,x+60,y);g.stroke();}});

  const o=Object.assign({},MATS);
  o.brick={t:brick,sc:2,shin:14,spec:brick.userData.spec};o.concrete={t:concrete,sc:4,shin:30,spec:concrete.userData.spec};o.tiles={t:tiles,sc:2.4,shin:34,spec:tiles.userData.spec};o.wood={t:wood,sc:1,shin:12};o.crate={t:crate,sc:1.5,shin:6};
  o.grate={t:grate,sc:1.2,shin:50};o.metal={t:metal,sc:2,shin:70,spec:metal.userData.spec};o.grass={t:grass,sc:2,shin:6};o.smooth={t:smooth,sc:3,shin:16,spec:smooth.userData.spec};o.whitewall={t:whitewall,sc:3,shin:10,spec:whitewall.userData.spec};
  o.roof={t:roof,sc:3,shin:50,spec:roof.userData.spec};o.step={t:step,sc:1,shin:50,spec:step.userData.spec};o.rock={t:rock,sc:3,shin:30,spec:rock.userData.spec};o.black={t:black,sc:2,shin:55};o.navy={t:navy,sc:1,shin:60};
  o.roofTiles={t:roofTiles,sc:1.5,shin:10};o.soil={t:soil,sc:1.5,shin:4};o.barn={t:barn,sc:2,shin:14};o.rail={t:rail,sc:1,shin:60,alpha:true};
  return {mats:o,water};
}

/* =================== PARTÍCULAS =================== */
function makeSys(n,size,additive){
  const geo=new THREE.BufferGeometry(),pos=new Float32Array(n*3),col=new Float32Array(n*3);
  for(let i=0;i<n;i++)pos[i*3+1]=-999;
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({size,vertexColors:true,sizeAttenuation:true,transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending}));
  pts.frustumCulled=false;scene.add(pts);
  return {n,pos,col,geo,vel:new Float32Array(n*3),life:new Float32Array(n),max:new Float32Array(n),base:new Float32Array(n*3),grav:new Float32Array(n),idx:0,additive};
}
const sparks=makeSys(2400,.14,true),gore=makeSys(1400,.17,false);
function emit(s,x,y,z,vx,vy,vz,life,r,g,b,grav){const i=s.idx;s.idx=(i+1)%s.n;const k=i*3;s.pos[k]=x;s.pos[k+1]=y;s.pos[k+2]=z;s.vel[k]=vx;s.vel[k+1]=vy;s.vel[k+2]=vz;s.life[i]=s.max[i]=life;s.base[k]=r;s.base[k+1]=g;s.base[k+2]=b;s.col[k]=r;s.col[k+1]=g;s.col[k+2]=b;s.grav[i]=grav;}
function updSys(s,dt){for(let i=0;i<s.n;i++){if(s.life[i]<=0)continue;s.life[i]-=dt;const k=i*3;if(s.life[i]<=0){s.pos[k+1]=-999;continue;}s.vel[k+1]-=s.grav[i]*dt;s.pos[k]+=s.vel[k]*dt;s.pos[k+1]+=s.vel[k+1]*dt;s.pos[k+2]+=s.vel[k+2]*dt;const f=s.additive?s.life[i]/s.max[i]:1;s.col[k]=s.base[k]*f;s.col[k+1]=s.base[k+1]*f;s.col[k+2]=s.base[k+2]*f;}s.geo.attributes.position.needsUpdate=true;s.geo.attributes.color.needsUpdate=true;}
const R=a=>(Math.random()-.5)*a;
function fxSparks(x,y,z,n,nn){for(let i=0;i<nn;i++)emit(sparks,x,y,z,n[0]*3+R(5),n[1]*3+R(5)+1,n[2]*3+R(5),.25+Math.random()*.3,1,.75,.35,9);for(let i=0;i<3;i++)emit(gore,x,y,z,n[0]+R(.6),n[1]+R(.6)+.4,n[2]+R(.6),.5+Math.random()*.4,.32,.29,.26,-.5);}
function fxBlood(x,y,z,n){for(let i=0;i<n;i++)emit(gore,x,y,z,R(5),Math.random()*4,R(5),.6+Math.random()*.6,.55+Math.random()*.2,.04,.02,12);}
function fxTele(x,y,z,r=.4,g=.85,b=1){for(let i=0;i<60;i++){const a=Math.random()*6.28,rr=.3+Math.random()*.6;emit(sparks,x+Math.cos(a)*rr,y+Math.random()*2,z+Math.sin(a)*rr,0,1+Math.random()*2,0,.6+Math.random()*.5,r,g,b,0);}}
function fxGib(x,y,z){for(let i=0;i<60;i++)emit(gore,x,y+.5+Math.random()*1.2,z,R(10),Math.random()*9,R(10),1.4,.5,.05,.03,16);for(let i=0;i<12;i++)emit(gore,x,y+1,z,R(7),Math.random()*7,R(7),2,.35,.3,.28,16);}

/* =================== EFECTOS DE MUNDO =================== */
const expGeo=new THREE.SphereGeometry(1,12,8);
const booms=[],beams=[];
const dynLights=[0,1].map(()=>{const l=new THREE.PointLight(0xff7a20,0,24,1.5);scene.add(l);return {l,t:0,max:1};});
function flashLight(x,y,z,color,t){if(!S.q)return;const L=dynLights.reduce((a,b)=>a.t<b.t?a:b);L.l.position.set(x,y,z);L.l.color.setHex(color);L.t=L.max=t;}
const boomPool=[],beamPool=[];
function fxExplosion(x,y,z){
  const m=boomPool.pop()||new THREE.Mesh(expGeo,new THREE.MeshBasicMaterial({color:0xff8a2a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.visible=true;m.position.set(x,y,z);if(!m.parent)scene.add(m);booms.push({m,t:0});
  flashLight(x,y+.5,z,0xff7a20,.45);
  for(let i=0;i<70;i++)emit(sparks,x,y,z,R(14),R(10)+3,R(14),.4+Math.random()*.5,1,.55+Math.random()*.3,.15,6);
  for(let i=0;i<30;i++)emit(gore,x,y,z,R(4),Math.random()*3,R(4),1+Math.random(),.25,.22,.2,-.6);
  SFX.boom(vAt(x,y,z));
  const d=Math.hypot(x-me.s.x,y-me.s.y-1,z-me.s.z);if(d<10)shake=Math.max(shake,(10-d)/10*.6);
}
// la botella se rompe: vidrio y un fogonazo chico (el fuego lo manda el servidor)
function fxGlass(x,y,z){
  for(let i=0;i<26;i++)emit(sparks,x,y+.1,z,R(6),Math.random()*4+1,R(6),.35+Math.random()*.3,.75,.95,.6,9);
  for(let i=0;i<30;i++)emit(sparks,x,y+.1,z,R(4),Math.random()*3+.5,R(4),.4+Math.random()*.4,1,.55+Math.random()*.25,.1,-1);
  flashLight(x,y+.6,z,0xff8a30,.35);SFX.glass(vAt(x,y,z));
}
const fires=[];
function fxFire(m){fires.push({id:m.id,x:m.p[0],y:m.p[1],z:m.p[2],r:m.r,t:m.d,max:m.d,lt:0});SFX.fire(vAt(m.p[0],m.p[1],m.p[2]));}
function updFires(dt){
  for(let i=fires.length-1;i>=0;i--){
    const f=fires[i];f.t-=dt;if(f.t<=0){fires.splice(i,1);continue;}
    const k=Math.min(1,f.t/1.2,(f.max-f.t)/.3+.2),n=Math.round((S.q?55:22)*dt*60*k*f.r/3.4);
    for(let j=0;j<n;j++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*f.r,hot=Math.random();
      emit(sparks,f.x+Math.cos(a)*r,f.y+.05,f.z+Math.sin(a)*r,R(.4),1.4+Math.random()*2.2,R(.4),.35+Math.random()*.45,1,.35+hot*.45,.05+hot*.1,-2.5);}
    if(Math.random()<dt*8)emit(gore,f.x+R(f.r),f.y+.3,f.z+R(f.r),R(.3),1+Math.random(),R(.3),1.3,.14,.12,.11,-.6);
    f.lt-=dt;if(f.lt<=0){f.lt=.12;flashLight(f.x,f.y+1,f.z,0xff6a18,.16+Math.random()*.08);}
  }
}
function fxRail(a,b,color){
  let line=beamPool.pop();
  if(!line){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));line=new THREE.Line(geo,new THREE.LineBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));line.frustumCulled=false;}
  const pa=line.geometry.attributes.position;pa.setXYZ(0,a[0],a[1],a[2]);pa.setXYZ(1,b[0],b[1],b[2]);pa.needsUpdate=true;
  line.material.color.setHex(color||0xa8e6ff);line.material.opacity=1;line.visible=true;if(!line.parent)scene.add(line);beams.push({line,t:0,life:.8});
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1,n=Math.min(220,L*3|0);
  const ux=dx/L,uy=dy/L,uz=dz/L;let px=-uz,pz=ux;const pl=Math.hypot(px,pz)||1;px/=pl;pz/=pl;const py=0;
  const qx=uy*pz-uz*py,qy=uz*px-ux*pz,qz=ux*py-uy*px;
  const col=new THREE.Color(color||0xa8e6ff);
  for(let i=0;i<n;i++){const t=i/n,an=i*.7,c=Math.cos(an)*.12,s=Math.sin(an)*.12;emit(sparks,a[0]+dx*t+px*c+qx*s,a[1]+dy*t+py*c+qy*s,a[2]+dz*t+pz*c+qz*s,R(.3),R(.3)+.2,R(.3),.7+Math.random()*.3,col.r*.6,col.g*.8,col.b,0);}
}
function fxTracer(a,b){
  const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0],a[1],a[2]),new THREE.Vector3(b[0],b[1],b[2])]);
  const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffd080,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(line);beams.push({line,t:0,life:.07});
}


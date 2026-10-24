/* =================== AUDIO =================== */
let AC=null,master=null,musicGain=null,noiseBuf=null;
function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=S.vol;master.connect(AC.destination);musicGain=AC.createGain();musicGain.gain.value=S.music*.5;musicGain.connect(master);noiseBuf=AC.createBuffer(1,AC.sampleRate*1.5,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}catch(e){AC=null;}}
function nz({dur=.2,f0=2000,f1=200,q=.8,type='lowpass',vol=.5,delay=0,at=null,out=null}){if(!AC)return;const t=at!=null?at:AC.currentTime+delay,s=AC.createBufferSource();s.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(out||master);s.start(t);s.stop(t+dur+.05);}
function tn({type='square',f0=400,f1=200,dur=.15,vol=.2,delay=0,at=null,out=null}){if(!AC)return;const t=at!=null?at:AC.currentTime+delay,o=AC.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(out||master);o.start(t);o.stop(t+dur+.05);}
const vAt=(x,y,z)=>Math.max(0,1-Math.hypot(x-me.s.x,y-me.s.y,z-me.s.z)/60);
const SFX={
  0:v=>{nz({dur:.12,f0:3200,f1:700,type:'bandpass',q:1,vol:.55*v});tn({type:'square',f0:320,f1:80,dur:.07,vol:.14*v});},
  1:v=>{nz({dur:.38,f0:2400,f1:180,vol:.9*v});tn({type:'sine',f0:120,f1:40,dur:.25,vol:.5*v});},
  2:v=>{nz({dur:.55,f0:2800,f1:120,vol:1.1*v});tn({type:'sine',f0:100,f1:30,dur:.4,vol:.7*v});},
  3:v=>{nz({dur:.09,f0:2600,f1:600,type:'bandpass',q:1.2,vol:.55*v});tn({type:'square',f0:160,f1:60,dur:.05,vol:.12*v});},
  4:v=>{tn({type:'sine',f0:180,f1:70,dur:.18,vol:.4*v});nz({dur:.22,f0:800,f1:200,vol:.35*v});},
  5:v=>{nz({dur:.5,f0:900,f1:200,vol:.55*v});tn({type:'sawtooth',f0:260,f1:70,dur:.4,vol:.18*v});},
  6:v=>{tn({type:'sine',f0:2400,f1:180,dur:.6,vol:.22*v});nz({dur:.35,f0:8000,f1:1500,type:'highpass',vol:.3*v});tn({type:'sawtooth',f0:90,f1:40,dur:.3,vol:.2*v});},
  7:v=>{nz({dur:.16,f0:900,f1:3500,type:'bandpass',q:2,vol:.4*v});},
  9:v=>{nz({dur:.7,f0:4200,f1:120,vol:1.2*v});tn({type:'sine',f0:110,f1:30,dur:.55,vol:.7*v});nz({dur:.12,f0:7000,f1:2500,type:'bandpass',vol:.4*v,delay:.03});tn({type:'square',f0:420,f1:380,dur:.05,vol:.08*v,delay:.6});tn({type:'square',f0:320,f1:300,dur:.05,vol:.08*v,delay:.78});},
  hunt:()=>{[392,523,659,784,1046].forEach((f,i)=>tn({type:'triangle',f0:f,f1:f,dur:i===4?.45:.1,vol:.15,delay:i*.07}));},
  8:v=>{nz({dur:.5,f0:6000,f1:200,vol:1.1*v});tn({type:'sine',f0:140,f1:35,dur:.45,vol:.6*v});nz({dur:.08,f0:9000,f1:4000,type:'highpass',vol:.5*v,delay:.02});},
  magOut:()=>{tn({type:'square',f0:420,f1:300,dur:.04,vol:.07});nz({dur:.06,f0:3000,f1:1500,type:'bandpass',vol:.18});},
  magIn:()=>{nz({dur:.05,f0:2200,f1:900,type:'bandpass',q:2,vol:.3});tn({type:'square',f0:180,f1:120,dur:.05,vol:.1});},
  slideRel:()=>{nz({dur:.05,f0:5000,f1:2500,type:'bandpass',q:3,vol:.25});tn({type:'square',f0:700,f1:500,dur:.03,vol:.06});},
  pumpBack:()=>{nz({dur:.09,f0:1800,f1:700,type:'bandpass',q:1.5,vol:.32});tn({type:'square',f0:160,f1:110,dur:.06,vol:.08});},
  pumpFwd:()=>{nz({dur:.07,f0:1200,f1:2600,type:'bandpass',q:1.5,vol:.3});tn({type:'square',f0:140,f1:200,dur:.05,vol:.08});},
  shellIn:()=>{nz({dur:.04,f0:2600,f1:1800,type:'bandpass',q:4,vol:.22});tn({type:'triangle',f0:900,f1:700,dur:.03,vol:.05});},
  breakOpen:()=>{nz({dur:.1,f0:900,f1:2400,type:'bandpass',q:2,vol:.3});},
  breakClose:()=>{nz({dur:.06,f0:2600,f1:800,type:'bandpass',q:2,vol:.4});tn({type:'square',f0:130,f1:90,dur:.06,vol:.12});},
  bolt:()=>{nz({dur:.06,f0:3000,f1:1400,type:'bandpass',q:3,vol:.25});nz({dur:.06,f0:1400,f1:3200,type:'bandpass',q:3,vol:.22,delay:.16});},
  rocketIn:()=>{tn({type:'sine',f0:160,f1:70,dur:.12,vol:.25});nz({dur:.08,f0:900,f1:400,vol:.25});},
  cellOut:()=>{nz({dur:.25,f0:6000,f1:800,type:'highpass',vol:.18});tn({type:'sine',f0:900,f1:200,dur:.25,vol:.08});},
  cellIn:()=>{nz({dur:.05,f0:2000,f1:1000,type:'bandpass',q:2,vol:.25});tn({type:'sine',f0:300,f1:1400,dur:.35,vol:.1,delay:.05});},
  reload:()=>{tn({type:'square',f0:300,f1:260,dur:.06,vol:.1});nz({dur:.08,f0:2500,f1:1200,type:'bandpass',vol:.25,delay:.35});tn({type:'square',f0:500,f1:620,dur:.07,vol:.1,delay:.9});},
  flagTake:()=>{[880,660,880,660].forEach((f,i)=>tn({type:'square',f0:f,f1:f,dur:.12,vol:.12,delay:i*.13}));},
  flagCap:()=>{[523,659,784,1046].forEach((f,i)=>tn({type:'square',f0:f,f1:f,dur:i===3?.5:.16,vol:.14,delay:i*.14}));},
  flagRet:()=>{tn({type:'sine',f0:600,f1:1200,dur:.3,vol:.14});},
  lvl:()=>{[440,660,990].forEach((f,i)=>tn({type:'triangle',f0:f,f1:f,dur:.12,vol:.14,delay:i*.08}));},
  lvlDown:()=>{[400,300,200].forEach((f,i)=>tn({type:'sawtooth',f0:f,f1:f*.9,dur:.14,vol:.12,delay:i*.1}));},
  quadfire:()=>tn({type:'sawtooth',f0:90,f1:60,dur:.3,vol:.18}),
  boom:v=>{nz({dur:1,f0:1200,f1:60,vol:1.1*v});tn({type:'sine',f0:90,f1:28,dur:.7,vol:.7*v});},
  10:v=>{nz({dur:.28,f0:500,f1:1600,type:'bandpass',q:1.5,vol:.35*v});},
  glass:v=>{nz({dur:.25,f0:6000,f1:2500,type:'bandpass',q:3,vol:.6*v});nz({dur:.15,f0:3500,f1:8000,type:'bandpass',q:4,vol:.4*v,delay:.04});},
  fire:v=>{nz({dur:1.4,f0:300,f1:900,vol:.5*v});nz({dur:2.4,f0:180,f1:120,vol:.25*v,delay:.2});},
  bounce:v=>tn({type:'sine',f0:520,f1:300,dur:.06,vol:.09*v}),
  pick:()=>tn({type:'square',f0:600,f1:1250,dur:.12,vol:.12}),
  weapon:()=>{tn({type:'square',f0:400,f1:420,dur:.1,vol:.14});tn({type:'square',f0:800,f1:820,dur:.14,vol:.14,delay:.1});},
  quad:()=>{[110,165,220].forEach((f,i)=>tn({type:'sawtooth',f0:f,f1:f*1.01,dur:1.2,vol:.12,delay:i*.05}));},
  mega:()=>{tn({type:'sine',f0:300,f1:900,dur:.4,vol:.2});tn({type:'sine',f0:450,f1:1350,dur:.4,vol:.12,delay:.08});},
  shard:()=>{tn({type:'sine',f0:1760,f1:2350,dur:.07,vol:.12});tn({type:'triangle',f0:2640,f1:2640,dur:.05,vol:.05,delay:.04});},
  armor:()=>{nz({dur:.25,f0:4000,f1:900,type:'bandpass',vol:.3});tn({type:'square',f0:300,f1:500,dur:.2,vol:.1});},
  hurt:()=>tn({type:'sawtooth',f0:230,f1:90,dur:.22,vol:.28}),
  // impacto estilo TF2: un "ding" corto y limpio; cuanto más daño, más grave
  // tiro a la cabeza: campanita metálica corta (como el "dink" de CS o el ding de TF2), por encima del impacto normal
  head:()=>{const at=AC?AC.currentTime:0;[[2093,.22,.55],[3322,.1,.35],[5274,.06,.22],[1046,.07,.3]].forEach(([f,v,d])=>tn({type:'sine',f0:f,f1:f*.995,dur:d,vol:v,at}));nz({dur:.03,f0:9000,f1:6000,type:'highpass',vol:.12,at});},
  hit:n=>{const f=1500-Math.min(700,(n||10)*6);tn({type:'triangle',f0:f,f1:f*.98,dur:.11,vol:.2});tn({type:'sine',f0:f*2,f1:f*2,dur:.05,vol:.05});},
  body:w=>{const k=[.55,1,1.15,.45,.6,.7,.5,0,1,1.1,0][w]||0;if(!k)return;
    tn({type:'sine',f0:150*(1.2-k*.3),f1:38,dur:.09+k*.08,vol:.5*k});
    nz({dur:.05,f0:5000,f1:1800,type:'bandpass',q:.7,vol:.35*k});
    nz({dur:.35+k*.35,f0:900,f1:90,vol:.16*k,delay:.04});},
  frag:()=>{tn({type:'square',f0:660,f1:660,dur:.08,vol:.14});tn({type:'square',f0:990,f1:990,dur:.14,vol:.14,delay:.08});},
  cash:()=>{tn({type:'triangle',f0:1320,f1:1320,dur:.07,vol:.12});tn({type:'triangle',f0:1760,f1:1760,dur:.12,vol:.12,delay:.07});},
  buy:()=>{nz({dur:.12,f0:5000,f1:2000,type:'bandpass',vol:.2});tn({type:'square',f0:520,f1:1040,dur:.18,vol:.12});},
  deny:()=>tn({type:'square',f0:180,f1:140,dur:.18,vol:.12}),
  ui:()=>tn({type:'sine',f0:700,f1:900,dur:.05,vol:.06}),
  die:v=>{nz({dur:.4,f0:900,f1:100,vol:.4*v});tn({type:'sawtooth',f0:260,f1:40,dur:.55,vol:.25*v});},
  jump:()=>tn({type:'sine',f0:220,f1:360,dur:.08,vol:.06}),
  land:v=>nz({dur:.08,f0:400,f1:100,vol:.25*v}),
  step:()=>nz({dur:.05,f0:600,f1:200,vol:.06}),
  geyser:v=>{nz({dur:1.1,f0:250,f1:1400,vol:.7*v});tn({type:'sine',f0:60,f1:140,dur:.9,vol:.4*v});},
  pad:v=>{tn({type:'sine',f0:150,f1:900,dur:.35,vol:.25*v});nz({dur:.3,f0:300,f1:3000,type:'bandpass',vol:.2*v});},
  tele:v=>{tn({type:'sine',f0:1600,f1:120,dur:.6,vol:.2*v});nz({dur:.5,f0:5000,f1:400,type:'bandpass',vol:.2*v});},
  click:()=>tn({type:'square',f0:200,f1:180,dur:.04,vol:.1}),
  sizzle:()=>nz({dur:.3,f0:6000,f1:2000,type:'highpass',vol:.18}),
  respawn:v=>tn({type:'sine',f0:200,f1:1200,dur:.3,vol:.1*v}),
  chat:()=>tn({type:'sine',f0:880,f1:880,dur:.06,vol:.06}),
  voteStart:()=>{const at=AC?AC.currentTime:0;[[523,0],[659,.09],[784,.18]].forEach(([f,d])=>tn({type:'triangle',f0:f,f1:f,dur:.16,vol:.12,at:at+d}));},
  start:()=>{[330,440,660].forEach((f,i)=>tn({type:'square',f0:f,f1:f,dur:.18,vol:.13,delay:i*.18}));}
};
/* ---------- música del boliche: 126 BPM sintetizado en vivo ---------- */
const BPM=126,SIX=60/BPM/4;
const BASS=[55,0,55,0,65.4,0,55,0,73.4,0,55,0,65.4,0,49,0];
let musNext=0,musStep=0;
function musicTick(){
  if(!AC||!level||!level.club||!inGame||paused||S.music<=0)return;
  const now=AC.currentTime;if(musNext<now)musNext=now+.05;
  while(musNext<now+.15){
    const i=musStep%16,t=musNext,bar=(musStep>>4)%8;
    if(i%4===0)tn({type:'sine',f0:150,f1:42,dur:.28,vol:.9,at:t,out:musicGain});
    if(i%4===2)nz({dur:.05,f0:9000,f1:6000,type:'highpass',vol:.25,at:t,out:musicGain});
    if(i===4||i===12)nz({dur:.16,f0:2200,f1:900,type:'bandpass',q:.8,vol:.45,at:t,out:musicGain});
    if(BASS[i]&&bar<6)tn({type:'sawtooth',f0:BASS[i]*(bar%4===3?1.12:1),f1:BASS[i]*.98,dur:SIX*1.6,vol:.22,at:t,out:musicGain});
    if(bar>=4&&i%2===1){const n=[440,523,659,587][(i>>1)%4];tn({type:'square',f0:n*(bar>=6?2:1),f1:n,dur:.07,vol:.05,at:t,out:musicGain});}
    musNext+=SIX;musStep++;
  }
}
const beatNow=()=>(AC?AC.currentTime:G.time)*BPM/60;


const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

const menu = document.getElementById("menu");
const pauseScreen = document.getElementById("pauseScreen");
const endScreen = document.getElementById("endScreen");
const endText = document.getElementById("endText");
const pauseBtn = document.getElementById("pauseBtn");
const ui = document.getElementById("ui");

const moveStick = document.getElementById("moveStick");
const aimStick  = document.getElementById("aimStick");

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

let audioCtx;
function beep(f,d,t="square"){
  if(!audioCtx) audioCtx=new AudioContext();
  const o=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o.type=t; o.frequency.value=f; g.gain.value=.15;
  o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime+d);
}
const snd={
  shoot:()=>beep(800,.03),
  hit:()=>beep(300,.05),
  kill:()=>beep(150,.15,"sawtooth"),
  win:()=>beep(900,.2),
  lose:()=>beep(120,.4,"triangle")
};

const player={ x:0,y:0,r:15,speed:4,health:100 };
let bullets=[], enemies=[], particles=[], keys={};
let kills=0,targetKills=0,timeLeft=0,initialTime=0;
let started=false,paused=false,gameOver=false;
let mouseDown=false,mouseX=0,mouseY=0,fireCooldown=0;

addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
addEventListener("mousedown",()=>mouseDown=true);
addEventListener("mouseup",()=>mouseDown=false);
addEventListener("mousemove",e=>{mouseX=e.clientX;mouseY=e.clientY});

let moveVec={x:0,y:0};
let aimVec={x:0,y:0};
let firing=false;
let moveTouch=null;
let aimTouch=null;

function setupJoystick(el,type){
  const stick=el.querySelector(".stick");
  const r=90;
  el.addEventListener("touchstart",e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(type==="move" && moveTouch===null) moveTouch=t.identifier;
      if(type==="aim" && aimTouch===null){ aimTouch=t.identifier; firing=true; }
    }
  });
  el.addEventListener("touchmove",e=>{
    e.preventDefault();
    for(const t of e.touches){
      if(type==="move" && t.identifier!==moveTouch) continue;
      if(type==="aim" && t.identifier!==aimTouch) continue;
      const rect=el.getBoundingClientRect();
      let x=t.clientX-rect.left-r;
      let y=t.clientY-rect.top-r;
      const d=Math.hypot(x,y);
      if(d>r){ x*=r/d; y*=r/d }
      stick.style.transform=`translate(${x}px,${y}px)`;
      if(type==="move") moveVec={x:x/r,y:y/r};
      if(type==="aim") aimVec={x:x/r,y:y/r};
    }
  });
  el.addEventListener("touchend",e=>{
    for(const t of e.changedTouches){
      if(type==="move" && t.identifier===moveTouch){
        moveTouch=null; moveVec={x:0,y:0}; stick.style.transform="translate(0,0)";
      }
      if(type==="aim" && t.identifier===aimTouch){
        aimTouch=null; firing=false; aimVec={x:0,y:0}; stick.style.transform="translate(0,0)";
      }
    }
  });
}

if(isMobile){
  setupJoystick(moveStick,"move");
  setupJoystick(aimStick,"aim");
}

function resetGame(){
  bullets=[]; enemies=[]; particles=[];
  kills=0; timeLeft=initialTime;
  player.health=100;
  player.x=canvas.width/2;
  player.y=canvas.height/2;
  paused=false; gameOver=false;
  fireCooldown=0;
  pauseBtn.classList.remove("hidden");
}

function startPreset(m){
  if(m==="easy"){targetKills=20;initialTime=60}
  if(m==="medium"){targetKills=40;initialTime=30}
  if(m==="hard"){targetKills=50;initialTime=25}
  startGame();
}

function startCustom(){
  const k=+customKills.value,t=+customTime.value;
  if(k<=0||t<=0) return alert("Invalid values");
  targetKills=k; initialTime=t;
  startGame();
}

function startGame(){
  resetGame();
  started=true;
  menu.style.display="none";
}

function togglePause(){
  if(!started||gameOver) return;
  paused=!paused;
  pauseScreen.classList.toggle("hidden",!paused);
}

function restart(){
  pauseScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  resetGame();
}

function backToMenu(){
  started=false;
  bullets=[]; enemies=[]; particles=[];
  pauseBtn.classList.add("hidden");
  menu.style.display="flex";
  pauseScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  ui.innerHTML="";
}

setInterval(()=>{
  if(started&&!paused&&!gameOver){
    timeLeft=Math.max(0,timeLeft-1);
    if(timeLeft===0) endGame(false);
  }
},1000);

setInterval(()=>{
  if(!started||paused||gameOver||enemies.length>30) return;
  let s=Math.floor(Math.random()*4);
  let x=s==0?0:s==1?canvas.width:Math.random()*canvas.width;
  let y=s==2?0:s==3?canvas.height:Math.random()*canvas.height;
  enemies.push({x,y,r:15,speed:1.5,health:30});
},500);

function endGame(win){
  gameOver=true;
  pauseBtn.classList.add("hidden");
  endText.textContent=win?"MISSION COMPLETE":"MISSION FAILED";
  win?snd.win():snd.lose();
  endScreen.classList.remove("hidden");
}

function addHealthBar(){
  player.health=Math.max(0,Math.min(100,player.health));
  const x=120,y=canvas.height-60,w=canvas.width-240,h=20;
  ctx.fillStyle="#7971714e";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle="#4caf4f79";
  ctx.fillRect(x,y,w*(player.health/100),h);
}

function clamp(){
  player.x=Math.max(player.r,Math.min(canvas.width-player.r,player.x));
  player.y=Math.max(player.r,Math.min(canvas.height-player.r,player.y));
}

function spawnParticles(x,y){
  for(let i=0;i<12;i++){
    particles.push({
      x,y,
      dx:(Math.random()-.5)*1.2,
      dy:(Math.random()-.5)*1.2,
      life:80,
      max:80
    });
  }
}

function update(){
  if(!started||paused||gameOver) return;

  if(isMobile){
    player.x+=moveVec.x*player.speed*1.6;
    player.y+=moveVec.y*player.speed*1.6;
  }else{
    if(keys.w) player.y-=player.speed;
    if(keys.s) player.y+=player.speed;
    if(keys.a) player.x-=player.speed;
    if(keys.d) player.x+=player.speed;
  }

  clamp();

  if(((mouseDown&&!isMobile)||(firing&&isMobile))&&fireCooldown<=0){
    let a=isMobile?Math.atan2(aimVec.y,aimVec.x):Math.atan2(mouseY-player.y,mouseX-player.x);
    bullets.push({x:player.x,y:player.y,dx:Math.cos(a)*8,dy:Math.sin(a)*8});
    snd.shoot();
    fireCooldown=5;
  }
  fireCooldown=Math.max(0,fireCooldown-1);

  bullets.forEach(b=>{b.x+=b.dx;b.y+=b.dy});
  bullets=bullets.filter(b=>b.x>0&&b.y>0&&b.x<canvas.width&&b.y<canvas.height);

  enemies.forEach(e=>{
    let a=Math.atan2(player.y-e.y,player.x-e.x);
    e.x+=Math.cos(a)*e.speed;
    e.y+=Math.sin(a)*e.speed;
    if(Math.hypot(player.x-e.x,player.y-e.y)<player.r+e.r){
      player.health-=0.4;
      if(player.health<=0) endGame(false);
    }
  });

  bullets.forEach(b=>{
    enemies.forEach(e=>{
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.r){
        e.health-=20;
        spawnParticles(b.x,b.y);
        b.x=-999;
        snd.hit();
        if(e.health<=0){kills++;e.dead=true;snd.kill();}
      }
    });
  });

  particles.forEach(p=>{
  p.x+=p.dx;
  p.y+=p.dy;
  p.dx*=0.96;
  p.dy*=0.96;
  p.life--;
});
particles=particles.filter(p=>p.life>0);

  enemies=enemies.filter(e=>!e.dead);
  if(kills>=targetKills) endGame(true);
}

function draw(){
  ctx.fillStyle="#3a3a3a";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle="white";
  ctx.beginPath();
  ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="yellow";
  bullets.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,4,0,Math.PI*2);
    ctx.fill();
  });

  particles.forEach(p=>{
  ctx.fillStyle=`rgba(255,200,200,${p.life/p.max})`;
  ctx.fillRect(p.x,p.y,2,2);
});

  ctx.fillStyle="red";
  enemies.forEach(e=>{
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.fill();
  });

  addHealthBar();

  ui.innerHTML=`Health:${player.health|0}<br>Kills:${kills}/${targetKills}<br>Time:${timeLeft}s`;
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

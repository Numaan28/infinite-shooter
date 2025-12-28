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

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if(isMobile) document.getElementById("mobileControls").style.display="block";

/* AUDIO */
let audioCtx;
function beep(f,d,t="square"){
  if(!audioCtx) audioCtx=new AudioContext();
  const o=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o.type=t; o.frequency.value=f; g.gain.value=.2;
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
let bullets=[], enemies=[], keys={};
let kills=0,targetKills=0,timeLeft=0,initialTime=0;
let started=false,paused=false,gameOver=false;
let mouseDown=false,mouseX=0,mouseY=0,fireCooldown=0;

/* INPUT */
addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
addEventListener("mousedown",()=>mouseDown=true);
addEventListener("mouseup",()=>mouseDown=false);
addEventListener("mousemove",e=>{mouseX=e.clientX;mouseY=e.clientY});

/* MOBILE INPUT */
let touchMove={up:false,down:false,left:false,right:false};
let touchFire=false;

function bind(btn,dir){
  btn.addEventListener("touchstart",e=>{e.preventDefault();touchMove[dir]=true});
  btn.addEventListener("touchend",()=>touchMove[dir]=false);
}

if(isMobile){
  bind(up,"up"); bind(down,"down"); bind(left,"left"); bind(right,"right");
  fireBtn.addEventListener("touchstart",e=>{e.preventDefault();touchFire=true});
  fireBtn.addEventListener("touchend",()=>touchFire=false);
}

function resetGame(){
  bullets=[]; enemies=[];
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
  targetKills=k; initialTime=t; startGame();
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
  resetGame();
  pauseScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
}

function backToMenu(){
  started=false;
  menu.style.display="flex";
  pauseBtn.classList.add("hidden");
  ui.innerHTML="";
}

setInterval(()=>{
  if(started&&!paused&&!gameOver){
    timeLeft--;
    if(timeLeft<=0) endGame(false);
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

function clamp(){
  player.x=Math.max(player.r,Math.min(canvas.width-player.r,player.x));
  player.y=Math.max(player.r,Math.min(canvas.height-player.r,player.y));
}

function update(){
  if(!started||paused||gameOver) return;

  if(keys.w||touchMove.up) player.y-=player.speed;
  if(keys.s||touchMove.down) player.y+=player.speed;
  if(keys.a||touchMove.left) player.x-=player.speed;
  if(keys.d||touchMove.right) player.x+=player.speed;

  clamp(); // 🔒 BORDER LOCK

  if((mouseDown||touchFire)&&fireCooldown<=0){
    let a=Math.atan2(mouseY-player.y,mouseX-player.x);
    bullets.push({x:player.x,y:player.y,dx:Math.cos(a)*8,dy:Math.sin(a)*8});
    snd.shoot();
    fireCooldown=6;
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
        e.health-=20; b.x=-999;
        snd.hit();
        if(e.health<=0){ kills++; e.dead=true; snd.kill(); }
      }
    });
  });

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

  ctx.fillStyle="red";
  enemies.forEach(e=>{
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.fill();
  });

  ui.innerHTML=`Health:${player.health|0}<br>Kills:${kills}/${targetKills}<br>Time:${timeLeft}s`;
}

function loop(){
  update(); draw();
  requestAnimationFrame(loop);
}
loop();

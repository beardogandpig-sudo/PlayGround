import * as THREE from 'three';
import './style.css';

const root = document.querySelector('#game-root');
const canvas = document.querySelector('#game-canvas');
const ui = document.querySelector('#ui-layer');
const toast = document.querySelector('#toast');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a5bdc6');
scene.fog = new THREE.FogExp2('#b1c4c7', 0.0065);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 180);
camera.position.set(0,7,15);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.24;

scene.add(new THREE.HemisphereLight('#dceeff', '#5b3840', 2.0));
const sun = new THREE.DirectionalLight('#fff0d3', 3.2); sun.position.set(-7, 13, 8); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -13; sun.shadow.camera.right = 13; sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -12; scene.add(sun);
const rim = new THREE.DirectionalLight('#62d8ef', 2); rim.position.set(6, 8, -8); scene.add(rim);
const fill = new THREE.PointLight('#ff8c63', 55, 22); fill.position.set(-5, 3, 1); scene.add(fill);

const mat = (color, roughness=.65, metalness=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const groundMat = mat('#c8b99a', .9), stoneMat=mat('#928c80'), darkStone=mat('#686a66'), gold=mat('#dfb56f',.36,.55);
const arena = new THREE.Mesh(new THREE.CylinderGeometry(17, 18, .9, 80), mat('#baa98b'));
arena.position.y=-.5; arena.receiveShadow=true; scene.add(arena);
const top = new THREE.Mesh(new THREE.CylinderGeometry(16.98, 17, .14, 80), groundMat); top.position.y=-.035; top.receiveShadow=true; scene.add(top);
const ring = new THREE.Mesh(new THREE.TorusGeometry(13.8,.055,8,160), new THREE.MeshStandardMaterial({color:'#e4c785',emissive:'#735632',emissiveIntensity:.35,roughness:.5})); ring.rotation.x=Math.PI/2; ring.position.y=.045; scene.add(ring);
// Tile seams and engraved ring markers
for(const r of [4.5,9.2]){const seam=new THREE.Mesh(new THREE.TorusGeometry(r,.022,6,144),mat('#a99d85'));seam.rotation.x=Math.PI/2;seam.position.y=.045;scene.add(seam);}
for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const p=new THREE.Mesh(new THREE.BoxGeometry(.16,.02,.9),gold);p.position.set(Math.cos(a)*13.65,.055,Math.sin(a)*13.65);p.rotation.y=-a;scene.add(p);}
// Floating rock shelf and pillars frame the expanded battlefield
function pillar(x,z,h=4){const g=new THREE.Group();g.position.set(x,0,z);const base=new THREE.Mesh(new THREE.CylinderGeometry(.8,1.05,.35,6),darkStone);base.position.y=.15;g.add(base);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.55,.69,h,6),stoneMat);shaft.position.y=h/2+.3;shaft.castShadow=true;g.add(shaft);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.78,.58,.35,6),gold);cap.position.y=h+.48;g.add(cap);scene.add(g);return g;}
pillar(-19,-11,4.4); pillar(19,-10,3.8); pillar(-19,11,3.2); pillar(19,11,4.7);
// broken monoliths
for(let i=0;i<16;i++){const a=i/16*Math.PI*2, r=19+(i%3)*1.8;const h=1.5+(i*7%5)*.45;const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.8+(i%3)*.28,0),i%2?stoneMat:darkStone);rock.position.set(Math.cos(a)*r,h/2-1,Math.sin(a)*r);rock.scale.y=h;rock.rotation.set(.16*i,.4*i,.12*i);rock.castShadow=true;scene.add(rock);}
// distant atmospheric spires
for(let i=0;i<20;i++){const x=(i-10)*3.1,z=-24-(i%4)*4,h=5+(i*13%9);const ob=new THREE.Mesh(new THREE.ConeGeometry(1.6+(i%3),h,5),mat(i%2?'#70868a':'#87999b'));ob.position.set(x,h/2-1,z);ob.rotation.z=(i%2?.1:-.12);scene.add(ob);}

const fighters=[];
function makeFighter(name, colors, isPlayer){
  const group=new THREE.Group(); scene.add(group);
  const skin=mat(colors.skin), suit=mat(colors.suit,.66), undersuit=mat(colors.under,.62), hair=mat(colors.hair,.48), boot=mat(colors.boot), belt=mat(colors.belt), auraMat=new THREE.MeshBasicMaterial({color:colors.aura,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
  const body=new THREE.Group();group.add(body);
  function ell(parent,m,pos,scale){const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),m);o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;parent.add(o);return o;}
  function capsule(parent,m,a,b,r1,r2){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(B,A);const o=new THREE.Mesh(new THREE.CapsuleGeometry(r1,d.length(),4,8),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());o.castShadow=true;parent.add(o);return o;}
  // legs, boots, torso, gi panels, belt
  const legs=[];
  for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.23,.87,0);body.add(leg);capsule(leg,undersuit,[0,-.08,0],[s*.035,-.47,0],.17,.16);capsule(leg,suit,[s*.035,-.42,0],[s*.07,-.76,0],.16,.145);const b=new THREE.Mesh(new THREE.BoxGeometry(.32,.2,.4),boot);b.position.set(s*.08,-.83,.08);b.castShadow=true;leg.add(b);legs.push(leg);}
  const hairParts=[],superHairParts=[];
  ell(body,undersuit,[0,1.35,0],[.42,.58,.28]);ell(body,suit,[0,1.44,.015],[.46,.54,.30]);
  const gi=new THREE.Mesh(new THREE.ConeGeometry(.39,.55,4),suit);gi.position.set(0,1.15,.2);gi.rotation.y=Math.PI/4;gi.scale.set(.9,1,.28);gi.castShadow=true;body.add(gi);
  const beltMesh=new THREE.Mesh(new THREE.BoxGeometry(.82,.12,.59),belt);beltMesh.position.y=1.05;beltMesh.castShadow=true;body.add(beltMesh);
  ell(body,skin,[0,2.1,0],[.31,.34,.29]);
  // neck + angular anime hair spikes
  const hairCap=ell(body,hair,[0,2.34,-.025],[.32,.19,.3]);hairParts.push(hairCap);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const spike=new THREE.Mesh(new THREE.ConeGeometry(.16,.66+(i%3)*.12,5),hair);spike.position.set(Math.cos(a)*.2,2.64+(i%2)*.07,Math.sin(a)*.18);spike.rotation.z=-Math.cos(a)*.46;spike.rotation.x=Math.sin(a)*.42;spike.castShadow=true;body.add(spike);hairParts.push(spike);}
  const superHair=mat('#ffd83d',.5),superHairCap=ell(body,superHair,[0,2.38,-.025],[.34,.2,.31]);superHairCap.visible=false;superHairParts.push(superHairCap);
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const spike=new THREE.Mesh(new THREE.ConeGeometry(.16,.86+(i%3)*.12,5),superHair);spike.position.set(Math.cos(a)*.22,2.69+(i%2)*.09,Math.sin(a)*.2);spike.rotation.z=-Math.cos(a)*.48;spike.rotation.x=Math.sin(a)*.45;spike.castShadow=true;spike.visible=false;body.add(spike);superHairParts.push(spike);}
  // face eyes and brows
  for(const s of [-1,1]){const eye=ell(body,mat('#fff6de'),[s*.105,2.13,.263],[.065,.044,.035]);ell(body,mat(isPlayer?'#138cab':'#be4932'),[s*.105,2.13,.294],[.027,.035,.017]);const brow=new THREE.Mesh(new THREE.BoxGeometry(.14,.035,.04),hair);brow.position.set(s*.105,2.2,.26);brow.rotation.z=s*.15;brow.castShadow=true;body.add(brow);}
  const arms=[];
  for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*.4,1.75,0);body.add(arm);capsule(arm,suit,[0,0,0],[s*.15,-.34,.04],.17,.145);capsule(arm,undersuit,[s*.15,-.34,.04],[s*.2,-.63,.18],.14,.12);ell(arm,skin,[s*.2,-.7,.2],[.14,.14,.14]);const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.15,.16,.12,10),belt);cuff.position.set(s*.18,-.54,.12);cuff.rotation.z=s*.25;arm.add(cuff);arms.push(arm);}
  // Layered gi lapels, shoulder guards and a clear rival-specific silhouette.
  for(const s of [-1,1]){const lapel=new THREE.Mesh(new THREE.ConeGeometry(.15,.43,3),undersuit);lapel.position.set(s*.16,1.66,.276);lapel.rotation.z=s*.62;lapel.rotation.x=Math.PI/2;lapel.scale.set(.72,1,.35);body.add(lapel);const pad=ell(body,suit,[s*.39,1.83,0],[.18,.16,.25]);pad.rotation.z=-s*.18;}
  const knot=ell(body,belt,[0,1.04,.32],[.16,.11,.08]);
  const nose=ell(body,skin,[0,2.075,.291],[.045,.067,.045]);
  for(const s of [-1,1]){const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.17,.18,.1,10),belt);cuff.position.set(s*.08,-.78,.08);cuff.castShadow=true;body.add(cuff);}
  if(name==='VEGETA'){
    const widow=new THREE.Mesh(new THREE.ConeGeometry(.13,.3,4),hair);widow.position.set(0,2.24,.27);widow.rotation.x=Math.PI/2;widow.castShadow=true;body.add(widow);
  }else{
    for(const s of [-1,1]){const fringe=new THREE.Mesh(new THREE.ConeGeometry(.13,.4,4),hair);fringe.position.set(s*.16,2.4,.24);fringe.rotation.z=-s*.5;fringe.rotation.x=Math.PI/2;fringe.castShadow=true;body.add(fringe);}
  }
  // Subtle chest insignia.
  const emblem=new THREE.Mesh(new THREE.CircleGeometry(.105,24),mat(colors.emblem));emblem.position.set(.13,1.59,.315);body.add(emblem);
  const aura=new THREE.Mesh(new THREE.ConeGeometry(.73,3.2,12,1,true),auraMat);aura.position.y=1.65;aura.scale.set(1,1,.72);aura.visible=false;group.add(aura);
  const glow=new THREE.PointLight(colors.aura,0,5);glow.position.y=1.4;group.add(glow);
  const state={name,group,body,arms,legs,hairParts,superHairParts,aura,glow,isPlayer,hp:100,ki:0,transformed:false,overcharge:0,maxKiAnnounced:false,x:isPlayer?-3:3,y:0,z:0,vx:0,vy:0,vz:0,face:isPlayer?1:-1,stun:0,attack:0,attackType:'',cooldown:0,charging:false,flying:false,dead:false,colors};group.position.set(state.x,0,state.z); fighters.push(state);return state;
}
const player=makeFighter('SON GOKU',{skin:'#efb992',suit:'#ed7139',under:'#253d83',hair:'#17202c',boot:'#273c79',belt:'#246bca',aura:'#59dfff',emblem:'#f7dcaa'},true);
const enemy=makeFighter('VEGETA',{skin:'#e5ad87',suit:'#263b75',under:'#f0e9d8',hair:'#111725',boot:'#25385d',belt:'#d6c6ab',aura:'#ff6197',emblem:'#dfd2b6'},false);
let aimLocked=true;
const targetMarker=new THREE.Group();
const targetRing=new THREE.Mesh(new THREE.TorusGeometry(.48,.025,6,36),new THREE.MeshBasicMaterial({color:'#8ff6ff',transparent:true,opacity:.9}));targetMarker.add(targetRing);
for(const s of [-1,1])for(const v of [-1,1]){const bracket=new THREE.Mesh(new THREE.BoxGeometry(.16,.025,.025),targetRing.material);bracket.position.set(s*.38,v*.38,0);targetMarker.add(bracket);}
scene.add(targetMarker);

// clouds and ambient particles
const particleGeo=new THREE.BufferGeometry(), particleCount=135, positions=new Float32Array(particleCount*3);
for(let i=0;i<particleCount;i++){positions[i*3]=(Math.random()-.5)*36;positions[i*3+1]=Math.random()*9+.2;positions[i*3+2]=(Math.random()-.5)*28;}
particleGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const dust=new THREE.Points(particleGeo,new THREE.PointsMaterial({color:'#fff1d2',size:.055,transparent:true,opacity:.7}));scene.add(dust);

player.group.rotation.y=Math.PI/2; enemy.group.rotation.y=-Math.PI/2;
let started=false, paused=false, ended=false, time=120, shake=0, lastAction='', mobile=false, timerAcc=0, toastTimer=0;
const keys=new Set(), projectiles=[], bursts=[];

function renderMenu(){
  ui.innerHTML=`<div class="menu-screen"><div class="topline"><div class="brand-mark"><span class="brand-sun">✦</span><span>KI<span class="brand-light">CLASH</span></span></div><div class="edition">WARRIOR'S ASCENT <i></i> MOBILE EDITION</div></div><div class="intro-copy"><div class="eyebrow"><span></span> THE ARENA IS CALLING</div><h1>LEGENDS<br><em>COLLIDE.</em></h1><p>A high-impact 3D showdown. Charge your ki, break through the guard, and claim the crown.</p><div class="fighter-compare"><div class="fighter-chip"><div class="chip-orb goku-orb">悟</div><div><b>SON GOKU</b><small>EARTH'S LAST HOPE</small></div></div><div class="versus">VS</div><div class="fighter-chip rival"><div class="chip-orb vegeta-orb">王</div><div><b>VEGETA</b><small>PRINCE OF SAIYANS</small></div></div></div><button id="play-button" class="play-button"><span>ENTER THE ARENA</span><b>↗</b></button><div class="menu-hint">NO DESTINY. JUST YOUR NEXT MOVE.</div></div><div class="corner-note"><span>01</span> THE SKY TEMPLE <span class="note-line"></span> 1V1 DUEL</div><div class="menu-footer"><span>KI CLASH <span class="muted">/</span> 001</span><span>BUILT FOR THE FIGHT</span><span>TOUCH OR KEYBOARD</span></div></div>`;
  document.querySelector('#play-button').onclick=startGame;
}
function renderHud(){
  ui.innerHTML=`<div class="hud"><div class="hud-top"><div class="hud-brand"><span>✦</span> KI CLASH <small>• RANKED DUEL</small></div><div class="round-label"><span>SKY TEMPLE</span><b>— &nbsp; ROUND 01 &nbsp;—</b></div><button id="pause-button" class="pause-button" aria-label="Pause">Ⅱ</button></div><div class="fight-status"><div class="health-side"><div class="name-row"><strong>SON GOKU</strong><span>EARTH'S DEFENDER</span><b id="p-health-text">100</b></div><div class="health-track"><div id="p-health" class="health-fill player-fill"></div><div class="health-glint"></div></div><div class="ki-row"><span>KI</span><div class="ki-track"><div id="p-ki" class="ki-fill player-ki"></div></div><span id="p-ki-text">0%</span></div></div><div class="timer"><b id="timer">120</b><span>SECONDS</span></div><div class="health-side enemy-side"><div class="name-row"><b id="e-health-text">100</b><strong>VEGETA</strong><span>PRINCE OF SAIYANS</span></div><div class="health-track"><div id="e-health" class="health-fill enemy-fill"></div></div><div class="ki-row"><span>KI</span><div class="ki-track"><div id="e-ki" class="ki-fill enemy-ki"></div></div><span>RIVAL</span></div></div></div><div class="fight-tip"><span class="tip-dot"></span><span id="fight-tip-text">MAKE YOUR MOVE</span></div><div class="desktop-help"><kbd>W A S D</kbd> MOVE <kbd>J</kbd> STRIKE <kbd>K</kbd> BLAST <kbd>L</kbd> CHARGE <kbd>SHIFT</kbd> DASH <kbd>T</kbd> LOCK <kbd>F</kbd> FLY <kbd>R/C</kbd> ALTITUDE</div><div class="touch-controls"><div class="stick-zone"><div id="joystick" class="joystick"><div class="stick-knob"></div></div><small>MOVE</small></div><div class="action-pad"><button class="action-btn charge-btn" data-action="charge"><span>✦</span><small>CHARGE</small></button><button class="action-btn fly-btn" data-action="fly"><span>↑</span><small>FLY</small></button><button class="action-btn lock-btn" data-action="lock"><span>◎</span><small>AIM LOCK</small></button><button class="action-btn dash-btn" data-action="dash"><span>➤</span><small>DASH</small></button><button class="action-btn strike-btn" data-action="strike"><span>✊</span><small>STRIKE</small></button><button class="action-btn blast-btn" data-action="blast"><span>◉</span><small>KI BLAST</small></button></div></div><div id="pause-overlay" class="pause-overlay hidden"><div class="pause-card"><span class="eyebrow">BREATHE, WARRIOR</span><h2>PAUSED</h2><button id="resume-button" class="play-button"><span>BACK TO THE FIGHT</span><b>↗</b></button><button id="restart-button" class="restart-button">RESTART DUEL ↻</button></div></div></div>`;
  document.querySelector('#pause-button').onclick=togglePause; document.querySelector('#resume-button').onclick=togglePause; document.querySelector('#restart-button').onclick=()=>location.reload(); bindTouch();document.querySelector('.lock-btn')?.classList.toggle('active',aimLocked);document.querySelector('.fly-btn')?.classList.toggle('active',player.flying);
}
function startGame(){started=true;time=120;renderHud();toastMsg('FIGHT!');}
function toastMsg(text){toast.textContent=text;toast.classList.add('visible');toastTimer=1.1;}
function transformFighter(f){if(f.transformed)return;f.transformed=true;f.overcharge=0;f.hairParts.forEach(part=>part.visible=false);f.superHairParts.forEach(part=>part.visible=true);f.aura.material.color.set('#ffd83d');f.glow.color.set('#ffd83d');f.glow.intensity=16;f.aura.scale.set(1.3,1.18,.95);shake=.65;burstAt(new THREE.Vector3(f.x,1.7,f.z),0xffd83d,48);if(f.isPlayer){toastMsg('SUPER SAIYAN!');lastAction='transform';}}
function updateHud(){const p=document.querySelector('#p-health');if(!p)return; p.style.width=player.hp+'%';document.querySelector('#e-health').style.width=enemy.hp+'%';document.querySelector('#p-health-text').textContent=Math.ceil(player.hp);document.querySelector('#e-health-text').textContent=Math.ceil(enemy.hp);document.querySelector('#p-ki').style.width=player.ki+'%';document.querySelector('#e-ki').style.width=enemy.ki+'%';document.querySelector('#p-ki-text').textContent=player.transformed?'SUPER SAIYAN':Math.floor(player.ki)+'%';document.querySelector('#timer').textContent=Math.ceil(time);}
function togglePause(){paused=!paused;document.querySelector('#pause-overlay')?.classList.toggle('hidden',!paused);}
function endGame(winner){ended=true;paused=true;const overlay=document.querySelector('#pause-overlay');overlay.classList.remove('hidden');overlay.innerHTML=`<div class="pause-card result-card"><span class="eyebrow">${winner==='YOU WIN'?'A LEGEND IS BORN':'THE PRINCE PREVAILS'}</span><h2>${winner}</h2><p>${winner==='YOU WIN'?'The arena bows to your power.':'Rise again. The next battle is yours.'}</p><button id="again-button" class="play-button"><span>FIGHT AGAIN</span><b>↗</b></button></div>`;document.querySelector('#again-button').onclick=()=>location.reload();}

function bindTouch(){
  const joy=document.querySelector('#joystick'),knob=joy.querySelector('.stick-knob');let active=false,origin={x:0,y:0};
  const move=e=>{if(!active)return;const r=joy.getBoundingClientRect(),dx=e.clientX-origin.x,dy=e.clientY-origin.y,len=Math.hypot(dx,dy),max=35,scale=Math.min(1,max/(len||1));knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;touchMove.x=dx/max;touchMove.z=dy/max;};
  joy.onpointerdown=e=>{active=true;origin={x:e.clientX,y:e.clientY};joy.setPointerCapture(e.pointerId);move(e);};joy.onpointermove=move;const release=()=>{active=false;touchMove.x=touchMove.z=0;knob.style.transform='';};joy.onpointerup=release;joy.onpointercancel=release;
  document.querySelectorAll('.action-btn').forEach(btn=>{const action=btn.dataset.action;btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);if(action==='charge')chargeHeld=true;else trigger(action);};const up=()=>{if(action==='charge')chargeHeld=false;};btn.onpointerup=up;btn.onpointercancel=up;});
}
const touchMove={x:0,z:0};let chargeHeld=false;

function burstAt(pos,color,amount=14){for(let i=0;i<amount;i++){const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95});const mesh=new THREE.Mesh(new THREE.SphereGeometry(.055+Math.random()*.06,7,6),m);mesh.position.copy(pos);scene.add(mesh);bursts.push({mesh,life:.45+Math.random()*.35,v:new THREE.Vector3((Math.random()-.5)*5,Math.random()*5,(Math.random()-.5)*4)});}}
function projectile(from,power=1){const isP=from===player,target=isP?enemy:player,color=isP?0x5de9ff:0xff5d9b;const origin=new THREE.Vector3(from.x,from.y+1.55,from.z);let direction=new THREE.Vector3();if(!isP||aimLocked)direction.set(target.x-origin.x,target.y+1.45-origin.y,target.z-origin.z).normalize();else direction.set(from.face,0,0);const mesh=new THREE.Mesh(new THREE.SphereGeometry(.2+power*.18,16,12),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.96}));mesh.position.copy(origin);const halo=new THREE.Mesh(new THREE.SphereGeometry(.43+power*.27,14,10),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.21}));mesh.add(halo);scene.add(mesh);const light=new THREE.PointLight(color,3,4);mesh.add(light);projectiles.push({mesh,from,target,direction,power,speed:13+power*4,life:2});}
function toggleFlight(f=player){if(!started||paused||ended||f.dead)return;f.flying=!f.flying;if(f.flying){f.vy=Math.max(f.vy,2.2);toastMsg('FLIGHT ENGAGED');}else toastMsg('DESCENDING');document.querySelector('.fly-btn')?.classList.toggle('active',f.flying);}
function toggleAimLock(){aimLocked=!aimLocked;document.querySelector('.lock-btn')?.classList.toggle('active',aimLocked);toastMsg(aimLocked?'AIM LOCK ON':'AIM LOCK OFF');}
function trigger(action, fighter=player){if(action==='fly'&&fighter===player){toggleFlight(fighter);return;}if(action==='lock'&&fighter===player){toggleAimLock();return;}if(!started||paused||ended||fighter.dead||fighter.cooldown>0)return;
  if(action==='strike'){fighter.attack=.4;fighter.attackType='strike';fighter.cooldown=.42;fighter.charging=false;if(fighter.isPlayer)lastAction='strike';}
  else if(action==='blast'){if(fighter.ki<22){if(fighter.isPlayer)toastMsg('NOT ENOUGH KI');return;}fighter.ki-=22;fighter.cooldown=.65;fighter.attack=.26;fighter.attackType='blast';projectile(fighter,1);if(fighter.isPlayer)lastAction='blast';}
  else if(action==='dash'){fighter.vx+=Math.sign(fighter===player?enemy.x-player.x:player.x-enemy.x)*10;fighter.vz+=(Math.random()-.5)*5;if(fighter.flying)fighter.vy+=1.2;fighter.cooldown=.48;fighter.attack=.2;fighter.attackType='dash';if(fighter.isPlayer)lastAction='dash';}
}
function hit(target,damage,dir){target.hp=Math.max(0,target.hp-damage);target.stun=.26;target.vx+=dir*3.4;target.vz+=(Math.random()-.5)*2;shake=Math.min(.38,shake+.2);burstAt(new THREE.Vector3(target.x,1.55,target.z),target.isPlayer?0xff9269:0x73eaff,15);if(target.hp<=0){target.dead=true;setTimeout(()=>{if(!ended)endGame(target===enemy?'YOU WIN':'YOU LOSE');},550);}}
function attackUpdate(f){if(f.attack>0){const prev=f.attack;f.attack=Math.max(0,f.attack-.016);if(f.attackType==='strike'&&prev>.24&&f.attack<=.24){const t=f===player?enemy:player;if(Math.abs(t.x-f.x)<2.05&&Math.abs(t.z-f.z)<2.1&&Math.abs(t.y-f.y)<1.5&&t.hp>0)hit(t,10+Math.random()*3,f===player?1:-1);else if(f.isPlayer)toastMsg('WHIFF');}if(f.attackType==='dash'&&prev>.12&&f.attack<=.12){const t=f===player?enemy:player;if(Math.abs(t.x-f.x)<1.9&&Math.abs(t.z-f.z)<1.8&&Math.abs(t.y-f.y)<1.5)hit(t,12,f===player?1:-1);}}
  if(f.cooldown>0)f.cooldown=Math.max(0,f.cooldown-.016);if(f.stun>0)f.stun=Math.max(0,f.stun-.016);
}
function animateFighter(f,dt){const moving=Math.abs(f.vx)+Math.abs(f.vz)>.7;const t=time*9+(f===player?0:Math.PI);f.body.position.y=f.attackType==='dash'&&f.attack>0?.16:Math.sin(t)*.04*(moving?1.4:.35);f.body.rotation.z=f.attackType==='strike'&&f.attack>0?Math.sin((.4-f.attack)/.4*Math.PI)*-.18:0;
  f.legs.forEach((l,i)=>{l.rotation.x=moving?Math.sin(t+i*Math.PI)*.52:0;});f.arms.forEach((a,i)=>{const s=i===0?-1:1;if(f.attackType==='strike'&&f.attack>0&&s===f.faceSide){const q=Math.sin((.4-f.attack)/.4*Math.PI);a.rotation.z=-f.face*q*1.35;a.rotation.x=-q*.5;}else if(f.charging){a.rotation.x=-.8+Math.sin(t*2)*.08;a.rotation.z=s*.65;}else{a.rotation.x=Math.sin(t*.6+i)*.04;a.rotation.z=s*.12;}});
  f.aura.visible=f.charging||f.ki>94||f.transformed;f.aura.material.opacity=f.transformed?.22+Math.sin(t*3)*.07:f.charging?.12+Math.sin(t*2)*.05:.08;f.aura.scale.set((f.transformed?1.28:1)+Math.sin(t*2)*.08,(f.transformed?1.14:1)+Math.sin(t*3)*.07, f.transformed?.9:.72);f.glow.intensity=f.transformed?8+Math.sin(t*3)*2:f.charging?10:0;f.group.rotation.y=f.face>0?Math.PI/2:-Math.PI/2;f.group.position.set(f.x,f.y,f.z);if(f.flying){f.body.rotation.x=Math.max(-.12,Math.min(.12,-f.vy*.025));}else f.body.rotation.x=0;
}
function update(dt){time-=dt;timerAcc+=dt;if(timerAcc>1&&time>0){timerAcc=0;}if(time<=0&&!ended){time=0;endGame(player.hp>=enemy.hp?'YOU WIN':'YOU LOSE');}if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.classList.remove('visible');}
  const dx=enemy.x-player.x;if(aimLocked||Math.abs(player.vx)<.25)player.face=dx>=0?1:-1;else player.face=Math.sign(player.vx);enemy.face=-player.face;
  // Player movement. Keyboard and virtual joystick share the same vector.
  let mx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+touchMove.x;
  let mz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+touchMove.z;
  const mlen=Math.hypot(mx,mz);if(mlen>1){mx/=mlen;mz/=mlen;}const speed=keys.has('shift')?(player.flying?9:7.4):(player.flying?6.2:4.7);
  if(player.stun<=0&&started&&!paused){player.vx+=(mx*speed-player.vx)*Math.min(1,dt*9);player.vz+=(mz*speed-player.vz)*Math.min(1,dt*9);const altitude=(keys.has('r')?1:0)-(keys.has('c')?1:0);if(player.flying)player.vy+=(altitude*4-player.vy)*Math.min(1,dt*5);if(chargeHeld||keys.has('l')){player.charging=true;if(player.ki<100)player.ki=Math.min(100,player.ki+dt*25);else if(!player.transformed){player.overcharge+=dt;if(!player.maxKiAnnounced){toastMsg('KI MAXED — KEEP CHARGING!');player.maxKiAnnounced=true;}if(player.overcharge>=2.2){transformFighter(player);}}if(Math.random()<dt*12)burstAt(new THREE.Vector3(player.x+(Math.random()-.5),1.6,player.z+(Math.random()-.5)),player.transformed?0xffd83d:0x62eaff,1);}else player.charging=false;}
  // Rival keeps pressure, dodges, charges when at range.
  if(enemy.stun<=0&&started&&!paused&&!enemy.dead){const dist=Math.hypot(dx,enemy.z-player.z),approach=dist>2.3?1:dist<1.6?-.18:0;enemy.vx+=(Math.sign(-dx)*approach*3.5-enemy.vx)*Math.min(1,dt*3);enemy.vz+=((player.z-enemy.z)*.65-enemy.vz)*Math.min(1,dt*2);enemy.flying=player.flying&&dist>4;enemy.vy+=(enemy.flying?Math.max(-1.5,Math.min(2.2,player.y-enemy.y)): -enemy.y*2-enemy.vy)*Math.min(1,dt*1.5);enemy.ai=(enemy.ai||0)-dt;if(enemy.charging){enemy.ki=Math.min(100,enemy.ki+dt*21);if(enemy.ai<=0){enemy.charging=false;enemy.ai=.25;}}else if(enemy.ai<=0){if(dist>4&&enemy.ki<70&&Math.random()<.5){enemy.charging=true;enemy.ai=.65;}else if(dist<2.5&&Math.random()<.65){trigger('strike',enemy);enemy.ai=.75+Math.random()*.3;}else if(enemy.ki>=22&&dist<8){trigger('blast',enemy);enemy.ai=1.1;}else{enemy.ai=.4;}}}
  for(const f of fighters){f.x+=f.vx*dt;f.y=THREE.MathUtils.clamp(f.y+f.vy*dt,0,6);if(f.y===0&&f.vy<0)f.vy=0;if(!f.flying&&f.y>0)f.vy-=9.8*dt;f.z+=f.vz*dt;f.vx*=Math.pow(.025,dt);f.vz*=Math.pow(.025,dt);f.x=THREE.MathUtils.clamp(f.x,-14.5,14.5);f.z=THREE.MathUtils.clamp(f.z,-14.5,14.5);attackUpdate(f);animateFighter(f,dt);}
  // Keep fighters from occupying the same space.
  const separation=player.x-enemy.x;if(Math.abs(separation)<.85&&Math.abs(player.z-enemy.z)<.8){const push=(.85-Math.abs(separation))*.5;player.x+=Math.sign(separation||-1)*push;enemy.x-=Math.sign(separation||-1)*push;}
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.life-=dt;if(p.from!==player||aimLocked){const desired=new THREE.Vector3(p.target.x-p.mesh.position.x,p.target.y+1.45-p.mesh.position.y,p.target.z-p.mesh.position.z).normalize();p.direction.lerp(desired,Math.min(1,dt*2.8)).normalize();}p.mesh.position.addScaledVector(p.direction,p.speed*dt);const targetPoint=new THREE.Vector3(p.target.x,p.target.y+1.45,p.target.z);if(p.mesh.position.distanceTo(targetPoint)<.78&&p.life>0){hit(p.target,12+p.power*3,Math.sign(p.direction.x)||1);burstAt(p.mesh.position,p.from===player?0x6cecff:0xff72a8,20);p.life=0;}if(p.life<=0){scene.remove(p.mesh);projectiles.splice(i,1);}}
  for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.life-=dt;b.mesh.position.addScaledVector(b.v,dt);b.v.y-=5*dt;b.mesh.material.opacity=Math.max(0,b.life);b.mesh.scale.multiplyScalar(1+dt*2);if(b.life<=0){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();bursts.splice(i,1);}}
  // Cinematic camera tracks both warriors, including vertical framing on phones.
  const midX=(player.x+enemy.x)*.5,midZ=(player.z+enemy.z)*.5;const portrait=innerHeight>innerWidth;
  const midpointY=(player.y+enemy.y)*.5;const spread=Math.hypot(player.x-enemy.x,player.z-enemy.z);const distance=THREE.MathUtils.clamp((portrait?17:13.6)+spread*.48,portrait?17:13.6,portrait?25:20);const sideOffset=portrait?1.6:4.2;const focusOffset=portrait ? 0.15 : 0.8;const desired=new THREE.Vector3(midX-player.face*sideOffset,midpointY+(portrait?7.2:5.8),midZ+distance);camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(midX+player.face*focusOffset,midpointY+1.1,midZ-.25);
  targetMarker.visible=started&&!ended&&aimLocked;targetMarker.position.set(enemy.x,enemy.y+2.55,enemy.z);targetMarker.rotation.y=time*-.45;targetMarker.scale.setScalar(1+Math.sin(time*5)*.045);if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake=Math.max(0,shake-dt*.75);}dust.rotation.y+=dt*.012;
  if(Math.random()<dt*.55){const x=(Math.random()-.5)*19,z=(Math.random()-.5)*14;const c=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),new THREE.MeshBasicMaterial({color:'#fff1d2'}));c.position.set(x,.1,z);scene.add(c);bursts.push({mesh:c,life:1.6,v:new THREE.Vector3(0,.35,0)});}
  updateHud();
}

const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.035);if(started&&!paused&&!ended)update(dt);else{time-=0;animateFighter(player,dt);animateFighter(enemy,dt);camera.lookAt(0,1.25,0);}renderer.render(scene,camera);}
function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=innerHeight>innerWidth?48:42;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);}
window.addEventListener('resize',resize);resize();
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='j')trigger('strike');if(k==='k')trigger('blast');if(k==='shift')trigger('dash');if(k==='f'&&!e.repeat)toggleFlight();if(k==='t'&&!e.repeat)toggleAimLock();if(k==='escape'&&started)togglePause();});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
renderMenu();frame();


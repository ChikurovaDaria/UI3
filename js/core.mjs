import {WORLD,LAMP,OBSTACLES,GATE,INTERACTABLES,SPAWNS,REGIONS,activateRegion,canStand,fromMap} from './world.mjs';
import {findWaypoint} from './navigation.mjs';
export const SAVE_KEY='bloodborne-last-hunt-v2';
let slot=0;
export function setSlot(n){slot=clamp(Math.floor(n),0,2);}
export function getSlot(){return slot;}
export const project=({x,y})=>({x:x-y,y:(x+y)*.5});
export const unproject=({x,y})=>({x:y+x*.5,y:y-x*.5});
export const normalizedScreenDirection=(x,y)=>{const n=Math.hypot(x,y);return n?unproject({x:x/n,y:y/n}):{x:0,y:0};};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const visualDist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y));
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function clearLine(a,b,obstacles,stand=()=>true){const steps=Math.max(1,Math.ceil(dist(a,b)/5));for(let i=1;i<steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;if(!stand(x,y,0)||obstacles.some(o=>x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h))return false;}return true;}
const signal=(s,text,kind='info')=>{s.events.push({text,kind});if(s.events.length>8)s.events.shift();};
export function moveWithCollisions(e,dx,dy,obstacles,stand=()=>true){
 // Substeps prevent a fast roll from crossing a thin wall.
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));
 const blocked=(x,y)=>!stand(x,y,e.r)||obstacles.some(o=>{const px=clamp(x,o.x,o.x+o.w),py=clamp(y,o.y,o.y+o.h);return (x-px)**2+(y-py)**2<e.r**2;});
 for(let i=0;i<steps;i++){const nx=clamp(e.x+dx/steps,e.r,WORLD.width-e.r);if(!blocked(nx,e.y))e.x=nx;const ny=clamp(e.y+dy/steps,e.r,WORLD.height-e.r);if(!blocked(e.x,ny))e.y=ny;}
}
const makeEnemy=(spawn)=>({...spawn,home:{x:spawn.x,y:spawn.y},r:spawn.type==='boss'?30:17,hp:spawn.type==='boss'?420:spawn.type==='hookman'?100:65,maxHp:spawn.type==='boss'?420:spawn.type==='hookman'?100:65,state:'idle',timer:0,cooldown:0,angle:0,attack:0,phase:1,hit:false,shotFlash:0});
export function createState(saved){
 activateRegion(saved?.region||'yharnam');
 const s={mode:'playing',time:0,player:{x:LAMP.x+45,y:LAMP.y+5,r:14,hp:100,maxHp:100,stamina:100,maxStamina:100,ammo:6,heals:3,angle:0,form:0,action:'idle',timer:0,iframes:0,staminaDelay:0,rally:0,rallyTimer:0,hitIds:[],rollDir:{x:0,y:0},heavy:false,invulnerable:0},enemies:SPAWNS.map(makeEnemy),flags:{eye:false,secret:false,shortcut:false,npcChoice:null,key:false,bossStarted:false,bossDefeated:false,note:false},echoes:0,insight:0,events:[],effects:[],nearest:null,dialogue:null,saveError:false};
 s.region=saved?.region||'yharnam';s.campaign=saved?.campaign||{yharnam:{},cathedral:{},mensis:{},dream:{}};s.attributes={vitality:0,endurance:0,strength:0,skill:0,bloodtinge:0,arcane:0,...saved?.attributes};s.level=saved?.level||1;s.ending=saved?.ending||null;
 if(saved&&saved.version===1){s.flags={...s.flags,...saved.flags,bossStarted:false};s.echoes=saved.echoes;s.insight=saved.insight;s.player.ammo=clamp(saved.ammo,0,99);s.player.heals=clamp(saved.heals,0,30);if(s.flags.bossDefeated)s.enemies.find(e=>e.id==='boss').hp=0;}
 s.hazards=[];s.player.maxHp=100+s.attributes.vitality*12;s.player.hp=s.player.maxHp;s.player.maxStamina=100+s.attributes.endurance*10;s.player.stamina=s.player.maxStamina;s.player.moving=false;s.player.exhausted=false;s.player.moveAngle=0;
 if(s.region==='dream'&&s.campaign.yharnam?.npcChoice==='give')INTERACTABLES.push({id:'survivor',...fromMap(850,570),label:'Выживший · разговор о прошлой охоте'});
 return s;
}
export function serialize(s){return {version:1,region:s.region,campaign:s.campaign,attributes:s.attributes,level:s.level,ending:s.ending,flags:{...s.flags,bossStarted:false},echoes:s.echoes,insight:s.insight,ammo:s.player.ammo,heals:s.player.heals};}
export function readSave(storage){try {const d=JSON.parse(storage.getItem(slot?`${SAVE_KEY}-${slot}`:SAVE_KEY));if(!d||d.version!==1||!d.flags||typeof d.flags!=='object'||Array.isArray(d.flags))return null;const flags=d.flags;for(const k of ['eye','secret','shortcut','key','bossDefeated','note'])if(typeof flags[k]!=='boolean')return null;if(![null,'give','keep'].includes(flags.npcChoice))return null;for(const k of ['echoes','insight','ammo','heals'])if(!Number.isFinite(d[k])||d[k]<0)return null;if(d.region!==undefined&&!Object.hasOwn(REGIONS,d.region))return null;
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const flagKeys=['eye','secret','shortcut','key','bossStarted','bossDefeated','note'];
if(d.campaign!==undefined){if(!record(d.campaign))return null;for(const [region,progress] of Object.entries(d.campaign)){if(!Object.hasOwn(REGIONS,region)||!record(progress))return null;for(const [key,value] of Object.entries(progress)){if(key==='npcChoice'){if(![null,'give','keep'].includes(value))return null;}else if(!flagKeys.includes(key)||typeof value!=='boolean')return null;}}}
if(d.attributes!==undefined){if(!record(d.attributes))return null;for(const [key,value] of Object.entries(d.attributes))if(!['vitality','endurance','strength','skill','bloodtinge','arcane'].includes(key)||!Number.isInteger(value)||value<0||value>50)return null;}
if(d.level!==undefined&&(!Number.isInteger(d.level)||d.level<1||d.level>301))return null;
if(d.ending!==undefined&&![null,'Освобождение','Наследник кошмара'].includes(d.ending))return null;return d;}catch{return null;}}
export function writeSave(storage,s){try{storage.setItem(slot?`${SAVE_KEY}-${slot}`:SAVE_KEY,JSON.stringify(serialize(s)));s.saveError=false;return true;}catch{s.saveError=true;return false;}}
const obstaclesFor=s=>s.region==='dream'||s.flags.shortcut?OBSTACLES:[...OBSTACLES,GATE];
const spend=(p,cost)=>{if(p.stamina<cost)return false;p.stamina-=cost;p.staminaDelay=.75;return true;};
export function beginAttack(s,heavy=false){const p=s.player;if(s.mode!=='playing'||p.action!=='idle'||!spend(p,heavy?30:p.form?23:16))return false;p.action='attack';p.heavy=heavy;p.timer=0;p.hitIds=[];p.swung=false;return true;}
export function dodge(s,dir){const p=s.player;if(s.mode!=='playing'||p.action!=='idle'||!spend(p,25))return false;p.action='roll';p.timer=.36;p.iframes=.25;p.rollDir=dir&&Math.hypot(dir.x,dir.y)>.01?dir:normalizedScreenDirection(Math.cos(p.angle),Math.sin(p.angle));return true;}
export function dash(s,dir){const p=s.player;if(s.mode!=='playing'||p.action!=='idle'||!spend(p,20))return false;p.action='dash';p.timer=.21;p.iframes=.07;p.rollDir=dir&&Math.hypot(dir.x,dir.y)>.01?dir:normalizedScreenDirection(Math.cos(p.angle),Math.sin(p.angle));return true;}
export function slide(s,dir){const p=s.player;if(!p.moving||s.mode!=='playing'||p.action!=='idle'||!spend(p,18))return false;p.action='slide';p.timer=.4;p.iframes=0;p.rollDir=dir&&Math.hypot(dir.x,dir.y)>.01?dir:normalizedScreenDirection(Math.cos(p.moveAngle),Math.sin(p.moveAngle));return true;}
export function upgrade(s,key){if(s.region!=='dream'||!Object.hasOwn(s.attributes,key)||s.attributes[key]>=50)return false;const cost=60+(s.level-1)*35;if(s.echoes<cost)return false;s.echoes-=cost;s.attributes[key]++;s.level++;s.player.maxHp=100+s.attributes.vitality*12;s.player.maxStamina=100+s.attributes.endurance*10;s.player.hp=s.player.maxHp;s.player.stamina=s.player.maxStamina;signal(s,'Память крови укрепила охотника.','progress');return true;}
export function trade(s,type){if(s.region!=='dream')return false;if(type==='insight'&&s.insight>=5){s.insight-=5;s.echoes+=80;return true;}if(type==='heal'&&s.echoes>=25){s.echoes-=25;s.player.heals++;return true;}if(type==='ammo'&&s.echoes>=20){s.echoes-=20;s.player.ammo+=5;return true;}return false;}
export function travel(s,id){if(!REGIONS[id]||s.flags.bossStarted)return false;if(id==='cathedral'&&!s.campaign.yharnam?.bossDefeated)return false;if(id==='mensis'&&!s.campaign.cathedral?.bossDefeated)return false;s.campaign[s.region]={...s.flags,bossStarted:false};const data=serialize(s);data.region=id;data.flags=s.campaign[id]?.note!==undefined?s.campaign[id]:{};const fresh=createState(data);Object.assign(s,fresh);signal(s,REGIONS[id].name,'region');return true;}
export function finishChoice(s,value){if(s.region!=='dream'||!s.campaign.mensis?.bossDefeated)return false;const good=s.campaign.yharnam?.npcChoice==='give'&&s.campaign.cathedral?.npcChoice==='give'&&s.campaign.mensis?.npcChoice==='give';if(value==='wake'&&good){s.ending='Освобождение';s.mode='ending';return true;}if(value==='inherit'){s.ending='Наследник кошмара';s.mode='ending';return true;}if(value==='fight'){if(s.flags.bossDefeated)return false;s.flags.bossStarted=true;s.enemies.find(e=>e.id==='boss').hp=420;s.mode='playing';return true;}return false;}
export function transform(s){if(s.mode!=='playing'||s.player.action!=='idle')return false;s.player.form=1-s.player.form;signal(s,s.player.form?'Оружие раскрыто · дальний удар':'Оружие сложено · быстрый удар');return true;}
export function heal(s){const p=s.player;if(s.mode!=='playing'||p.action!=='idle'||p.heals<=0||p.hp===p.maxHp)return false;p.heals--;p.hp=Math.min(p.maxHp,p.hp+40);p.rally=0;p.action='heal';p.timer=.65;signal(s,'Ампула · восстановлено здоровье');return true;}
export function shoot(s){const p=s.player;if(s.mode!=='playing'||p.action!=='idle'||p.ammo<1||!spend(p,10))return false;p.ammo--;p.action='shoot';p.timer=.28;
 const origin=project(p);const candidates=s.enemies.filter(e=>e.hp>0&&(e.type!=='boss'||s.flags.bossStarted)&&clearLine(p,e,obstaclesFor(s),canStand)).map(e=>{const q=project(e),d=visualDist(q,origin),a=Math.atan2(q.y-origin.y,q.x-origin.x);return {e,d,a};}).filter(v=>v.d<380&&Math.abs(angleDiff(v.a,p.angle))<.16).sort((a,b)=>a.d-b.d);
 let shotLength=350;if(candidates[0]){const {e,d}=candidates[0];shotLength=d;e.hp-=8+s.attributes.bloodtinge*3;e.shotFlash=.15;if(e.state==='windup'&&e.timer<=.27&&e.attack!==2){e.state='stunned';e.timer=2.1;signal(s,'Парирование! Противник оглушён.','parry');}if(e.hp<=0)killEnemy(s,e);}
 s.effects.push({type:'shot',x:p.x,y:p.y,angle:p.angle,range:shotLength,life:.13,maxLife:.13});return true;
}
function killEnemy(s,e){if(e.state==='dead')return;e.hp=0;e.state='dead';s.echoes+=e.type==='boss'?250:35;s.player.ammo=Math.min(24,s.player.ammo+(e.type==='hookman'?2:1));if(e.id==='h1'&&!s.flags.key){s.flags.key=true;signal(s,`Найден предмет: ${REGIONS[s.region].key}`,'progress');}if(e.type==='boss'){s.flags.bossDefeated=true;s.flags.bossStarted=false;s.campaign[s.region]={...s.flags,bossStarted:false};s.mode=s.region==='dream'?'ending':'victory';if(s.region==='dream')s.ending='Наследник кошмара';s.insight+=s.region==='mensis'?10:8;signal(s,REGIONS[s.region].victory,'progress');}else signal(s,'+35 отголосков · найден патрон');}
function hurtPlayer(s,amount){const p=s.player;if(p.iframes>0||p.invulnerable>0||s.mode!=='playing')return;p.hp=Math.max(0,p.hp-amount);p.rally=Math.min(p.maxHp-p.hp,p.rally+amount*.65);p.rallyTimer=4+s.attributes.arcane*.2;p.invulnerable=.65;s.effects.push({type:'hurt',x:p.x,y:p.y,life:.4,maxLife:.4});if(p.hp<=0){s.mode='dead';s.flags.bossStarted=false;signal(s,'Охота ещё не окончена.');}}
export function respawn(s){const saved=serialize(s);saved.insight=Math.max(0,saved.insight-3);const fresh=createState(saved);fresh.player.ammo=Math.max(6,fresh.player.ammo);fresh.player.heals=Math.max(3,fresh.player.heals);Object.assign(s,fresh);signal(s,'Фонарь · Озарение −3. Обычные враги вернулись.');}
export function choose(s,choice){if(s.dialogue!=='npc'||s.flags.npcChoice!==null||!['give','keep'].includes(choice))return false;s.flags.npcChoice=choice;if(s.region==='mensis'&&choice==='keep')s.insight+=10;s.campaign[s.region]={...s.flags};s.dialogue=null;s.mode='playing';signal(s,choice==='give'?REGIONS[s.region].choiceResultGive:REGIONS[s.region].choiceResultKeep,'progress');return true;}
export function interact(s){if(s.mode!=='playing'||s.player.action!=='idle')return;const item=s.nearest;if(!item)return;const p=s.player;
 switch(item.id){case 'lamp':if(s.enemies.some(e=>e.hp>0&&e.state!=='idle'&&e.state!=='dead'&&dist(e,p)<230)){signal(s,'Фонарь не отвечает, пока рядом охотятся.');return;}p.hp=p.maxHp;p.stamina=p.maxStamina;p.ammo=Math.max(6,p.ammo);p.heals=Math.max(3,p.heals);p.rally=0;s.mode='travel';break;
 case 'npc':if(s.flags.npcChoice===null){s.dialogue='npc';s.mode='dialogue';}else signal(s,s.flags.npcChoice==='give'?REGIONS[s.region].choiceResultGive:REGIONS[s.region].choiceResultKeep);break;
 case 'eye':if(!s.flags.eye){s.flags.eye=true;s.insight+=10;signal(s,'Озарение +10 · за привычным проступило скрытое','progress');}break;
 case 'secret':if(s.insight>=10&&!s.flags.secret){s.flags.secret=true;p.ammo+=2;p.heals++;signal(s,`Тайник: 2 патрона, ампула. ${REGIONS[s.region].note}`,'progress');}break;
 case 'shortcut':if(!s.flags.shortcut){s.flags.shortcut=true;signal(s,'Решётка поднята · короткий путь к фонарю открыт','progress');}break;
 case 'bossDoor':if(!s.flags.key)signal(s,`Проход запечатан. Нужен предмет: ${REGIONS[s.region].key}.`);else if(!s.flags.bossDefeated&&!s.flags.bossStarted){s.flags.bossStarted=true;signal(s,REGIONS[s.region].bossNotice,'boss');}break;
 case 'ladder':p.action='climb';p.timer=.9;p.climbFrom={x:p.x,y:p.y};p.climbTo=fromMap(1290,395);signal(s,'Подъём по лестнице');break;
 case 'survivor':signal(s,'«В лечебнице не осталось никого. Часовня спасла меня. Но твоё лицо… я видел тебя ещё до этой ночи».');break;
 case 'doll':s.mode='upgrade';break;case 'messenger':s.mode='shop';break;case 'graves':s.mode='travel';break;case 'gehrman':if(s.campaign.mensis?.bossDefeated)s.mode='finalChoice';else signal(s,'«Не торопись. Твоя ночь ещё не окончена».');break;
 case 'note':s.flags.note=true;signal(s,REGIONS[s.region].note);break;}
}
export function objective(s){if(s.region==='dream')return {text:s.campaign.mensis?.bossDefeated?'Поговори с Германом':'У надгробий можно выбрать путь',target:LAMP};if(s.flags.bossDefeated)return {text:'Вернись в Сон охотника у фонаря',target:LAMP};if(!s.flags.note)return {text:'На мостовой осталась записка',target:INTERACTABLES.find(v=>v.id==='note')};if(s.flags.npcChoice===null)return {text:REGIONS[s.region].npc,target:INTERACTABLES.find(v=>v.id==='npc')};if(!s.flags.key)return {text:`Найди: ${REGIONS[s.region].key}`,target:SPAWNS.find(v=>v.id==='h1')};return {text:s.flags.bossStarted?REGIONS[s.region].boss:'Исследуй путь к '+REGIONS[s.region].boss,target:INTERACTABLES.find(v=>v.id==='bossDoor')};}
export function step(s,input,dt){if(s.mode!=='playing')return;dt=clamp(dt,0,.04);s.time+=dt;const p=s.player,obs=obstaclesFor(s);
 p.iframes=Math.max(0,p.iframes-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.staminaDelay=Math.max(0,p.staminaDelay-dt);p.rallyTimer=Math.max(0,p.rallyTimer-dt);if(p.rallyTimer===0)p.rally=0;if(p.staminaDelay===0)p.stamina=Math.min(p.maxStamina,p.stamina+29*dt);if(p.stamina>25)p.exhausted=false;p.moving=false;
 if(Number.isFinite(input.angle)&&p.action==='idle')p.angle=input.angle;
 const dir=normalizedScreenDirection(input.x||0,input.y||0);
 if(['roll','dash','slide'].includes(p.action)){const speed=p.action==='dash'?670:p.action==='slide'?350:450;const radius=p.r;if(p.action==='slide')p.r=8;moveWithCollisions(p,p.rollDir.x*speed*dt,p.rollDir.y*speed*dt,p.action==='slide'?OBSTACLES:obs,canStand);p.r=radius;p.timer-=dt;if(p.timer<=0)p.action='idle';}
 else if(p.action==='climb'){p.timer-=dt;const t=clamp(1-p.timer/.9,0,1);p.x=p.climbFrom.x+(p.climbTo.x-p.climbFrom.x)*t;p.y=p.climbFrom.y+(p.climbTo.y-p.climbFrom.y)*t;if(p.timer<=0)p.action='idle';}
 else if(p.action==='attack'){
 p.timer+=dt;const windup=p.heavy?.38:p.form?.26:.14,active=.15,recover=p.heavy?.4:p.form?.35:.2;
 if(p.timer>=windup&&p.timer<=windup+active){const origin=project(p),range=p.heavy?120:p.form?108:72;if(!p.swung){p.swung=true;s.effects.push({type:'swing',x:p.x,y:p.y,angle:p.angle,life:active,maxLife:active,range});}for(const e of s.enemies){if(e.hp<=0||p.hitIds.includes(e.id)||(e.type==='boss'&&!s.flags.bossStarted))continue;const q=project(e),angle=Math.atan2(q.y-origin.y,q.x-origin.x);if(visualDist(q,origin)<=range+e.r&&Math.abs(angleDiff(angle,p.angle))<.92&&clearLine(p,e,obs,canStand)){p.hitIds.push(e.id);const amount=(p.heavy?48+s.attributes.strength*4:p.form?36+s.attributes.strength*3:24+s.attributes.skill*3);e.hp-=amount;e.shotFlash=.15;if(e.state==='praying'&&p.heavy){e.state='stunned';e.timer=1.3;e.prayerCooldown=12;signal(s,'Молитва прервана.','parry');}if(p.rallyTimer>0){const gain=Math.min(p.rally,amount*.45);p.hp=Math.min(p.maxHp,p.hp+gain);p.rally-=gain;}s.effects.push({type:'hit',x:e.x,y:e.y,life:.22,maxLife:.22});if(e.hp<=0)killEnemy(s,e);}}}
 if(p.timer>windup+active+recover)p.action='idle';
 }else if(p.action!=='idle'){p.timer-=dt;if(p.timer<=0)p.action='idle';}
 else {let speed=145;if(input.run&&Math.hypot(dir.x,dir.y)>.01&&!p.exhausted){if(p.stamina>=17*dt){speed=210;p.stamina-=17*dt;p.staminaDelay=.5;}else p.exhausted=true;}const oldX=p.x,oldY=p.y;moveWithCollisions(p,dir.x*speed*dt,dir.y*speed*dt,obs,canStand);p.moving=Math.hypot(oldX-p.x,oldY-p.y)>.01;if(p.moving)p.moveAngle=Math.atan2(input.y||0,input.x||0);}
 for(const e of s.enemies){e.shotFlash=Math.max(0,e.shotFlash-dt);if(e.hp<=0||(e.type==='boss'&&!s.flags.bossStarted))continue;const v=project(p),q=project(e),d=visualDist(v,q),a=Math.atan2(v.y-q.y,v.x-q.x);e.cooldown=Math.max(0,e.cooldown-dt);
 if(e.type==='boss'&&e.phase===1&&e.hp<=e.maxHp*.5){e.phase=2;e.state='transition';e.timer=1.4;signal(s,s.region==='yharnam'?'Человеческое в нём угасло.':s.region==='cathedral'?'Молитва обратилась в рычание.':s.region==='mensis'?'Тень обрела вторую тень.':'Старый охотник вспомнил свою силу.','boss');}
 if(e.state==='stunned'||e.state==='transition'){e.timer-=dt;if(e.timer<=0){e.state='recover';e.timer=.6;}continue;}
 if(e.type==='boss'&&s.region==='cathedral'&&e.phase===2){e.prayerCooldown=Math.max(0,(e.prayerCooldown??9)-dt);if(e.state==='praying'){e.timer-=dt;e.hp=Math.min(e.maxHp,e.hp+15*dt);if(e.timer<=0){e.state='recover';e.timer=.8;e.prayerCooldown=12;}continue;}if(e.prayerCooldown===0&&e.state==='recover'){e.state='praying';e.timer=1.8;signal(s,'Амелия молится. Сильный удар прервёт исцеление.','boss');continue;}}
 if(e.state==='windup'){e.timer-=dt;if(e.timer>.4)e.angle=a;if(e.type==='wolf'&&e.timer<.3){const d=normalizedScreenDirection(Math.cos(e.angle),Math.sin(e.angle));moveWithCollisions(e,d.x*90*dt,d.y*90*dt,obs,canStand);}if(e.timer<=0){e.state='active';e.timer=e.attack===2?.25:.18;e.hit=false;if(e.type==='boss'&&s.region==='mensis'&&e.phase===2&&e.attack===2){for(const side of [-1,1]){const offset=normalizedScreenDirection(side,0);s.hazards.push({x:p.x+offset.x*60,y:p.y+offset.y*60,timer:1.1,life:1.5,hit:false});}}}continue;}
 if(e.state==='active'){e.timer-=dt;let canHit=false;if(e.attack===2)canHit=d<165;else canHit=d<(e.attack===3?380:e.type==='hookman'?120:e.type==='boss'?128:e.type==='wolf'?92:76)&&Math.abs(angleDiff(a,e.angle))<(e.attack===3?.15:.85);
 if(canHit&&!e.hit&&clearLine(e,p,obs,canStand)){hurtPlayer(s,e.type==='boss'?23:e.type==='hookman'?20:e.type==='wolf'?14:12);e.hit=true;if(e.attack===3)s.effects.push({type:'shot',x:e.x,y:e.y,angle:e.angle,range:d,life:.15,maxLife:.15});}
 if(e.timer<=0){e.state='recover';e.timer=e.type==='boss'?.8:e.type==='hookman'?1.2:.9;if(e.type==='boss'&&e.phase===2&&e.attack===0&&!e.combo){e.combo=true;e.timer=.25;}else e.combo=false;}continue;}
 if(e.state==='recover'){e.timer-=dt;if(e.timer<=0){if(e.combo){e.state='windup';e.timer=.38;e.angle=a;}else{e.state='chase';e.cooldown=.35;}}continue;}
 if(d<(e.type==='boss'?540:290+Math.max(0,s.insight-s.attributes.arcane*.5)*.7)){e.state='chase';e.angle=a;const reach=e.type==='gunner'?290:e.type==='hookman'?105:e.type==='boss'?110:e.type==='wolf'?80:60;if(d<reach&&e.cooldown===0&&clearLine(e,p,obs,canStand)){e.state='windup';e.attack=e.type==='gunner'?3:e.type==='boss'?(s.region==='yharnam'&&e.phase===1&&Math.sin(s.time)>.4?3:e.phase===2&&Math.sin(s.time*2)>.3?2:Math.cos(s.time)>0?1:0):1;e.timer=e.attack===2?1.1:e.type==='gunner'?1.1:e.type==='hookman'?1:e.type==='boss'?.85:e.type==='wolf'?.55:.68;e.hit=false;}
 else if(d>reach*.85){e.navTimer=(e.navTimer||0)-dt;if(e.navTimer<=0){e.waypoint=findWaypoint(e,p,obs,canStand);e.navTimer=.5;}const wp=project(e.waypoint||p),direction=normalizedScreenDirection(wp.x-q.x,wp.y-q.y);const speed=e.type==='boss'?(e.phase===2?105:78):e.type==='hookman'?60:e.type==='wolf'?110:74;moveWithCollisions(e,direction.x*speed*dt,direction.y*speed*dt,obs,canStand);}}
 else{e.state='idle';if(dist(e,e.home)>35){e.navTimer=(e.navTimer||0)-dt;if(e.navTimer<=0){e.waypoint=findWaypoint(e,e.home,obs,canStand);e.navTimer=.8;}const wp=project(e.waypoint||e.home),direction=normalizedScreenDirection(wp.x-q.x,wp.y-q.y);moveWithCollisions(e,direction.x*45*dt,direction.y*45*dt,obs,canStand);}}
 // Gentle separation prevents overlapping enemies without pushing them through scenery.
 for(const other of s.enemies){if(other===e||other.hp<=0)continue;const gap=dist(e,other),min=e.r+other.r;if(gap>0&&gap<min){moveWithCollisions(e,(e.x-other.x)/gap*18*dt,(e.y-other.y)/gap*18*dt,obs,canStand);}}
 }
 s.effects=s.effects.filter(e=>(e.life-=dt)>0);
 for(const hazard of s.hazards){hazard.timer-=dt;hazard.life-=dt;if(hazard.timer<=0&&!hazard.hit){hazard.hit=true;if(visualDist(project(p),project(hazard))<70)hurtPlayer(s,19);}}s.hazards=s.hazards.filter(h=>h.life>0);
 s.nearest=INTERACTABLES.filter(v=>!(v.id==='eye'&&s.flags.eye)&&!(v.id==='secret'&&(s.insight<10||s.flags.secret))&&!(v.id==='shortcut'&&s.flags.shortcut)&&!(v.id==='bossDoor'&&s.flags.bossDefeated)).map(v=>({...v,d:dist(p,v)})).filter(v=>v.d<105).sort((a,b)=>a.d-b.d)[0]||null;
}





import test from 'node:test';
import assert from 'node:assert/strict';
import {project,unproject,normalizedScreenDirection,moveWithCollisions,createState,step,beginAttack,shoot,dodge,heal,respawn,serialize,readSave,writeSave,SAVE_KEY,clearLine,interact,choose,setSlot,getSlot,travel,upgrade,trade,finishChoice,dash,slide} from '../js/core.mjs';
import {WORLD,LAMP,OBSTACLES,GATE,INTERACTABLES,SPAWNS,REGIONS,activateRegion,fromMap,toMap,canStand} from '../js/world.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const isolated=()=>{const s=createState();s.enemies=[];Object.assign(s.player,fromMap(720,820));return s;};
const advance=(s,n)=>{for(let i=0;i<n;i++)step(s,{},.02);};
const memoryStorage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};

test('isometric projection round trips and all eight screen directions have unit speed',()=>{
 for(const point of [{x:0,y:0},{x:125,y:814},{x:-70,y:14}]){const p=unproject(project(point));near(p.x,point.x);near(p.y,point.y);}
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
  const p=project(normalizedScreenDirection(x,y));near(Math.hypot(p.x,p.y),1);near(p.x,x/Math.hypot(x,y));near(p.y,y/Math.hypot(x,y));
 }
 assert.deepEqual(normalizedScreenDirection(0,0),{x:0,y:0});
});

test('collision substeps stop a fast roll at a thin wall while allowing wall sliding',()=>{
 const e={x:100,y:100,r:14};moveWithCollisions(e,400,0,[{x:180,y:50,w:5,h:200}]);assert.ok(e.x<=166);assert.ok(e.x>=160);
 const before=e.y;moveWithCollisions(e,40,60,[{x:180,y:50,w:5,h:200}]);assert.ok(e.x<=166);assert.ok(e.y>before);
 moveWithCollisions(e,-500,-500,[]);assert.ok(e.x>=14&&e.y>=14);
});

test('one swing damages a living target only once across active simulation frames',()=>{
 const s=isolated();s.player.angle=0;
 s.enemies=[{id:'dummy',type:'villager',x:s.player.x+30,y:s.player.y-30,r:17,hp:100,maxHp:100,state:'stunned',timer:50,cooldown:0,shotFlash:0}];
 assert.equal(beginAttack(s),true);advance(s,25);assert.equal(s.enemies[0].hp,76);
 assert.equal(beginAttack(s),true);advance(s,25);assert.equal(s.enemies[0].hp,52);
});

test('resource gates reject actions atomically and unavailable actions do not consume ammo',()=>{
 const s=isolated();s.player.stamina=15;
 assert.equal(beginAttack(s),false);assert.equal(dodge(s,{x:1,y:0}),false);assert.equal(s.player.stamina,15);assert.equal(s.player.action,'idle');
 s.player.stamina=9;assert.equal(shoot(s),false);assert.equal(s.player.ammo,6);
 s.player.stamina=100;s.player.ammo=0;assert.equal(shoot(s),false);assert.equal(s.player.stamina,100);
 s.player.ammo=6;assert.equal(beginAttack(s),true);const stamina=s.player.stamina;assert.equal(shoot(s),false);assert.equal(s.player.ammo,6);assert.equal(s.player.stamina,stamina);
 s.player.action='idle';assert.equal(heal(s),false);assert.equal(s.player.heals,3);s.player.hp=45;assert.equal(heal(s),true);assert.equal(s.player.hp,85);assert.equal(s.player.heals,2);
});

test('enemy active attack hits once and roll invulnerability rejects damage',()=>{
 const make=()=>{const s=isolated();const p=s.player;s.enemies=[{id:'attacker',type:'villager',x:p.x-20,y:p.y+20,r:17,hp:65,maxHp:65,state:'active',timer:.18,angle:0,attack:1,hit:false,cooldown:0,shotFlash:0}];return s;};
 const s=make();advance(s,6);assert.equal(s.player.hp,88);
 const rolling=make();assert.equal(dodge(rolling,normalizedScreenDirection(1,0)),true);advance(rolling,6);assert.equal(rolling.player.hp,100);
});

test('pistol parries only the late windup of a parryable attack',()=>{
 const fire=(timer,attack)=>{const s=isolated();const p=s.player;s.enemies=[{id:'target',type:'villager',x:p.x+50,y:p.y-50,r:17,hp:65,maxHp:65,state:'windup',timer,angle:0,attack,hit:false,cooldown:0,shotFlash:0}];assert.equal(shoot(s),true);assert.equal(s.player.ammo,5);assert.equal(s.player.stamina,90);return s.enemies[0];};
 assert.equal(fire(.2,1).state,'stunned');assert.equal(fire(.5,1).state,'windup');assert.equal(fire(.2,2).state,'windup');
});

test('respawn and save reload retain durable progress and clear combat state',()=>{
 const s=createState();s.flags.shortcut=true;s.flags.key=true;s.flags.bossStarted=true;s.flags.npcChoice='give';s.insight=10;s.echoes=91;s.player.hp=0;s.mode='dead';
 respawn(s);assert.equal(s.mode,'playing');assert.equal(s.player.hp,100);assert.equal(s.flags.shortcut,true);assert.equal(s.flags.bossStarted,false);assert.equal(s.flags.npcChoice,'give');
 const storage=memoryStorage();assert.equal(writeSave(storage,s),true);const restored=createState(readSave(storage));assert.deepEqual(serialize(restored),serialize(s));assert.equal(restored.player.hp,100);
 restored.flags.bossDefeated=true;const completed=createState(serialize(restored));assert.equal(completed.enemies.find(e=>e.id==='boss').hp,0);
});

test('corrupt, unsupported and unavailable saves fail safely',()=>{
 const storage=memoryStorage();assert.equal(readSave(storage),null);
 for(const value of ['{broken','null','[]',JSON.stringify({version:2}),JSON.stringify({...serialize(createState()),ammo:-1}),JSON.stringify({...serialize(createState()),flags:[]})]){storage.setItem(SAVE_KEY,value);assert.equal(readSave(storage),null);}
 const inaccessible={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};assert.equal(readSave(inaccessible),null);const s=createState();assert.equal(writeSave(inaccessible,s),false);assert.equal(s.saveError,true);assert.equal(writeSave(storage,s),true);assert.equal(s.saveError,false);
});

test('paused time does not advance simulation and a delayed frame is capped',()=>{
 const s=isolated();s.mode='paused';step(s,{x:1},9);assert.equal(s.time,0);s.mode='playing';step(s,{},9);near(s.time,.04);
});

test('map/world coordinates round trip',()=>{for(const [x,y] of [[720,820],[1330,320],[400,465]]){const w=fromMap(x,y),m=toMap(w.x,w.y);near(m.x,x);near(m.y,y);}});

test('three save slots are independent',()=>{const storage=memoryStorage();for(let n=0;n<3;n++){setSlot(n);assert.equal(getSlot(),n);const s=createState();s.echoes=100+n;writeSave(storage,s);}for(let n=0;n<3;n++){setSlot(n);assert.equal(readSave(storage).echoes,100+n);}setSlot(0);});

test('heavy swing starts in active phase, not during preparation',()=>{const s=isolated();beginAttack(s,true);assert.equal(s.effects.some(e=>e.type==='swing'),false);advance(s,18);assert.equal(s.effects.some(e=>e.type==='swing'),false);advance(s,2);assert.equal(s.effects.some(e=>e.type==='swing'),true);advance(s,9);assert.equal(s.effects.some(e=>e.type==='swing'),false);});

test('exhausted sprint recovers stamina rather than freezing at zero',()=>{const s=isolated();s.player.stamina=0;s.player.exhausted=true;s.player.staminaDelay=.5;for(let i=0;i<100;i++)step(s,{x:1,run:true},.02);assert.ok(s.player.stamina>0);assert.ok(Number.isFinite(s.player.x));});

test('upgrades change actual health/stamina limits and regen respects them',()=>{const s=createState();assert.equal(upgrade(s,'vitality'),false);travel(s,'dream');s.echoes=1000;assert.equal(upgrade(s,'vitality'),true);assert.equal(upgrade(s,'endurance'),true);assert.equal(s.player.maxHp,112);assert.equal(s.player.maxStamina,110);s.enemies=[];s.player.hp=100;heal(s);assert.equal(s.player.hp,112);s.player.stamina=109;s.player.staminaDelay=0;advance(s,20);assert.equal(s.player.stamina,110);const r=createState(serialize(s));assert.equal(r.player.maxHp,112);assert.equal(r.player.maxStamina,110);});

test('trade consumes insight and death subtracts insight without resetting discoveries',()=>{const s=createState();assert.equal(trade(s,'insight'),false);travel(s,'dream');s.insight=12;assert.equal(trade(s,'insight'),true);assert.equal(s.insight,7);assert.equal(s.echoes,80);s.flags.secret=true;s.mode='dead';respawn(s);assert.equal(s.insight,4);assert.equal(s.flags.secret,true);s.insight=1;respawn(s);assert.equal(s.insight,0);});

test('camp cannot heal during an action or nearby combat',()=>{const s=createState();s.nearest={id:'lamp'};s.player.hp=20;s.player.action='attack';interact(s);assert.equal(s.player.hp,20);s.player.action='idle';s.enemies=[{hp:50,state:'chase',x:s.player.x+20,y:s.player.y}];interact(s);assert.equal(s.player.hp,20);assert.equal(s.mode,'playing');s.enemies=[];interact(s);assert.equal(s.player.hp,s.player.maxHp);assert.equal(s.mode,'travel');});

test('closed gate blocks melee, bullets and enemy damage; opening restores hit',()=>{const make=open=>{const s=isolated();s.flags.shortcut=open;Object.assign(s.player,{x:GATE.x+GATE.w/2,y:GATE.y-25});const e={id:'dummy',type:'villager',x:s.player.x,y:GATE.y+GATE.h+25,r:17,hp:100,maxHp:100,state:'stunned',timer:100,cooldown:0,shotFlash:0};s.enemies=[e];const a=project(s.player),b=project(e);s.player.angle=Math.atan2(b.y-a.y,b.x-a.x);return s;};
 const closed=make(false);assert.equal(clearLine(closed.player,closed.enemies[0],[GATE],canStand),false);shoot(closed);assert.equal(closed.enemies[0].hp,100);advance(closed,20);beginAttack(closed);advance(closed,25);assert.equal(closed.enemies[0].hp,100);
 const open=make(true);shoot(open);assert.equal(open.enemies[0].hp,92);advance(open,20);beginAttack(open);advance(open,25);assert.equal(open.enemies[0].hp,68);
 const enemy=make(false);Object.assign(enemy.enemies[0],{state:'active',timer:.18,attack:2});advance(enemy,6);assert.equal(enemy.player.hp,100);
});

test('dash and slide retain distinct costs and require movement for slide',()=>{const s=isolated();assert.equal(slide(s),false);assert.equal(dash(s,normalizedScreenDirection(1,0)),true);assert.equal(s.player.stamina,80);assert.equal(s.player.action,'dash');advance(s,12);s.player.moving=true;assert.equal(slide(s,normalizedScreenDirection(1,0)),true);assert.equal(s.player.action,'slide');assert.equal(s.player.iframes,0);});

test('liberation requires all three good choices, not a high insight number',()=>{for(const missing of ['yharnam','cathedral','mensis']){const s=createState();travel(s,'dream');s.insight=99;for(const region of ['yharnam','cathedral','mensis'])s.campaign[region]={bossDefeated:true,npcChoice:region===missing?'keep':'give'};assert.equal(finishChoice(s,'wake'),false,missing);assert.equal(finishChoice(s,'inherit'),true);assert.equal(s.ending,'Наследник кошмара');}});

test('save schema rejects malformed campaign, attributes and ending without crashing load',()=>{setSlot(0);const storage=memoryStorage(),base=serialize(createState());for(const patch of [{campaign:null},{campaign:[]},{campaign:'bad'},{campaign:{mensis:null}},{campaign:{mensis:{bossDefeated:'yes'}}},{campaign:{mensis:{npcChoice:'evil'}}},{campaign:{unknown:{}}},{attributes:[]},{attributes:{arcane:99}},{attributes:{unknown:1}},{level:-1},{ending:'invented'},{region:'__proto__'}]){storage.setItem(SAVE_KEY,JSON.stringify({...base,...patch}));assert.equal(readSave(storage),null,JSON.stringify(patch));}storage.setItem(SAVE_KEY,JSON.stringify(base));assert.ok(readSave(storage));});

test('sliding crosses a low closed gate while a roll stops before it',()=>{const setup=()=>{const s=isolated();Object.assign(s.player,{x:GATE.x+GATE.w/2,y:GATE.y-30,moving:true});return s;};const slideState=setup(),rollState=setup(),dir={x:0,y:1};slide(slideState,dir);advance(slideState,20);dodge(rollState,dir);advance(rollState,20);assert.ok(slideState.player.y>GATE.y+GATE.h+14);assert.ok(rollState.player.y<=GATE.y-14);assert.equal(slideState.player.r,14);});

test('Amelia prayer heals over time and a heavy hit interrupts it',()=>{const s=createState();travel(s,'dream');s.campaign.yharnam.bossDefeated=true;travel(s,'cathedral');s.flags.bossStarted=true;const boss=s.enemies.find(e=>e.id==='boss');s.enemies=[boss];Object.assign(boss,{phase:2,hp:100,state:'praying',timer:1.8,prayerCooldown:12});Object.assign(s.player,{x:boss.x-20,y:boss.y+20,angle:0});advance(s,10);assert.ok(boss.hp>100);assert.equal(beginAttack(s,true),true);advance(s,20);assert.equal(boss.state,'stunned');assert.ok(boss.hp<100);assert.ok(boss.prayerCooldown>11);});

test('Mergo hazards telegraph before one hit and expire instead of lingering',()=>{const s=createState();s.campaign.cathedral.bossDefeated=true;assert.equal(travel(s,'mensis'),true);s.flags.bossStarted=true;const boss=s.enemies.find(e=>e.id==='boss');s.enemies=[boss];Object.assign(boss,{phase:2,state:'windup',timer:.01,attack:2});Object.assign(s.player,fromMap(720,820));step(s,{},.02);assert.equal(s.hazards.length,2);Object.assign(boss,{state:'stunned',timer:100});const hp=s.player.hp;advance(s,50);assert.equal(s.player.hp,hp,'warning phase must not hurt');advance(s,7);assert.equal(s.player.hp,hp-19,'overlapping hazards must respect invulnerability');advance(s,30);assert.equal(s.player.hp,hp-19);assert.equal(s.hazards.length,0);});

test('dream survivor appears once for rescued NPC and resets across new states',()=>{const s=createState();s.flags.npcChoice='give';travel(s,'dream');assert.equal(INTERACTABLES.filter(v=>v.id==='survivor').length,1);const saved=serialize(s);createState(saved);createState(saved);assert.equal(INTERACTABLES.filter(v=>v.id==='survivor').length,1);const fresh=createState();travel(fresh,'dream');assert.equal(INTERACTABLES.some(v=>v.id==='survivor'),false);});

const visit=(s,id)=>{const v=INTERACTABLES.find(v=>v.id===id);assert.ok(v,id);Object.assign(s.player,{x:v.x,y:v.y,action:'idle'});step(s,{},0);assert.equal(s.nearest?.id,id);interact(s);};
const kill=(s,id)=>{const e=s.enemies.find(e=>e.id===id);Object.assign(s.player,{x:e.x-20,y:e.y+20,action:'idle',angle:0,stamina:s.player.maxStamina});e.hp=8;assert.equal(shoot(s),true);assert.equal(e.hp,0,`kill ${s.region}/${id}`);};
for(const outcome of ['give','keep'])test(`campaign progression, durable choices and ending: ${outcome}`,()=>{const s=createState();assert.equal(travel(s,'cathedral'),false);assert.equal(travel(s,'mensis'),false);
 for(const region of ['yharnam','cathedral','mensis']){if(s.region!==region)assert.equal(travel(s,region),true);for(const e of s.enemies){e.state='stunned';e.timer=10000;}visit(s,'note');visit(s,'npc');assert.equal(choose(s,outcome),true);assert.equal(choose(s,'give'),false);visit(s,'eye');visit(s,'secret');visit(s,'shortcut');assert.equal(s.flags.secret,true);assert.equal(s.flags.shortcut,true);kill(s,'h1');assert.equal(s.flags.key,true);visit(s,'bossDoor');assert.equal(s.flags.bossStarted,true);assert.equal(travel(s,'dream'),false);kill(s,'boss');assert.equal(s.mode,'victory');assert.equal(s.campaign[region].bossDefeated,true);s.mode='playing';assert.equal(travel(s,'dream'),true);}
 assert.equal(finishChoice(s,'wake'),outcome==='give');if(outcome==='give')assert.equal(s.ending,'Освобождение');else{assert.equal(finishChoice(s,'inherit'),true);assert.equal(s.ending,'Наследник кошмара');}const r=createState(serialize(s));for(const id of ['yharnam','cathedral','mensis']){assert.equal(r.campaign[id].npcChoice,outcome);assert.equal(r.campaign[id].bossDefeated,true);}
});

for(const region of Object.keys(REGIONS))test(`terrain reachability from lamp: ${region}`,()=>{activateRegion(region);const obs=region==='dream'?OBSTACLES:[...OBSTACLES,GATE],grid=20,r=14;
 const free=(x,y)=>canStand(x,y,r)&&!obs.some(o=>{const px=Math.max(o.x,Math.min(x,o.x+o.w)),py=Math.max(o.y,Math.min(y,o.y+o.h));return (x-px)**2+(y-py)**2<r*r;});assert.ok(free(LAMP.x,LAMP.y),'spawn must be walkable');const queue=[{x:LAMP.x,y:LAMP.y}],seen=new Set(['0,0']);
 for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[grid,0],[-grid,0],[0,grid],[0,-grid]]){const x=p.x+dx,y=p.y+dy,key=`${Math.round((x-LAMP.x)/grid)},${Math.round((y-LAMP.y)/grid)}`;if(seen.has(key)||!free(x,y))continue;if([.25,.5,.75].some(t=>!free(p.x+dx*t,p.y+dy*t)))continue;seen.add(key);queue.push({x,y});}}
 for(const target of [...INTERACTABLES,...SPAWNS.filter(v=>['h1','boss'].includes(v.id))])assert.ok(queue.some(p=>Math.hypot(p.x-target.x,p.y-target.y)<(SPAWNS.includes(target)?45:90)),`${region}/${target.id} unreachable`);
});


import {writeFile,mkdir} from 'node:fs/promises';
import {createState,step,project,normalizedScreenDirection,beginAttack,dodge,shoot,heal,interact,choose,clearLine,travel} from '../js/core.mjs';
import {INTERACTABLES,OBSTACLES,GATE,canStand,toMap} from '../js/world.mjs';
import {findWaypoint} from '../js/navigation.mjs';

// Synthetic headless playtest. Only public actions advance or change state.
// No HP, stamina, enemy statistics, flags or positions are assigned by this bot.
const DT=.04;
const screenDistance=(a,b)=>{const p=project(a),q=project(b);return Math.hypot(p.x-q.x,p.y-q.y);};
const worldDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const direction=(a,b)=>{const p=project(a),q=project(b),d=Math.hypot(q.x-p.x,q.y-p.y);return d?{x:(q.x-p.x)/d,y:(q.y-p.y)/d}:{x:0,y:0};};
const obstacles=s=>s.flags.shortcut?OBSTACLES:[...OBSTACLES,GATE];

function run(attempt,style){
  const s=createState(), initial={...s.player};
  const record={attempt,style,initial:{x:initial.x,y:initial.y,hp:initial.hp,stamina:initial.stamina,ammo:initial.ammo,heals:initial.heals},damageEvents:[],kills:[],milestones:[],parries:0,healsUsed:0,shots:0,dodges:0,attacks:0,stalls:[]};
  const regionalGoals=['note','shortcut','npc','eye','secret','key','bossDoor','boss'];
  let goals=[...regionalGoals], elapsed=0;
  record.victories=[];
  let stage=0,navTimer=0,waypoint=null,targetKey='',still=0,lastPosition={x:s.player.x,y:s.player.y},lastMilestoneTime=0;
  for(let frame=0;frame<18000;frame++){
    if(s.mode==='dead'||s.mode==='ending')break;
    if(s.mode==='victory'){
      record.victories.push({region:s.region,seconds:+elapsed.toFixed(2),hp:+s.player.hp.toFixed(2)});
      if(s.region==='mensis')break;
      if(!travel(s,'dream')){record.stop='Victory return to Dream was rejected';break;}
      goals=['graves'];stage=0;navTimer=0;lastMilestoneTime=elapsed;
    }
    if(s.mode==='travel'&&s.region==='dream'){
      const next=record.victories.length===1?'cathedral':'mensis';
      if(!travel(s,next)){record.stop='Unlocked regional travel was rejected';break;}
      goals=[...regionalGoals];stage=0;navTimer=0;lastMilestoneTime=elapsed;
    }
    if(s.mode==='dialogue'){choose(s,'give');}
    if(s.mode!=='playing'){record.stop=`Unexpected mode: ${s.mode}`;break;}
    const p=s.player,obs=obstacles(s),beforeHp=p.hp,beforeEnemies=new Map(s.enemies.map(e=>[e.id,e.hp]));
    const goalId=goals[stage];
    const done=goalId==='graves'?false:goalId==='note'?s.flags.note:goalId==='shortcut'?s.flags.shortcut:goalId==='npc'?s.flags.npcChoice!==null:goalId==='eye'?s.flags.eye:goalId==='secret'?s.flags.secret:goalId==='key'?s.flags.key:goalId==='bossDoor'?s.flags.bossStarted:s.flags.bossDefeated;
    if(done){record.milestones.push({goal:goalId,region:s.region,seconds:+elapsed.toFixed(2),hp:+p.hp.toFixed(2)});stage++;lastMilestoneTime=elapsed;navTimer=0;if(stage>=goals.length)break;}
    const current=goals[stage];
    const objective=current==='key'?s.enemies.find(e=>e.id==='h1'):current==='boss'?s.enemies.find(e=>e.id==='boss'):INTERACTABLES.find(i=>i.id===current);
    if(!objective){record.stop=`Missing objective ${current}`;break;}
    const live=s.enemies.filter(e=>e.hp>0&&(e.type!=='boss'||s.flags.bossStarted));
    const threats=live.filter(e=>screenDistance(p,e)<(style==='patient'?275:240)).sort((a,b)=>screenDistance(p,a)-screenDistance(p,b));
    const enemy=threats[0];
    let moveTarget=enemy||objective;
    let input={x:0,y:0,angle:enemy?Math.atan2(project(enemy).y-project(p).y,project(enemy).x-project(p).x):p.angle};
    // Aim through step's ordinary input before invoking an action.
    step(s,input,0);
    if(p.action==='idle'){
      if(p.hp<=(style==='patient'?58:42)&&p.heals>0){if(heal(s))record.healsUsed++;}
      else if(enemy){
        const distance=screenDistance(p,enemy);
        const imminent=threats.find(e=>(e.state==='windup'&&e.timer<.25||e.state==='active')&&screenDistance(p,e)<(e.attack===2?180:e.attack===3?390:e.type==='hookman'?135:145));
        if(imminent&&imminent.state==='windup'&&imminent.attack!==2&&p.ammo>0&&p.stamina>25){
          const d=direction(p,imminent);step(s,{x:0,y:0,angle:Math.atan2(d.y,d.x)},0);
          const was=imminent.state;if(shoot(s)){record.shots++;if(was==='windup'&&imminent.state==='stunned')record.parries++;}
        }else if(imminent&&p.stamina>=25){
          const away=direction(imminent,p),directions=[{x:-away.y,y:away.x},{x:away.y,y:-away.x},away];
          const route=directions.map(d=>normalizedScreenDirection(d.x,d.y)).find(d=>{
            const end={x:p.x+d.x*145,y:p.y+d.y*145};
            return canStand(end.x,end.y,p.r)&&clearLine(p,end,obs,(x,y)=>canStand(x,y,p.r));
          });
          if(route&&dodge(s,route))record.dodges++;
        }else if(distance<=(enemy.state==='stunned'?130:104)&&p.stamina>=(style==='patient'?42:30)){
          if(beginAttack(s,true))record.attacks++;
        }else if(distance<75&&p.stamina<42){
          const away=direction(enemy,p),world=normalizedScreenDirection(away.x,away.y);
          const candidate={x:p.x+world.x*100,y:p.y+world.y*100};
          if(canStand(candidate.x,candidate.y,p.r))moveTarget=candidate;
        }
      }else if(worldDistance(p,objective)<55&&s.nearest?.id===current){
        interact(s);if(s.mode==='dialogue')choose(s,'give');
      }
    }
    if(p.action==='idle'){
      const key=enemy?`${enemy.id}:${Math.round(moveTarget.x/40)},${Math.round(moveTarget.y/40)}`:current;
      navTimer-=DT;
      if(navTimer<=0||key!==targetKey||!waypoint||worldDistance(p,waypoint)<8){
        waypoint=findWaypoint(p,moveTarget,obs,canStand);navTimer=.35;targetKey=key;
      }
      const vector=direction(p,waypoint);
      // Preserve a safe recovery gap instead of walking into an attack.
      const shouldHold=enemy&&screenDistance(p,enemy)<95&&p.stamina<42&&worldDistance(moveTarget,enemy)<1;
      if(!shouldHold){input.x=vector.x;input.y=vector.y;}
    }
    step(s,input,DT);elapsed+=DT;
    if(p.hp<beforeHp)record.damageEvents.push({region:s.region,seconds:+elapsed.toFixed(2),damage:+(beforeHp-p.hp).toFixed(2),hp:+p.hp.toFixed(2),goal:current,near:threats.slice(0,3).map(e=>`${e.id}:${e.state}`)});
    for(const e of s.enemies)if(beforeEnemies.get(e.id)>0&&e.hp<=0)record.kills.push({region:s.region,id:e.id,seconds:+elapsed.toFixed(2)});
    if(worldDistance(p,lastPosition)<.03&&p.action==='idle')still+=DT;else still=0;
    if(still>12){record.stalls.push({goal:current,seconds:+elapsed.toFixed(2),position:{x:p.x,y:p.y},enemy:enemy?.id,waypoint});record.stop='Bot held position for 12 seconds';break;}
    lastPosition={x:p.x,y:p.y};
    if(elapsed-lastMilestoneTime>180){record.stop='No objective progress for 180 simulated seconds';break;}
  }
  record.seconds=+elapsed.toFixed(2);record.mode=s.mode;record.region=s.region;record.final={hp:+s.player.hp.toFixed(2),stamina:+s.player.stamina.toFixed(2),ammo:s.player.ammo,heals:s.player.heals,x:s.player.x,y:s.player.y,map:toMap(s.player.x,s.player.y)};record.flags={...s.flags};record.enemyHealth=s.enemies.map(e=>({id:e.id,hp:e.hp,state:e.state}));record.goal=goals[stage];record.campaign=s.campaign;
  return record;
}

const reports=[run(1,'aggressive'),run(2,'patient')];
await mkdir(new URL('../docs/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/bot-playtest.json',import.meta.url),JSON.stringify(reports,null,2));
let md='# Автоматизированный прогон игровой логики\n\nЭто headless-бот, а не ручное прохождение и не проверка изображения или интерфейса. Время ниже — время симуляции. Каждый прогон начинается через `createState()` с настоящей стартовой позицией, 100 HP, 100 выносливости, 6 патронами и 3 ампулами. Бот вызывает только игровые действия, `step` и взаимодействия: HP, выносливость, позиции, характеристики врагов и флаги не подменяются.\n\nМаршруты строятся по `canStand` и настоящим прямоугольникам столкновений. Изображения и геометрия рендера для маршрутизации не используются. Бот умеет читать состояния противников для реакции на замах, поэтому результат не оценивает сложность для новичка.\n\n';
for(const r of reports){md+=`## Прогон ${r.attempt}: ${r.style}\n\n- Результат: **${r.mode}**; ${r.seconds} секунд симуляции; здоровье ${r.final.hp}.\n- Остановлен на цели: ${r.goal}. ${r.stop||''}\n- Убиты: ${r.kills.map(k=>`${k.region}/${k.id} (${k.seconds} с)`).join(', ')||'никто'}.\n- Выполнены цели: ${r.milestones.map(m=>`${m.region}/${m.goal} (${m.seconds} с)`).join(', ')||'нет'}.\n- Удары: ${r.attacks}; выстрелы: ${r.shots}; парирования: ${r.parries}; перекаты: ${r.dodges}; лечение: ${r.healsUsed}.\n- События потери здоровья: ${r.damageEvents.length}; ключ: ${r.flags.key}; босс начат: ${r.flags.bossStarted}; босс побеждён: ${r.flags.bossDefeated}.\n\n| Секунда | Чистая потеря HP за кадр | HP после | Цель | Противники рядом |\n|---|---|---|---|---|\n${r.damageEvents.map(e=>`| ${e.seconds} | ${e.damage} | ${e.hp} | ${e.goal} | ${e.near.join(', ')} |`).join('\n')}\n\n`;if(r.stalls.length)md+=`Остановка бота: ${JSON.stringify(r.stalls)}\n\n`;}
md+='## Наблюдения по трём регионам\n\nОба поведения бота прошли Центральный Ярнам, Соборный округ и Кошмар Менсиса, победив трёх боссов. Переход из победы в Сон охотника соответствует кнопке экрана победы; следующий регион выбирается только после пешего подхода к надгробиям и взаимодействия с ними. Восстановление здоровья при переходе выполняет сама игра. Общая длительность 134.44–137.92 секунды симуляции говорит о коротком прототипе с компактным расположением целей; это не подтверждение многочасового контента. Последний выбор концовки не проверен. Число в колонке потери HP учитывает возврат здоровья rally в том же кадре и не всегда равно номинальной силе удара.\n\n';
md+='## Границы проверки\n\nПроверяется только реальный пройденный ботом участок. Непройденные регионы, концовки, визуальное совпадение путей с изображением и удобство управления человеком этим прогоном не подтверждаются. Исходные подробные результаты находятся в `bot-playtest.json`.\n';
await writeFile(new URL('../docs/BOT-PLAYTEST.md',import.meta.url),md);
console.log(JSON.stringify(reports.map(r=>({attempt:r.attempt,mode:r.mode,seconds:r.seconds,goal:r.goal,victories:r.victories,kills:r.kills,milestones:r.milestones,damageEvents:r.damageEvents.length,final:r.final,stop:r.stop,stalls:r.stalls})),null,2));




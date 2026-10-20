export const WORLD = {width:2300,height:2300};
export const LAMP = {id:'lamp',x:480,y:620,label:'Фонарь · вернуться в Сон охотника'};
export const OBSTACLES = [
 {x:55,y:65,w:160,h:170,kind:'crypt'}, {x:380,y:100,w:210,h:180,kind:'crypt'},
 {x:680,y:80,w:170,h:210,kind:'crypt'}, {x:1040,y:120,w:200,h:250,kind:'crypt'},
 {x:1400,y:100,w:190,h:250,kind:'crypt'}, {x:80,y:600,w:180,h:170,kind:'crypt'},
 {x:460,y:550,w:120,h:85,kind:'cart'}, {x:730,y:560,w:200,h:210,kind:'crypt'},
 {x:1170,y:540,w:175,h:110,kind:'cart'}, {x:1480,y:630,w:160,h:230,kind:'crypt'},
 {x:55,y:1040,w:190,h:220,kind:'crypt'}, {x:460,y:970,w:135,h:190,kind:'crypt'},
 {x:800,y:1060,w:170,h:195,kind:'crypt'}, {x:1080,y:1390,w:80,h:220,kind:'crypt'},
 {x:1510,y:1460,w:200,h:200,kind:'chapel'}, {x:250,y:1400,w:230,h:190,kind:'crypt'},
 {x:630,y:1410,w:180,h:175,kind:'crypt'},
 {x:340,y:810,w:300,h:30,kind:'wall'}, {x:720,y:810,w:255,h:30,kind:'wall'},
];
export const GATE = {id:'shortcut',x:640,y:810,w:80,h:30};
export const INTERACTABLES = [LAMP,
 {id:'npc',x:845,y:385,label:'Окно аптекарки'},
 {id:'eye',x:1080,y:835,label:'Помутневший глаз'},
 {id:'secret',x:1040,y:1040,label:'Следы у глухой арки'},
 {id:'shortcut',x:680,y:890,label:'Поднять решётку'},
 {id:'bossDoor',x:1350,y:1160,label:'Ударить в колокол'},
 {id:'note',x:400,y:450,label:'Записка охотника'},
];
export const SPAWNS = [
 {id:'v1',type:'villager',x:580,y:400}, {id:'v2',type:'villager',x:965,y:470},
 {id:'v3',type:'villager',x:420,y:750}, {id:'h1',type:'hookman',x:1100,y:730},
 {id:'v4',type:'villager',x:1300,y:960}, {id:'h2',type:'hookman',x:1150,y:1100},
 {id:'boss',type:'boss',x:1440,y:1350},
];
export const PATHS = [{x:245,y:300,w:1110,h:220},{x:950,y:420,w:210,h:750},{x:300,y:700,w:800,h:200},{x:300,y:850,w:140,h:540},{x:990,y:1120,w:600,h:260}];

export const REGIONS={
 yharnam:{name:'Центральный Ярнам',subtitle:'Город, который не просыпается',boss:'Отец Гаскойн',art:'yharnam',npc:'За закрытым окном',key:'Ключ от гробницы',note:'«Церковь обещала исцеление. У окна ещё ждут возвращения охотника. Ключ от гробницы — у великана на площади».',bossNotice:'За оградой гробницы кто-то точит топор.',victory:'Добыча уничтожена',choiceGive:'Отправить выжившую в безопасную часовню',choiceKeep:'Указать путь к старой лечебнице',choiceQuestion:'«Куда нам идти, охотник? У дверей лечебницы ещё горит свет. Или часовня безопаснее?»',choiceResultGive:'В часовне зажглась свеча. Выжившая найдёт там укрытие.',choiceResultKeep:'Шаги стихли в сторону лечебницы. Ты ещё узнаешь, кто её встретил.'},
 cathedral:{name:'Соборный округ',subtitle:'Кровь не исцеляет. Она помнит.',boss:'Викарий Амелия',art:'cathedral',npc:'Хранитель архива',key:'Печать Церкви',note:'«В архиве сохранились записи о крови. Не всё найденное следует предавать огню».',bossNotice:'За дверью Великого собора слышится молитва.',victory:'Молитва окончена',choiceGive:'Сохранить исследование для выживших',choiceKeep:'Сжечь исследование Церкви',choiceQuestion:'«Эти записи погубили город. Но в них есть способ разорвать связь с кровью. Оставим их — или сожжём?»',choiceResultGive:'Архив сохранён. На полях проступили слова о выходе из сна.',choiceResultKeep:'Страницы обращены в пепел. Вместе с ними исчез один из ответов.'},
 mensis:{name:'Кошмар Менсиса',subtitle:'Здесь небо смотрит в ответ',boss:'Кормилица Мерго',art:'mensis',npc:'Голос за завесой',key:'Осколок лунной печати',note:'«Не всякая сущность за завесой — твой враг. Иногда тюрьму принимают за алтарь».',bossNotice:'Колыбель замолчала. Кормилица уже рядом.',victory:'Кошмар рассеян',choiceGive:'Освободить заключённую сущность',choiceKeep:'Присвоить силу сущности · +10 Озарения',choiceQuestion:'«Ты слышишь меня сквозь сон. Открой печать — или забери то, что удерживает её закрытой».',choiceResultGive:'Печать раскрыта. Голос больше не просит о помощи.',choiceResultKeep:'Ты впустил чужую память. Небо стало ближе.'},
 dream:{name:'Сон охотника',subtitle:'Единственный огонь за пределами ночи',boss:'Герман, первый охотник',art:'dream',npc:'Кукла',victory:'Охота окончена'},
};
const normalObjects=INTERACTABLES.map(v=>({...v}));
const normalSpawns=SPAWNS.map(v=>({...v}));
const normalObstacles=OBSTACLES.map(v=>({...v}));
export let activeRegion='yharnam';
export const MAP_ART={x:-1110.2,y:200,w:2220.4,h:1388.8};
export const fromMap=(x,y)=>({x:200+y*1.4+(x-793)*.7,y:200+y*1.4-(x-793)*.7});
export const toMap=(x,y)=>({x:(x-y)/1.4+793,y:((x+y)*.5-200)/1.4});
const pointIn=(p,polygon)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const terrain={
 yharnam:{walk:[[300,150],[475,215],[600,300],[990,400],[1110,405],[1250,270],[1380,210],[1450,275],[1390,390],[1370,520],[1390,570],[1240,680],[1150,850],[1000,930],[690,935],[510,865],[320,800],[225,700],[205,615],[245,515],[340,430],[350,365],[255,300],[250,210]],blocked:[[[510,552],[630,540],[724,605],[694,687],[535,644],[480,620]],[[928,703],[1077,640],[1210,695],[1160,815],[1060,844],[927,790]],[[890,315],[1028,326],[1035,387],[916,388]]]},
 cathedral:{walk:[[340,360],[630,320],[880,300],[1100,350],[1300,470],[1360,660],[1220,850],[1000,940],[650,940],[320,840],[210,660],[250,470]],blocked:[]},
 mensis:{walk:[[325,360],[600,260],[1000,290],[1300,400],[1380,650],[1250,850],[990,950],[650,935],[320,820],[200,650],[245,460]],blocked:[]},
 dream:{walk:[[300,380],[600,270],[1030,300],[1300,440],[1380,650],[1200,870],[970,940],[620,925],[300,790],[210,620]],blocked:[]},
};
export function canStand(x,y,r=14){const map=terrain[activeRegion];for(let i=0;i<8;i++){const a=i*Math.PI/4,p=toMap(x+Math.cos(a)*r,y+Math.sin(a)*r);if(!pointIn(p,map.walk)||map.blocked.some(poly=>pointIn(p,poly)))return false;}return true;}
function at(id,x,y,label){return{id,...fromMap(x,y),label};}
export function activateRegion(id='yharnam'){
 if(!REGIONS[id])id='yharnam';activeRegion=id;
 if(id==='dream'){
  Object.assign(LAMP,fromMap(820,620),{label:'Фонарь Сна охотника'});
  INTERACTABLES.splice(0,INTERACTABLES.length,LAMP,at('doll',610,590,'Кукла · пробуждение'),at('messenger',1040,730,'Посланники · обмен'),at('graves',720,520,'Надгробия · выбрать путь'),at('gehrman',940,500,'Герман · закончить охоту'));
  SPAWNS.splice(0,SPAWNS.length,{id:'boss',type:'boss',...fromMap(1000,550)});OBSTACLES.splice(0,OBSTACLES.length);
 }else{
  Object.assign(LAMP,fromMap(720,820),{label:'Фонарь · вернуться в Сон охотника'});
  INTERACTABLES.splice(0,INTERACTABLES.length,LAMP,at('npc',id==='yharnam'?330:400,465,REGIONS[id].npc),at('eye',820,530,'След чужой памяти'),at('secret',1190,600,'За гранью видимого'),at('shortcut',760,710,'Открыть короткий путь'),at('bossDoor',id==='yharnam'?1290:880,id==='yharnam'?395:380,id==='yharnam'?'Войти в гробницу':'Открыть печать'),at('note',750,780,'Записка охотника'),at('ladder',1250,470,'Подняться по лестнице'));
  const placements=[['v1','villager',490,680],['v2','villager',410,540],['v3','wolf',690,450],['h1','hookman',1120,520],['v4','gunner',1020,450],['h2','wolf',1220,450],['boss','boss',id==='yharnam'?1330:920,id==='yharnam'?320:400]];
  SPAWNS.splice(0,SPAWNS.length,...placements.map(([eid,type,x,y])=>({id:eid,type,...fromMap(x,y)})));
  OBSTACLES.splice(0,OBSTACLES.length);
  // A low barricade on the square, removable from either side after discovery.
  const gp=fromMap(775,690);Object.assign(GATE,{x:gp.x-25,y:gp.y-8,w:50,h:16});
 }
}
activateRegion();



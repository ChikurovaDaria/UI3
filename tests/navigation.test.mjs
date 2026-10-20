import test from 'node:test';
import assert from 'node:assert/strict';
import {findWaypoint} from '../js/navigation.mjs';

test('unobstructed pursuit returns the exact target directly',()=>{
  assert.deepEqual(findWaypoint({x:100,y:100},{x:730,y:690},[]),{x:730,y:690});
});

test('successive waypoints lead a hunter around a rectangular wall',()=>{
  const obstacles=[{x:280,y:180,w:120,h:460}];
  const target={x:650,y:400};
  let actor={x:160,y:400,r:16};
  let detoured=false;
  for(let step=0;step<20;step++){
    const waypoint=findWaypoint(actor,target,obstacles);
    assert.ok(Number.isFinite(waypoint.x)&&Number.isFinite(waypoint.y));
    assert.notDeepEqual(waypoint,{x:actor.x,y:actor.y},'a reachable hunter must not stall');
    for(let i=0;i<=100;i++){
      const x=actor.x+(waypoint.x-actor.x)*i/100,y=actor.y+(waypoint.y-actor.y)*i/100;
      const nx=Math.max(280,Math.min(x,400)),ny=Math.max(180,Math.min(y,640));
      assert.ok((x-nx)**2+(y-ny)**2>16**2,'waypoint segment crosses the wall');
    }
    detoured ||= waypoint.y<180 || waypoint.y>640;
    actor={...waypoint,r:16};
    if(actor.x===target.x&&actor.y===target.y)break;
  }
  assert.equal(detoured,true);
  assert.equal(actor.x,target.x);
  assert.equal(actor.y,target.y);
});

test('terrain callback is honoured with actor radius and provides a detour',()=>{
  const radii=[];
  const terrain=(x,y,r)=>{
    radii.push(r);
    return !(x>300-r&&x<500+r&&y<700+r);
  };
  const waypoint=findWaypoint({x:180,y:300,r:20},{x:660,y:300},[],terrain);
  assert.ok(waypoint.y>700);
  assert.ok(radii.every(r=>r===20));
});

test('an impassable dividing wall returns a finite stationary waypoint',()=>{
  assert.deepEqual(findWaypoint({x:100,y:200},{x:900,y:200},[{x:400,y:0,w:80,h:2300}]),{x:100,y:200});
});

test('blocked target resolves to a nearby free destination',()=>{
  const point=findWaypoint({x:100,y:100},{x:350,y:350},[{x:300,y:300,w:100,h:100}]);
  assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
  assert.notDeepEqual(point,{x:100,y:100});
  assert.notDeepEqual(point,{x:350,y:350});
});

test('invalid inputs and fully blocked terrain never produce NaN',()=>{
  assert.deepEqual(findWaypoint({x:100,y:100},{x:NaN,y:300}),{x:100,y:100});
  assert.deepEqual(findWaypoint({x:100,y:100},{x:300,y:300},[],()=>false),{x:100,y:100});
  assert.deepEqual(findWaypoint({x:NaN,y:100},{x:300,y:300}),{x:0,y:100});
});

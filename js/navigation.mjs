const WIDTH = 2300;
const HEIGHT = 2300;
const CELL = 40;
const COLS = Math.ceil(WIDTH / CELL);
const ROWS = Math.ceil(HEIGHT / CELL);
const MAX_NODES = 2500;
const DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

// A small binary heap keeps searches bounded without sorting the open list.
class MinHeap {
  items = [];
  push(item) {
    const a = this.items;
    let i = a.length;
    a.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].f <= item.f) break;
      a[i] = a[parent];
      i = parent;
    }
    a[i] = item;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (!a.length) return first;
    let i = 0;
    while (i * 2 + 1 < a.length) {
      let child = i * 2 + 1;
      if (child + 1 < a.length && a[child + 1].f < a[child].f) child++;
      if (a[child].f >= last.f) break;
      a[i] = a[child];
      i = child;
    }
    a[i] = last;
    return first;
  }
}

/**
 * Return the next world-space waypoint, or the start when no route exists.
 * start.r controls actor clearance (default 16). Obstacles use {x,y,w,h}.
 * canStand(x,y,r) optionally adds terrain/polygon restrictions.
 * No state is retained: callers may cache the result for their own pursuit update interval.
 */
export function findWaypoint(start, target, obstacles = [], canStand) {
  const origin = {x: Number.isFinite(start?.x) ? start.x : 0,
    y: Number.isFinite(start?.y) ? start.y : 0};
  if (!Number.isFinite(start?.x) || !Number.isFinite(start?.y)
      || !Number.isFinite(target?.x) || !Number.isFinite(target?.y)) return origin;
  const radius = Number.isFinite(start.r) ? Math.max(0, start.r) : 16;
  const rectangles = obstacles.filter(o => o && Number.isFinite(o.x) && Number.isFinite(o.y)
    && Number.isFinite(o.w ?? o.width) && Number.isFinite(o.h ?? o.height));
  const stand = (x, y) => {
    if (x < radius || y < radius || x > WIDTH-radius || y > HEIGHT-radius) return false;
    for (const o of rectangles) {
      const w = o.w ?? o.width, h = o.h ?? o.height;
      const nx = Math.max(o.x, Math.min(x, o.x+w));
      const ny = Math.max(o.y, Math.min(y, o.y+h));
      if ((x-nx)**2 + (y-ny)**2 <= radius**2) return false;
    }
    return !canStand || !!canStand(x, y, radius);
  };
  const clear = (a, b) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12));
    for (let i = 0; i <= count; i++) {
      const t = i/count;
      if (!stand(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t)) return false;
    }
    return true;
  };
  if (!stand(origin.x,origin.y)) return origin;
  if (clear(origin,target)) return {x:target.x,y:target.y};

  const position = id => ({x:(id%COLS+.5)*CELL,y:(Math.floor(id/COLS)+.5)*CELL});
  const walkable = new Int8Array(COLS*ROWS);
  const valid = id => {
    if (id < 0 || id >= walkable.length) return false;
    if (walkable[id] === 0) {
      const p = position(id);
      walkable[id] = stand(p.x,p.y) ? 1 : -1;
    }
    return walkable[id] === 1;
  };
  // A blocked target (e.g. a player against a wall) gets the closest free cell.
  const targetFree = stand(target.x,target.y);
  let goal = -1, goalDistance = Infinity;
  for (let id=0;id<walkable.length;id++) {
    const p = position(id), distance = (p.x-target.x)**2+(p.y-target.y)**2;
    if (distance >= goalDistance || !valid(id)) continue;
    if (targetFree && !clear(p,target)) continue;
    goal = id;
    goalDistance = distance;
  }
  if (goal < 0) return origin;
  const destination = position(goal);
  const heuristic = id => {
    const p = position(id), dx = Math.abs(p.x-destination.x), dy = Math.abs(p.y-destination.y);
    return Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy);
  };
  const costs = new Float64Array(walkable.length).fill(Infinity);
  const parents = new Int32Array(walkable.length).fill(-1);
  const closed = new Uint8Array(walkable.length);
  const open = new MinHeap();
  // Virtual start links to nearby grid cells, avoiding a blocked cell centre
  // trapping a valid actor standing beside an obstacle or terrain boundary.
  const sx = Math.floor(origin.x/CELL), sy = Math.floor(origin.y/CELL);
  for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) {
    const x=sx+dx,y=sy+dy;
    if (x<0 || y<0 || x>=COLS || y>=ROWS) continue;
    const id=y*COLS+x,p=position(id);
    if (!valid(id) || !clear(origin,p)) continue;
    costs[id]=Math.hypot(origin.x-p.x,origin.y-p.y);
    open.push({id,g:costs[id],f:costs[id]+heuristic(id)});
  }
  let visited=0;
  while (open.items.length && visited<MAX_NODES) {
    const node=open.pop(),id=node.id;
    if (closed[id] || node.g!==costs[id]) continue;
    closed[id]=1;
    visited++;
    if (id===goal) {
      const route=[];
      for (let at=id;at!==-1;at=parents[at]) route.push(position(at));
      route.reverse();
      // Smooth only segments verified with actual actor clearance.
      for (let i=route.length-1;i>=0;i--) if (clear(origin,route[i])) {
        if (i===route.length-1 && targetFree && clear(origin,target)) return {x:target.x,y:target.y};
        return route[i];
      }
      return origin;
    }
    const x=id%COLS,y=Math.floor(id/COLS),from=position(id);
    for (const [dx,dy] of DIRECTIONS) {
      const nx=x+dx,ny=y+dy;
      if (nx<0 || ny<0 || nx>=COLS || ny>=ROWS) continue;
      const next=ny*COLS+nx;
      if (closed[next] || !valid(next)) continue;
      if (dx && dy && (!valid(y*COLS+nx) || !valid(ny*COLS+x))) continue;
      if (!clear(from,position(next))) continue;
      const cost=costs[id]+CELL*(dx&&dy?Math.SQRT2:1);
      if (cost>=costs[next]) continue;
      costs[next]=cost;
      parents[next]=id;
      open.push({id:next,g:cost,f:cost+heuristic(next)});
    }
  }
  return origin;
}


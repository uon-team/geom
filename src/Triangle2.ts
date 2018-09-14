

import { Vector2 } from '@uon/math'


export class Triangle2 {

    static GetSignedArea(p: Vector2, q: Vector2, r: Vector2) {
        return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    }

    static CCW(p: Vector2, q: Vector2, r: Vector2) {

        var cw = ((r.y - p.y) * (q.x - p.x)) - ((q.y - p.y) * (r.x - p.x));
        return cw > 0 ? true : cw < 0 ? false : true; // colinear
    }
}
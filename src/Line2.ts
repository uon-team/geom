

import { Vector2 } from '@uon/math';

const EPSILON = 10e-5;


/**
 * Represents an infinite crossing 2 points
 */
export class Line2 {

    p1: Vector2;
    p2: Vector2;

    constructor(p1: Vector2, p2: Vector2) {
        this.p1 = p1;
        this.p2 = p2;
    }

    static IntersectLines(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2) {

        var a0 = p1.y - p0.y;
        var b0 = p0.x - p1.x;

        var a1 = p3.y - p2.y;
        var b1 = p2.x - p3.x;

        var det = a0 * b1 - a1 * b0;
        if (det > -EPSILON && det < EPSILON) {
            return null;
        } else {
            var c0 = a0 * p0.x + b0 * p0.y;
            var c1 = a1 * p2.x + b1 * p2.y;

            var x = (b1 * c0 - b0 * c1) / det;
            var y = (a0 * c1 - a1 * c0) / det;
            return new Vector2(x, y);
        }

    }


}
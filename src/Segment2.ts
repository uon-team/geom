
import { Vector2, IsNearEqual } from '@uon/math';
import { Triangle2 } from './Triangle2';

/**
 * Represents a 2d line segment
 */
export class Segment2 {

    p1: Vector2;
    p2: Vector2;

    /**
     * Creates a new line segment from 2 points
     * @param p1
     * @param p2
     */
    constructor(p1?: Vector2, p2?: Vector2) {

        this.p1 = p1 ? p1.clone() : new Vector2();
        this.p2 = p2 ? p2.clone() : new Vector2();
    }


    set(p1?: Vector2, p2?: Vector2) {
        this.p1.copy(p1);
        this.p2.copy(p2);
    }


    inverse() {

        let temp = this.p2;
        this.p2 = this.p1;
        this.p1 = temp;
    }

    /**
     * Test if this segment intersects another
     * @param segment
     */
    intersects(segment: Segment2): boolean {

        let x1 = this.p1.x,
            y1 = this.p1.y,
            x2 = this.p2.x,
            y2 = this.p2.y,
            x3 = segment.p1.x,
            y3 = segment.p1.y,
            x4 = segment.p2.x,
            y4 = segment.p2.y;


        // segment have 0 length
        if (x1 == x2 && y1 == y2 || x3 == x4 && y3 == y4) {
            return false;
        }

        let ax = x2 - x1;
        let ay = y2 - y1;
        let bx = x3 - x4;
        let by = y3 - y4;
        let cx = x1 - x3;
        let cy = y1 - y3;

        let alpha_num = by * cx - bx * cy;
        let common_denom = ay * bx - ax * by;

        if (common_denom > 0) {
            if (alpha_num < 0 || alpha_num > common_denom) {
                return false;
            }
        } else if (common_denom < 0) {
            if (alpha_num > 0 || alpha_num < common_denom) {
                return false;
            }
        }
        let beta_num = ax * cy - ay * cx;
        if (common_denom > 0) {
            if (beta_num < 0 || beta_num > common_denom) {
                return false;
            }
        } else if (common_denom < 0) {
            if (beta_num > 0 || beta_num < common_denom) {
                return false;
            }
        }
        // if common_denom == 0 then the lines are parallel.
        if (common_denom == 0) {
            // This code wasn't in Franklin Antonio's method. It was added by
            // Keith Woodward.
            // The lines are parallel.
            // Check if they're collinear.
            let collinearityTestForP3 = x1 * (y2 - y3) + x2 * (y3 - y1)
                + x3 * (y1 - y2); // see
            // http://mathworld.wolfram.com/Collinear.html
            // If p3 is collinear with p1 and p2 then p4 will also be collinear,
            // since p1-p2 is parallel with p3-p4
            if (collinearityTestForP3 == 0) {
                // The lines are collinear. Now check if they overlap.
                if (x1 >= x3 && x1 <= x4 || x1 <= x3 && x1 >= x4 ||
                    x2 >= x3 && x2 <= x4 || x2 <= x3 && x2 >= x4 ||
                    x3 >= x1 && x3 <= x2 || x3 <= x1 && x3 >= x2) {
                    if (y1 >= y3 && y1 <= y4 || y1 <= y3 && y1 >= y4 ||
                        y2 >= y3 && y2 <= y4 || y2 <= y3 && y2 >= y4 ||
                        y3 >= y1 && y3 <= y2 || y3 <= y1 && y3 >= y2) {
                        return true;
                    }
                }
            }
            return false;
        }
        return true;


    }

    /**
     * Intersect this segment with another and return the intersection point,
     * or null if they dont intersect
     * @param segment
     */
    intersect(segment: Segment2): Vector2 {
        return Segment2.Intersect(this.p1, this.p2, segment.p1, segment.p2);
    }


    isPerpendicular(segment: Segment2) {

        let vec1 = Vector2.Sub(this.p2, this.p1);
        let vec2 = Vector2.Sub(segment.p2, segment.p1);
        return IsNearEqual(vec1.dot(vec2), 0.0);

    }

    isParallel(segment: Segment2, tolerance: number = 0.001) {
        let vec1 = Vector2.Sub(this.p2, this.p1).normalize();
        let vec2 = Vector2.Sub(segment.p2, segment.p1).normalize();

        return IsNearEqual(Math.abs(vec1.dot(vec2)), 1.0, tolerance);

    }

    isColinear(segment: Segment2, tolerance: number = 0.001) {
        let vec1 = Vector2.Sub(this.p2, this.p1).normalize();
        let vec2 = Vector2.Sub(segment.p2, segment.p1).normalize();

        return IsNearEqual(vec1.dot(vec2), 1.0, tolerance);

    }


    getPointAt(t: number, out?: Vector2) {

        out = out || new Vector2(this.p1.x, this.p1.y);


        return out.lerp(this.p2, t);

    }

    /**
     * Returns the length of the line segment
     */
    length() {
        return Vector2.Sub(this.p2, this.p1).length();
    }

    /**
    * Returns the length of the line segment
    */
    lengthSq() {
        return Vector2.Sub(this.p2, this.p1).lengthSq();
    }

    /**
     * Translates the line segment
     * @param vec2
     */
    translate(vec2: Vector2) {
        this.p1.add(vec2);
        this.p2.add(vec2);

        return this;
    }

    /**
     * Expand this segment along it's vector in both direction
     * @param scalar
     */
    grow(scalar: number) {


        let dir = this.getDirection().multiplyScalar(scalar);

        this.p1.subtract(dir);
        this.p2.add(dir);

        return this;

    }

    getDirection() {
        return this.p2.clone().subtract(this.p1).normalize();
    }

    getTangent() {
        return this.getDirection().perpendicular();
    }

    /**
     * Compute the squared distance from this segment to a point
     * @param point
     */
    getDistanceSq(point: Vector2) {

        return Segment2.ComputeDistanceSq(this.p1, this.p2, point);
    }

    getSegmentDistanceSq(segment: Segment2) {

        let p1_dist = this.getDistanceSq(segment.p1);
        let p2_dist = this.getDistanceSq(segment.p2);

        return Math.min(p1_dist, p2_dist);
    }

    /**
     * Compute the closest point on this segment
     * @param point
     */
    getClosestPoint(point: Vector2, ignoreEnds?: boolean) {

        let result = new Vector2();

        let diff = Vector2.Sub(this.p2, this.p1);
        let len_sq = diff.lengthSq();
        let r = ((point.x - this.p1.x) * diff.x + (point.y - this.p1.y) * diff.y) / len_sq;


        if (ignoreEnds) {
            return result.set(this.p1.x + r * diff.x, this.p1.y + r * diff.y);
        }

        if (r <= 0) {
            result.copy(this.p1);
        }
        else if (r >= 1) {
            result.copy(this.p2);
        }
        else {
            result.set(this.p1.x + r * diff.x, this.p1.y + r * diff.y);
        }

        return result;
    }

    /**
     * Clone this segment
     */
    clone() {
        return new Segment2(this.p1, this.p2);
    }


    static FastIntersects(p1: Vector2, p2: Vector2, p3: Vector2, p4: Vector2) {

        return Triangle2.CCW(p1, p3, p4) !== Triangle2.CCW(p2, p3, p4) &&
            Triangle2.CCW(p1, p2, p3) !== Triangle2.CCW(p1, p2, p4);
    }

    /**
     * Find intersection point
     * @param p1
     * @param p2
     * @param p3
     * @param p4
     */
    static Intersect(p1: Vector2, p2: Vector2, p3: Vector2, p4: Vector2) {

        let x1 = p1.x;
        let y1 = p1.y;
        let x2 = p2.x;
        let y2 = p2.y;
        let x3 = p3.x;
        let y3 = p3.y;
        let x4 = p4.x;
        let y4 = p4.y;


        var a1, a2, b1, b2, c1, c2; // Coefficients of line eqns.
        var r1, r2, r3, r4;         // 'Sign' values
        var denom, offset;          // Intermediate values
        var x, y;                   // Intermediate return values

        // Compute a1, b1, c1, where line joining points 1 and 2
        // is "a1 x  +  b1 y  +  c1  =  0".
        a1 = y2 - y1;
        b1 = x1 - x2;
        c1 = x2 * y1 - x1 * y2;

        // Compute r3 and r4.
        r3 = a1 * x3 + b1 * y3 + c1;
        r4 = a1 * x4 + b1 * y4 + c1;

        // Check signs of r3 and r4.  If both point 3 and point 4 lie on
        // same side of line 1, the line segments do not intersect.
        if (r3 !== 0 && r4 !== 0 && ((r3 >= 0 && r4 >= 0) || (r3 < 0 && r4 < 0))) {
            return null; // no intersection
        }


        // Compute a2, b2, c2
        a2 = y4 - y3;
        b2 = x3 - x4;
        c2 = x4 * y3 - x3 * y4;

        // Compute r1 and r2
        r1 = a2 * x1 + b2 * y1 + c2;
        r2 = a2 * x2 + b2 * y2 + c2;

        // Check signs of r1 and r2.  If both point 1 and point 2 lie
        // on same side of second line segment, the line segments do
        // not intersect.
        if (r1 !== 0 && r2 !== 0 && ((r1 >= 0 && r2 >= 0) || (r1 < 0 && r2 < 0))) {
            return null; // no intersections
        }

        // Line segments intersect: compute intersection point.
        denom = a1 * b2 - a2 * b1;

        if (denom === 0) {
            return null;
        }

        offset = denom < 0 ? - denom / 2 : denom / 2;

        x = b1 * c2 - b2 * c1;
        y = a2 * c1 - a1 * c2;

        return new Vector2(x / denom, y / denom);


    }

    /**
     * Compute the squared distance of segment[p1,p2] to p
     * @param p1
     * @param p2
     * @param p
     */
    static ComputeDistanceSq(p1: Vector2, p2: Vector2, p: Vector2) {

        let x1 = p1.x,
            y1 = p1.y,
            x2 = p2.x,
            y2 = p2.y,
            px = p.x,
            py = p.y;



        // Adjust vectors relative to x1,y1
        x2 -= x1;
        y2 -= y1;

        // px,py becomes relative vector from x1,y1 to test point
        px -= x1;
        py -= y1;

        let dotprod = px * x2 + py * y2;
        let proj_len_sq;

        if (dotprod <= 0.0) {
            proj_len_sq = 0.0;
        }
        else {
            px = x2 - px;
            py = y2 - py;
            dotprod = px * x2 + py * y2;

            if (dotprod <= 0.0) {
                proj_len_sq = 0.0;
            } else {
                proj_len_sq = dotprod * dotprod / (x2 * x2 + y2 * y2);
            }
        }

        let len_sq = px * px + py * py - proj_len_sq;
        if (len_sq < 0) {
            len_sq = 0;
        }
        return len_sq;

    }

}
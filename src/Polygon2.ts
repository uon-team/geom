

import { Vector2, GetSign, Box2, Segment2, Line2 } from '@uon/math'

import { Triangle2 } from './Triangle2'


/**
 * Reprensents a complex 2D polygon with a set of points
 */
export class Polygon2 {

    points: Vector2[];


    private _centroid: Vector2;
    private _area: number;
    private _signedArea: number;
    private _radius: number;
    private _radiusSq: number;
    private _counterCW: boolean;
    private _bounds: Box2 = new Box2();

    private _segments: Segment2[];

    /**
     * Create a new plygon from a set of points
     * @param points
     * @param copy
     */
    constructor(points: Vector2[], copy?: boolean) {

        if (points.length < 3) {
            throw new Error('Minimum of 3 points needed for a polygon');
        }

        this.points = points.map((p) => {
            if (copy === true) {
                return new Vector2(p);
            }

            return p;
        });

        this.computeAll();

    }

    /**
     * Returns the polygon's area
     */
    get area(): number {
        return this._area;
    }

    /**
     * Returns the centroid
     */
    get center(): Vector2 {

        return this._centroid;
    }

    /**
     * Return this polygon's bounds
     */
    get bounds(): Box2 {
        return this._bounds;
    }

    /**
     * Returns the number of points in the polygon
     */
    get length(): number {
        return this.points.length;
    }

    /**
     * Whether or not the winding of this polygon is clockwise
     */
    get clockwise(): boolean {
        return !this._counterCW;
    }

    /**
     * Reverse the point order
     */
    reverseOrder() {

        this.points = this.points.reverse();

        this.computeAll();

        return this;
    }


    /**
     * Get a segment list for this polygon
     */
    toSegments() {

        if (!this._segments) {

            let points = this.points;
            let result: Segment2[] = [];

            for (let i = 0; i < points.length; ++i) {
                let j = i + 1 == points.length ? 0 : i + 1;

                let p1 = points[i];
                let p2 = points[j];


                result.push(new Segment2(p1, p2));
            }

            this._segments = result;

        }

        return this._segments;
    }


    /**
     * Check if a point is inside the polygon
     * @param point
     */
    containsPoint(point: Vector2): boolean {

        let i, j = 0;
        let c = false;

        let px = point.x;
        let py = point.y;

        for (i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            let p1 = this.points[i];
            let p2 = this.points[j];
            if (((p1.y > py) != (p2.y > py)) &&
                (px < (p1.x - p2.x) * (py - p1.y) / (p1.y - p2.y) + p1.x)) {
                c = !c;
            }

        }

        return c;
    }

    /**
     * Intersect this polygon with a segment, return the first intersection closest to segment.p1
     * @param segment
     */
    intersectSegment(segment: Segment2): Vector2 {

        let points = this.points;
        let temp_segment = new Segment2();

        let closest_dist_sq = Number.MAX_VALUE;
        let closest_point: Vector2 = null;
        let j;

        for (let i = 0; i < points.length; ++i) {

            j = (i + 1 == points.length) ? 0 : i + 1;

            temp_segment.p1 = points[i];
            temp_segment.p2 = points[j];

            if (temp_segment.intersects(segment)) {
                let point = temp_segment.intersect(segment);
                if (point == null) {
                    continue;
                }

                let current_point_dist_sq = point.distanceSq(segment.p1);

                if (current_point_dist_sq < closest_dist_sq) {
                    closest_point = point;
                    closest_dist_sq = current_point_dist_sq;
                }
            }


        }

        return closest_point;
    }

    /**
     * Compute the closest point to the given point on the polygon's boundary
     * @param point
     */
    getClosestBoundaryPoint(point: Vector2) {

        let closest_dist_sq = Number.MAX_VALUE;

        let closest_index = -1;
        let closest_next_index = -1;

        let points = this.points;
        let next_i;
        for (let i = 0; i < points.length; ++i) {

            next_i = (i + 1 == points.length) ? 0 : i + 1;

            let p1 = points[i];
            let p2 = points[next_i];
            let segment = new Segment2(p1, p2);

            let seg_dist_sq = Segment2.ComputeDistanceSq(p1, p2, point);

            if (seg_dist_sq < closest_dist_sq) {
                closest_dist_sq = seg_dist_sq;
                closest_index = i;
                closest_next_index = next_i;
            }

        }

        let p1 = points[closest_index];
        let p2 = points[closest_next_index];

        let segment = new Segment2(p1, p2);

        return segment.getClosestPoint(point);


    }


    /**
     * Rotate the polygon around an arbitrary  origin
     * @param angle
     * @param origin
     */
    rotate(angle: number, origin?: Vector2) {

        let points = this.points;
        origin = origin ? origin : this.center;


        for (let i = 0; i < points.length; ++i) {
            points[i].rotate(angle, origin);
        }

        if (!origin.equals(this.center)) {
            this.center.rotate(angle, origin);
        }

        return this;

    }

    /**
     * Translate the polygon
     * @param offset
     */
    translate(offset: Vector2) {

        let points = this.points;
        let x = offset.x;
        let y = offset.y;
        for (let i = 0; i < points.length; ++i) {
            points[i].x += x;
            points[i].y += y;
        }

        this.center.x += x;
        this.center.y += y;

        return this;
    }

    /**
     * Expand the polygon by a scalar value
     * @param scalar
     */
    offset(scalar: number) {

        let points = this.points;

        let start = 0;
        let end = points.length;

        scalar = this.clockwise ? scalar : -scalar;


        let segments: Segment2[] = [];

        for (let i = 0; i < end; ++i) {
            let j = i + 1 == end ? 0 : i + 1;

            let seg = new Segment2(points[i], points[j]);

            let offset = seg.getTangent().multiplyScalar(scalar);

            seg.translate(offset).grow(Math.abs(scalar * 2));

            segments.push(seg);

        }

        let new_points: Vector2[] = [];

        for (let i = 0; i < end; ++i) {
            let j = i + 1 == end ? 0 : i + 1;

            let s1 = segments[i];
            let s2 = segments[j];
            let np = Line2.IntersectLines(s1.p1, s1.p2, s2.p1, s2.p2);


            let p = s1.p1;

            if (np) {
                p = np;
            }

            new_points.push(p);


        }

        let last = new_points.pop();
        new_points.unshift(last);

        this.points = new_points;

        this.computeAll();

        return this;

    }

    /**
     * Removes colinear points
     */
    optimize() {

        let points = this.points;

        let start = 0;
        let end = points.length;
        let i = 0,
            prev,
            next;

        let new_points: Vector2[] = [];

        while (i !== end) {

            prev = i - 1 < 0 ? end - 1 : i - 1;
            next = i + 1 == end ? 0 : i + 1;

            let p = points[i];
            let pp = points[prev];
            let pn = points[next];

            i++;

            if (!(p.equals(pn) || Math.abs(Triangle2.GetSignedArea(pp, p, pn)) < 10e-5)) {

                new_points.push(p);
            }

        }

        this.points = new_points;

        this.computeAll();

    }


    /**
     * Copy another polygon
     * @param polygon
     */
    copy(polygon: Polygon2) {

        this.points = polygon.points.map((p) => {
            return new Vector2(p);
        });

        this.computeAll();

    }

    /**
     * Creates a copy of this polygon
     */
    clone() {
        return new Polygon2(this.points, true);
    }

    /**
     * Construct a new polygon from an array of points
     * @param points
     */
    static FromArray(points: number[][]) {

        let v2points = points.map((p) => {
            return new Vector2(p);
        });

        return new Polygon2(v2points, false);
    }



    private computeAll() {

        this.computeCentroid();
        this.computeArea();
        this.computeRadius();

        this._bounds.setFromPoints(this.points);

        this._segments = null;
    }


    private computeArea() {

        let signed_area = this.computeSignedArea();

        this._counterCW = signed_area > 0;

        this._signedArea = signed_area;
        this._area = Math.abs(signed_area);

    }

    private computeSignedArea() {

        let total_area = 0;
        let points = this.points;
        let j;

        for (let i = 0; i < points.length - 1; ++i) {
            j = i + 1;
            total_area += ((points[i].x - points[j].x) * (points[j].y + (points[i].y - points[j].y) / 2));
        }

        // need to do points[point.length-1] and points[0].
        j = points.length - 1;
        total_area += ((points[j].x - points[0].x) * (points[0].y + (points[j].y - points[0].y) / 2));

        return total_area;

    }

    private computeRadius() {

        let max_radius = -1;
        let furthest_point_index = 0;
        let points = this.points;
        for (let i = 0; i < points.length; ++i) {
            let current_radius_sq = this._centroid.distanceSq(points[i]);

            if (current_radius_sq > max_radius) {
                max_radius = current_radius_sq;
                furthest_point_index = i;
            }
        }

        this._radius = this._centroid.distance(points[furthest_point_index]);
        this._radiusSq = this._radius * this._radius;

    }

    private computeCentroid() {

        let xsum = 0.0;
        let ysum = 0.0;
        let area = 0.0;
        let points = this.points;

        for (let i = 0; i < points.length - 1; i++) {

            let p0 = points[i];
            let p1 = points[i + 1];

            let areaSum = (p0.x * p1.y) - (p1.x * p0.y)

            xsum += (p0.x + p1.x) * areaSum;
            ysum += (p0.y + p1.y) * areaSum;
            area += areaSum;
        }

        let centMassX = xsum / (area * 6);
        let centMassY = ysum / (area * 6);

        this._centroid = new Vector2(centMassX, centMassY);
    }

}

import { Vector2, Box2 } from '@uon/math';

const CUSP_LIMIT = 0;
const ANGLE_TOLERANCE = 0.000035;
const DISTANCE_TOLERANCE_SQUARED = 0.00005;
const CURVE_DISTANCE_EPSILON = 1e-52;
const CURVE_COLINEAR_EPSILON = 1e-52;
const CURVE_ANGLE_TOLERANCE_EPSILON = 0.00005;


enum SegmentType {
    Move,
    Linear,
    Conic,
    Cubic,
    Arc
}


export class Path2 {

    private segmentTypes: SegmentType[] = [];
    private segmentParams: number[] = [];
    private vertices: Vector2[] = [];
    private bounds: Box2 = new Box2();
    private isClosed: boolean = false;

    private computedVertices: Vector2[] = [];
    private computedLength: number = 0;


    /**
     * Constructs new path
     */
    constructor() {

    }

    get closed() {
        return this.isClosed;
    }

    /**
     * Clear all path segments
     */
    clear() {

        this.segmentTypes = [];
        this.segmentParams = [];
        this.vertices = [];
        this.isClosed = false;
        this.bounds.empty();

    }

    /**
     * Begin the path at location x,y
     */
    begin(x: number, y: number) {
        this.segmentTypes.push(SegmentType.Move);
        this.vertices.push(new Vector2(x, y));
    }

    /**
     * Finalize the path
     */
    end() {
        this.compute();
    }


    /**
     * Create a linear segment to x, y
     * @param x
     * @param y
     */
    lineTo(x: number, y: number) {
        this.segmentTypes.push(SegmentType.Linear);
        this.vertices.push(new Vector2(x, y));
    }

    /**
     * Create a conic curve to x, y with control point cx, cy
     * @param cx
     * @param cy
     * @param x
     * @param y
     */
    conicCurveTo(cx: number, cy: number, x: number, y: number) {

        this.segmentTypes.push(SegmentType.Conic);

        this.vertices.push(new Vector2(cx, cy));
        this.vertices.push(new Vector2(x, y));
    }

    /**
     * Create a cubic curve to point x,y with 2 control points
     * @param cx1
     * @param cy1
     * @param cx2
     * @param cy2
     * @param x
     * @param y
     */
    cubicCurveTo(cx1: number, cy1: number, cx2: number, cy2: number, x: number, y: number) {

        this.segmentTypes.push(SegmentType.Cubic);

        this.vertices.push(new Vector2(cx1, cy1));
        this.vertices.push(new Vector2(cx2, cy2));
        this.vertices.push(new Vector2(x, y));

    }

    /**
     * Creates an arc to point x,y
     */
    arcTo() {

    }

    arc(x: number, y: number, radius: number, start: number, end: number, clockwise: boolean) {

        var dist = Math.abs(start - end);

        if (!clockwise && start > end)
            dist = 2 * Math.PI - dist
        else if (clockwise && end > start)
            dist = 2 * Math.PI - dist

        //approximate the # of steps using the cube root of the radius
        let steps = Math.max(6, Math.floor(12 * Math.pow(radius, 1 / 3) * (dist / (Math.PI))))

        //ensure we have at least 3 steps..
        steps = Math.max(steps, 3)

        var f = dist / (steps),
            t = start

        //modify direction
        f *= clockwise ? -1 : 1

        for (var i = 0; i < steps + 1; i++) {
            var cs = Math.cos(t),
                sn = Math.sin(t)

            var nx = x + cs * radius,
                ny = y + sn * radius

            this.segmentTypes.push(SegmentType.Linear);
            this.vertices.push(new Vector2(nx, ny));
            t += f
        }
    }

    /**
     * Close the path
     */
    close() {
        if (this.vertices.length < 1) {
            return;
        }

        this.isClosed = true;
    }

    /**
     * Get the computed lenght of the path
     */
    length() {
        return this.computedLength;
    }


    /**
     * Test if a point is contained within the path, path must be closed
     * @param point
     */
    isInside(point: Vector2) {

        let i, j = 0;
        let c = false;

        let px = point.x;
        let py = point.y;

        for (i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
            let p1 = this.vertices[i];
            let p2 = this.vertices[j];
            if (((p1.y > py) != (p2.y > py)) &&
                (px < (p1.x - p2.x) * (py - p1.y) / (p1.y - p2.y) + p1.x)) {
                c = !c;
            }

        }

        return c;


    }

    /**
     * Get the bounds 
     */
    getBounds() {
        return this.bounds;
    }

    /**
     * Get the non-computed vertices
     */
    getVertices() {
        return this.vertices;
    }

    /**
     * Get the tessalated vertices
     */
    getComputedVertices() {
        return this.computedVertices;
    }

    /**
     * Computes the path tessalation
     */
    private compute() {


        this.computedVertices = [];
        this.computedLength = 0;
        this.bounds.empty();


        let v = 0;
        let len = this.segmentTypes.length;

        for (let s = 0; s < len; ++s) {


            switch (this.segmentTypes[s]) {

                case SegmentType.Move: {
                    break;
                }

                case SegmentType.Linear: {

                    let p1 = this.vertices[v++];
                    let p2 = this.vertices[v];

                    this.updateBounds(p1);
                    this.updateBounds(p2);

                    if (this.computedVertices.length == 0) {
                        this.computedVertices.push(p1);
                    }

                    this.computedVertices.push(p2);
                    

                    break;
                }

                case SegmentType.Conic: {

                    let p1 = this.vertices[v++];
                    let p2 = this.vertices[v++];
                    let p3 = this.vertices[v];

                    if (this.computedVertices.length == 0) {
                        this.computedVertices.push(p1);
                    }


                    this.subdivideConic(p1, p2, p3, 0);

                    this.computedVertices.push(p3);

                }

            }




        }



    }

    /**
     * Update bounds
     * @param p
     */
    private updateBounds(p: Vector2) {

        this.bounds.expand(p);
    }

    /**
     * Sybdivide the arc
     */
    private subdivideArc() {

    }

    /**
     * Subdivide a conic curve
     * @param p1
     * @param p2
     * @param p3
     * @param level
     */
    private subdivideConic(p1: Vector2, p2: Vector2, p3: Vector2, level: number) {

        let p12 = p1.clone().add(p2).multiplyScalar(0.5);
        let p23 = p2.clone().add(p3).multiplyScalar(0.5);
        let p123 = p12.clone().add(p23).multiplyScalar(0.5);

        let dx = p3.x - p1.x;
        let dy = p3.y - p1.y;
        let d = Math.abs((p2.x - p3.x) * dy - (p2.y - p3.y) * dx);
        let da: number;

        if (d > CURVE_COLINEAR_EPSILON) {

            if (d * d <= DISTANCE_TOLERANCE_SQUARED * (dx * dx + dy * dy)) {

                if (ANGLE_TOLERANCE < CURVE_ANGLE_TOLERANCE_EPSILON) {
                    this.computedVertices.push(p123);
                    return;
                }

                da = Math.abs(
                    Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p2.y - p1.y, p2.x - p1.x)
                );

                if (da >= Math.PI) {
                    da = 2 * Math.PI - da;
                }

                if (da < ANGLE_TOLERANCE) {
                    this.computedVertices.push(p123);
                    return;
                }

            }


        } else {

            // Collinear case
            let diff12 = p2.clone().subtract(p1);
            let diff23 = p3.clone().subtract(p2);

            da = dx * dx + dy * dy;

            if (da == 0) {

                d = diff12.lengthSq();

            } else {

                d = (diff12.x * dx + diff12.y * dy) / da;

                if (d > 0 && d < 1) {
                    // Simple collinear case, 1---2---3
                    // We can leave just two endpoints
                    return;
                }

                if (d <= 0) {
                    d = diff12.lengthSq();
                }

                else if (d >= 1) {
                    d = diff23.lengthSq();
                }
                else {

                    let pp = p2.clone();
                    pp.x -= p1.x + d * dx;
                    pp.y -= p1.y + d * dy;
                    d = pp.lengthSq();
                }


            }

            if (da < ANGLE_TOLERANCE) {
                this.computedVertices.push(p2);
                return;
            }

        }

        // Continue subdivision
        this.subdivideConic(p1, p12, p123, level + 1);
        this.subdivideConic(p123, p23, p3, level + 1);


    }

    /**
     * Subdivide a cubic curve
     */
    private subdivideCubic() {

    }

}
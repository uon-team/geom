import { Vector2, Line2 } from "@uon/math";
import { Path2 } from "../Path2";
import { Triangle2 } from "../Triangle2";



export enum StrokeJoin {
    Miter,
    Bevel,
    Round
}

export enum StrokeCap {
    Butt,
    Square,
    Round
}

/**
 * Tesselate a path
 */
export class StrokeTessellator2 {

    path: Path2;

    private points: Vector2[];

    constructor(path: Path2 | Vector2[], closed?: boolean) {

        if (Array.isArray(path)) {
            this.points = path.slice(0);
        } else {
            this.path = path;
            this.points = path.getComputedVertices().slice(0);
            closed = path.closed;
        }


        if (closed === true) {

            var p0 = this.points[0];
            p0 = Vector2.Middle(p0, this.points[this.points.length - 1]);
            this.points.unshift(p0);
            this.points.push(p0);

        }

    }

    process(stokeWidth: number, stokeCap = StrokeCap.Butt, strokeJoin = StrokeJoin.Miter) {

        let points = this.points;
        let num_points = this.points.length;
        let stroke_width = stokeWidth * 0.5;

        let middle_points: Vector2[] = [];

        let result: Vector2[] = [];


        for (let i = 0; i < num_points - 1; i++) {
            if (i === 0) {

                middle_points.push(points[0]);

            } else if (i === num_points - 2) {

                middle_points.push(points[num_points - 1]);

            } else {

                middle_points.push(Vector2.Middle(points[i], points[i + 1]));

            }
        }

        for (let i = 1; i < middle_points.length; i++) {

            this.createTriangles(middle_points[i - 1], points[i], middle_points[i],
                result, stroke_width, strokeJoin, 3);
        }

        return result;
    }



    private createTriangles(p0: Vector2, p1: Vector2, p2: Vector2, verts: Vector2[], width: number, join: StrokeJoin, miterLimit: number) {

        var t0 = Vector2.Sub(p1, p0);
        var t2 = Vector2.Sub(p2, p1);

        t0.perpendicular();
        t2.perpendicular();

        // triangle composed by the 3 points if clockwise or couterclockwise.
        // if counterclockwise, we must invert the line threshold points, otherwise the intersection point
        // could be erroneous and lead to odd results.
        if (Triangle2.GetSignedArea(p0, p1, p2) > 0) {
            t0.negate();
            t2.negate();
        }

        t0.normalize();
        t2.normalize();
        t0.multiplyScalar(width);
        t2.multiplyScalar(width);

        var pintersect = Line2.IntersectLines(Vector2.Add(t0, p0), Vector2.Add(t0, p1), Vector2.Add(t2, p2), Vector2.Add(t2, p1));

        var anchor = null;
        var anchorLength = Number.MAX_VALUE;
        if (pintersect) {
            anchor = Vector2.Sub(pintersect, p1);
            anchorLength = anchor.length();
        }
        var dd = (anchorLength / width) | 0;
        var p0p1 = Vector2.Sub(p0, p1);
        var p0p1Length = p0p1.length();
        var p1p2 = Vector2.Sub(p1, p2);
        var p1p2Length = p1p2.length();

        /**
         * the cross point exceeds any of the segments dimension.
         * do not use cross point as reference.
         */
        if (anchorLength > p0p1Length || anchorLength > p1p2Length) {

            verts.push(Vector2.Add(p0, t0));
            verts.push(Vector2.Sub(p0, t0));
            verts.push(Vector2.Add(p1, t0));

            verts.push(Vector2.Sub(p0, t0));
            verts.push(Vector2.Add(p1, t0));
            verts.push(Vector2.Sub(p1, t0));

            if (join === StrokeJoin.Round) {
                //createRoundCap(p1, Point.Add(p1, t0), Point.Add(p1, t2), p2, verts);

            } else if (join === StrokeJoin.Bevel || (join === StrokeJoin.Miter && dd >= miterLimit)) {

                verts.push(p1);
                verts.push(Vector2.Add(p1, t0));
                verts.push(Vector2.Add(p1, t2));

            } else if (join === StrokeJoin.Miter && dd < miterLimit && pintersect) {

                verts.push(Vector2.Add(p1, t0));
                verts.push(p1);
                verts.push(pintersect);

                verts.push(Vector2.Add(p1, t2));
                verts.push(p1);
                verts.push(pintersect);
            }

            verts.push(Vector2.Add(p2, t2));
            verts.push(Vector2.Sub(p1, t2));
            verts.push(Vector2.Add(p1, t2));

            verts.push(Vector2.Add(p2, t2));
            verts.push(Vector2.Sub(p1, t2));
            verts.push(Vector2.Sub(p2, t2));


        } else {

            verts.push(Vector2.Add(p0, t0));
            verts.push(Vector2.Sub(p0, t0));
            verts.push(Vector2.Sub(p1, anchor));

            verts.push(Vector2.Add(p0, t0));
            verts.push(Vector2.Sub(p1, anchor));
            verts.push(Vector2.Add(p1, t0));

            if (join === StrokeJoin.Round) {

                var _p0 = Vector2.Add(p1, t0);
                var _p1 = Vector2.Add(p1, t2);
                var _p2 = Vector2.Sub(p1, anchor);

                var center = p1;

                verts.push(_p0);
                verts.push(center);
                verts.push(_p2);

                // createRoundCap(center, _p0, _p1, _p2, verts);

                verts.push(center);
                verts.push(_p1);
                verts.push(_p2);

            } else {

                if (join === StrokeJoin.Bevel || (join === StrokeJoin.Miter && dd >= miterLimit)) {
                    verts.push(Vector2.Add(p1, t0));
                    verts.push(Vector2.Add(p1, t2));
                    verts.push(Vector2.Sub(p1, anchor));
                }

                if (join === StrokeJoin.Miter && dd < miterLimit) {

                    verts.push(pintersect);
                    verts.push(Vector2.Add(p1, t0));
                    verts.push(Vector2.Add(p1, t2));

                    verts.push(Vector2.Sub(p1, anchor));
                    verts.push(Vector2.Add(p1, t0));
                    verts.push(Vector2.Add(p1, t2));


                }
            }

            verts.push(Vector2.Add(p2, t2));
            verts.push(Vector2.Sub(p1, anchor));
            verts.push(Vector2.Add(p1, t2));

            verts.push(Vector2.Add(p2, t2));
            verts.push(Vector2.Sub(p1, anchor));
            verts.push(Vector2.Sub(p2, t2));
        }

    }



}
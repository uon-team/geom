


import { Vector2, Box2 } from '@uon/math';

import { Path2 } from './Path2';
import { Line2 } from './Line2';
import { Triangle2 } from './Triangle2';
import { Polygon2 } from './Polygon2';

/**
 * Node list for the tessalator
 */
class VertexNode extends Vector2 {

    i: number;

    next: VertexNode;
    prev: VertexNode;

    zOrder: number = null;

    zNext: VertexNode;
    zPrev: VertexNode;

    steiner: boolean = false;

    constructor(vec: Vector2, index: number) {

        super(vec.x, vec.y);

        this.i = index;
    }

}


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


/**
 * An earclipping algorithm
 */
export class Tessellator2 {


    polygon: Polygon2;

    private bounds: Box2;
    private isComplex: boolean;
    private size: number;

    /**
     * Creates a new tessalator
     * @param polygon
     */
    constructor(polygon: Vector2[]) {

        this.polygon = new Polygon2(polygon);
        //this.polygon.optimize();


        if (!this.polygon.clockwise) {
            this.polygon.reverseOrder();
        }


        this.bounds = new Box2();
        this.bounds.setFromPoints(this.polygon.points);

        let size = this.bounds.getSize();
        this.size = Math.max(size.x, size.y);
        this.isComplex = this.polygon.points.length >= 70;


    }

    process() {

        let indices: number[] = [];
        let points = this.polygon.points;

        if (points.length === 3) {
            return points.map((p) => {
                return p.clone();
            });
        }

        let first_node = this.createLinkedList(0, points.length);

        this.processList(first_node, indices);


        let result: Vector2[] = [];
        indices.forEach((i) => {

            result.push(points[i]/*.clone()*/);
        });




        return result;
    }


    private processList(node: VertexNode, out: number[], pass?: number) {

        if (!node) return;


        if (!pass && this.isComplex) {
            this.indexCurve(node);

        }

        let stop = node;
        let next, prev;

        while (node.prev !== node.next) {


            prev = node.prev;
            next = node.next;

            if (this.isComplex ? this.isEarHashed(node) : this.isEar(node)) {
                // cut off the triangle
                out.push(prev.i);
                out.push(node.i);
                out.push(next.i);

                this.removeNode(node);

                node = next.next;
                stop = next.next;

                continue;
            }


            node = next;

            if (node === stop) {
                if (!pass) {
                    this.processList(this.filterPoints(node), out, 1);
                }
                else if (pass === 1) {
                    node = this.cureLocalIntersections(node, out);
                    this.processList(node, out, 2);
                }
                else if (pass === 2) {

                    this.splitNode(node, out);
                }

                break;
            }

        }

    }



    private createLinkedList(start: number, end: number) {

        let points = this.polygon.points;
        let last: VertexNode;

        if (!this.polygon.clockwise) {

            for (let i = start; i < end; i++) {
                last = this.insertNode(i, points[i], last);
            }


        } else {
            for (let i = end - 1; i >= start; i--) {
                last = this.insertNode(i, points[i], last);
            }
        }


        if (last && last.equals(last.next)) {
            this.removeNode(last);
            last = last.next;
        }

        return last;

    }

    private insertNode(index: number, vec: Vector2, last: VertexNode) {

        let p = new VertexNode(vec, index);

        if (!last) {
            p.prev = p;
            p.next = p;
        } else {
            p.next = last.next;
            p.prev = last;
            last.next.prev = p;
            last.next = p;
        }

        return p;
    }

    private removeNode(p: VertexNode) {

        p.next.prev = p.prev;
        p.prev.next = p.next;

        if (p.zPrev) p.zPrev.zNext = p.zNext;
        if (p.zNext) p.zNext.zPrev = p.zPrev;
    }


    private isEarHashed(node: VertexNode) {

        let a = node.prev,
            b = node,
            c = node.next;

        if (this.computeArea(a, b, c) >= 0) return false; // reflex, can't be an ear

        // triangle bbox; min & max are calculated like this for speed
        var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
            minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
            maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
            maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

        // z-order range for the current triangle bbox;
        var minZ = this.zOrder(minTX, minTY),
            maxZ = this.zOrder(maxTX, maxTY);

        // first look for points inside the triangle in increasing z-order
        var p = node.zNext;

        while (p && p.zOrder <= maxZ) {
            if (p !== node.prev && p !== node.next &&
                this.isPointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
                this.computeArea(p.prev, p, p.next) >= 0) return false;
            p = p.zNext;
        }

        // then look for points in decreasing z-order
        p = node.zPrev;

        while (p && p.zOrder >= minZ) {
            if (p !== node.prev && p !== node.next &&
                this.isPointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
                this.computeArea(p.prev, p, p.next) >= 0) return false;
            p = p.zPrev;
        }

        return true;

    }

    private isEar(node: VertexNode) {

        let a = node.prev,
            b = node,
            c = node.next;

        if (this.computeArea(a, b, c) >= 0) return false; // reflex, can't be an ear

        // now make sure we don't have other points inside the potential ear
        var p = node.next.next;

        while (p !== node.prev) {

            if (this.isPointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y)
                && this.computeArea(p.prev, p, p.next) >= 0) {
                return false;
            }

            p = p.next;
        }

        return true;
    }

    private indexCurve(node: VertexNode) {

        var p = node;
        do {
            if (p.zOrder === null) p.zOrder = this.zOrder(p.x, p.y);
            p.zPrev = p.prev;
            p.zNext = p.next;
            p = p.next;
        } while (p !== node);

        p.zPrev.zNext = null;
        p.zPrev = null;

        this.sortLinked(p);
    }

    private sortLinked(list: VertexNode) {

        var i, p, q, e, tail, numMerges, pSize, qSize,
            inSize = 1;

        do {
            p = list;
            list = null;
            tail = null;
            numMerges = 0;

            while (p) {
                numMerges++;
                q = p;
                pSize = 0;
                for (i = 0; i < inSize; i++) {
                    pSize++;
                    q = q.zNext;
                    if (!q) break;
                }
                qSize = inSize;

                while (pSize > 0 || (qSize > 0 && q)) {

                    if (pSize !== 0 && (qSize === 0 || !q || p.zOrder <= q.zOrder)) {
                        e = p;
                        p = p.zNext;
                        pSize--;
                    } else {
                        e = q;
                        q = q.zNext;
                        qSize--;
                    }

                    if (tail) tail.zNext = e;
                    else list = e;

                    e.zPrev = tail;
                    tail = e;
                }

                p = q;
            }

            tail.zNext = null;
            inSize *= 2;

        } while (numMerges > 1);

        return list;
    }


    private zOrder(x: number, y: number) {

        let min = this.bounds.min;


        // coords are transformed into non-negative 15-bit integer range
        x = 32767 * (x - min.x) / this.size;
        y = 32767 * (y - min.y) / this.size;

        x = (x | (x << 8)) & 0x00FF00FF;
        x = (x | (x << 4)) & 0x0F0F0F0F;
        x = (x | (x << 2)) & 0x33333333;
        x = (x | (x << 1)) & 0x55555555;

        y = (y | (y << 8)) & 0x00FF00FF;
        y = (y | (y << 4)) & 0x0F0F0F0F;
        y = (y | (y << 2)) & 0x33333333;
        y = (y | (y << 1)) & 0x55555555;

        return x | (y << 1);
    }

    private splitNode(start: VertexNode, out: number[]) {

        let a = start;
        do {
            var b = a.next.next;
            while (b !== a.prev) {
                if (a.i !== b.i && this.isValidDiagonal(a, b)) {
                    // split the polygon in two by the diagonal
                    var c = this.splitPolygon(a, b);

                    // filter colinear points around the cuts
                    a = this.filterPoints(a, a.next);
                    c = this.filterPoints(c, c.next);

                    // run earcut on each half
                    this.processList(a, out);
                    this.processList(c, out);
                    return;
                }
                b = b.next;
            }
            a = a.next;
        } while (a !== start);

    }

    private splitPolygon(a: VertexNode, b: VertexNode) {
        var a2 = new VertexNode(a, a.i),
            b2 = new VertexNode(b, b.i),
            an = a.next,
            bp = b.prev;

        a.next = b;
        b.prev = a;

        a2.next = an;
        an.prev = a2;

        b2.next = a2;
        a2.prev = b2;

        bp.next = b2;
        b2.prev = bp;

        return b2;
    }

    private filterPoints(start: VertexNode, end?: VertexNode) {
        if (!start) return start;
        if (!end) end = start;

        var p = start,
            again;
        do {
            again = false;

            if (!p.steiner && (p.equals(p.next) || this.computeArea(p.prev, p, p.next) === 0)) {
                this.removeNode(p);
                p = end = p.prev;
                if (p === p.next) return null;
                again = true;

            } else {
                p = p.next;
            }
        } while (again || p !== end);

        return end;
    }

    private cureLocalIntersections(start: VertexNode, out: number[]) {
        var p = start;
        do {
            var a = p.prev,
                b = p.next.next;

            if (!a.equals(b) && this.intersects(a, p, p.next, b) && this.isLocallyInside(a, b) && this.isLocallyInside(b, a)) {

                out.push(a.i);
                out.push(p.i);
                out.push(b.i);

                // remove two nodes involved
                this.removeNode(p);
                this.removeNode(p.next);

                p = start = b;
            }
            p = p.next;
        } while (p !== start);

        return p;
    }

    private computeArea(p: VertexNode, q: VertexNode, r: VertexNode) {
        return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    }

    private isPointInTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, px: number, py: number) {
        return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
            (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
            (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
    }

    private isValidDiagonal(a: VertexNode, b: VertexNode) {
        return a.next.i !== b.i && a.prev.i !== b.i && !this.intersectsPolygon(a, b) &&
            this.isLocallyInside(a, b) && this.isLocallyInside(b, a) && this.isMiddleInside(a, b);
    }

    private intersectsPolygon(a: VertexNode, b: VertexNode) {
        var p = a;
        do {
            if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
                this.intersects(p, p.next, a, b)) return true;
            p = p.next;
        } while (p !== a);

        return false;
    }

    private intersects(p1: VertexNode, q1: VertexNode, p2: VertexNode, q2: VertexNode) {
        if ((p1.equals(q1) && p2.equals(q2)) ||
            (p1.equals(q2) && p2.equals(q1)))
            return true;

        return this.computeArea(p1, q1, p2) > 0 !== this.computeArea(p1, q1, q2) > 0 &&
            this.computeArea(p2, q2, p1) > 0 !== this.computeArea(p2, q2, q1) > 0;
    }

    private isLocallyInside(a: VertexNode, b: VertexNode) {
        return this.computeArea(a.prev, a, a.next) < 0 ?
            this.computeArea(a, b, a.next) >= 0 && this.computeArea(a, a.prev, b) >= 0 :
            this.computeArea(a, b, a.prev) < 0 || this.computeArea(a, a.next, b) < 0;
    }

    private isMiddleInside(a: VertexNode, b: VertexNode) {
        var p = a,
            inside = false,
            px = (a.x + b.x) / 2,
            py = (a.y + b.y) / 2;
        do {
            if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y &&
                (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))
                inside = !inside;
            p = p.next;
        } while (p !== a);

        return inside;
    }

    //private indexCurve

}


import { Vector2 } from '@uon/math';

const EPSILON = 1.0 / 1048576.0;


interface DelaunayCircle {
    i: number;
    j: number;
    k: number;
    x: number;
    y: number;
    r: number;

}

export function Delaunay(vertices: Vector2[]) {


    let n = vertices.length,
        i, j, indices, st, edges, dx, dy, a, b, c;

    let final_vertices: Vector2[] = [];

    /* Bail if there aren't enough vertices to form any triangles. */
    if (n < 3)
        return [];

    /* Slice out the actual vertices from the passed objects. (Duplicate the
     * array even if we don't, though, since we need to make a supertriangle
     * later on!) */
    vertices = vertices.slice(0);


    /* Make an array of indices into the vertex array, sorted by the
     * vertices' x-position. Force stable sorting by comparing indices if
     * the x-positions are equal. */
    indices = new Uint16Array(n);

    for (i = n; i--;)
        indices[i] = i;

    indices.sort(function (i, j) {
        var diff = vertices[j].x - vertices[i].x;
        return diff !== 0 ? diff : i - j;
    });

    /* Next, find the vertices of the supertriangle (which contains all other
     * triangles), and append them onto the end of a (copy of) the vertex
     * array. */
    st = CreateSuperTriangle(vertices);
    vertices.push(st[0], st[1], st[2]);

    /* Initialize the open list (containing the supertriangle and nothing
     * else) and the closed list (which is empty since we havn't processed
     * any triangles yet). */
    let open: DelaunayCircle[] = [GetCircle(vertices, n + 0, n + 1, n + 2)];
    let closed: DelaunayCircle[] = [];
    edges = [];

    /* Incrementally add each vertex to the mesh. */
    for (i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for (j = open.length; j--;) {
            /* If this point is to the right of this triangle's circumcircle,
             * then this triangle should never get checked again. Remove it
             * from the open list, add it to the closed list, and skip. */
            dx = vertices[c].x - open[j].x;
            if (dx > 0.0 && dx * dx > open[j].r) {
                closed.push(open[j]);
                open.splice(j, 1);
                continue;
            }

            /* If we're outside the circumcircle, skip this triangle. */
            dy = vertices[c].y - open[j].y;
            if (dx * dx + dy * dy - open[j].r > EPSILON)
                continue;

            /* Remove the triangle and add it's edges to the edge list. */
            edges.push(
                open[j].i, open[j].j,
                open[j].j, open[j].k,
                open[j].k, open[j].i
            );
            open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        RemoveDuplicatedEdges(edges);

        /* Add a new triangle for each edge. */
        for (j = edges.length; j;) {
            b = edges[--j];
            a = edges[--j];
            open.push(GetCircle(vertices, a, b, c));
        }
    }

    /* Copy any remaining open triangles to the closed list, and then
     * remove any triangles that share a vertex with the supertriangle,
     * building a list of triplets that represent triangles. */
    for (i = open.length; i--;)
        closed.push(open[i]);

    for (i = closed.length; i--;)
        if (closed[i].i < n && closed[i].j < n && closed[i].k < n)
            final_vertices.push(
                vertices[closed[i].i].clone(),
                vertices[closed[i].j].clone(),
                vertices[closed[i].k].clone());

    /* Yay, we're done! */

    return final_vertices;

}





function IsInsideTriangle(tri: Vector2[], p: Vector2) {


    /* Bounding box test first, for quick rejections. */
    if ((p.x < tri[0].x && p.x < tri[1].x && p.x < tri[2].x) ||
        (p.x > tri[0].x && p.x > tri[1].x && p.x > tri[2].x) ||
        (p.y < tri[0].y && p.y < tri[1].y && p.y < tri[2].y) ||
        (p.y > tri[0].y && p.y > tri[1].y && p.y > tri[2].y))
        return null;

    var a = tri[1].x - tri[0].x ,
        b = tri[2].x - tri[0].x ,
        c = tri[1].y - tri[0].y,
        d = tri[2].y - tri[0].y,
        i = a * d - b * c;

    /* Degenerate tri. */
    if (i === 0.0)
        return null;

    var u = (d * (p.x - tri[0].x) - b * (p.y - tri[0].y)) / i,
        v = (a * (p.y - tri[0].y) - c * (p.x - tri[0].x )) / i;

    /* If we're outside the tri, fail. */
    if (u < 0.0 || v < 0.0 || (u + v) > 1.0)
        return null;

    return new Vector2(u, v);

}


function CreateSuperTriangle(vertices: Vector2[]) {


    var xmin = Number.POSITIVE_INFINITY,
        ymin = Number.POSITIVE_INFINITY,
        xmax = Number.NEGATIVE_INFINITY,
        ymax = Number.NEGATIVE_INFINITY,
        i, dx, dy, dmax, xmid, ymid;

    for (i = vertices.length; i--;) {
        if (vertices[i].x < xmin) xmin = vertices[i].x;
        if (vertices[i].x > xmax) xmax = vertices[i].x;
        if (vertices[i].y < ymin) ymin = vertices[i].y;
        if (vertices[i].y > ymax) ymax = vertices[i].y;
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [
        new Vector2(xmid - 20 * dmax, ymid - dmax),
        new Vector2(xmid, ymid + 20 * dmax),
        new Vector2(xmid + 20 * dmax, ymid - dmax)
    ];

}


function GetCircle(vertices: Vector2[], i: number, j: number, k: number): DelaunayCircle {


    var x1 = vertices[i].x,
        y1 = vertices[i].y,
        x2 = vertices[j].x,
        y2 = vertices[j].y,
        x3 = vertices[k].x,
        y3 = vertices[k].y,
        fabsy1y2 = Math.abs(y1 - y2),
        fabsy2y3 = Math.abs(y2 - y3),
        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

    /* Check for coincident points */
    if (fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
        throw new Error("Eek! Coincident points!");

    if (fabsy1y2 < EPSILON) {
        m2 = -((x3 - x2) / (y3 - y2));
        mx2 = (x2 + x3) / 2.0;
        my2 = (y2 + y3) / 2.0;
        xc = (x2 + x1) / 2.0;
        yc = m2 * (xc - mx2) + my2;
    }

    else if (fabsy2y3 < EPSILON) {
        m1 = -((x2 - x1) / (y2 - y1));
        mx1 = (x1 + x2) / 2.0;
        my1 = (y1 + y2) / 2.0;
        xc = (x3 + x2) / 2.0;
        yc = m1 * (xc - mx1) + my1;
    }

    else {
        m1 = -((x2 - x1) / (y2 - y1));
        m2 = -((x3 - x2) / (y3 - y2));
        mx1 = (x1 + x2) / 2.0;
        mx2 = (x2 + x3) / 2.0;
        my1 = (y1 + y2) / 2.0;
        my2 = (y2 + y3) / 2.0;
        xc = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
        yc = (fabsy1y2 > fabsy2y3) ?
            m1 * (xc - mx1) + my1 :
            m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return { i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy };
}



function RemoveDuplicatedEdges(edges: number[]) {

    var i, j, a, b, m, n;

    for (j = edges.length; j;) {
        b = edges[--j];
        a = edges[--j];

        for (i = j; i;) {
            n = edges[--i];
            m = edges[--i];

            if ((a === m && b === n) || (a === n && b === m)) {
                edges.splice(j, 2);
                edges.splice(i, 2);
                break;
            }
        }
    }
}
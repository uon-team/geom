import { Vector2, Box2 } from '@uon/math';

import { Segment2 } from './Segment2';
import { Line2 } from './Line2';
import { ConvexHull } from './ConvexHull';


const MAX_CONCAVE_ANGLE_COS = Math.cos(90 / (180 / Math.PI)); // angle = 90 deg
const MAX_SEARCH_BBOX_SIZE_PERCENT = 0.1;


export function ConcaveHull(pointset: Vector2[], concavity: number = 1.5) {

    let points = SortByX(pointset.slice(0));
    let rect = new Box2().setFromPoints(pointset);
    let size = rect.getSize();
    let max_search_area = size.clone().multiplyScalar(MAX_SEARCH_BBOX_SIZE_PERCENT);

    let convex = ConvexHull(points);

    let inner_points = points.filter((p) => {
        return convex.indexOf(p) < 0;
    });

    console.log('concex', convex.length, inner_points.length);

    let cell_size = Math.ceil(1 / (points.length / (size.x * size.y)));


    let concave = ComputeHull(
        convex, Math.pow(concavity, 2),
        max_search_area, new Grid(inner_points, cell_size), {});

    return concave;


}



function ComputeHull(convex: Vector2[], maxEdgeLenSq: number, maxSearchArea: Vector2, grid: Grid, skipList: any): Vector2[] {


    let rect = new Box2();
    let extended_rect = new Box2();

    let edge = new Segment2();
    let mid_point: Vector2 = null;
    let size: Vector2 = null;
    let mid_point_inserted = false;

    for (var i = 0; i < convex.length - 1; i++) {
        edge.set(convex[i], convex[i + 1]);
        let keyInSkipList = edge.p1.toString() + ',' + edge.p2.toString();

        if (edge.lengthSq() < maxEdgeLenSq || skipList[keyInSkipList] === true) {
            continue;
        }

        let scaleFactor = 0;
        rect.setFromPoints([edge.p1, edge.p2]);
        //size = rect.getSize();
        do {

            extended_rect = grid.extendRect(rect, scaleFactor, extended_rect);
            size = extended_rect.getSize();
            mid_point = MidPoint(edge, grid.getRange(extended_rect), convex);
            scaleFactor++;

        }
        while (mid_point === null && (maxSearchArea.x > size.x || maxSearchArea.y > size.y));

        if (size.x >= maxSearchArea.x && size.y >= maxSearchArea.y) {
            skipList[keyInSkipList] = true;
        }

        if (mid_point !== null) {
            //console.log('found mid')
            convex.splice(i + 1, 0, mid_point);
            grid.removePoint(mid_point);
            mid_point_inserted = true;
        }
    }

    if (mid_point_inserted) {
        return ComputeHull(convex, maxEdgeLenSq, maxSearchArea, grid, skipList);
    }

    return convex;


}



function SortByX(pointset: Vector2[]) {
    return pointset.sort(function (a, b) {
        if (a.x == b.x) {
            return b.y - a.y;
        } else {
            return b.x - a.x;
        }
    });
}


function Cos(o: Vector2, a: Vector2, b: Vector2) {

    var aShifted = Vector2.Sub(a, o),
        bShifted = Vector2.Sub(b, o),
        sqALen = o.distanceSq(a),
        sqBLen = o.distanceSq(b),
        dot = aShifted.x * bShifted.x + aShifted.y * bShifted.y;

    return dot / Math.sqrt(sqALen * sqBLen);
}


function Intersects(segment: Segment2, pointset: Vector2[]) {

    for (var i = 0; i < pointset.length - 1; i++) {
        let p1 = pointset[i];
        let p2 = pointset[i + 1];

        if (segment.p1.equals(p1) || segment.p1.equals(p2)) {
            continue;
        }
        if (Segment2.Intersect(segment.p1, segment.p2, p1, p2)) {
            return true;
        }
    }
    return false;
}


function MidPoint(edge: Segment2, innerPoints: Vector2[], convex: Vector2[]) {
    var point = null,
        angle1Cos = MAX_CONCAVE_ANGLE_COS,
        angle2Cos = MAX_CONCAVE_ANGLE_COS,
        a1Cos, a2Cos;

    for (var i = 0; i < innerPoints.length; i++) {
        a1Cos = Cos(edge.p1, edge.p2, innerPoints[i]);
        a2Cos = Cos(edge.p2, edge.p1, innerPoints[i]);

        if (a1Cos > angle1Cos && a2Cos > angle2Cos &&
            !Intersects(new Segment2(edge.p1, innerPoints[i]), convex) &&
            !Intersects(new Segment2(edge.p2, innerPoints[i]), convex)) {

            angle1Cos = a1Cos;
            angle2Cos = a2Cos;
            point = innerPoints[i];
        }
    }

    //console.log('ficj mid');
    return point;
}



function RectAround(edge: Segment2) {
    return new Box2().setFromPoints([edge.p1, edge.p2]);
}


class Grid {

    cells: Vector2[][][] = [];
    cellSize: number;

    constructor(points: Vector2[], cellSize: number) {

        this.cellSize = cellSize;

        points.forEach((point) => {
            var cellXY = this.getCellCoords(point),
                x = cellXY[0],
                y = cellXY[1];

            if (this.cells[x] === undefined) {
                this.cells[x] = [];
            }
            if (this.cells[x][y] === undefined) {
                this.cells[x][y] = [];
            }
            this.cells[x][y].push(point);
        }, this);
    }


    get(x: number, y: number) {

        return (this.cells[x] !== undefined && this.cells[x][y] !== undefined) ? this.cells[x][y] : [];
    }

    getRange(rect: Box2) {

        var tlCellXY = this.getCellCoords(rect.min),
            brCellXY = this.getCellCoords(rect.max),
            points: Vector2[] = [];

        for (var x = tlCellXY[0]; x <= brCellXY[0]; x++) {
            for (var y = tlCellXY[1]; y <= brCellXY[1]; y++) {
                points = points.concat(this.get(x, y));
            }
        }

        return points;
    }


    removePoint(point: Vector2) {
        var cellXY = this.getCellCoords(point),
            cell = this.cells[cellXY[0]][cellXY[1]],
            pointIdxInCell;

        for (var i = 0; i < cell.length; i++) {
            if (cell[i].x === point.x && cell[i].y === point.y) {
                pointIdxInCell = i;
                break;
            }
        }

        cell.splice(pointIdxInCell, 1);

        return cell;
    }

    getCellCoords(point: Vector2) {

        let x = Math.round(point.x / this.cellSize),
            y = Math.round(point.y / this.cellSize);
        return [x, y];
    }

    extendRect(rect: Box2, scaleFactor: number, out: Box2) { // (Array, Number) -> Array

        let s = (scaleFactor * this.cellSize)

        out.min.x = rect.min.x - s;
        out.min.y = rect.min.y - s;
        out.max.x = rect.max.x + s;
        out.max.y = rect.max.y + s;


        return out;
    }
}
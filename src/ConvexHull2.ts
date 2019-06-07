

import { Vector2 } from '@uon/math';

/**
 * Compute a convex polygon encompassing a pointset
 * @param pointset 
 */
export function ConvexHull2(pointset: Vector2[]) {

    let convex: Vector2[],
        upper = UpperTangent(pointset),
        lower = LowerTangent(pointset);
    convex = lower.concat(upper);

    // append first point at end
    convex.push(pointset[0]);
    
    return convex;  
}



function UpperTangent(pointset: Vector2[]) {
    var lower = [];
    for (var l = 0; l < pointset.length; l++) {
        while (lower.length >= 2 && (Cross(lower[lower.length - 2], lower[lower.length - 1], pointset[l]) <= 0)) {
            lower.pop();
        }
        lower.push(pointset[l]);
    }
    lower.pop();
    return lower;
}

function LowerTangent(pointset: Vector2[]) {
    var reversed = pointset.reverse(),
        upper = [];
    for (var u = 0; u < reversed.length; u++) {
        while (upper.length >= 2 && (Cross(upper[upper.length - 2], upper[upper.length - 1], reversed[u]) <= 0)) {
            upper.pop();
        }
        upper.push(reversed[u]);
    }
    upper.pop();
    return upper;
}


function Cross(o: Vector2, a: Vector2, b: Vector2) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
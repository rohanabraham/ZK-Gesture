program aleo_contract.aleo {

    struct Point {
        x: i64,
        y: i64
    }

    struct PointsCombinationDistance {
        point1: Point,
        point2: Point,
        distance: i64
    }

    mapping accountReferencePoints: address => [Point; 21];


    inline calculate_distance(point1: Point, point2: Point) -> i64 {
        let dx: i64 = (point2.x > point1.x) ? point2.x - point1.x : point1.x - point2.x;
        let dy: i64 = (point2.y > point1.y) ? point2.y - point1.y : point1.y - point2.y;

        let dxy: i64 = dx * dx + dy * dy;


        return dxy;
    }

    transition set_reference_points(owner: address, referencePoints: [Point; 21])  {
        return then finalize(owner, referencePoints);
    }

    finalize set_reference_points(owner: address, referencePoints: [Point; 21]) {
        Mapping::set(accountReferencePoints, owner, referencePoints);
    }

    transition verify(owner: address, userPoints: [Point; 21]) -> bool {
        return  then finalize(owner, userPoints);
    }

    finalize verify(owner: address, userPoints: [Point; 21]) {
        let referencePoints: [Point; 21] = Mapping::get(accountReferencePoints, owner);
        

        let referencePointsCombinationDistance: [PointsCombinationDistance;7] = [
            PointsCombinationDistance {point1: referencePoints[8u8],point2: referencePoints[12u8],distance: calculate_distance(referencePoints[8u8],referencePoints[12u8])},
            PointsCombinationDistance {point1: referencePoints[12u8],point2: referencePoints[16u8],distance: calculate_distance(referencePoints[12u8],referencePoints[16u8])},
            PointsCombinationDistance {point1: referencePoints[16u8],point2: referencePoints[20u8],distance: calculate_distance(referencePoints[16u8],referencePoints[20u8])},
            PointsCombinationDistance {point1: referencePoints[0u8],point2: referencePoints[8u8],distance: calculate_distance(referencePoints[0u8],referencePoints[8u8])},
            PointsCombinationDistance {point1: referencePoints[0u8],point2: referencePoints[12u8],distance: calculate_distance(referencePoints[0u8],referencePoints[12u8])},
            PointsCombinationDistance {point1: referencePoints[0u8],point2: referencePoints[16u8],distance: calculate_distance(referencePoints[0u8],referencePoints[16u8])},
            PointsCombinationDistance {point1: referencePoints[0u8],point2: referencePoints[20u8],distance: calculate_distance(referencePoints[0u8],referencePoints[20u8])}
        ];

        let userPointsCombinationDistance: [PointsCombinationDistance;7] = [
            PointsCombinationDistance {point1: userPoints[8u8],point2: userPoints[12u8],distance: calculate_distance(userPoints[8u8],userPoints[12u8])},
            PointsCombinationDistance {point1: userPoints[12u8],point2: userPoints[16u8],distance: calculate_distance(userPoints[12u8],userPoints[16u8])},
            PointsCombinationDistance {point1: userPoints[16u8],point2: userPoints[20u8],distance: calculate_distance(userPoints[16u8],userPoints[20u8])},
            PointsCombinationDistance {point1: userPoints[0u8],point2: userPoints[8u8],distance: calculate_distance(userPoints[0u8],userPoints[8u8])},
            PointsCombinationDistance {point1: userPoints[0u8],point2: userPoints[12u8],distance: calculate_distance(userPoints[0u8],userPoints[12u8])},
            PointsCombinationDistance {point1: userPoints[0u8],point2: userPoints[16u8],distance: calculate_distance(userPoints[0u8],userPoints[16u8])},
            PointsCombinationDistance {point1: userPoints[0u8],point2: userPoints[20u8],distance: calculate_distance(userPoints[0u8],userPoints[20u8])}
        ];


        let total_difference: i64 = 0i64;
        for i: u8 in 0u8..7u8 {
            total_difference += (referencePointsCombinationDistance[i].distance - userPointsCombinationDistance[i].distance);

        }

        let average_difference: i64 =  total_difference / 7i64;

        let match: bool = average_difference <= 25i64;

        assert(match == true);
    }
}
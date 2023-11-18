import {
  Card,
  Alert,
  Container,
  Row,
  Col,
  Table,
  Button,
  Accordion,
} from "react-bootstrap";
import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as scatter from "scatter-gl";
import { isMobile } from "react-device-detect";

const HandPoseDetection = () => {
  const params = {
    DEFAULT_LINE_WIDTH: 2,
    VIDEO_SIZE: {
      //"640 X 480": { width: 640, height: 480 },
      //"640 X 360": { width: 640, height: 360 },
      "480 X 360": { width: 480, height: 360 },
      "360 X 270": { width: 360, height: 270 },
    },
    STATE: {
      camera: { targetFPS: 60, sizeOption: "480 X 360" },
      backend: "",
      flags: {},
      modelConfig: {
        type: "full",
        render3D: false,
      },
    },
  };

  // These anchor points allow the hand pointcloud to resize according to its
  // position in the input.
  const ANCHOR_POINTS = [
    [0, 0, 0],
    [0, 0.1, 0],
    [-0.1, 0, 0],
    [-0.1, -0.1, 0],
  ];

  const fingerLookupIndices = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20],
  }; // for rendering each finger as a polyline

  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20],
  ];

  const [isSetCamera, setIsSetCamera] = useState(false);
  const videoRef = useRef(null);
  const referenceOutputRef = useRef(null);
  const referenceCtxRef = useRef(null);
  const userOutputRef = useRef(null);
  const userCtxRef = useRef(null);
  const scatterGlContainerLeft = useRef(null);
  const scatterGlContainerRight = useRef(null);

  const [pointsDistance, setPointsDistance] = useState([]);
  const [pointsCombinationDistance, setPointsCombinationDistance] = useState(
    []
  );

  const detectorRef = useRef(null);

  //let detector, rafId;
  let scatterGLCtxtLeftHand, scatterGLCtxtRightHand;

  function drawCtx(ctx) {
    let video = videoRef.current;

    ctx.drawImage(video, 0, 0, video.width, video.height);
  }

  function clearCtx(ctx) {
    let video = videoRef.current;

    ctx.clearRect(0, 0, video.width, video.height);
  }

  // function drawCtxCrop(hands) {
  //   const hand = hands.find((hand) => hand.handedness === "Right");
  //   if (!hand) return;

  //   // // Initialize min and max coordinates
  //   let minX = video.width;
  //   let minY = video.height;
  //   let maxX = 0;
  //   let maxY = 0;

  //   // // Iterate through each point to find min and max coordinates
  //   for (let i = 0; i < hand.keypoints.length; i++) {
  //     let point = hand.keypoints[i];

  //     minX = Math.min(minX, point.x);
  //     minY = Math.min(minY, point.y);
  //     maxX = Math.max(maxX, point.x);
  //     maxY = Math.max(maxY, point.y);
  //   }

  //   minX = minX - 10;
  //   minY = minY - 10;
  //   maxX = maxX + 10;
  //   maxY = maxY + 10;
  //   // // Calculate the width and height of the bounding box
  //   let width = maxX - minX;
  //   let height = maxY - minY;
  //   console.log(`minX: ${minX} minY: ${minY} maxX: ${maxX} maxY: ${maxY} width: ${width} height: ${height}`);
  //   // ctx.drawImage(video, 0, 0, width, height);
  //   ctx.drawImage(
  //     video,
  //     minX,
  //     minY,
  //     width,
  //     height,
  //     0,
  //     0,
  //     video.width,
  //     video.height
  //   );
  // }

  /**
   * Draw the keypoints on the video.
   * @param hands A list of hands to render.
   */
  function drawResults(hands, ctx) {
    // Sort by right to left hands.
    hands.sort((hand1, hand2) => {
      if (hand1.handedness < hand2.handedness) return 1;
      if (hand1.handedness > hand2.handedness) return -1;
      return 0;
    });

    // Pad hands to clear empty scatter GL plots.
    while (hands.length < 2) hands.push({});

    for (let i = 0; i < hands.length; ++i) {
      // Third hand and onwards scatterGL context is set to null since we
      // don't render them.
      const ctxt = [scatterGLCtxtLeftHand, scatterGLCtxtRightHand][i];
      drawResult(hands[i], ctxt, ctx);
    }
  }

  /**
   * Draw the keypoints on the video.
   * @param hand A hand with keypoints to render.
   * @param ctxt Scatter GL context to render 3D keypoints to.
   */
  function drawResult(hand, ctxt, ctx) {
    if (hand.keypoints != null) {
      drawKeypoints(hand.keypoints, hand.handedness, ctx);
    }
    // Don't render 3D hands after first two.
    if (ctxt == null) {
      return;
    }
    if (hand.keypoints3D != null && params.STATE.modelConfig.render3D) {
      drawKeypoints3D(hand.keypoints3D, hand.handedness, ctxt);
    } else {
      // Clear scatter plot.
      drawKeypoints3D([], "", ctxt);
    }
  }

  /**
   * Draw the keypoints on the video.
   * @param keypoints A list of keypoints.
   * @param handedness Label of hand (either Left or Right).
   */
  function drawKeypoints(keypoints, handedness, ctx) {
    const keypointsArray = keypoints;
    ctx.fillStyle = handedness === "Left" ? "Red" : "Blue";
    ctx.strokeStyle = "White";
    ctx.lineWidth = params.DEFAULT_LINE_WIDTH;

    for (let i = 0; i < keypointsArray.length; i++) {
      const y = keypointsArray[i].x;
      const x = keypointsArray[i].y;

      drawPoint(x - 2, y - 2, 3, ctx);
    }

    const fingers = Object.keys(fingerLookupIndices);
    for (let i = 0; i < fingers.length; i++) {
      const finger = fingers[i];
      const points = fingerLookupIndices[finger].map((idx) => keypoints[idx]);
      drawPath(points, false, ctx);
    }
  }

  function drawPath(points, closePath, ctx) {
    const region = new Path2D();
    region.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      region.lineTo(point.x, point.y);
    }

    if (closePath) {
      region.closePath();
    }
    ctx.stroke(region);
  }

  function drawPoint(y, x, r, ctx) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawKeypoints3D(keypoints, handedness, ctxt) {
    const scoreThreshold = params.STATE.modelConfig.scoreThreshold || 0;
    const pointsData = keypoints.map((keypoint) => [
      -keypoint.x,
      -keypoint.y,
      -keypoint.z,
    ]);

    const dataset = new scatter.ScatterGL.Dataset([
      ...pointsData,
      ...ANCHOR_POINTS,
    ]);

    ctxt.scatterGL.setPointColorer((i) => {
      if (keypoints[i] == null || keypoints[i].score < scoreThreshold) {
        // hide anchor points and low-confident points.
        return "#ffffff";
      }
      return handedness === "Left" ? "#ff0000" : "#0000ff";
    });

    if (!ctxt.scatterGLHasInitialized) {
      ctxt.scatterGL.render(dataset);
    } else {
      ctxt.scatterGL.updateDataset(dataset);
    }
    const sequences = connections.map((pair) => ({ indices: pair }));
    ctxt.scatterGL.setSequences(sequences);
    ctxt.scatterGLHasInitialized = true;
  }

  async function createDetector() {
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
      runtime: "tfjs", // or 'tfjs',
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      modelType: "full",
    };
    detectorRef.current = await handPoseDetection.createDetector(
      model,
      detectorConfig
    );
  }

  async function setupCamera() {
    const { targetFPS, sizeOption } = params.STATE.camera;
    let referenceCtx = referenceCtxRef.current;
    let userCtx = userCtxRef.current;
    let video = videoRef.current;
    let referenceCanvas = referenceOutputRef.current;
    let userCanvas = userOutputRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        // Only setting the video to a specified size for large screen, on
        // mobile devices accept the default size.
        width: isMobile
          ? params.VIDEO_SIZE["360 X 270"].width
          : params.VIDEO_SIZE[sizeOption].width,
        height: isMobile
          ? params.VIDEO_SIZE["360 X 270"].height
          : params.VIDEO_SIZE[sizeOption].height,
        frameRate: {
          // ideal: targetFPS,
        },
      },
    });
    video.srcObject = stream;

    const videoWidth = parseInt(video.style.width);
    const videoHeight = parseInt(video.style.height);

    video.width = videoWidth;
    video.height = videoHeight;

    referenceCanvas.width = videoWidth;
    referenceCanvas.height = videoHeight;

    userCanvas.width = videoWidth;
    userCanvas.height = videoHeight;

    //const canvasContainer = document.querySelector(".canvas-wrapper");
    //canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

    // Because the image from camera is mirrored, need to flip horizontally.
    referenceCtx.translate(video.width, 0);
    referenceCtx.scale(-1, 1);

    userCtx.translate(video.width, 0);
    userCtx.scale(-1, 1);

    for (const ctxt of [scatterGLCtxtLeftHand, scatterGLCtxtRightHand]) {
      ctxt.scatterGLEl.style = `width: ${
        videoWidth / (isMobile ? 2 : 1)
      }px; height: ${videoHeight / (isMobile ? 2 : 1)}px;`;
      ctxt.scatterGL.resize();

      ctxt.scatterGLEl.style.display = params.STATE.modelConfig.render3D
        ? "inline-block"
        : "none";
    }

    setIsSetCamera(true);
  }

  const estimateHands = async (ctx) => {
    let video = videoRef.current;

    let hands = null;
    // Detectors can throw errors, for example when using custom URLs that
    // contain a model that doesn't provide the expected output.

    let detector = detectorRef.current;

    if (!detector) return;

    try {
      hands = await detector.estimateHands(video, {
        flipHorizontal: false,
      });
    } catch (error) {
      detector.dispose();
      detector = null;
      console.log(error);
    }

    drawCtx(ctx);

    if (hands && hands.length > 0) {
      console.log(hands);
      //drawCtx(hands);
      drawResults(hands, ctx);
      //compareResults(hands);
    }

    return hands;
  };

  function createScatterGLContext(scatterGLEl) {
    // const scatterGLEl = document.querySelector(selectors);
    return {
      scatterGLEl,
      scatterGL: new scatter.ScatterGL(scatterGLEl, {
        rotateOnStart: true,
        selectEnabled: false,
        styles: { polyline: { defaultOpacity: 1, deselectedOpacity: 1 } },
      }),
      scatterGLHasInitialized: false,
    };
  }

  const init = async () => {
    let video = videoRef.current;
    let referenceCanvas = referenceOutputRef.current;
    let userCanvas = userOutputRef.current;
    //video = videoRef.current;
    //referenceCanvas = referenceOutputRef.current;
    referenceCtxRef.current = referenceCanvas.getContext("2d");

    //userCanvas = userOutputRef.current;
    userCtxRef.current = userCanvas.getContext("2d");

    scatterGLCtxtLeftHand = createScatterGLContext(
      scatterGlContainerLeft.current
    );
    scatterGLCtxtRightHand = createScatterGLContext(
      scatterGlContainerRight.current
    );

    //setupCamera();
    createDetector();

    //rafId = requestAnimationFrame(estimateHands);
    //estimateHands();
    //setInterval(estimateHands, 5000);
  };

  useEffect(() => {
    init();
  }, []);

  // Your reference set of points
  const [referencePoints, setReferencePoints] = useState(null);
  const [userPoints, setUserPoints] = useState(null);

  const calculateDistance = (point1, point2) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    //const dz = point2.z - point1.z;

    //return Math.sqrt(dx * dx + dy * dy + dz * dz);
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculatePointsDistance = (userPoints, referencePoints) => {
    var pointsDistanceResults = [];
    for (var userPoint of userPoints) {
      var referencePoint = referencePoints.find(
        (referencePoint) => referencePoint.name == userPoint.name
      );

      const distance = calculateDistance(userPoint, referencePoint);
      pointsDistanceResults.push({
        userPoint: userPoint,
        referencePoint: referencePoint,
        distance: distance,
      });
    }

    return pointsDistanceResults;
  };

  // const compareResults = (hands) => {
  //   // Sort by right to left hands.
  //   hands.sort((hand1, hand2) => {
  //     if (hand1.handedness < hand2.handedness) return 1;
  //     if (hand1.handedness > hand2.handedness) return -1;
  //     return 0;
  //   });

  //   // const hand = hands.find((hand) => hand.handedness === "Right");
  //   const hand = hands[0];
  //   if (!hand) {
  //     setPointsDistance([]);
  //     return;
  //   }

  //   const userPoints = hand.keypoints;

  //   const pointsDistanceResults = calculatePointsDistance(
  //     userPoints,
  //     referencePoints
  //   );
  //   setPointsDistance(pointsDistanceResults);
  // };

  const captureReferencePoints = async () => {
    let referenceCtx = referenceCtxRef.current;
    console.log("referenceCtx", referenceCtx);
    const hands = await estimateHands(referenceCtx);
    const points = hands && hands[0] ? hands[0].keypoints : [];
    const normalizedPoints = normalizePoints(points);
    setReferencePoints({
      keyPoints: points,
      normalizedPoints: normalizedPoints,
    });
  };

  const captureUserPoints = async () => {
    let userCtx = userCtxRef.current;
    console.log("userCtx", userCtx);
    const hands = await estimateHands(userCtx);
    const points = hands && hands[0] ? hands[0].keypoints : [];
    const normalizedPoints = normalizePoints(points);
    setUserPoints({ keyPoints: points, normalizedPoints: normalizedPoints });
  };

  const comparePoints = () => {
    if (!userPoints || !referencePoints) return;
    // var pointNames = [
    //   "wrist",
    //   "thumb_tip",
    //   "index_finger_tip",
    //   "middle_finger_tip",
    //   "ring_finger_tip",
    //   "pinky_finger_tip",
    // ];

    // const keyPointsDistanceResults = calculatePointsDistance(
    //   userPoints.keyPoints,
    //   referencePoints.keyPoints
    // );

    // const normalizedPointsDistanceResults = calculatePointsDistance(
    //   userPoints.normalizedPoints,
    //   referencePoints.normalizedPoints
    // );

    // setPointsDistance({
    //   keyPoints: keyPointsDistanceResults,
    //   normalizedPoints: normalizedPointsDistanceResults,
    // });

    //Case2
    let matchCombinationsNames = [
      //["thumb_tip", "index_finger_tip"],
      ["index_finger_tip", "middle_finger_tip"],
      ["middle_finger_tip", "ring_finger_tip"],
      ["ring_finger_tip", "pinky_finger_tip"],
      ["wrist", "index_finger_tip"],
      ["wrist", "middle_finger_tip"],
      ["wrist", "ring_finger_tip"],
      ["wrist", "pinky_finger_tip"],
    ];

    var referencePointsCombinationDistance = uniqueCombinations(
      referencePoints.normalizedPoints,
      matchCombinationsNames
    ).map((record) => ({
      ...record,
      distance: calculateDistance(record[0], record[1]),
    }));

    var userPointsCombinationDistance = uniqueCombinations(
      userPoints.normalizedPoints,
      matchCombinationsNames
    ).map((record) => ({
      ...record,
      distance: calculateDistance(record[0], record[1]),
    }));

    console.log(
      referencePointsCombinationDistance,
      userPointsCombinationDistance
    );

    const pointsCombinationDistance = new Array(matchCombinationsNames.length)
      .fill({
        referencePoints: null,
        userPoints: null,
        difference: null,
      })
      .map((record, index) => ({
        ...record,
        referencePoints: referencePointsCombinationDistance[index],
        userPoints: userPointsCombinationDistance[index],
        difference: Math.abs(
          referencePointsCombinationDistance[index].distance -
            userPointsCombinationDistance[index].distance
        ),
      }));

    console.log(pointsCombinationDistance);
    setPointsCombinationDistance(pointsCombinationDistance);

    //Matching tip to tip distance and difference starts
    // let matchNames = [
    //   "thumb_tip",
    //   "index_finger_tip",
    //   "middle_finger_tip",
    //   "ring_finger_tip",
    //   "pinky_finger_tip",
    // ];

    // var referencePointsCombinationDistance = uniqueCombinations(
    //   referencePoints.normalizedPoints.filter((referencePoint) =>
    //     matchNames.includes(referencePoint.name)
    //   )
    // ).map((record) => ({
    //   ...record,
    //   distance: calculateDistance(record[0], record[1]),
    // }));

    // var userPointsCombinationDistance = uniqueCombinations(
    //   userPoints.normalizedPoints.filter((referencePoint) =>
    //     matchNames.includes(referencePoint.name)
    //   )
    // ).map((record) => ({
    //   ...record,
    //   distance: calculateDistance(record[0], record[1]),
    // }));

    // console.log(
    //   referencePointsCombinationDistance,
    //   userPointsCombinationDistance
    // );

    // Combine the two arrays
    // const pointsCombinationDistance = new Array(10)
    //   .fill({
    //     referencePoints: null,
    //     userPoints: null,
    //     difference: null,
    //   })
    //   .map((record, index) => ({
    //     ...record,
    //     referencePoints: referencePointsCombinationDistance[index],
    //     userPoints: userPointsCombinationDistance[index],
    //     difference: Math.abs(
    //       referencePointsCombinationDistance[index].distance -
    //         userPointsCombinationDistance[index].distance
    //     ),
    //   }));

    // console.log(pointsCombinationDistance);
    // setPointsCombinationDistance(pointsCombinationDistance);
  };

  const normalizePoints = (points, size = 1000) => {
    if (points.length === 0) return [];
    let normalizedPoints = [];

    for (const point of points) {
      let normalizedPoint = { ...point };
      normalizedPoints.push(normalizedPoint);
    }

    //Step1
    // let minX = normalizedPoints[0].x;
    // let minY = normalizedPoints[0].y;
    // for (const normalizedPoint of normalizedPoints) {
    //   minX = Math.min(minX, normalizedPoint.x);
    //   minY = Math.min(minY, normalizedPoint.y);
    // }
    const minX = Math.min(
      ...normalizedPoints.map((normalizedPoint) => normalizedPoint.x)
    );
    const minY = Math.min(
      ...normalizedPoints.map((normalizedPoint) => normalizedPoint.y)
    );

    normalizedPoints = normalizedPoints.map((normalizedPoint) => ({
      ...normalizedPoint,
      x: normalizedPoint.x - minX,
      y: normalizedPoint.y - minY,
    }));

    // for (const normalizedPoint of normalizedPoints) {
    //   normalizedPoint.x = normalizedPoint.x - minX;
    //   normalizedPoint.y = normalizedPoint.y - minY;
    // }

    //Step2
    // let maxX = normalizedPoints[0].x;
    // let maxY = normalizedPoints[0].y;
    // for (const normalizedPoint of normalizedPoints) {
    //   maxX = Math.max(maxX, normalizedPoint.x);
    //   maxY = Math.max(maxY, normalizedPoint.y);
    // }
    const maxX = Math.max(
      ...normalizedPoints.map((normalizedPoint) => normalizedPoint.x)
    );
    const maxY = Math.max(
      ...normalizedPoints.map((normalizedPoint) => normalizedPoint.y)
    );

    let maxXY = Math.max(maxX, maxY);
    let multiplicationFactor = size / maxXY;
    console.log(
      `minX: ${minX} minY:${minY} maxX:${maxX} maxY:${maxY} maxXY:${maxXY} multiplicationFactor:${multiplicationFactor}`
    );

    // for (const normalizedPoint of normalizedPoints) {
    //   normalizedPoint.x = normalizedPoint.x * multiplicationFactor;
    //   normalizedPoint.y = normalizedPoint.y * multiplicationFactor;
    // }
    normalizedPoints = normalizedPoints.map((normalizedPoint) => ({
      ...normalizedPoint,
      x: normalizedPoint.x * multiplicationFactor,
      y: normalizedPoint.y * multiplicationFactor,
    }));

    console.log(points, normalizedPoints);
    return normalizedPoints;
  };

  // const uniqueCombinations = (points) => {
  //   const uniqueCombinations = [];

  //   for (let i = 0; i < points.length; i++) {
  //     for (let j = i + 1; j < points.length; j++) {
  //       const combination = [points[i], points[j]];

  //       // Check if the combination already exists in uniqueCombinations
  //       const isDuplicate = uniqueCombinations.some(
  //         ([recordA, recordB]) =>
  //           (recordA.name === combination[0].name &&
  //             recordB.name === combination[1].name) ||
  //           (recordA.name === combination[1].name &&
  //             recordB.name === combination[0].name)
  //       );

  //       if (!isDuplicate) {
  //         uniqueCombinations.push(combination);
  //       }
  //     }
  //   }

  //   return uniqueCombinations;
  // };

  const uniqueCombinations = (points, matchCombinationsNames) => {
    const uniqueCombinations = [];
    matchCombinationsNames.forEach((matchCombinationNames) => {
      var combination = [];
      combination.push(
        points.find(
          (referencePoint) => matchCombinationNames[0] === referencePoint.name
        )
      );
      combination.push(
        points.find(
          (referencePoint) => matchCombinationNames[1] === referencePoint.name
        )
      );

      // Check if the combination already exists in uniqueCombinations
      const isDuplicate = uniqueCombinations.some(
        ([recordA, recordB]) =>
          (recordA.name === combination[0].name &&
            recordB.name === combination[1].name) ||
          (recordA.name === combination[1].name &&
            recordB.name === combination[0].name)
      );

      if (!isDuplicate) {
        uniqueCombinations.push(combination);
      }
    });

    return uniqueCombinations;
  };

  return (
    <div>
      <Card>
        <Card.Body>
          <Card.Title>Hand Pose</Card.Title>
          <Row>
            <Col>
              <div
                style={{
                  position: "relative",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onClick={setupCamera}
              >
                <h6>Video stream</h6>
                <video
                  //id="video"
                  playsInline
                  autoPlay
                  style={{
                    WebkitTransform: "scaleX(-1)",
                    transform: "scaleX(-1)",
                    //visibility: "hidden",
                    backgroundColor: "black",
                    width: `${
                      isMobile
                        ? params.VIDEO_SIZE["360 X 270"].width
                        : params.VIDEO_SIZE[params.STATE.camera.sizeOption]
                            .width
                    }px`,
                    height: `${
                      isMobile
                        ? params.VIDEO_SIZE["360 X 270"].height
                        : params.VIDEO_SIZE[params.STATE.camera.sizeOption]
                            .height
                    }px`,
                    backgroundImage: !isSetCamera
                      ? 'url("./images/camera.png")'
                      : "none",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                  ref={videoRef}
                ></video>
                {!isSetCamera ? (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: "65%",
                        left: "20%",
                        right: "20%",
                      }}
                    >
                      Step 1 : Video stream
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        top: "20%",
                        left: "20%",
                        right: "20%",
                      }}
                    >
                      Click here to enable camera access
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "20%",
                        left: "20%",
                        right: "20%",
                      }}
                    >
                      Images remain on your browser only
                    </div>
                  </>
                ) : null}
              </div>
              <br />
              {/* <Button
                //disabled={referencePoints ? true : false}
                onClick={captureReferencePoints}
              >
                Capture Reference image
              </Button>
              &nbsp;
              <Button
                //disabled={referencePoints ? true : false}
                onClick={captureUserPoints}
              >
                Capture User image
              </Button> */}
              {/* &nbsp;
              <Button
                //disabled={referencePoints ? true : false}
                onClick={comparePoints}
              >
                Compare
              </Button> */}
            </Col>
            <Col>
              <div
                style={{
                  position: "relative",
                  textAlign: "center",
                }}
              >
                <h6>Reference image</h6>
                {/* <div className="canvas-wrapper"> */}
                <canvas
                  //id="referenceOutput"
                  style={{
                    backgroundColor: "black",
                    width: `${
                      isMobile
                        ? params.VIDEO_SIZE["360 X 270"].width
                        : params.VIDEO_SIZE[params.STATE.camera.sizeOption]
                            .width
                    }px`,
                    height: `${
                      isMobile
                        ? params.VIDEO_SIZE["360 X 270"].height
                        : params.VIDEO_SIZE[params.STATE.camera.sizeOption]
                            .height
                    }px`,
                    //backgroundImage: 'url("./images/camera.png")',
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                  ref={referenceOutputRef}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "65%",
                    left: "20%",
                    right: "20%",
                  }}
                >
                  Step 2 : Reference image
                </div>
                {isSetCamera ? (
                  <Button
                    //disabled={referencePoints ? true : false}
                    onClick={captureReferencePoints}
                  >
                    Capture Reference image
                  </Button>
                ) : null}
              </div>
              {/* </div> */}
            </Col>
            <Col>
              <div
                style={{
                  position: "relative",
                  textAlign: "center",
                }}
              >
                <h6>User image</h6>
                {/* <div className="canvas-wrapper"> */}
                <canvas
                  //id="userOutput"
                  style={{
                    backgroundColor: "black",
                    width: `${
                      isMobile
                        ? params.VIDEO_SIZE["360 X 270"].width
                        : params.VIDEO_SIZE[params.STATE.camera.sizeOption]
                            .width
                    }px`,
                    height: `${
                      isMobile
                        ? params.VIDEO_SIZE["360 X 270"].height
                        : params.VIDEO_SIZE[params.STATE.camera.sizeOption]
                            .height
                    }px`,
                    //backgroundImage: 'url("./images/camera.png")',
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                  ref={userOutputRef}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "65%",
                    left: "20%",
                    right: "20%",
                  }}
                >
                  Step 3 : User image
                </div>
                {/* </div> */}
                {isSetCamera ? (
                  <Button
                    //disabled={referencePoints ? true : false}
                    onClick={captureUserPoints}
                  >
                    Capture User image
                  </Button>
                ) : null}
              </div>
            </Col>
          </Row>

          <Row style={{ display: "none" }}>
            <Col>
              <div
                //id="scatter-gl-container-left"
                ref={scatterGlContainerLeft}
              ></div>
            </Col>
            <Col>
              <div
                // id="scatter-gl-container-right"
                ref={scatterGlContainerRight}
              ></div>
            </Col>
          </Row>
          {/* <Row>
            <Col>
              KeyPoints Total Distance:{" "}
              {pointsDistance.keyPoints &&
                pointsDistance.keyPoints.reduce(
                  (accumulator, pointDistance) => {
                    return accumulator + pointDistance.distance;
                  },
                  0
                )}
              <br />
              NormalizedPoints Total Distance:{" "}
              {pointsDistance.normalizedPoints &&
                pointsDistance.normalizedPoints.reduce(
                  (accumulator, pointDistance) => {
                    return accumulator + pointDistance.distance;
                  },
                  0
                )}
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Reference Point</th>
                    <th>User Point</th>
                    <th>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsDistance.normalizedPoints &&
                    pointsDistance.normalizedPoints.map(
                      (normalizedPointDistance, index) => {
                        let keyPointDistance = pointsDistance.keyPoints[index];
                        return (
                          <tr key={index}>
                            <td>
                              KeyPoints:{" "}
                              {JSON.stringify(keyPointDistance.referencePoint)}
                              <br />
                              NormalizedPoints:{" "}
                              {JSON.stringify(
                                normalizedPointDistance.referencePoint
                              )}
                            </td>
                            <td>
                              KeyPoints:{" "}
                              {JSON.stringify(keyPointDistance.userPoint)}
                              <br />
                              NormalizedPoints:{" "}
                              {JSON.stringify(
                                normalizedPointDistance.userPoint
                              )}
                            </td>
                            <td>
                              KeyPoint:{keyPointDistance.distance}
                              <br />
                              NormalizedPoint:{normalizedPointDistance.distance}
                            </td>
                          </tr>
                        );
                      }
                    )}
                </tbody>
              </Table>
            </Col>
          </Row> */}
          {/* <Row>
            <Col>
              <h4>Wrist to tip</h4>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Reference Point</th>
                    <th>User Point</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {referencePoints &&
                    userPoints &&
                    referencePoints.normalizedPoints
                      .filter((referencePoint) =>
                        [
                          "thumb_tip",
                          "index_finger_tip",
                          "middle_finger_tip",
                          "ring_finger_tip",
                          "pinky_finger_tip",
                        ].includes(referencePoint.name)
                      )
                      .map((referencePoint, index) => {
                        let referencePointWrist =
                          referencePoints.normalizedPoints.find(
                            (referencePoint) => referencePoint.name === "wrist"
                          );

                        let userPointWrist = userPoints.normalizedPoints.find(
                          (userPoint) => userPoint.name === "wrist"
                        );

                        let userPoint = userPoints.normalizedPoints.find(
                          (userPoint) => userPoint.name === referencePoint.name
                        );

                        let referenceDistance = calculateDistance(
                          referencePointWrist,
                          referencePoint
                        );

                        let userDistance = calculateDistance(
                          userPointWrist,
                          userPoint
                        );
                        return (
                          <tr>
                            <td>
                              {JSON.stringify(referencePointWrist)}
                              <br />
                              {JSON.stringify(referencePoint)}
                              <br />
                              Distance: {referenceDistance}
                            </td>
                            <td>
                              {JSON.stringify(userPointWrist)}
                              <br />
                              {JSON.stringify(userPoint)}
                              <br />
                              Distance: {userDistance}
                            </td>
                            <td>
                              {Math.abs(referenceDistance - userDistance)}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </Table>
            </Col>
          </Row> */}
          {/* <Row>
            <Col>
              <h4>tip to tip</h4>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Reference Point</th>
                    <th>User Point</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {referencePoints &&
                    userPoints &&
                    referencePoints.normalizedPoints
                      .filter((referencePoint) =>
                        [
                          "thumb_tip",
                          "index_finger_tip",
                          "middle_finger_tip",
                          "ring_finger_tip",
                          "pinky_finger_tip",
                        ].includes(referencePoint.name)
                      )
                      .map((referencePoint1, index1) => {
                        let userPoint1 = userPoints.normalizedPoints.find(
                          (userPoint) => userPoint.name === referencePoint1.name
                        );

                        return (
                          <>
                            {referencePoints &&
                              userPoints &&
                              referencePoints.normalizedPoints
                                .filter(
                                  (referencePoint) =>
                                    [
                                      "thumb_tip",
                                      "index_finger_tip",
                                      "middle_finger_tip",
                                      "ring_finger_tip",
                                      "pinky_finger_tip",
                                    ].includes(referencePoint.name) &&
                                    referencePoint.name !== referencePoint1.name
                                )
                                .map((referencePoint2, index2) => {
                                  let userPoint2 =
                                    userPoints.normalizedPoints.find(
                                      (userPoint) =>
                                        userPoint.name === referencePoint2.name
                                    );

                                  let referenceDistance = calculateDistance(
                                    referencePoint1,
                                    referencePoint2
                                  );

                                  let userDistance = calculateDistance(
                                    userPoint1,
                                    userPoint2
                                  );

                                  return (
                                    <tr>
                                      <td>
                                        {JSON.stringify(referencePoint1)}
                                        <br />
                                        {JSON.stringify(referencePoint2)}
                                        <br />
                                        Distance: {referenceDistance}
                                      </td>
                                      <td>
                                        {JSON.stringify(userPoint1)}
                                        <br />
                                        {JSON.stringify(userPoint2)}
                                        <br />
                                        Distance: {userDistance}
                                      </td>
                                      <td>
                                        {Math.abs(
                                          referenceDistance - userDistance
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                          </>
                        );
                      })}
                </tbody>
              </Table>
            </Col>
          </Row> */}

          <Row>
            <Col>
              Matched:{" "}
              {pointsCombinationDistance && pointsCombinationDistance.length > 0
                ? pointsCombinationDistance.reduce(
                    (sum, item) => sum + item.difference,
                    0
                  ) /
                    pointsCombinationDistance.length <=
                  25
                  ? "Yes"
                  : "No"
                : "N/A"}
              <Button
                className="ms-3"
                disabled={
                  !referencePoints ||
                  (referencePoints && referencePoints.keyPoints.length === 0) ||
                  !userPoints ||
                  (userPoints && userPoints.keyPoints.length === 0)
                    ? true
                    : false
                }
                onClick={comparePoints}
              >
                Compare
              </Button>
              {/* {pointsCombinationDistance && pointsCombinationDistance.length > 0
                ? pointsCombinationDistance.every(
                    (item) => item.difference <= 10
                  )
                  ? "Yes"
                  : "No"
                : "N/A"} */}
              <Row className="mt-3">
                <Col>
                  <section>
                    <h2>How to</h2>
                    <p>Introduction or brief description of the topic.</p>
                    <ul>
                      <li>Step 1: Explanation of the first step.</li>
                      <li>
                        Step 2: Detailed instructions for the second step.
                      </li>
                      <li>Step 3: Guidance for the third step.</li>
                    </ul>
                  </section>
                </Col>
              </Row>
              <Accordion className="mt-3">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Debug</Accordion.Header>
                  <Accordion.Body>
                    Average :{" "}
                    {pointsCombinationDistance &&
                    pointsCombinationDistance.length > 0
                      ? pointsCombinationDistance.reduce(
                          (sum, item) => sum + item.difference,
                          0
                        ) / pointsCombinationDistance.length
                      : "N/A"}
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Reference Point</th>
                          <th>User Point</th>
                          <th>Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pointsCombinationDistance.map(
                          (pointCombinationDistance, index) => (
                            <tr key={index}>
                              <td>
                                {JSON.stringify(
                                  pointCombinationDistance.referencePoints[0]
                                )}
                                <br />
                                {JSON.stringify(
                                  pointCombinationDistance.referencePoints[1]
                                )}
                                <br />
                                Distance:{" "}
                                {
                                  pointCombinationDistance.referencePoints[
                                    "distance"
                                  ]
                                }
                              </td>
                              <td>
                                {JSON.stringify(
                                  pointCombinationDistance.userPoints[0]
                                )}
                                <br />
                                {JSON.stringify(
                                  pointCombinationDistance.userPoints[1]
                                )}
                                <br />
                                Distance:{" "}
                                {
                                  pointCombinationDistance.userPoints[
                                    "distance"
                                  ]
                                }
                              </td>
                              <td>{pointCombinationDistance.difference}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </Table>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default HandPoseDetection;

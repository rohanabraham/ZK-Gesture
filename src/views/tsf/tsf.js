import HandPoseDetection from "./components/hand-pose-detection";
import { Row, Col } from "react-bootstrap";

const Ezkl = () => {
  return (
    <div>
      <div className="text-center">
        <h2>ZK Gesture</h2>
        <p>Verifying hand signals on-chain with ML and ZK </p>
      </div>

      <Row>
        <Col>
          <HandPoseDetection />
        </Col>
      </Row>
    </div>
  );
};

export default Ezkl;

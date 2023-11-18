import { Container } from "react-bootstrap";
import { Outlet } from "react-router-dom";

const DefaultLayout = () => {
  return (
    <>
      <Container fluid className="mt-3">
        <Outlet />
      </Container>
    </>
  );
};

export default DefaultLayout;

import { Routes, Route, Outlet, Link } from "react-router-dom";
import DefaultLayout from "./layouts/default";
import Tsf from "./views/tsf";


function App() {
  return (    
    <Routes>
      <Route path="/" element={<DefaultLayout />}>
        <Route index element={<Tsf />} />        
      </Route>
    </Routes>
  );
}

export default App;

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./mainlayout.css";

export default function MainLayout(){
  return(
    <div className="layout">
      <Sidebar/>

      <div className="main">
        <Topbar/>

        <div className="content">
          <Outlet/>
        </div>

      </div>
    </div>
  );
}
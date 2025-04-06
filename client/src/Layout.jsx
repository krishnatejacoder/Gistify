import NavBar from "./components/NavBar/NavBar";
import Footer from "./components/footer/Footer";
import { Outlet } from "react-router-dom";

export default function Layout(){
    return (
        <>
            <NavBar />
            <div style={{display:"flex", flexDirection: "column", minHeight: "100vh"}}>
                <div style={{flex:1, marginTop: "60px"}}>
                    <Outlet />
                </div>
                <Footer />
            </div>
        </>
    );
}
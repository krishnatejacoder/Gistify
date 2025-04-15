import React, { useContext, useState } from "react";''
import { Link, useLocation } from "react-router-dom";
import profilePic from '../../assets/icons/profilePic.svg';
import darkmode from '../../assets/icons/modes/darkmode.svg';
import lightmode from '../../assets/icons/modes/lightmode.svg';
import { DarkModeContext } from "../../context/DarkMode/DarkModeContext";
import ProfileSection from "./ProfileSection";
import './MainNavigation.css';

export default function NavBar() {
  const location = useLocation();
  const {isDarkMode, setDarkMode} = useContext(DarkModeContext);
  const [isProfileClick, setIsProfileClick] = useState(false);
  const [isSettingClicked, setSettingClicked] = useState(false);
  const menuItems = [
    { name: "Home", paths: ["/", "/dashboard"] },
    { name: "Gist It", paths: ["/gistit"] },
    { name: "Gist History", paths: ["/gisthistory"] },
  ];

  const handleProfileClick = (e) => {
    e.stopPropagation();
    setIsProfileClick((prev) => !prev);
  };

  return (
    <div>  
      <nav className="navbar">
        <div className="logo piazzolla-bold">Gistify</div>
        <ul className="nav-links baloo-2-semiBold">
        {menuItems.map((item, index) => (
          <li key={item.name} className="nav-group">
            <div className={`nav-item ${item.paths.includes(location.pathname) ? "active" : ""}`}>
              <Link to={item.paths[0]}>{item.name}</Link>
              {item.paths.includes(location.pathname) && <span className="underline"></span>}
            </div>
            {index !== menuItems.length - 1 && <span className="sep"></span>}
          </li>
        ))}
        </ul>
        <div className="icons">
        <img
          draggable="false"
          className={`pp ${isProfileClick ? "active" : ""}`}
          src={profilePic}
          alt="profile"
          onClick={handleProfileClick}
        />
        <button
          draggable="false"
          className="modebutton tooltip"
          data-tooltip={isDarkMode ? "Dark Mode" : "Light Mode"}
          onClick={() => {
            setDarkMode((cur) => !cur);
          }}
        >
          <img
            draggable="false"
            src={darkmode}
            alt="Dark Mode"
            className={isDarkMode ? "active" : ""}
          />
          <img
            draggable="false"
            src={lightmode}
            alt="Light Mode"
            className={!isDarkMode ? "active" : ""}
          />
        </button>
        </div>
      </nav>
      <ProfileSection
          isVisible={isProfileClick}
          isSettingClicked={isSettingClicked}
          onclose={() => setIsProfileClick(false)}
          setSettingClicked={setSettingClicked}
        />
    </div>
  );
}

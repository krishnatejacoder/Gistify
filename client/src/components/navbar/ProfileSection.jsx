import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import Setting from "./Setting";
import "./ProfileSection.css";

export default function ProfileSection({
  isVisible,
  isSettingClicked,
  onclose,
  setSettingClicked,
}) {
  const navigate = useNavigate();
  useEffect(() => {
    if (isSettingClicked) {
      onclose();
    }
  }, [isSettingClicked]);
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) {
      if (isVisible) {
        containerRef.current.style.display = "flex";
        containerRef.current.offsetHeight;
        containerRef.current.classList.add("visible");
      } else {
        containerRef.current.classList.remove("visible");
        const timer = setTimeout(() => {
          if (!isVisible && containerRef.current) {
            containerRef.current.style.display = "none";
          }
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible]);

  const handleSignOut = () => {
    localStorage.removeItem("userGistify");
    localStorage.removeItem("authToken");

    sessionStorage.removeItem("user");
    sessionStorage.setItem("welcomeMessageShown", JSON.stringify(false));

    navigate("/login");
  };

  return (
    <div className="profileSection dropdown-menu baloo-2-semiBold" ref={containerRef}>
      <div
        className="profile-link setting"
        onClick={() => {
          return setSettingClicked(true);
        }}
      >
        Settings
      </div>
      <Link onClick={handleSignOut} className="profile-link signout" to="/">
        Sign Out
      </Link>
      {isSettingClicked && <Setting onclose={() => setSettingClicked(false)} />}
    </div>
  );
}

ProfileSection.propTypes = {
  isVisible: PropTypes.bool,
};

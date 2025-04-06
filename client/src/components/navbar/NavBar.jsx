import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Sun, User } from "lucide-react";
import "./NavBar.css";

export default function NavBar() {
  const location = useLocation();
  const menuItems = [
    { name: "Home", path: "/" },
    { name: "Gist It", path: "/gistit" },
    { name: "Gist History", path: "/gistit_uploaded" },
    { name: "Search", path: "/search" },
    { name: "Forum", path: "/forum" },
    { name: "Smart Library", path: "/library" },
  ];

  return (
    <nav className="navbar">
      <div className="logo">Gistify</div>
      <ul className="nav-links">
        {menuItems.map((item) => (
          <li key={item.name} className={`nav-item ${location.pathname === item.path ? "active" : ""}`}>
            <Link to={item.path}>{item.name}</Link>
            {location.pathname === item.path && <span className="underline"></span>}
          </li>
        ))}
      </ul>
      <div className="icons">
        <Bell className="icon bell" />
        <User className="icon user" />
        <Sun className="icon sun" />
      </div>
    </nav>
  );
}

import { useState } from 'react';
import { Bell, Sun, User } from "lucide-react";
import './NavBar.css';

export default function NavBar(){
    const [active, setActive] = useState("Home"); // Initialize active with a default value

    return (
      <nav className="navbar">
        <div className="logo">Gistify</div>
        <ul className="nav-links">
          {["Home", "Gist It", "Gist History", "Search", "Forum", "Smart Library"].map((item) => (
            <li
              key={item}
              className={`nav-item ${active === item ? "active" : ""}`}
              onClick={() => setActive(item)}
            >
              {item}
              {active === item && <span className="underline"></span>}
            </li>
          ))}
        </ul>
        <div className="icons">
          {/* Assuming Bell, User, Sun are imported components */}
          <Bell className="icon bell" />
          <User className="icon user" />
          <Sun className="icon sun" />
        </div>
      </nav>
    );
}
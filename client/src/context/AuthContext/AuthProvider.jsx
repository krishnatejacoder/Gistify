// AuthContext.js
import { AuthContext } from "./AuthContext";
import { useState, useEffect } from "react";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("userGistify");
    try {
      return storedUser && storedUser !== "undefined" ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error parsing auth user from localStorage:", error);
      localStorage.removeItem("userGistify");
      return null;
    }
  });

  const [uploading, setUploading] = useState(() => {
    const storedUploading = localStorage.getItem("storedUploading");
    try {
      return storedUploading && storedUploading !== "undefined" ? JSON.parse(storedUploading) : false;
    } catch (error) {
      console.error("Error parsing stored uploading data", error);
      localStorage.removeItem("storedUploading");
      return false;
    }
  });

  function login(userData) {
    setUser(userData);
    localStorage.setItem("userGistify", JSON.stringify(userData));
  }

  function logout() {
    setUser(null);
    setUploading(false);
    localStorage.removeItem("userGistify");
    localStorage.removeItem("storedUploading");
    localStorage.removeItem("summarizationTask");
    // localStorage.removeItem("accessToken"); // Clear accessToken if applicable
  }

  function uploadingUpdate() {
    setUploading((cur) => {
      const newValue = !cur;
      localStorage.setItem("storedUploading", JSON.stringify(newValue));
      return newValue;
    });
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, uploading, uploadingUpdate }}>
      {children}
    </AuthContext.Provider>
  );
}
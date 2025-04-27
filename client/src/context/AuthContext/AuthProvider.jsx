import { AuthContext } from "./AuthContext";
import { useState, useEffect } from "react";

export default function AuthProvider({children}){
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

    function login(userData){
        setUser(userData);
        localStorage.setItem("userGistify", JSON.stringify(userData));
    }
    function logout(){
        setUser(null);
        localStorage.removeItem("userGistify");
    }

    return(
        <AuthContext.Provider value={{user, login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}
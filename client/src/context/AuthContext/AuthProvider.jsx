import { AuthContext } from "./AuthContext";
import { useState, useEffect } from "react";

export default function AuthProvider({children}){
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedAuthUser = localStorage.getItem("userGistify"); 
        let parsedUser = null;

        if (storedAuthUser && storedAuthUser !== "undefined") {
            try {
                parsedUser = JSON.parse(storedAuthUser);
            } catch (error) {
                console.error("Error parsing auth user from localStorage:", error);
                localStorage.removeItem("authUser"); // Clear invalid data
            }
        }

    setUser(parsedUser);
  }, []);

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
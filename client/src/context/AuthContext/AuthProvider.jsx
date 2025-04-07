import { AuthContext } from "./AuthContext";
import { useState } from "react";

export default function AuthProvider({children}){
    const [user, setUser] = useState(null);

    function login(userData){
        setUser(userData);
        localStorage.setItem("userGistify", JSON.stringify(userData));
    }
    function logout(){
        setUser(null);
        localStorage.removeItem("userGistify");
    }

    return(
        <AuthContext.Provider value={{login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}
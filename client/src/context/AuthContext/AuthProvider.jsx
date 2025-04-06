import { AuthContext } from "./AuthContext";
import { useState } from "react";

export default function AuthProvider({children}){
    const [user, setUser] = useState(null);

    function login(userData){
        setUser(userData);
    }
    function logout(userData){
        setUser(null);
    }

    return(
        <AuthContext.Provider value={{user, login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}
import { createContext, useContext, useState } from "react";
import { ADMIN_EMAIL } from "../config";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fp-admin-user") || "null"); }
    catch { return null; }
  });

  const login = (userInfo) => {
    setUser(userInfo);
    localStorage.setItem("fp-admin-user", JSON.stringify(userInfo));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fp-admin-user");
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

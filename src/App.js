import { createContext, useContext, useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Navbar from "./components/Navbar";
import LiveWidget from "./components/LiveWidget";
import Landing from "./pages/Landing";
import Live from "./pages/Live";
import Gallery from "./pages/Gallery";
import Admin from "./pages/Admin";
import { AuthProvider } from "./context/AuthContext";
import { LiveProvider } from "./context/LiveContext";
import { GOOGLE_CLIENT_ID } from "./config";
import "./App.css";

export const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("fp-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fp-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <LiveProvider>
          <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <Router>
              <Navbar />
              <LiveWidget />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/live" element={<Live />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Router>
          </ThemeContext.Provider>
        </LiveProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

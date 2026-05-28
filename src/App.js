import { createContext, useContext, useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Videos from "./pages/Videos";
import Live from "./pages/Live";
import Gallery from "./pages/Gallery";
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
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Videos />} />
          <Route path="/live" element={<Live />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;

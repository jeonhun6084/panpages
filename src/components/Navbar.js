import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../App";

function Navbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-brand">✦ FanPage</div>
      <div className="navbar-links">
        <Link to="/" className={pathname === "/" ? "active" : ""}>유튜브</Link>
        <Link to="/live" className={pathname === "/live" ? "active" : ""}>라이브</Link>
        <Link to="/gallery" className={pathname === "/gallery" ? "active" : ""}>갤러리</Link>
      </div>
      <button className="theme-toggle" onClick={toggleTheme} aria-label="테마 전환">
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </nav>
  );
}

export default Navbar;

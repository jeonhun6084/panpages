import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../App";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";

function Navbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">✦ FanPage</Link>
      <div className="navbar-links">
        <Link to="/gallery" className={pathname === "/gallery" ? "active" : ""}>갤러리</Link>
        <Link to="/live" className={pathname === "/live" ? "active" : ""}>라이브</Link>
        {isAdmin && (
          <Link to="/admin" className={`navbar-admin-link${pathname === "/admin" ? " active" : ""}`} title="관리자">
            <Icon name="cog" size={13} /> 관리
          </Link>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {!isAdmin && (
          <Link to="/admin" className="navbar-admin-icon" title="관리자 로그인" aria-label="관리자 로그인">
            <Icon name="lock" size={14} />
          </Link>
        )}
        <button className="theme-toggle" onClick={toggleTheme} aria-label="테마 전환">
          <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

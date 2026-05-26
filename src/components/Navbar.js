import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">✦ FanPage</div>
      <div className="navbar-links">
        <Link to="/" className={pathname === "/" ? "active" : ""}>유튜브</Link>
        <Link to="/live" className={pathname === "/live" ? "active" : ""}>라이브</Link>
        <Link to="/gallery" className={pathname === "/gallery" ? "active" : ""}>갤러리</Link>
      </div>
    </nav>
  );
}

export default Navbar;

import { useState, useCallback } from "react";

const API_BASE = "http://localhost:3001";

function PostCard({ post }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="gallery-item"
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      {post.thumbnail && (
        <img
          src={post.thumbnail}
          alt={post.title}
          className="gallery-img"
          loading="lazy"
          onError={(e) => { e.target.style.display = "none"; }}
        />
      )}
      <div className="gallery-item-body">
        <div className="gallery-item-title">{post.title}</div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
          {post.views && <span className="gallery-item-date">👁 {post.views}</span>}
          {post.comments && <span className="gallery-item-date">💬 {post.comments}</span>}
          {post.date && <span className="gallery-item-date">{post.date}</span>}
        </div>
      </div>
    </a>
  );
}

function Gallery() {
  const [bjIdInput, setBjIdInput] = useState(() => localStorage.getItem("fp-bjid") || "");
  const [currentBjId, setCurrentBjId] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [scrollCount, setScrollCount] = useState(5);

  const fetchPosts = useCallback(async (bjId, scroll) => {
    setLoading(true);
    setError(null);
    setPosts([]);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${bjId}?scroll=${scroll}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `오류 ${res.status}`);
      setPosts(data.posts);
      setLoaded(true);
    } catch (e) {
      if (e.message.includes("fetch") || e.message.includes("Failed")) {
        setError("서버에 연결할 수 없어요. server/ 폴더에서 npm start 를 먼저 실행하세요.");
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const search = () => {
    const id = bjIdInput.trim();
    if (!id) return;
    localStorage.setItem("fp-bjid", id);
    setCurrentBjId(id);
    fetchPosts(id, scrollCount);
  };

  const loadMore = () => {
    if (!currentBjId) return;
    const next = scrollCount + 5;
    setScrollCount(next);
    fetchPosts(currentBjId, next);
  };

  const clearCookies = async () => {
    if (!window.confirm("저장된 SOOP 쿠키를 삭제하고 다음에 재로그인할까요?")) return;
    try {
      await fetch(`${API_BASE}/api/cookies`, { method: "DELETE" });
      alert("쿠키가 삭제됐어요. 다음 불러오기 시 재로그인합니다.");
    } catch {
      alert("서버에 연결할 수 없어요.");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>갤러리</h1>
        <p>SOOP 방송국 게시판을 카드형으로 재구성해요. 로컬 서버(port 3001)가 필요해요.</p>
      </div>

      <div className="gallery-controls">
        <div className="add-form" style={{ margin: 0, flex: 1 }}>
          <input
            type="text"
            placeholder="SOOP 아이디 (예: bj_nickname)"
            value={bjIdInput}
            onChange={(e) => setBjIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <select
            value={scrollCount}
            onChange={(e) => setScrollCount(Number(e.target.value))}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "0.75rem 0.75rem",
              color: "var(--text)",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            <option value={3}>3회 스크롤</option>
            <option value={5}>5회 스크롤</option>
            <option value={10}>10회 스크롤</option>
            <option value={20}>20회 스크롤</option>
          </select>
          <button className="btn" onClick={search} disabled={loading}>
            {loading ? "스크래핑 중..." : "불러오기"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {currentBjId && (
            <a
              href={`https://www.sooplive.com/station/${currentBjId}/post`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ whiteSpace: "nowrap" }}
            >
              원본 보기
            </a>
          )}
          <button className="btn btn-ghost btn-sm" onClick={clearCookies} title="로그인 쿠키 초기화">
            🔄 쿠키 초기화
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>⏳</div>
          SOOP 자동 로그인 후 게시글 스크롤 중...<br />
          <span style={{ fontSize: "0.82rem", opacity: 0.7 }}>처음 실행 시 브라우저 구동으로 30초~1분 걸릴 수 있어요</span>
        </div>
      )}

      {!loading && !loaded && !error && (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <h3>아이디를 입력하면 게시판이 표시돼요</h3>
          <p>SOOP 아이디를 입력하고 불러오기를 눌러보세요.</p>
        </div>
      )}

      {!loading && loaded && posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>게시글을 찾지 못했어요</h3>
          <p>아이디를 확인하거나 서버 터미널 로그를 살펴보세요.</p>
        </div>
      )}

      {posts.length > 0 && (
        <>
          <div
            style={{
              marginBottom: "1rem",
              fontSize: "0.88rem",
              color: "var(--text-muted)",
            }}
          >
            게시글 {posts.length}개
          </div>
          <div className="gallery-grid">
            {posts.map((post, i) => (
              <PostCard key={i} post={post} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              className="btn btn-ghost"
              onClick={loadMore}
              disabled={loading}
              style={{ minWidth: "160px" }}
            >
              더 불러오기 ({scrollCount + 5}회 스크롤)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Gallery;

import { useState, useCallback, useMemo, useEffect, useRef } from "react";

const API_BASE = "http://localhost:3001";

function parseKoreanDate(str) {
  if (!str) return null;
  const now = new Date();
  if (str.includes("방금")) return now;
  const m = str.match(/(\d+)분 전/); if (m) return new Date(now - m[1] * 60000);
  const h = str.match(/(\d+)시간 전/); if (h) return new Date(now - h[1] * 3600000);
  const d = str.match(/(\d+)일 전/); if (d) return new Date(now - d[1] * 86400000);
  if (str.includes("어제")) return new Date(now - 86400000);
  const abs = str.match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})/);
  if (abs) return new Date(+abs[1], +abs[2] - 1, +abs[3]);
  return null;
}

function PostCard({ post, onOpen }) {
  return (
    <div className="gallery-item" onClick={() => onOpen(post)} style={{ cursor: "pointer" }}>
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
    </div>
  );
}

function Lightbox({ post, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: "0.95rem" }}>{post.title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {post.thumbnail && (
          <img src={post.thumbnail} alt={post.title} className="modal-gallery-img" />
        )}
        <div className="modal-gallery-body">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {post.views && <span>👁 조회 {post.views}</span>}
            {post.comments && <span>💬 댓글 {post.comments}</span>}
            {post.date && <span>📅 {post.date}</span>}
          </div>
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            SOOP에서 보기 →
          </a>
        </div>
      </div>
    </div>
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
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const sentinelRef = useRef(null);
  const lastCountRef = useRef(0);
  const loadingRef = useRef(false);
  const loadMoreRef = useRef(null);

  const fetchPosts = useCallback(async (bjId, scroll, isLoadMore = false) => {
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${bjId}?scroll=${scroll}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `오류 ${res.status}`);
      setPosts(data.posts);
      if (isLoadMore && data.posts.length <= lastCountRef.current) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      lastCountRef.current = data.posts.length;
      setLoaded(true);
    } catch (e) {
      setError(
        e.message.includes("fetch") || e.message.includes("Failed")
          ? "서버에 연결할 수 없어요. server/ 폴더에서 npm start 를 먼저 실행하세요."
          : e.message
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const search = () => {
    const id = bjIdInput.trim();
    if (!id) return;
    localStorage.setItem("fp-bjid", id);
    setCurrentBjId(id);
    setScrollCount(5);
    setHasMore(true);
    lastCountRef.current = 0;
    fetchPosts(id, 5);
  };

  const loadMore = useCallback(() => {
    if (!currentBjId || loadingRef.current || !hasMore) return;
    const next = scrollCount + 5;
    setScrollCount(next);
    fetchPosts(currentBjId, next, true);
  }, [currentBjId, scrollCount, hasMore, fetchPosts]);

  // loadMore ref 최신 유지
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  // 무한 스크롤: 한 번만 observer 생성, ref로 최신 함수 참조
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !loaded) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) loadMoreRef.current?.();
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loaded]);

  const filteredPosts = useMemo(() => {
    let r = posts;
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(p => p.title.toLowerCase().includes(q));
    }
    if (dateFilter !== "all") {
      const days = { "7d": 7, "30d": 30, "3m": 90 }[dateFilter];
      const cutoff = Date.now() - days * 86400000;
      r = r.filter(p => { const d = parseKoreanDate(p.date); return d && d.getTime() >= cutoff; });
    }
    return r;
  }, [posts, query, dateFilter]);

  const clearCookies = async () => {
    if (!window.confirm("저장된 쿠키를 삭제하고 다음에 재로그인할까요?")) return;
    try {
      await fetch(`${API_BASE}/api/cookies`, { method: "DELETE" });
      alert("쿠키 삭제 완료. 다음 불러오기 시 재로그인합니다.");
    } catch { alert("서버에 연결할 수 없어요."); }
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
          <select value={scrollCount} onChange={(e) => setScrollCount(Number(e.target.value))} className="select-input">
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
            <a href={`https://www.sooplive.com/station/${currentBjId}/post`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ whiteSpace: "nowrap" }}>
              원본 보기
            </a>
          )}
          <button className="btn btn-ghost btn-sm" onClick={clearCookies}>🔄 쿠키 초기화</button>
        </div>
      </div>

      {loaded && posts.length > 0 && (
        <div className="gallery-search">
          <input
            type="text"
            placeholder="제목 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="select-input">
            <option value="all">전체 기간</option>
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
            <option value="3m">최근 3개월</option>
          </select>
          {(query || dateFilter !== "all") && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setQuery(""); setDateFilter("all"); }}>
              초기화
            </button>
          )}
        </div>
      )}

      {error && <div className="error-box" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      {loading && posts.length === 0 && (
        <div className="loading-spinner">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>⏳</div>
          SOOP 자동 로그인 후 게시글 스크롤 중...<br />
          <span style={{ fontSize: "0.82rem", opacity: 0.7 }}>처음 실행 시 30초~1분 걸릴 수 있어요</span>
        </div>
      )}

      {!loading && !loaded && !error && (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <h3>아이디를 입력하면 게시판이 표시돼요</h3>
          <p>SOOP 아이디를 입력하고 불러오기를 눌러보세요.</p>
        </div>
      )}

      {!loading && loaded && filteredPosts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">{posts.length === 0 ? "🔍" : "🔎"}</div>
          <h3>{posts.length === 0 ? "게시글을 찾지 못했어요" : "검색 결과가 없어요"}</h3>
          <p>{posts.length === 0 ? "아이디를 확인하거나 서버 로그를 살펴보세요." : "다른 키워드나 기간으로 검색해보세요."}</p>
        </div>
      )}

      {filteredPosts.length > 0 && (
        <>
          <div style={{ marginBottom: "1rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            {filteredPosts.length === posts.length
              ? `게시글 ${posts.length}개`
              : `${filteredPosts.length}개 (전체 ${posts.length}개 중)`}
          </div>
          <div className="gallery-grid">
            {filteredPosts.map((post, i) => (
              <PostCard key={i} post={post} onOpen={setLightbox} />
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loading && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>더 불러오는 중...</span>}
            {!loading && !hasMore && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>마지막 게시글이에요</span>
            )}
          </div>
        </>
      )}

      {lightbox && <Lightbox post={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

export default Gallery;

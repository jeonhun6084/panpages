import { useState, useEffect, useCallback } from "react";

const PROXY = "https://corsproxy.io/?";

async function fetchPosts(bjId, page = 1) {
  const targetUrl = `https://bjapi.afreecatv.com/api/${bjId}/station/posts?page=${page}&per_page=24&type=post`;
  const res = await fetch(PROXY + encodeURIComponent(targetUrl));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json;
}

function formatDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function GalleryModal({ post, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const imgs = post.photos || (post.thumbnail ? [post.thumbnail] : []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{post.title_name || post.title || "게시글"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {imgs.length > 0 && (
          <img className="modal-gallery-img" src={imgs[0]} alt={post.title_name || ""} />
        )}
        <div className="modal-gallery-body">
          {post.content && (
            <p>{post.content.replace(/<[^>]+>/g, "").trim()}</p>
          )}
          {post.write_datetime && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {formatDate(post.write_datetime)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  const [bjId] = useState(() => localStorage.getItem("fp-bjid") || "");
  const [bjIdInput, setBjIdInput] = useState(bjId);
  const [activeBjId, setActiveBjId] = useState(bjId);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (id, pg = 1, append = false) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPosts(id, pg);
      const items = data.data || data.list || [];
      setPosts((prev) => (append ? [...prev, ...items] : items));
      setHasMore(items.length >= 24);
    } catch (e) {
      setError(`게시글을 불러오지 못했습니다. (${e.message})\n아프리카TV 방송국에서 직접 확인해보세요.`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeBjId) load(activeBjId, 1);
  }, [activeBjId, load]);

  const search = () => {
    const id = bjIdInput.trim();
    if (!id) return;
    localStorage.setItem("fp-bjid", id);
    setActiveBjId(id);
    setPage(1);
    setPosts([]);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(activeBjId, next, true);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>갤러리</h1>
        <p>아프리카TV 방송국 게시글과 사진을 모아볼 수 있어요.</p>
      </div>

      <div className="gallery-controls">
        <div className="add-form" style={{ margin: 0, flex: 1 }}>
          <input
            type="text"
            placeholder="아프리카TV 아이디 (예: bj_nickname)"
            value={bjIdInput}
            onChange={(e) => setBjIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn" onClick={search}>불러오기</button>
        </div>
        {activeBjId && (
          <a
            href={`https://bj.afreecatv.com/${activeBjId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ whiteSpace: "nowrap" }}
          >
            방송국 바로가기
          </a>
        )}
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: "1.5rem" }}>
          {error.split("\n").map((line, i) => <p key={i}>{line}</p>)}
          {activeBjId && (
            <a
              href={`https://bj.afreecatv.com/${activeBjId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--pink)", display: "inline-block", marginTop: "0.75rem", fontSize: "0.88rem" }}
            >
              방송국에서 직접 보기 →
            </a>
          )}
        </div>
      )}

      {!error && posts.length === 0 && !loading && activeBjId && (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <h3>게시글이 없거나 불러올 수 없어요</h3>
          <p>아프리카TV 방송국 ID를 확인해주세요.</p>
        </div>
      )}

      {!activeBjId && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <h3>아이디를 입력하면 갤러리가 표시돼요</h3>
          <p>위에 아프리카TV 방송국 아이디를 입력하고 불러오기를 눌러보세요.</p>
        </div>
      )}

      {posts.length > 0 && (
        <>
          <div className="gallery-grid">
            {posts.map((post, i) => {
              const imgs = post.photos || (post.thumbnail ? [post.thumbnail] : []);
              const thumb = imgs[0] || null;
              return (
                <div key={post.title_no || post.id || i} className="gallery-item" onClick={() => setSelected(post)}>
                  {thumb && (
                    <img className="gallery-img" src={thumb} alt={post.title_name || ""} loading="lazy" />
                  )}
                  <div className="gallery-item-body">
                    {post.title_name && (
                      <div className="gallery-item-title">{post.title_name}</div>
                    )}
                    {post.content && (
                      <div className="gallery-item-text">
                        {post.content.replace(/<[^>]+>/g, "").trim()}
                      </div>
                    )}
                    <div className="gallery-item-date">{formatDate(post.write_datetime)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && !loading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <button className="btn btn-ghost" onClick={loadMore}>더 보기</button>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="loading-spinner">
          {posts.length > 0 ? "불러오는 중..." : "게시글 불러오는 중..."}
        </div>
      )}

      {selected && <GalleryModal post={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default Gallery;

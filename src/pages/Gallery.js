import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useLive } from "../context/LiveContext";
import { useGalleryFavs } from "../hooks/useGalleryFavs";
import Icon from "../components/Icon";

const API_BASE = "http://localhost:3001";

function MetaItem({ icon, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
      <Icon name={icon} size={13} />
      {children}
    </span>
  );
}

function FavsBar({ favs, statuses, onSelect }) {
  if (favs.length === 0) return null;
  return (
    <div className="gallery-favs-bar">
      <span className="gallery-favs-label">즐겨찾기</span>
      {favs.map(bjId => {
        const st = statuses[bjId];
        const label = st?.nickname || bjId;
        return (
          <button key={bjId} className="gallery-fav-chip" onClick={() => onSelect(bjId)}>
            {st?.isLive && <span className="gallery-fav-live-dot" />}
            {st?.profileImg && (
              <img src={st.profileImg} alt={label} className="gallery-fav-avatar" />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PostCard({ post, onOpen }) {
  return (
    <div className="gallery-item">
      <div className="gallery-item-img" onClick={() => onOpen(post)}>
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt={post.title}
            className="gallery-img"
            loading="lazy"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="gallery-img-placeholder" />
        )}
        {post.images && post.images.length > 1 && (
          <div className="gallery-img-count">+{post.images.length - 1}</div>
        )}
      </div>
      <div className="gallery-item-content">
        <a
          className="gallery-item-title"
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {post.title}
        </a>
        {post.text && (
          <div className="gallery-item-text">{post.text}</div>
        )}
        <div className="gallery-item-meta">
          {post.author && <span>{post.author}</span>}
          {post.boardName && <span className="gallery-board-tag">{post.boardName}</span>}
          {post.views && <MetaItem icon="eye">{post.views}</MetaItem>}
          {post.comments && <MetaItem icon="chat">{post.comments}</MetaItem>}
          {post.likes && post.likes !== "0" && <MetaItem icon="heart">{post.likes}</MetaItem>}
          {post.date && <span>{post.date.split(" ")[0]}</span>}
        </div>
      </div>
    </div>
  );
}

function Lightbox({ post, onClose }) {
  const images = (post.images && post.images.length > 0) ? post.images : (post.thumbnail ? [post.thumbnail] : []);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, images.length]);

  const current = images[idx];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: "0.95rem" }}>{post.title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {images.length > 1 && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{idx + 1} / {images.length}</span>
            )}
            <button className="modal-close" onClick={onClose} aria-label="닫기"><Icon name="close" size={16} /></button>
          </div>
        </div>

        {current && (
          <div className="lightbox-img-wrap">
            {images.length > 1 && idx > 0 && (
              <button className="lightbox-nav lightbox-prev" onClick={() => setIdx(i => i - 1)}>‹</button>
            )}
            <img src={current} alt={`${post.title} ${idx + 1}`} className="modal-gallery-img" />
            {images.length > 1 && idx < images.length - 1 && (
              <button className="lightbox-nav lightbox-next" onClick={() => setIdx(i => i + 1)}>›</button>
            )}
          </div>
        )}

        <div className="modal-gallery-body">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            {post.author && <MetaItem icon="pencil">{post.author}</MetaItem>}
            {post.views && <MetaItem icon="eye">{post.views}</MetaItem>}
            {post.comments && <MetaItem icon="chat">{post.comments}</MetaItem>}
            {post.likes && post.likes !== "0" && <MetaItem icon="heart">{post.likes}</MetaItem>}
            {post.date && <MetaItem icon="calendar">{post.date.split(" ")[0]}</MetaItem>}
          </div>
          {images.length > 1 && (
            <div className="lightbox-dots">
              {images.map((_, i) => (
                <button key={i} className={`lightbox-dot${i === idx ? " active" : ""}`} onClick={() => setIdx(i)} />
              ))}
            </div>
          )}
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: "0.75rem" }}>
            SOOP에서 보기 →
          </a>
        </div>
      </div>
    </div>
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SLIDESHOW_INTERVAL_MS = 5000;

function SlideshowMode({ images, onClose }) {
  const order = useMemo(() => shuffle(images), [images]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (order.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % order.length), SLIDESHOW_INTERVAL_MS);
    return () => clearInterval(id);
  }, [order.length]);

  const current = order[idx];

  return (
    <div className="slideshow-overlay" onClick={onClose}>
      <button className="slideshow-close" onClick={onClose} aria-label="닫기"><Icon name="close" size={20} /></button>
      <span className="slideshow-counter">{idx + 1} / {order.length}</span>
      {current && (
        <img key={current} src={current} alt="" className="slideshow-img" onClick={(e) => e.stopPropagation()} />
      )}
      <div className="slideshow-progress">
        <div key={idx} className="slideshow-progress-bar" />
      </div>
    </div>
  );
}

function Gallery() {
  const { statuses } = useLive();
  const { favs } = useGalleryFavs();
  const [bjIdInput, setBjIdInput] = useState(() => localStorage.getItem("fp-bjid") || "");
  const [currentBjId, setCurrentBjId] = useState("");
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [lightbox, setLightbox] = useState(null);
  const [slideshowOpen, setSlideshowOpen] = useState(false);

  // ref로 최신값 관리 → loadMore 클로저 stale 문제 완전 해결
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const selectedBoardRef = useRef(null);
  const currentBjIdRef = useRef("");
  const obsRef = useRef(null);
  const loadMoreRef = useRef(null);

  const fetchPosts = useCallback(async (bjId, bbsNo, pageNum, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pageNum });
      if (bbsNo) params.set("bbsNo", bbsNo);
      const res = await fetch(`${API_BASE}/api/posts/${bjId}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `오류 ${res.status}`);
      const newPosts = data.posts || [];
      setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
      const curPage = data.currentPage || pageNum;
      const more = curPage < (data.lastPage || 1);
      // ref 동기적 업데이트
      pageRef.current = curPage;
      hasMoreRef.current = more;
      setHasMore(more);
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

  const fetchBoards = useCallback(async (bjId) => {
    setLoadingBoards(true);
    try {
      const res = await fetch(`${API_BASE}/api/boards/${bjId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "게시판 목록 오류");
      const list = data.boards || [];
      if (list.length === 0) { setBoards([]); return []; }

      // 게시글 없는 탭 제거: 각 게시판 첫 페이지 병렬 확인
      const checked = await Promise.all(
        list.map(async (board) => {
          try {
            const bbsNo = board.displayType === 106 ? null : board.bbsNo;
            const params = new URLSearchParams({ page: 1 });
            if (bbsNo) params.set("bbsNo", bbsNo);
            const r = await fetch(`${API_BASE}/api/posts/${bjId}?${params}`);
            const d = await r.json();
            return r.ok && (d.total || 0) > 0 ? board : null;
          } catch { return null; }
        })
      );

      const filtered = checked.filter(Boolean);
      filtered.sort((a, b) => (b.displayType === 106 ? 1 : 0) - (a.displayType === 106 ? 1 : 0));
      setBoards(filtered);
      return filtered;
    } catch {
      setBoards([]);
      return [];
    } finally {
      setLoadingBoards(false);
    }
  }, []);

  // loadMore는 항상 ref에서 최신값을 읽으므로 deps 없음
  const loadMore = useCallback(() => {
    if (!currentBjIdRef.current || loadingRef.current || !hasMoreRef.current) return;
    fetchPosts(currentBjIdRef.current, selectedBoardRef.current, pageRef.current + 1, true);
  }, [fetchPosts]);

  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  // sentinel이 DOM에 마운트/언마운트될 때마다 observer 재연결 (callback ref)
  const sentinelRef = useCallback((node) => {
    if (obsRef.current) { obsRef.current.disconnect(); obsRef.current = null; }
    if (!node) return;
    obsRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingRef.current) loadMoreRef.current?.();
    }, { rootMargin: "400px", threshold: 0 });
    obsRef.current.observe(node);
  }, []);

  const resetFilters = () => {
    setQuery("");
    setDateFilter("all");
  };

  const search = useCallback(async (overrideId) => {
    const id = (overrideId !== undefined ? overrideId : bjIdInput).trim();
    if (!id) return;
    setBjIdInput(id);
    localStorage.setItem("fp-bjid", id);
    setCurrentBjId(id);
    currentBjIdRef.current = id;
    setPosts([]);
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    setLoaded(false);
    resetFilters();

    const list = await fetchBoards(id);
    const first = list.length > 0 ? list[0] : null;
    const bbsNo = first ? first.bbsNo : null;
    const apiBbsNo = (first && first.displayType === 106) ? null : bbsNo;
    selectedBoardRef.current = apiBbsNo;
    setSelectedBoard(bbsNo);
    fetchPosts(id, apiBbsNo, 1);
  }, [bjIdInput, fetchBoards, fetchPosts]);

  const changeBoard = (board) => {
    const bbsNo = board ? board.bbsNo : null;
    const apiBbsNo = (board && board.displayType === 106) ? null : bbsNo;
    selectedBoardRef.current = apiBbsNo;
    setSelectedBoard(bbsNo);
    setPosts([]);
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    setLoaded(false);
    resetFilters();
    fetchPosts(currentBjIdRef.current, apiBbsNo, 1);
  };

  const filteredPosts = useMemo(() => {
    let r = posts;
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(p => p.title.toLowerCase().includes(q) || (p.author && p.author.toLowerCase().includes(q)));
    }
    if (dateFilter !== "all") {
      const days = { "7d": 7, "30d": 30, "3m": 90 }[dateFilter];
      const cutoff = Date.now() - days * 86400000;
      r = r.filter(p => {
        if (!p.date) return false;
        const d = new Date(p.date.replace(" ", "T"));
        return d.getTime() >= cutoff;
      });
    }
    return r;
  }, [posts, query, dateFilter]);

  const allImages = useMemo(() => {
    const seen = new Set();
    for (const post of posts) {
      const imgs = (post.images && post.images.length > 0) ? post.images : (post.thumbnail ? [post.thumbnail] : []);
      for (const url of imgs) seen.add(url);
    }
    return [...seen];
  }, [posts]);

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

      <FavsBar favs={favs} statuses={statuses} onSelect={(id) => search(id)} />

      <div className="gallery-controls">
        <div className="add-form" style={{ margin: 0, flex: 1 }}>
          <input
            type="text"
            placeholder="SOOP 아이디 (예: bj_nickname)"
            value={bjIdInput}
            onChange={(e) => setBjIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn" onClick={() => search()} disabled={loading || loadingBoards}>
            {loading || loadingBoards ? "불러오는 중..." : "불러오기"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {allImages.length > 1 && (
            <button className="btn btn-ghost" onClick={() => setSlideshowOpen(true)} style={{ whiteSpace: "nowrap" }}>
              <Icon name="play" size={13} style={{ marginRight: "0.35rem", verticalAlign: "-2px" }} />
              갤러리 구경 모드
            </button>
          )}
          {currentBjId && (
            <a href={`https://www.sooplive.com/station/${currentBjId}/post`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ whiteSpace: "nowrap" }}>
              원본 보기
            </a>
          )}
          <button className="btn btn-ghost btn-sm" onClick={clearCookies}>쿠키 초기화</button>
        </div>
      </div>

      {boards.length > 0 && (
        <div className="gallery-board-tabs">
          {boards.map(b => (
            <button
              key={b.bbsNo}
              className={`tag-filter-chip${selectedBoard === b.bbsNo ? " active" : ""}`}
              onClick={() => changeBoard(b)}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {loaded && posts.length > 0 && (
        <div className="gallery-search">
          <input
            type="text"
            placeholder="제목/작성자 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <div className="date-filter-chips">
            {[
              { value: "all", label: "전체" },
              { value: "7d", label: "7일" },
              { value: "30d", label: "30일" },
              { value: "3m", label: "3개월" },
            ].map(({ value, label }) => (
              <button
                key={value}
                className={`tag-filter-chip${dateFilter === value ? " active" : ""}`}
                onClick={() => setDateFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {query && (
            <button className="btn btn-ghost btn-sm" onClick={() => setQuery("")}>
              초기화
            </button>
          )}
        </div>
      )}

      {error && <div className="error-box" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      {loading && posts.length === 0 && (
        <div className="loading-spinner">
          SOOP 게시글 불러오는 중...<br />
          <span style={{ fontSize: "0.82rem", opacity: 0.7 }}>처음 실행 시 쿠키 로그인이 필요해요 (30초~1분)</span>
        </div>
      )}

      {!loading && !loaded && !error && (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="camera" size={40} /></div>
          <h3>아이디를 입력하면 게시판이 표시돼요</h3>
          <p>SOOP 아이디를 입력하고 불러오기를 눌러보세요.</p>
        </div>
      )}

      {!loading && loaded && filteredPosts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="search" size={40} /></div>
          <h3>{posts.length === 0 ? "게시글을 찾지 못했어요" : "검색 결과가 없어요"}</h3>
          <p>{posts.length === 0 ? "아이디를 확인하거나 서버 로그를 살펴보세요." : "다른 키워드나 기간으로 검색해보세요."}</p>
        </div>
      )}

      {filteredPosts.length > 0 && (
        <>
          <div style={{ marginBottom: "1rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            {query || dateFilter !== "all"
              ? `검색 결과 ${filteredPosts.length}개 (로드된 ${posts.length}개 중)`
              : `${posts.length}개 로드됨${hasMore ? " · 스크롤해서 더 보기" : " · 전체 로드 완료"}`}
          </div>
          <div className="gallery-grid">
            {filteredPosts.map((post, i) => (
              <PostCard key={`${post.titleNo}-${i}`} post={post} onOpen={setLightbox} />
            ))}
          </div>
        </>
      )}

      {loaded && hasMore && (
        <div ref={sentinelRef} style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {loading && <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>더 불러오는 중...</span>}
        </div>
      )}
      {loaded && !hasMore && posts.length > 0 && (
        <div style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>전체 로드 완료 ({posts.length}개)</span>
        </div>
      )}

      {lightbox && <Lightbox post={lightbox} onClose={() => setLightbox(null)} />}
      {slideshowOpen && <SlideshowMode images={allImages} onClose={() => setSlideshowOpen(false)} />}
    </div>
  );
}

export default Gallery;

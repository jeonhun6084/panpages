import { useState } from "react";

function extractVideoId(url) {
  const match = url.match(/(?:v=|[/]embed[/]|youtu\.be[/])([^&\n?#]{11})/);
  return match ? match[1] : null;
}

function parseTags(str) {
  return str.split(",").map(t => t.trim()).filter(Boolean);
}

function VideoCard({ video, index, onPlay, onRemove, onDragStart, onDragOver, onDrop, isDragging, isDragOver, canDrag }) {
  return (
    <div
      className={`video-card${isDragging ? " dragging" : ""}${isDragOver ? " drag-over" : ""}`}
      draggable={canDrag}
      onDragStart={canDrag ? () => onDragStart(index) : undefined}
      onDragOver={canDrag ? (e) => { e.preventDefault(); onDragOver(index); } : undefined}
      onDrop={canDrag ? (e) => { e.preventDefault(); onDrop(index); } : undefined}
      onClick={() => onPlay(video)}
    >
      <div className="video-thumbnail">
        <img
          src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
          alt={video.title}
          loading="lazy"
        />
        <div className="play-overlay">
          <div className="play-btn">▶</div>
        </div>
      </div>
      <div className="video-info">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="video-title">{video.title}</div>
          {video.tags?.length > 0 && (
            <div className="tag-list">
              {video.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
            </div>
          )}
        </div>
        <button
          className="btn btn-sm btn-danger"
          onClick={(e) => { e.stopPropagation(); onRemove(video.id); }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function Videos() {
  const [videos, setVideos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fp-videos") || "[]"); }
    catch { return []; }
  });
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [playing, setPlaying] = useState(null);
  const [activeTag, setActiveTag] = useState("전체");
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const save = (list) => {
    setVideos(list);
    localStorage.setItem("fp-videos", JSON.stringify(list));
  };

  const add = () => {
    const id = extractVideoId(url.trim());
    if (!id) { alert("올바른 유튜브 링크를 입력해주세요."); return; }
    if (videos.find((v) => v.id === id)) { alert("이미 추가된 영상입니다."); return; }
    const label = title.trim() || `유튜브 영상 ${videos.length + 1}`;
    const tags = parseTags(tagsInput);
    save([{ id, title: label, tags, addedAt: Date.now() }, ...videos]);
    setUrl(""); setTitle(""); setTagsInput("");
  };

  const remove = (id) => save(videos.filter((v) => v.id !== id));

  const allTags = ["전체", ...new Set(videos.flatMap(v => v.tags || []))];
  const canDrag = activeTag === "전체";
  const filtered = canDrag ? videos : videos.filter(v => v.tags?.includes(activeTag));

  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null); setOverIdx(null); return;
    }
    const next = [...videos];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    save(next);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>유튜브 영상</h1>
        <p>유튜브 링크를 추가해서 나만의 영상 컬렉션을 만들어보세요.</p>
      </div>

      <div className="form-section">
        <div className="add-form">
          <input
            type="text"
            placeholder="유튜브 링크 (https://youtu.be/...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            type="text"
            placeholder="영상 제목 (선택)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            type="text"
            placeholder="태그 (예: 게임,토크)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            style={{ maxWidth: "180px" }}
          />
          <button className="btn" onClick={add}>추가</button>
        </div>
      </div>

      {allTags.length > 1 && (
        <div className="tag-filter">
          {allTags.map(t => (
            <button
              key={t}
              className={`tag-filter-chip${activeTag === t ? " active" : ""}`}
              onClick={() => setActiveTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3>{videos.length === 0 ? "아직 추가된 영상이 없어요" : "해당 태그의 영상이 없어요"}</h3>
          <p>{videos.length === 0 ? "위에서 유튜브 링크를 붙여넣고 추가해보세요!" : "다른 태그를 선택해보세요."}</p>
        </div>
      ) : (
        <div
          className="video-grid"
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
        >
          {filtered.map((v, i) => (
            <VideoCard
              key={v.id}
              video={v}
              index={i}
              onPlay={setPlaying}
              onRemove={remove}
              onDragStart={setDragIdx}
              onDragOver={setOverIdx}
              onDrop={handleDrop}
              isDragging={dragIdx === i}
              isDragOver={canDrag && overIdx === i && dragIdx !== i}
              canDrag={canDrag}
            />
          ))}
        </div>
      )}

      {playing && (
        <div className="modal-overlay" onClick={() => setPlaying(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{playing.title}</h3>
              <button className="modal-close" onClick={() => setPlaying(null)}>✕</button>
            </div>
            <iframe
              src={`https://www.youtube.com/embed/${playing.id}?autoplay=1`}
              title={playing.title}
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Videos;

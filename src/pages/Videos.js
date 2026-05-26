import { useState } from "react";

function extractVideoId(url) {
  const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&\n?#]{11})/);
  return match ? match[1] : null;
}

function VideoCard({ video, onPlay, onRemove }) {
  return (
    <div className="video-card" onClick={() => onPlay(video)}>
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
        <span className="video-title">{video.title}</span>
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
  const [playing, setPlaying] = useState(null);

  const save = (list) => {
    setVideos(list);
    localStorage.setItem("fp-videos", JSON.stringify(list));
  };

  const add = () => {
    const id = extractVideoId(url.trim());
    if (!id) { alert("올바른 유튜브 링크를 입력해주세요."); return; }
    if (videos.find((v) => v.id === id)) { alert("이미 추가된 영상입니다."); return; }
    const label = title.trim() || `유튜브 영상 ${videos.length + 1}`;
    save([{ id, title: label, addedAt: Date.now() }, ...videos]);
    setUrl("");
    setTitle("");
  };

  const remove = (id) => save(videos.filter((v) => v.id !== id));

  return (
    <div className="page">
      <div className="page-header">
        <h1>유튜브 영상</h1>
        <p>유튜브 링크를 추가해서 나만의 영상 컬렉션을 만들어보세요.</p>
      </div>

      <div className="add-form">
        <input
          type="text"
          placeholder="유튜브 링크 붙여넣기 (https://youtu.be/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          type="text"
          placeholder="영상 제목 (선택사항)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn" onClick={add}>추가</button>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3>아직 추가된 영상이 없어요</h3>
          <p>위에서 유튜브 링크를 붙여넣고 추가해보세요!</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} onPlay={setPlaying} onRemove={remove} />
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

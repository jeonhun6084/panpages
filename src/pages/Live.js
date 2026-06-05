import { useState, useEffect, useRef, useCallback } from "react";

const POLL_MS = 60_000;

async function fetchStation(bjId) {
  const res = await fetch(`https://bjapi.afreecatv.com/api/${bjId}/station`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchLatestVodThumb(bjId) {
  try {
    const res = await fetch(`https://bjapi.afreecatv.com/api/${bjId}/vods?page=1&per=1`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const thumb = data?.data?.[0]?.ucc?.thumb;
    return thumb ? (thumb.startsWith("//") ? "https:" + thumb : thumb) : "";
  } catch {
    return "";
  }
}

function ChannelCard({ bjId, status, notifOn, onRemove, onRefresh, onToggleNotif }) {
  return (
    <div className={`channel-card${status?.isLive ? " channel-live" : ""}`}>
      {!status ? (
        <div className="channel-info">
          <div className="loading-spinner" style={{ padding: "1.5rem 0" }}>확인 중...</div>
        </div>
      ) : status.isLive ? (
        <>
          <div className="channel-banner">
            {status.thumb
              ? <img src={status.thumb} alt="방송 썸네일" />
              : <div className="live-banner-placeholder">📺</div>
            }
            <div className="live-badge"><span className="live-dot" />LIVE</div>
          </div>
          <div className="channel-info">
            <div className="live-profile">
              {status.profileImg
                ? <img src={status.profileImg} alt={status.nickname} />
                : <div className="live-profile-placeholder">👤</div>
              }
              <span className="live-nickname">{status.nickname}</span>
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: "1rem", lineHeight: 1.4 }}>
              {status.title || "제목 없음"}
            </div>
            <a className="btn btn-sm" href={`https://play.afreecatv.com/${bjId}`} target="_blank" rel="noopener noreferrer">
              방송 보러가기
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="channel-banner">
            {status.vodThumb ? (
              <img src={status.vodThumb} alt="최근 방송 썸네일" style={{ opacity: 0.7 }} />
            ) : status.profileImg ? (
              <div className="live-banner-placeholder">
                <img src={status.profileImg} alt={status.nickname} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
              </div>
            ) : (
              <div className="live-banner-placeholder">📺</div>
            )}
            <div className="offline-badge" style={{ position: "absolute", top: "0.75rem", left: "0.75rem", marginBottom: 0 }}>⚫ 오프라인</div>
          </div>
          <div className="channel-info">
            <div className="live-profile">
              {status.profileImg
                ? <img src={status.profileImg} alt={status.nickname} />
                : <div className="live-profile-placeholder">👤</div>
              }
              <span className="live-nickname">{status.nickname || bjId}</span>
            </div>
            {status.error && (
              <p style={{ fontSize: "0.78rem", color: "var(--red)" }}>{status.error}</p>
            )}
          </div>
        </>
      )}

      <div className="channel-footer">
        <button
          className={`btn btn-sm${notifOn ? "" : " btn-ghost"}`}
          onClick={() => onToggleNotif(bjId)}
        >
          {notifOn ? "🔔 알람 켜짐" : "🔕 알람 켜기"}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => onRefresh(bjId)} title="새로고침">↻</button>
        <button className="btn btn-sm btn-danger" onClick={() => onRemove(bjId)}>삭제</button>
      </div>
    </div>
  );
}

function Live() {
  const [channels, setChannels] = useState(() => {
    try {
      const saved = localStorage.getItem("fp-channels");
      if (saved) return JSON.parse(saved);
      // 기존 단일 채널 마이그레이션
      const oldId = localStorage.getItem("fp-bjid");
      if (oldId) return [{ bjId: oldId }];
      return [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [statuses, setStatuses] = useState({});
  const [notifChannels, setNotifChannels] = useState({});
  const prevLiveRef = useRef({});

  const saveChannels = (list) => {
    setChannels(list);
    localStorage.setItem("fp-channels", JSON.stringify(list));
  };

  const checkChannel = useCallback(async (bjId) => {
    try {
      const [data, vodThumb] = await Promise.all([
        fetchStation(bjId),
        fetchLatestVodThumb(bjId),
      ]);
      const isLive = !!data.broad;
      const liveThumb = data.broad?.broad_thumb
        ? (data.broad.broad_thumb.startsWith("//") ? "https:" + data.broad.broad_thumb : data.broad.broad_thumb)
        : "";
      setStatuses(prev => ({
        ...prev,
        [bjId]: {
          isLive,
          title: data.broad?.broad_title || "",
          thumb: liveThumb,
          vodThumb,
          profileImg: data.profile_image
            ? (data.profile_image.startsWith("//") ? "https:" + data.profile_image : data.profile_image)
            : "",
          nickname: data.station?.user_nick || bjId,
          error: null,
        },
      }));
    } catch (e) {
      const msg = e.message.includes("Failed to fetch") || e.message.includes("CORS")
        ? "API 연결 실패 (CORS)"
        : `오류: ${e.message}`;
      setStatuses(prev => ({
        ...prev,
        [bjId]: { ...(prev[bjId] || { isLive: false }), error: msg },
      }));
    }
  }, []);

  // 브라우저 알림 발송
  useEffect(() => {
    Object.entries(statuses).forEach(([bjId, st]) => {
      if (!notifChannels[bjId] || !st) return;
      const prev = prevLiveRef.current[bjId];
      if (prev === false && st.isLive) {
        new Notification("🔴 방송 시작!", {
          body: `${st.nickname}님이 방송을 시작했습니다!\n${st.title}`,
          icon: st.profileImg || undefined,
        });
      }
      prevLiveRef.current[bjId] = st.isLive;
    });
  }, [statuses, notifChannels]);

  // 최초 로드 + 폴링
  useEffect(() => {
    if (channels.length === 0) return;
    channels.forEach(ch => checkChannel(ch.bjId));
    const id = setInterval(() => channels.forEach(ch => checkChannel(ch.bjId)), POLL_MS);
    return () => clearInterval(id);
  }, [channels, checkChannel]);

  const addChannel = () => {
    const id = input.trim();
    if (!id) return;
    if (channels.find(c => c.bjId === id)) { alert("이미 등록된 채널입니다."); return; }
    saveChannels([...channels, { bjId: id }]);
    setInput("");
  };

  const removeChannel = (bjId) => {
    saveChannels(channels.filter(c => c.bjId !== bjId));
    setStatuses(prev => { const s = { ...prev }; delete s[bjId]; return s; });
  };

  const toggleNotif = async (bjId) => {
    if (!notifChannels[bjId]) {
      if (!("Notification" in window)) { alert("이 브라우저는 알림을 지원하지 않습니다."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { alert("알림 권한이 거부됐습니다. 브라우저 설정에서 허용해주세요."); return; }
    }
    setNotifChannels(prev => ({ ...prev, [bjId]: !prev[bjId] }));
  };

  const liveCount = Object.values(statuses).filter(s => s?.isLive).length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>라이브 알람</h1>
        <p>
          SOOP / 아프리카TV 아이디를 등록하고 방송 시작 알림을 받아보세요.
          {liveCount > 0 && (
            <span style={{ color: "var(--red)", marginLeft: "0.5rem", fontWeight: 600 }}>
              🔴 {liveCount}개 방송 중
            </span>
          )}
        </p>
      </div>

      <div className="setup-card">
        <input
          type="text"
          placeholder="BJ 아이디 (예: bj_nickname)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addChannel()}
        />
        <button className="btn" onClick={addChannel}>채널 추가</button>
      </div>

      {channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📡</div>
          <h3>등록된 채널이 없어요</h3>
          <p>위에서 BJ 아이디를 입력하고 추가해보세요.</p>
        </div>
      ) : (
        <div className="channel-grid">
          {channels.map(ch => (
            <ChannelCard
              key={ch.bjId}
              bjId={ch.bjId}
              status={statuses[ch.bjId] || null}
              notifOn={!!notifChannels[ch.bjId]}
              onRemove={removeChannel}
              onRefresh={checkChannel}
              onToggleNotif={toggleNotif}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Live;

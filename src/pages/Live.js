import { useState, useEffect } from "react";
import { useLive } from "../context/LiveContext";
import Icon from "../components/Icon";

const THUMB_REFRESH_MS = 30_000;

function formatHistoryClock(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  if (sameDay(d, now)) return `오늘 ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `어제 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

function formatHistoryRelative(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${Math.floor(diffHr / 24)}일 전`;
}

function HistoryPanel({ history, onClear }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;

  return (
    <div className="live-history">
      <button className={`live-history-toggle${open ? " open" : ""}`} onClick={() => setOpen(o => !o)}>
        <span>방송 시작 기록 <span className="live-history-count">{history.length}</span></span>
        <span className={`notice-row-chevron${open ? " open" : ""}`}>›</span>
      </button>
      {open && (
        <>
          <div className="live-history-list">
            {history.map((h, i) => (
              <div key={`${h.bjId}-${h.startedAt}-${i}`} className="live-history-row">
                {h.profileImg ? (
                  <img src={h.profileImg} alt={h.nickname} className="live-history-avatar" />
                ) : (
                  <div className="live-history-avatar-placeholder"><Icon name="user" size={13} /></div>
                )}
                <span className="live-history-nickname">{h.nickname}</span>
                <span className="live-history-title">{h.title || "방송 시작"}</span>
                <span className="live-history-time" title={new Date(h.startedAt).toLocaleString("ko-KR")}>
                  {formatHistoryRelative(h.startedAt)} · {formatHistoryClock(h.startedAt)}
                </span>
              </div>
            ))}
          </div>
          <div className="live-history-footer">
            <button className="btn btn-ghost btn-sm" onClick={onClear}>기록 지우기</button>
          </div>
        </>
      )}
    </div>
  );
}

function PlayerModal({ bjId, broadNo, title, nickname, profileImg, onClose }) {
  const [thumb, setThumb] = useState(
    broadNo ? `https://liveimg.sooplive.com/m/${broadNo}?t=${Date.now()}` : ""
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!broadNo) return;
    const id = setInterval(() => {
      setThumb(`https://liveimg.sooplive.com/m/${broadNo}?t=${Date.now()}`);
    }, THUMB_REFRESH_MS);
    return () => clearInterval(id);
  }, [broadNo]);

  const openPlayer = () => {
    window.open(
      `https://play.sooplive.com/${bjId}`,
      `soop_${bjId}`,
      "width=1200,height=720,toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1"
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal live-player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
            {profileImg && <img src={profileImg} alt={nickname} style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem", minWidth: 0 }}>
              <span style={{ fontSize: "0.7rem", color: "var(--red)", fontWeight: 700, letterSpacing: "0.5px" }}><span className="dot-live" />LIVE · {nickname}</span>
              <h3 style={{ fontSize: "0.88rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{title || "방송 중"}</h3>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="닫기"><Icon name="close" size={16} /></button>
        </div>

        <div style={{ position: "relative", background: "#000", cursor: "pointer" }} onClick={openPlayer}>
          {thumb && (
            <img
              src={thumb}
              alt="라이브 썸네일"
              onError={(e) => { e.target.style.display = "none"; }}
              style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
            />
          )}
          <div className="live-play-overlay" style={{ opacity: 1, background: "rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <div className="live-play-btn" style={{ width: 64, height: 64, fontSize: "1.5rem" }}>▶</div>
              <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 600, letterSpacing: "-0.2px" }}>
                클릭해서 플레이어 열기
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>팝업 창으로 SOOP 플레이어가 열립니다</span>
          <button className="btn btn-sm" onClick={openPlayer}>▶ 플레이어 열기</button>
        </div>
      </div>
    </div>
  );
}

function MultiViewTile({ bjId, status }) {
  const [active, setActive] = useState(false);
  const [thumb, setThumb] = useState("");

  useEffect(() => {
    if (active || !status?.broadNo) return;
    const refresh = () => setThumb(`https://liveimg.sooplive.com/m/${status.broadNo}?t=${Date.now()}`);
    refresh();
    const id = setInterval(refresh, THUMB_REFRESH_MS);
    return () => clearInterval(id);
  }, [active, status?.broadNo]);

  const openPopup = () => {
    window.open(
      `https://play.sooplive.com/${bjId}`,
      `soop_${bjId}`,
      "width=1200,height=720,toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1"
    );
  };

  return (
    <div className="multiview-tile">
      <div className="multiview-tile-frame">
        {active ? (
          <iframe
            src={`https://play.sooplive.com/${bjId}`}
            title={`${status.nickname || bjId} 라이브`}
            className="multiview-iframe"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        ) : (
          <div className="multiview-thumb" onClick={() => setActive(true)} title="클릭해서 재생">
            {thumb
              ? <img src={thumb} alt="라이브 화면" onError={(e) => { e.target.style.display = "none"; }} />
              : <div className="live-banner-placeholder"><Icon name="film" size={26} /></div>
            }
            <div className="live-play-overlay" style={{ opacity: 1, background: "rgba(0,0,0,0.4)" }}>
              <div className="live-play-btn"><Icon name="play" size={18} /></div>
            </div>
          </div>
        )}
      </div>
      <div className="multiview-tile-bar">
        {status.profileImg
          ? <img src={status.profileImg} alt={status.nickname} className="multiview-tile-avatar" />
          : <div className="live-profile-placeholder" style={{ width: 22, height: 22 }}><Icon name="user" size={11} /></div>
        }
        <span className="multiview-tile-name">{status.nickname || bjId}</span>
        <div className="multiview-tile-actions">
          <button className="multiview-tile-btn" onClick={openPopup} title="팝업으로 열기" aria-label="팝업으로 열기">
            <Icon name="external" size={13} />
          </button>
          {active && (
            <button className="multiview-tile-btn" onClick={() => setActive(false)} title="플레이어 닫기" aria-label="플레이어 닫기">
              <Icon name="close" size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MultiViewMode({ liveChannels, statuses, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="multiview-overlay">
      <div className="multiview-header">
        <h3><span className="dot-live" />멀티뷰 · {liveChannels.length}개 동시 시청</h3>
        <button className="multiview-close" onClick={onClose} aria-label="닫기"><Icon name="close" size={18} /></button>
      </div>
      <div className="multiview-grid">
        {liveChannels.map(ch => (
          <MultiViewTile key={ch.bjId} bjId={ch.bjId} status={statuses[ch.bjId]} />
        ))}
      </div>
      <p className="multiview-hint">화면을 클릭하면 재생돼요 · 플레이어는 새 창으로도 열 수 있어요</p>
    </div>
  );
}

function ChannelCard({ bjId, status, notifOn, onRefresh, onToggleNotif }) {
  const stationUrl = `https://www.sooplive.com/station/${bjId}`;
  const [liveThumb, setLiveThumb] = useState("");
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    if (!status?.isLive || !status?.broadNo) { setLiveThumb(""); return; }
    const refresh = () =>
      setLiveThumb(`https://liveimg.sooplive.com/m/${status.broadNo}?t=${Date.now()}`);
    refresh();
    const id = setInterval(refresh, THUMB_REFRESH_MS);
    return () => clearInterval(id);
  }, [status?.isLive, status?.broadNo]);

  const profileLink = (children) => (
    <a className="live-profile" href={stationUrl} target="_blank" rel="noopener noreferrer"
      style={{ textDecoration: "none", color: "inherit" }}>
      {children}
    </a>
  );

  return (
    <>
      <div className={`channel-card${status?.isLive ? " channel-live" : ""}`}>
        {!status ? (
          <div className="channel-info">
            <div className="loading-spinner" style={{ padding: "1.5rem 0" }}>확인 중...</div>
          </div>
        ) : status.isLive ? (
          <>
            <div
              className="channel-banner live-banner-clickable"
              onClick={() => setPlayerOpen(true)}
              title="클릭해서 방송 보기"
            >
              {liveThumb
                ? <img src={liveThumb} alt="라이브 화면"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                : <div className="live-banner-placeholder"><Icon name="film" size={28} /></div>
              }
              <div className="live-badge"><span className="live-dot" />LIVE</div>
              <div className="live-play-overlay">
                <div className="live-play-btn">▶</div>
              </div>
            </div>
            <div className="channel-info">
              {profileLink(<>
                {status.profileImg
                  ? <img src={status.profileImg} alt={status.nickname} />
                  : <div className="live-profile-placeholder"><Icon name="user" size={16} /></div>
                }
                <span className="live-nickname">{status.nickname}</span>
              </>)}
              <div style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: "1rem", lineHeight: 1.4 }}>
                {status.title || "제목 없음"}
              </div>
              <button className="btn btn-sm" onClick={() => setPlayerOpen(true)}>
                ▶ 바로 보기
              </button>
            </div>
          </>
        ) : (
          <div className="channel-info">
            {profileLink(<>
              {status.profileImg
                ? <img src={status.profileImg} alt={status.nickname} />
                : <div className="live-profile-placeholder"><Icon name="user" size={16} /></div>
              }
              <span className="live-nickname">{status.nickname || bjId}</span>
            </>)}
            <div className="offline-badge"><span className="dot-offline" /> 오프라인</div>
            {status.error && (
              <p style={{ fontSize: "0.78rem", color: "var(--red)" }}>{status.error}</p>
            )}
          </div>
        )}

        <div className="channel-footer">
          <button
            className={`btn btn-sm${notifOn ? "" : " btn-ghost"}`}
            onClick={() => onToggleNotif(bjId)}
          >
            <Icon name={notifOn ? "bell" : "bellOff"} size={13} style={{ marginRight: "0.35rem", verticalAlign: "-2px" }} />
            {notifOn ? "알람 켜짐" : "알람 켜기"}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => onRefresh(bjId)} title="새로고침">↻</button>
        </div>
      </div>

      {playerOpen && status?.isLive && (
        <PlayerModal
          bjId={bjId}
          broadNo={status.broadNo}
          title={status.title}
          nickname={status.nickname}
          profileImg={status.profileImg}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </>
  );
}

function Live() {
  const { channels, statuses, notifChannels, liveCount, history, checkChannel, toggleNotif, clearHistory } = useLive();
  const [multiViewOpen, setMultiViewOpen] = useState(false);
  const liveChannels = channels.filter(ch => statuses[ch.bjId]?.isLive);

  return (
    <div className="page">
      <div className="page-header">
        <h1>라이브 알람</h1>
        <p>
          SOOP / 아프리카TV 방송 시작 알림을 받아보세요.
          {liveCount > 0 && (
            <span style={{ color: "var(--red)", marginLeft: "0.5rem", fontWeight: 600 }}>
              <span className="dot-live" />{liveCount}개 방송 중
            </span>
          )}
        </p>
      </div>

      {liveChannels.length >= 2 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <button className="btn btn-ghost" onClick={() => setMultiViewOpen(true)}>
            <Icon name="grid" size={13} style={{ marginRight: "0.35rem", verticalAlign: "-2px" }} />
            멀티뷰로 동시 시청 ({liveChannels.length})
          </button>
        </div>
      )}

      {channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="signal" size={40} /></div>
          <h3>등록된 채널이 없어요</h3>
          <p>관리자 페이지에서 BJ 채널을 추가할 수 있습니다.</p>
        </div>
      ) : (
        <div className="channel-grid">
          {channels.map(ch => (
            <ChannelCard
              key={ch.bjId}
              bjId={ch.bjId}
              status={statuses[ch.bjId] || null}
              notifOn={!!notifChannels[ch.bjId]}
              onRefresh={checkChannel}
              onToggleNotif={toggleNotif}
            />
          ))}
        </div>
      )}

      <HistoryPanel
        history={history}
        onClear={() => { if (window.confirm("방송 시작 기록을 모두 삭제할까요?")) clearHistory(); }}
      />

      {multiViewOpen && (
        <MultiViewMode
          liveChannels={liveChannels}
          statuses={statuses}
          onClose={() => setMultiViewOpen(false)}
        />
      )}
    </div>
  );
}

export default Live;

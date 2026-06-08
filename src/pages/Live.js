import { useState, useEffect } from "react";
import { useLive } from "../context/LiveContext";
import Icon from "../components/Icon";

const THUMB_REFRESH_MS = 30_000;

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
  const { channels, statuses, notifChannels, liveCount, checkChannel, toggleNotif } = useLive();

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
    </div>
  );
}

export default Live;

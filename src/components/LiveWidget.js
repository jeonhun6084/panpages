import { useState } from "react";
import { useLive } from "../context/LiveContext";
import Icon from "./Icon";

export default function LiveWidget() {
  const { channels, statuses, liveCount } = useLive();
  const [open, setOpen] = useState(false);

  if (channels.length === 0) return null;

  return (
    <div className={`live-widget${open ? " live-widget-open" : ""}`}>
      <button
        className="live-widget-tab"
        onClick={() => setOpen(v => !v)}
        title="라이브 상태"
      >
        {liveCount > 0 ? (
          <span className="live-widget-dot live-widget-dot-on" />
        ) : (
          <span className="live-widget-dot live-widget-dot-off" />
        )}
        <span className="live-widget-count">{liveCount > 0 ? liveCount : channels.length}</span>
        <span className="live-widget-label">LIVE</span>
      </button>

      {open && (
        <div className="live-widget-panel">
          <div className="live-widget-panel-title">
            라이브 상태
            {liveCount > 0 && (
              <span style={{ color: "var(--red)", marginLeft: "0.4rem", fontSize: "0.75rem" }}>
                {liveCount}개 방송 중
              </span>
            )}
          </div>
          <ul className="live-widget-list">
            {channels.map(ch => {
              const st = statuses[ch.bjId];
              const isLive = st?.isLive;
              const nickname = st?.nickname || ch.bjId;
              const profileImg = st?.profileImg;
              return (
                <li key={ch.bjId} className="live-widget-item">
                  <div className={`live-widget-status-dot ${isLive ? "on" : "off"}`} />
                  {profileImg ? (
                    <img src={profileImg} alt={nickname} className="live-widget-avatar" />
                  ) : (
                    <div className="live-widget-avatar-placeholder"><Icon name="user" size={14} /></div>
                  )}
                  <div className="live-widget-item-info">
                    <span className="live-widget-nickname">{nickname}</span>
                    {isLive && (
                      <a
                        href={`https://play.afreecatv.com/${ch.bjId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="live-widget-watch"
                      >
                        보러가기
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

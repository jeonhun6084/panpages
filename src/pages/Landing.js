import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLive } from "../context/LiveContext";
import Icon from "../components/Icon";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d)) return dateStr;
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function LiveBar({ channels, statuses }) {
  const live = channels.filter(ch => statuses[ch.bjId]?.isLive);
  if (live.length === 0) return null;

  return (
    <div className="landing-live-bar">
      <span className="landing-live-badge">
        <span className="live-dot" />
        LIVE
      </span>
      <div className="landing-live-chips">
        {live.map(ch => {
          const st = statuses[ch.bjId];
          return (
            <a
              key={ch.bjId}
              href={`https://play.afreecatv.com/${ch.bjId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-live-chip"
            >
              {st.profileImg && (
                <img src={st.profileImg} alt={st.nickname} className="landing-live-chip-avatar" />
              )}
              <span>{st.nickname || ch.bjId}</span>
              <span className="landing-live-chip-title">{st.title}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function NoticeRow({ notice, bjId, channelStatus }) {
  const [open, setOpen] = useState(false);
  const nickname = channelStatus?.nickname || notice.author || bjId;
  const profileImg = channelStatus?.profileImg || notice.profileImage;

  return (
    <li className={`notice-row${open ? " notice-row-open" : ""}`}>
      <button className="notice-row-summary" onClick={() => setOpen(v => !v)}>
        <span className="notice-row-channel">
          {profileImg
            ? <img src={profileImg} alt={nickname} className="notice-row-avatar" />
            : <span className="notice-row-avatar-placeholder"><Icon name="user" size={13} /></span>
          }
          <span className="notice-row-nickname">{nickname}</span>
        </span>
        <span className="notice-row-title">{notice.title}</span>
        <span className="notice-row-date">{formatDate(notice.date)}</span>
        <span className={`notice-row-chevron${open ? " open" : ""}`}>›</span>
      </button>

      {open && (
        <div className="notice-row-detail">
          {notice.thumbnail && (
            <img src={notice.thumbnail} alt="" className="notice-detail-thumb" loading="lazy" />
          )}
          {notice.text && (
            <p className="notice-detail-text">{notice.text}</p>
          )}
          <div className="notice-detail-footer">
            <span className="notice-detail-meta">
              {notice.views > 0 && <span>조회 {Number(notice.views).toLocaleString()}</span>}
              {notice.comments > 0 && <span>댓글 {Number(notice.comments).toLocaleString()}</span>}
              {notice.likes > 0 && <span>좋아요 {Number(notice.likes).toLocaleString()}</span>}
            </span>
            <a
              href={notice.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-text"
            >
              원문 보기 →
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

export default function Landing() {
  const { channels, statuses } = useLive();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendOff, setBackendOff] = useState(false);

  useEffect(() => {
    if (channels.length === 0) return;
    setLoading(true);
    setBackendOff(false);

    Promise.all(
      channels.map(ch =>
        fetch(`/api/notices/${ch.bjId}?limit=5`)
          .then(r => r.ok ? r.json() : { notices: [] })
          .then(data => (data.notices || []).map(n => ({ ...n, bjId: ch.bjId })))
          .catch(() => [])
      )
    ).then(results => {
      const toMs = (d) => d ? new Date(d.replace(' ', 'T')).getTime() || 0 : 0;
      const all = results
        .flat()
        .sort((a, b) => toMs(b.date) - toMs(a.date));
      if (all.length === 0 && results.every(r => r.length === 0)) setBackendOff(true);
      setNotices(all);
      setLoading(false);
    });
  }, [channels]);

  const liveCount = channels.filter(ch => statuses[ch.bjId]?.isLive).length;

  return (
    <div className="page landing-page">
      <div className="landing-hero">
        <h1 className="landing-title">✦ FanPage</h1>
        <p className="landing-subtitle">
          {channels.length > 0 ? (
            <>
              {channels.length}개 채널 모니터링 중
              {liveCount > 0 && (
                <> · <span className="dot-live" />{liveCount}개 방송 중</>
              )}
            </>
          ) : "관리자 페이지에서 채널을 추가해보세요."}
        </p>
        {channels.length === 0 && (
          <div style={{ marginTop: "1.75rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/admin" className="btn">채널 추가하기</Link>
            <Link to="/live" className="btn-text" style={{ lineHeight: "2.1" }}>라이브 보기 →</Link>
          </div>
        )}
      </div>

      {channels.length > 0 && (
        <LiveBar channels={channels} statuses={statuses} />
      )}

      {channels.length > 0 && (
        <div className="landing-section">
          <div className="landing-section-header">
            <h2>최신 소식</h2>
            <span className="landing-section-hint">백엔드 서버 필요</span>
          </div>

          {loading && (
            <ul className="notice-list">
              {[1, 2, 3, 4, 5].map(i => (
                <li key={i} className="notice-row-skeleton">
                  <div className="skeleton-circle" />
                  <div className="skeleton-line mid" style={{ flex: 1 }} />
                  <div className="skeleton-line short" />
                </li>
              ))}
            </ul>
          )}

          {!loading && backendOff && (
            <div className="landing-backend-off">
              <span className="landing-backend-icon"><Icon name="plug" size={28} /></span>
              <p>백엔드 서버가 실행 중이지 않습니다.</p>
              <code>cd server && npm start</code>
            </div>
          )}

          {!loading && !backendOff && notices.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="inbox" size={40} /></div>
              <h3>공지가 없어요</h3>
              <p>등록된 채널에 공지 게시판이 없거나 공지가 없습니다.</p>
            </div>
          )}

          {!loading && notices.length > 0 && (
            <ul className="notice-list">
              {notices.map((n, i) => (
                <NoticeRow
                  key={`${n.bjId}-${n.titleNo}-${i}`}
                  notice={n}
                  bjId={n.bjId}
                  channelStatus={statuses[n.bjId]}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

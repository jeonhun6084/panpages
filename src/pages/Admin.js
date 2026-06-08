import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { useLive } from "../context/LiveContext";
import { useGalleryFavs } from "../hooks/useGalleryFavs";
import { ADMIN_EMAIL } from "../config";
import Icon from "../components/Icon";

function AdminLogin({ onLogin }) {
  const [error, setError] = useState("");

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        if (userInfo.email !== ADMIN_EMAIL) {
          setError(`접근 권한이 없습니다. (${userInfo.email})`);
          return;
        }
        onLogin(userInfo);
      } catch {
        setError("로그인 중 오류가 발생했습니다.");
      }
    },
    onError: () => setError("구글 로그인에 실패했습니다."),
  });

  return (
    <div className="page">
      <div className="admin-login-card">
        <div className="admin-lock-icon"><Icon name="lock" size={28} /></div>
        <h2 className="admin-login-title">관리자</h2>
        <p className="admin-login-desc">
          채널을 관리하려면 구글 계정으로 로그인하세요.
        </p>
        <button className="btn btn-google" onClick={() => login()}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: "0.5rem" }}>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.5-1.45-.78-2.99-.78-4.59s.27-3.14.78-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          </svg>
          Google로 로그인
        </button>
        {error && <p className="admin-login-error">{error}</p>}
      </div>
    </div>
  );
}

function ChannelManager() {
  const { user, logout } = useAuth();
  const { channels, statuses, addChannel, removeChannel, checkChannel } = useLive();
  const [input, setInput] = useState("");
  const [addError, setAddError] = useState("");

  const handleAdd = () => {
    const id = input.trim();
    if (!id) return;
    const ok = addChannel(id);
    if (!ok) { setAddError("이미 등록된 채널입니다."); return; }
    setInput("");
    setAddError("");
    checkChannel(id);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>채널 관리</h1>
        <p>
          라이브 모니터링할 SOOP/아프리카TV 채널을 관리합니다.
          <span className="admin-user-badge">
            <img src={user.picture} alt={user.name} />
            {user.name}
          </span>
        </p>
      </div>

      <div className="setup-card">
        <input
          type="text"
          placeholder="BJ 아이디 (예: bj_nickname)"
          value={input}
          onChange={(e) => { setInput(e.target.value); setAddError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="btn" onClick={handleAdd}>채널 추가</button>
      </div>
      {addError && <p className="admin-error-msg">{addError}</p>}

      {channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="signal" size={40} /></div>
          <h3>등록된 채널이 없어요</h3>
          <p>위에서 BJ 아이디를 입력하고 추가해보세요.</p>
        </div>
      ) : (
        <div className="admin-channel-list">
          {channels.map(ch => {
            const st = statuses[ch.bjId];
            return (
              <div key={ch.bjId} className="admin-channel-row">
                <div className={`admin-status-dot${st?.isLive ? " on" : ""}`} />
                {st?.profileImg ? (
                  <img src={st.profileImg} alt={ch.bjId} className="admin-channel-avatar" />
                ) : (
                  <div className="admin-channel-avatar-placeholder"><Icon name="user" size={16} /></div>
                )}
                <div className="admin-channel-info">
                  <span className="admin-channel-nickname">
                    {st?.nickname || ch.bjId}
                  </span>
                  <span className="admin-channel-id">@{ch.bjId}</span>
                </div>
                <div className={`admin-live-label${st?.isLive ? " live" : ""}`}>
                  {st === undefined
                    ? "확인 중..."
                    : st.isLive
                      ? <><span className="dot-live" />방송 중</>
                      : <><span className="dot-offline" /> 오프라인</>}
                </div>
                <div className="admin-channel-actions">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => checkChannel(ch.bjId)}
                    title="새로고침"
                  >↻</button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeChannel(ch.bjId)}
                  >삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GalleryFavManager statuses={statuses} />

      <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
        <button className="btn btn-ghost btn-sm" onClick={logout}>로그아웃</button>
      </div>
    </div>
  );
}

function GalleryFavManager({ statuses }) {
  const { favs, addFav, removeFav } = useGalleryFavs();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const id = input.trim();
    if (!id) return;
    const ok = addFav(id);
    if (!ok) { setError("이미 추가된 채널입니다."); return; }
    setInput("");
    setError("");
  };

  return (
    <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--border)", paddingTop: "2rem" }}>
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.4px" }}>갤러리 즐겨찾기</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
          갤러리에서 빠르게 접근할 SOOP 채널을 등록하세요.
        </p>
      </div>

      <div className="setup-card">
        <input
          type="text"
          placeholder="BJ 아이디 (예: bj_nickname)"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="btn" onClick={handleAdd}>추가</button>
      </div>
      {error && <p className="admin-error-msg">{error}</p>}

      {favs.length === 0 ? (
        <div className="empty-state" style={{ padding: "2rem" }}>
          <span className="empty-icon"><Icon name="photo" size={32} /></span>
          <h3>등록된 즐겨찾기가 없어요</h3>
          <p>갤러리에서 바로 볼 채널을 추가해보세요.</p>
        </div>
      ) : (
        <div className="admin-channel-list">
          {favs.map(bjId => {
            const st = statuses?.[bjId];
            return (
              <div key={bjId} className="admin-channel-row">
                <div className={`admin-status-dot${st?.isLive ? " on" : ""}`} />
                {st?.profileImg ? (
                  <img src={st.profileImg} alt={bjId} className="admin-channel-avatar" />
                ) : (
                  <div className="admin-channel-avatar-placeholder"><Icon name="camera" size={15} /></div>
                )}
                <div className="admin-channel-info">
                  <span className="admin-channel-nickname">{st?.nickname || bjId}</span>
                  <span className="admin-channel-id">@{bjId}</span>
                </div>
                <span style={{ fontSize: "0.73rem", color: "var(--text-subtle)", marginLeft: "auto" }}>갤러리</span>
                <div className="admin-channel-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => removeFav(bjId)}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const { user, login, isAdmin } = useAuth();

  if (!user || !isAdmin) return <AdminLogin onLogin={login} />;
  return <ChannelManager />;
}

import { useState, useEffect, useRef, useCallback } from "react";

const POLL_MS = 60_000;

async function fetchStation(bjId) {
  const res = await fetch(`https://bjapi.afreecatv.com/api/${bjId}/station`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function Live() {
  const [bjIdInput, setBjIdInput] = useState(
    () => localStorage.getItem("fp-bjid") || ""
  );
  const [bjId, setBjId] = useState(
    () => localStorage.getItem("fp-bjid") || ""
  );
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifOn, setNotifOn] = useState(false);
  const intervalRef = useRef(null);
  const prevLive = useRef(null);

  const check = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchStation(id);
      const isLive = !!data.broad;
      setStatus({
        isLive,
        title: data.broad?.broad_title || "",
        thumb: data.broad?.broad_thumb || "",
        profileImg: data.profile_image || "",
        nickname: data.station?.user_nick || id,
        bjId: id,
      });
    } catch (e) {
      if (e.message.includes("Failed to fetch") || e.message.includes("CORS")) {
        setError("CORS 오류: 브라우저 보안 정책으로 직접 API 호출이 차단됐습니다.\n아프리카TV에서 직접 방송 상태를 확인해주세요.");
      } else {
        setError(`불러오기 실패: ${e.message}`);
      }
    }
    setLoading(false);
  }, []);

  // Poll while notif is on
  useEffect(() => {
    if (notifOn && bjId) {
      intervalRef.current = setInterval(() => check(bjId), POLL_MS);
    }
    return () => clearInterval(intervalRef.current);
  }, [notifOn, bjId, check]);

  // Send browser notification on live start
  useEffect(() => {
    if (!status || !notifOn) return;
    if (prevLive.current === false && status.isLive) {
      new Notification(`🔴 방송 시작!`, {
        body: `${status.nickname}님이 방송을 시작했습니다!\n${status.title}`,
        icon: status.profileImg || undefined,
      });
    }
    prevLive.current = status.isLive;
  }, [status, notifOn]);

  const save = () => {
    const id = bjIdInput.trim();
    if (!id) return;
    localStorage.setItem("fp-bjid", id);
    setBjId(id);
    check(id);
  };

  const enableNotif = async () => {
    if (!("Notification" in window)) {
      alert("이 브라우저는 알림을 지원하지 않습니다.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifOn(true);
    } else {
      alert("알림 권한이 거부됐습니다. 브라우저 설정에서 허용해주세요.");
    }
  };

  // Initial load
  useEffect(() => {
    if (bjId) check(bjId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="page-header">
        <h1>라이브 알람</h1>
        <p>아프리카TV BJ 아이디를 등록하고 방송 시작 알림을 받아보세요.</p>
      </div>

      <div className="setup-card">
        <input
          type="text"
          placeholder="아프리카TV 아이디 (예: bj_nickname)"
          value={bjIdInput}
          onChange={(e) => setBjIdInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button className="btn" onClick={save}>등록</button>
        {bjId && (
          <button className="btn btn-ghost" onClick={() => check(bjId)} disabled={loading}>
            {loading ? "확인 중..." : "새로고침"}
          </button>
        )}
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: "1.5rem" }}>
          {error.split("\n").map((line, i) => <p key={i}>{line}</p>)}
          {bjId && (
            <a
              href={`https://play.afreecatv.com/${bjId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--pink)", display: "inline-block", marginTop: "0.75rem", fontSize: "0.88rem" }}
            >
              아프리카TV에서 직접 확인하기 →
            </a>
          )}
        </div>
      )}

      {!error && bjId && !loading && status && (
        <>
          {status.isLive ? (
            <div className="live-card">
              <div className="live-banner">
                {status.thumb ? (
                  <img src={status.thumb} alt="방송 썸네일" />
                ) : (
                  <div className="live-banner-placeholder">📺</div>
                )}
                <div className="live-badge">
                  <span className="live-dot" />
                  LIVE
                </div>
              </div>
              <div className="live-info">
                <div className="live-profile">
                  {status.profileImg ? (
                    <img src={status.profileImg} alt={status.nickname} />
                  ) : (
                    <div className="live-profile-placeholder">👤</div>
                  )}
                  <span className="live-nickname">{status.nickname}</span>
                </div>
                <div className="live-title">{status.title || "제목 없음"}</div>
                <div className="live-actions">
                  <a
                    className="btn"
                    href={`https://play.afreecatv.com/${status.bjId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    방송 보러가기
                  </a>
                  <button className="btn btn-ghost" onClick={() => check(bjId)}>
                    새로고침
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="offline-card">
              <div className="offline-badge">⚫ 오프라인</div>
              <div className="nickname">{status.nickname}</div>
              <p>현재 방송 중이 아닙니다.</p>
              <p style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}>
                1분마다 자동으로 상태를 확인합니다.
              </p>
            </div>
          )}
        </>
      )}

      {loading && !status && (
        <div className="loading-spinner">방송 상태 확인 중...</div>
      )}

      {bjId && !error && (
        <div className="notif-card">
          <div className="notif-info">
            <h3>방송 시작 알람</h3>
            <p>방송이 켜지는 순간 브라우저 알림을 받을 수 있어요.</p>
          </div>
          {notifOn ? (
            <div className="notif-enabled">
              ✓ 알람 활성화됨
            </div>
          ) : (
            <button className="btn" onClick={enableNotif}>
              알람 켜기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Live;

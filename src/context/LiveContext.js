import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const LiveContext = createContext(null);
export const useLive = () => useContext(LiveContext);

const POLL_MS = 60_000;
const THUMB_REFRESH_MS = 30_000;

async function fetchStation(bjId) {
  const res = await fetch(`https://bjapi.afreecatv.com/api/${bjId}/station`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function LiveProvider({ children }) {
  const [channels, setChannels] = useState(() => {
    try {
      const saved = localStorage.getItem("fp-channels");
      if (saved) return JSON.parse(saved);
      const oldId = localStorage.getItem("fp-bjid");
      if (oldId) return [{ bjId: oldId }];
      return [];
    } catch { return []; }
  });
  const [statuses, setStatuses] = useState({});
  const [notifChannels, setNotifChannels] = useState({});
  const prevLiveRef = useRef({});

  const saveChannels = (list) => {
    setChannels(list);
    localStorage.setItem("fp-channels", JSON.stringify(list));
  };

  const addChannel = (bjId) => {
    if (channels.find(c => c.bjId === bjId)) return false;
    saveChannels([...channels, { bjId }]);
    return true;
  };

  const removeChannel = (bjId) => {
    saveChannels(channels.filter(c => c.bjId !== bjId));
    setStatuses(prev => { const s = { ...prev }; delete s[bjId]; return s; });
  };

  const checkChannel = useCallback(async (bjId) => {
    try {
      const data = await fetchStation(bjId);
      const isLive = !!data.broad;
      const normalizeUrl = (u) => u && u.startsWith("//") ? "https:" + u : u;
      setStatuses(prev => ({
        ...prev,
        [bjId]: {
          isLive,
          broadNo: data.broad?.broad_no || null,
          title: data.broad?.broad_title || "",
          profileImg: normalizeUrl(data.profile_image || ""),
          nickname: data.station?.user_nick || bjId,
          error: null,
        },
      }));
    } catch (e) {
      const msg = e.message.includes("Failed to fetch") || e.message.includes("CORS")
        ? "API 연결 실패"
        : `오류: ${e.message}`;
      setStatuses(prev => ({
        ...prev,
        [bjId]: { ...(prev[bjId] || { isLive: false }), error: msg },
      }));
    }
  }, []);

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

  useEffect(() => {
    if (channels.length === 0) return;
    channels.forEach(ch => checkChannel(ch.bjId));
    const id = setInterval(() => channels.forEach(ch => checkChannel(ch.bjId)), POLL_MS);
    return () => clearInterval(id);
  }, [channels, checkChannel]);

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
    <LiveContext.Provider value={{
      channels, statuses, notifChannels, liveCount,
      addChannel, removeChannel, checkChannel, toggleNotif,
      THUMB_REFRESH_MS,
    }}>
      {children}
    </LiveContext.Provider>
  );
}

/* eslint-disable */
import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBr-Vq8kDPrxNv8RojdrPa_GUgXth2tHmg",
  authDomain: "teamnight-d909b.firebaseapp.com",
  databaseURL: "https://teamnight-d909b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "teamnight-d909b",
  storageBucket: "teamnight-d909b.firebasestorage.app",
  messagingSenderId: "440378727824",
  appId: "1:440378727824:web:2c4bf51c6c57f8f7d96715"
};

let fdb = null;
try { fdb = getDatabase(initializeApp(firebaseConfig)); } catch (e) {}
const dbSet = (p, val) => { try { if (fdb) set(ref(fdb, p), val); } catch (e) {} };

const ZONES = ["상부", "하부", "B", "C", "D", "P", "T", "W", "Z"];
const ZONE_COLORS = {
  "상부": "#7c3aed", "하부": "#2563eb", "B": "#ea580c", "C": "#0891b2",
  "D": "#dc2626", "P": "#059669", "T": "#db2777", "W": "#65a30d", "Z": "#d97706",
};
const LINES = [1, 2, 3, 4];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TYPES = ["플로우", "선반"];

try {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
  document.head.appendChild(fontLink);
} catch (e) {}

const initData = () => {
  try {
    const saved = localStorage.getItem("qps_data");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  const d = {};
  ZONES.forEach(z => {
    d[z] = {};
    LINES.forEach(l => {
      d[z][l] = {};
      TYPES.forEach(t => {
        d[z][l][t] = Array(9).fill(false);
      });
    });
  });
  return d;
};

function CircleProgress({ percent, color, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState(initData);
  const [activeZone, setActiveZone] = useState(ZONES[0]);
  const [activeLine, setActiveLine] = useState(1);
  const [copied, setCopied] = useState(false);
  const [round, setRound] = useState(() => {
    try { const s = localStorage.getItem("qps_round"); if (s) return parseInt(s) || 1; } catch (e) {}
    return 1;
  });
  const [nextRoundConfirm, setNextRoundConfirm] = useState(false);
  const [quickType, setQuickType] = useState("플로우");
  const [quickLine, setQuickLine] = useState(2);
  const [eventMode, setEventMode] = useState(() => {
    try { const s = localStorage.getItem("qps_event_mode"); if (s !== null) return s === "true"; } catch (e) {}
    return true; // true = 행사, false = 비행사
  });

  const toggleEventMode = (v) => {
    setEventMode(v);
    try { localStorage.setItem("qps_event_mode", String(v)); } catch (e) {}
  };

  const saveData = (newData) => {
    setData(newData);
    try { localStorage.setItem("qps_data", JSON.stringify(newData)); } catch (e) {}
    dbSet("qps/data", newData);
  };

  // Firebase 실시간 구독
  useEffect(() => {
    if (!fdb) return;
    const unsub1 = onValue(ref(fdb, "qps/data"), snap => {
      const v = snap.val();
      if (v) {
        setData(v);
        try { localStorage.setItem("qps_data", JSON.stringify(v)); } catch (e) {}
      }
    });
    const unsub2 = onValue(ref(fdb, "qps/round"), snap => {
      const v = snap.val();
      if (v) setRound(v);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // 번호 토글 — 해당 번호까지 누적 체크
  const toggleNum = (zone, line, type, idx) => {
    const current = data[zone][line][type];
    const allChecked = current.slice(0, idx + 1).every(v => v);
    const newArr = [...current];
    if (allChecked) {
      for (let i = idx; i < 9; i++) newArr[i] = false;
    } else {
      for (let i = 0; i <= idx; i++) newArr[i] = true;
    }
    const newData = {
      ...data,
      [zone]: {
        ...data[zone],
        [line]: { ...data[zone][line], [type]: newArr }
      }
    };
    saveData(newData);
  };

  const [resetConfirm, setResetConfirm] = useState(false);

  const resetAll = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    const d = {};
    ZONES.forEach(z => {
      d[z] = {};
      LINES.forEach(l => {
        d[z][l] = {};
        TYPES.forEach(t => { d[z][l][t] = Array(9).fill(false); });
      });
    });
    saveData(d);
    setResetConfirm(false);
    setRound(1);
    try { localStorage.setItem("qps_round", "1"); } catch (e) {}
    dbSet("qps/round", 1);
  };

  const nextRound = () => {
    if (!nextRoundConfirm) {
      setNextRoundConfirm(true);
      setTimeout(() => setNextRoundConfirm(false), 3000);
      return;
    }
    const d = {};
    ZONES.forEach(z => {
      d[z] = {};
      LINES.forEach(l => {
        d[z][l] = {};
        TYPES.forEach(t => { d[z][l][t] = Array(9).fill(false); });
      });
    });
    saveData(d);
    const nr = round + 1;
    setRound(nr);
    try { localStorage.setItem("qps_round", String(nr)); } catch (e) {}
    dbSet("qps/round", nr);
    setNextRoundConfirm(false);
  };

  // 통계 계산
  const stats = useMemo(() => {
    const out = {};
    ZONES.forEach(z => {
      let flowDone = 0, shelfDone = 0;
      const total = LINES.length * 9;
      LINES.forEach(l => {
        flowDone += data[z][l]["플로우"].filter(v => v).length;
        shelfDone += data[z][l]["선반"].filter(v => v).length;
      });
      out[z] = {
        flowDone, shelfDone, total,
        flowPct: Math.round((flowDone / total) * 100),
        shelfPct: Math.round((shelfDone / total) * 100),
        pct: Math.round(((flowDone + shelfDone) / (total * 2)) * 100),
      };
    });
    return out;
  }, [data]);

  const grand = useMemo(() => {
    const total = ZONES.length * LINES.length * 9;
    const flowDone = ZONES.reduce((s, z) => s + stats[z].flowDone, 0);
    const shelfDone = ZONES.reduce((s, z) => s + stats[z].shelfDone, 0);
    return {
      flowDone, shelfDone, total,
      flowPct: Math.round((flowDone / total) * 100),
      shelfPct: Math.round((shelfDone / total) * 100),
      pct: Math.round(((flowDone + shelfDone) / (total * 2)) * 100),
    };
  }, [stats]);

  // 대시보드용 요약 실시간 전송
  useEffect(() => {
    dbSet("summary/qps", { pct: grand.pct, round: round, ts: Date.now() });
  }, [grand.pct, round]);

  const S = {
    bg: "#f0f4f8", card: "#ffffff", border: "#e2e8f0",
    text: "#0f172a", textSub: "#64748b", inputBg: "#f8fafc",
    shadow: "0 1px 8px rgba(0,0,0,0.08)", shadowMd: "0 2px 16px rgba(0,0,0,0.10)",
  };

  const activeColor = ZONE_COLORS[activeZone];


  // 현황 텍스트
  const getSummaryText = () => {
    const now = new Date();
    const timeStr = `${now.getHours()}시${now.getMinutes().toString().padStart(2,"0")}분`;
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const lines = [`QPS ${round}차 (${timeStr})`, `${month}월${day}일자`, `──────────────`];

    const lineOrder = [2, 4, 3, 1];

    // 요약 그룹: 행사 = 존별 / 비행사 = 묶음 피킹
    const GROUPS = eventMode ? [
      { name: "상부", zones: ["상부"] },
      { name: "하부", zones: ["하부"] },
      { name: "B존", zones: ["B"] },
      { name: "D존", zones: ["D"] },
      { name: "P존", zones: ["P"] },
      { name: "W존", zones: ["W"] },
      { name: "Z존", zones: ["Z"] },
      { name: "C/T", zones: ["C", "T"] },
    ] : [
      { name: "상부", zones: ["상부"] },
      { name: "지하", zones: ["P", "Z"] },
      { name: "하부", zones: ["하부", "B", "C", "T", "W"] },
      { name: "D존", zones: ["D"] },
    ];

    // 그룹 상태 계산 (멤버 존 합산)
    const getGroupStatus = (zones) => {
      const flowTotal = zones.length * LINES.length * 9;
      const shelfTotal = zones.length * LINES.length * 9;
      let flowDone = 0, shelfDone = 0;
      zones.forEach(z => LINES.forEach(l => {
        flowDone += data[z][l]["플로우"].filter(v=>v).length;
        shelfDone += data[z][l]["선반"].filter(v=>v).length;
      }));
      const flowPick = zones.every(z => (data[z]._pick || {})["플로우"]);
      const shelfPick = zones.every(z => (data[z]._pick || {})["선반"]);
      const flowAll = flowDone === flowTotal;
      const shelfAll = shelfDone === shelfTotal;

      // 마지막 번호: 가장 진행이 느린 존 기준 (불출 순서 2→4→3→1)
      const lastNum = (type) => {
        // 현재 불출 위치 = 가장 많이 진행된 존의 마지막 번호
        let maxPos = -1, maxInfo = null;
        zones.forEach(z => {
          let pos = 0, info = null;
          lineOrder.forEach(l => {
            const cnt = data[z][l][type].filter(v=>v).length;
            pos += cnt;
            if (cnt > 0) info = { line: l, num: `${l}${cnt}`, zone: z.length<=1 ? z+"존" : z };
          });
          if (pos > maxPos && info) { maxPos = pos; maxInfo = info; }
        });
        return maxInfo;
      };

      if (flowPick && shelfPick) return "완료";
      if (flowAll && shelfAll) return "불출완료";
      if (flowDone === 0 && shelfDone === 0) return "미시작";
      if (flowAll && !shelfAll) {
        const sn = lastNum("선반");
        return sn ? `플로우 피킹완료 / 선반 ${sn.line}라인 불출중 (${sn.zone} ${sn.num})` : "플로우 피킹완료";
      }
      if (!flowAll && shelfAll) {
        const fn = lastNum("플로우");
        return fn ? `플로우 ${fn.line}라인 불출중 (${fn.zone} ${fn.num}) / 선반 피킹완료` : "선반 피킹완료";
      }
      const fn = lastNum("플로우"), sn = lastNum("선반");
      const fp = fn ? `플로우 ${fn.line}라인 불출중 (${fn.zone} ${fn.num})` : "";
      const sp = sn ? `선반 ${sn.line}라인 불출중 (${sn.zone} ${sn.num})` : "";
      return [fp, sp].filter(Boolean).join(" / ") || "미시작";
    };

    // 전존 완료 체크
    const allFlow = ZONES.every(z => LINES.every(l => data[z][l]["플로우"].every(v=>v)));
    const allShelf = ZONES.every(z => LINES.every(l => data[z][l]["선반"].every(v=>v)));

    if (allFlow && allShelf) {
      lines.push(`전체 불출완료`);
    } else if (allFlow) {
      lines.push(`플로우 피킹완료`);
      // 선반 상태만 그룹별 표시
      const groupStatus = {};
      GROUPS.forEach(g => {
        const st = getGroupStatus(g.zones);
        groupStatus[g.name] = st.replace("플로우 피킹완료 / ", "").replace("플로우 피킹완료", "선반 미불출");
      });
      const statusGroups = {};
      GROUPS.forEach(g => {
        const st = groupStatus[g.name];
        if (!statusGroups[st]) statusGroups[st] = [];
        statusGroups[st].push(g.name);
      });
      Object.entries(statusGroups).forEach(([status, names]) => {
        if (status === "선반 미불출") { lines.push(`나머지 미불출`); return; }
        lines.push(`${names.join("/")} : ${status}`);
      });
    } else {
      const groupStatus = {};
      GROUPS.forEach(g => { groupStatus[g.name] = getGroupStatus(g.zones); });

      const statusGroups = {};
      GROUPS.forEach(g => {
        const st = groupStatus[g.name];
        if (!statusGroups[st]) statusGroups[st] = [];
        statusGroups[st].push(g.name);
      });

      const order = ["완료", "불출완료", "플로우 피킹완료"];
      const sorted = Object.entries(statusGroups).sort(([a], [b]) => {
        const ai = order.indexOf(a) >= 0 ? order.indexOf(a) : a === "미시작" ? 999 : 50;
        const bi = order.indexOf(b) >= 0 ? order.indexOf(b) : b === "미시작" ? 999 : 50;
        return ai - bi;
      });

      sorted.forEach(([status, names]) => {
        lines.push(`${names.join("/")} : ${status}`);
      });
    }

    lines.push(`──────────────`, `토탈 ${grand.pct}%`);
    return lines.join("\n");
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "0.08em", background: "linear-gradient(135deg,#059669,#0891b2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>QPS</h1>
        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: S.textSub, textTransform: "uppercase", marginTop: 4, fontWeight: 500 }}>피킹 진행 현황</div>
        <div style={{ display: "inline-block", marginTop: 8, fontSize: 13, fontWeight: 900, color: "#7c3aed", background: "#7c3aed15", border: "1.5px solid #7c3aed44", borderRadius: 20, padding: "4px 16px" }}>
          {round}차 피킹
        </div>
      </div>

      {/* Grand Total */}
      <div style={{ background: "linear-gradient(135deg,#059669,#0891b2)", borderRadius: 16, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20, boxShadow: "0 4px 20px rgba(5,150,105,0.3)" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <CircleProgress percent={grand.pct} color="#ffffff" size={90} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{grand.pct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>전체 토탈 피킹작업률</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{grand.pct}%</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {ZONES.map(z => (
              <span key={z} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 20, background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
                {z} {stats[z].pct}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {ZONES.map(z => {
          const { pct } = stats[z];
          const isActive = z === activeZone;
          const color = ZONE_COLORS[z];
          return (
            <button key={z} onClick={() => setActiveZone(z)} style={{ background: isActive ? color+"12" : S.card, border: `1.5px solid ${isActive ? color : S.border}`, borderRadius: 12, padding: "10px 6px", cursor: "pointer", textAlign: "center", boxShadow: S.shadow, transition: "all 0.2s" }}>
              <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 3 }}>{z} 존</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: S.text, marginBottom: 4 }}>{pct}%</div>
              <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2 }}>
                <div style={{ height: 4, borderRadius: 2, background: color, width: `${pct}%`, transition: "width 0.4s" }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* 체크 패널 */}
      <div style={{ background: S.card, border: `1.5px solid ${activeColor}`, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: S.shadowMd }}>
        {/* 존 + 라인 선택 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: activeColor }}>{activeZone} 존</div>
          <div style={{ display: "flex", gap: 6 }}>
            {LINES.map(l => (
              <button key={l} onClick={() => setActiveLine(l)} style={{
                background: activeLine === l ? activeColor : S.inputBg,
                border: `1px solid ${activeLine === l ? activeColor : S.border}`,
                borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                color: activeLine === l ? "#fff" : S.textSub,
                fontSize: 12, fontWeight: 700, fontFamily: "inherit"
              }}>{l}라인</button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: S.textSub, marginBottom: 10, fontWeight: 500 }}>
          번호 {activeLine}1 ~ {activeLine}9 · 탭하면 해당 번호까지 누적 체크
        </div>

        {/* 존 전체 완료 버튼 (단계식: 불출완료 → 피킹완료) */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {TYPES.map(type => {
            const isPicked = (data[activeZone]._pick || {})[type] || false;
            const allDone = LINES.every(l => data[activeZone][l][type].every(v=>v));
            return (
              <button key={type} onClick={() => {
                const newZone = { ...data[activeZone] };
                if (!allDone) {
                  // 1단계: 불출완료 (전체 체크)
                  LINES.forEach(l => { newZone[l] = { ...newZone[l], [type]: Array(9).fill(true) }; });
                  newZone._pick = { ...(newZone._pick || {}), [type]: false };
                } else if (!isPicked) {
                  // 2단계: 피킹완료
                  newZone._pick = { ...(newZone._pick || {}), [type]: true };
                } else {
                  // 3단계: 해제 (전체 초기화)
                  LINES.forEach(l => { newZone[l] = { ...newZone[l], [type]: Array(9).fill(false) }; });
                  newZone._pick = { ...(newZone._pick || {}), [type]: false };
                }
                saveData({ ...data, [activeZone]: newZone });
              }} style={{
                flex: 1, fontSize: 11, fontWeight: 800, padding: "8px 0", borderRadius: 9,
                cursor: "pointer", transition: "all 0.15s",
                background: isPicked ? "#dcfce7" : allDone ? "#fef9c3" : "#f8fafc",
                border: `1.5px solid ${isPicked ? "#86efac" : allDone ? "#fde047" : "#e2e8f0"}`,
                color: isPicked ? "#15803d" : allDone ? "#a16207" : "#94a3b8", fontFamily: "inherit"
              }}>
                {isPicked ? `✓ ${type} 피킹완료` : allDone ? `✓ ${type} 불출완료` : `${type} 불출완료`}
              </button>
            );
          })}
        </div>

        {/* 플로우 / 선반 체크 */}
        {TYPES.map(type => {
          const checks = data[activeZone][activeLine][type];
          const doneCnt = checks.filter(v => v).length;
          const typeColor = type === "플로우" ? "#059669" : "#0891b2";
          const lineDone = doneCnt === 9;
          return (
            <div key={type} style={{ marginBottom: type === "플로우" ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: typeColor, background: typeColor+"12", border: `1px solid ${typeColor}33`, borderRadius: 7, padding: "3px 12px" }}>{type}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 11, color: S.textSub }}>{doneCnt} / 9 완료</div>
                  <button onClick={() => {
                    const newArr = Array(9).fill(!lineDone);
                    saveData({ ...data, [activeZone]: { ...data[activeZone], [activeLine]: { ...data[activeZone][activeLine], [type]: newArr } } });
                  }} style={{
                    fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 7,
                    cursor: "pointer", transition: "all 0.15s",
                    background: lineDone ? "#dcfce7" : "#f8fafc",
                    border: `1px solid ${lineDone ? "#86efac" : "#e2e8f0"}`,
                    color: lineDone ? "#15803d" : "#94a3b8", fontFamily: "inherit"
                  }}>
                    {lineDone ? "✓ 라인완료" : "라인완료"}
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 5 }}>
                {NUMBERS.map((n, idx) => {
                  const done = checks[idx];
                  const label = `${activeLine}${n}`;
                  return (
                    <button key={n} onClick={() => toggleNum(activeZone, activeLine, type, idx)} style={{
                      background: done ? typeColor : S.inputBg,
                      border: `1.5px solid ${done ? typeColor : S.border}`,
                      borderRadius: 8, padding: "8px 2px", cursor: "pointer",
                      color: done ? "#fff" : S.textSub,
                      fontSize: 12, fontWeight: 700,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      transition: "all 0.15s",
                      transform: done ? "scale(1.05)" : "scale(1)",
                      fontFamily: "inherit"
                    }}>
                      {label}
                      <span style={{ fontSize: 9 }}>{done ? "✓" : "·"}</span>
                    </button>
                  );
                })}
              </div>
              {/* 진행바 */}
              <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: 4, borderRadius: 2, background: typeColor, width: `${(doneCnt/9)*100}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          );
        })}

        {/* 라인 합산 */}
        <div style={{ marginTop: 12, background: S.inputBg, border: `1px solid ${S.border}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: S.textSub, fontWeight: 500 }}>{activeZone} 존 {activeLine}라인</div>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>플로우 {data[activeZone][activeLine]["플로우"].filter(v=>v).length}/9</span>
            <span style={{ fontSize: 12, color: "#0891b2", fontWeight: 700 }}>선반 {data[activeZone][activeLine]["선반"].filter(v=>v).length}/9</span>
          </div>
        </div>
      </div>

      {/* 하부 묶음 빠른입력 (비행사) */}
      {!eventMode && (() => {
        const SEQ_LINES = [2, 4, 3, 1];
        const SEQ_ZONES = ["W", "T", "C", "하부", "B"];

        const quickSet = (type, targetLine, targetZone, num) => {
          const newData = { ...data };
          SEQ_ZONES.forEach(z => { newData[z] = { ...newData[z] }; SEQ_LINES.forEach(l => { newData[z][l] = { ...newData[z][l] }; }); });
          const tLineIdx = SEQ_LINES.indexOf(targetLine);
          const tZoneIdx = SEQ_ZONES.indexOf(targetZone);
          SEQ_LINES.forEach((l, li) => {
            SEQ_ZONES.forEach((z, zi) => {
              if (li < tLineIdx || (li === tLineIdx && zi < tZoneIdx)) {
                newData[z][l][type] = Array(9).fill(true);
              } else if (li === tLineIdx && zi === tZoneIdx) {
                newData[z][l][type] = Array(9).fill(false).map((_, i) => i < num);
              }
            });
          });
          saveData(newData);
        };

        return (
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: S.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 4 }}>하부 묶음 빠른입력</div>
            <div style={{ fontSize: 10, color: S.textSub, marginBottom: 10 }}>불출 순서: 2→4→3→1라인 · W→T→C→하부→B · 탭하면 이전 순서 전부 자동 체크</div>

            {/* 타입 선택 */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => setQuickType(t)} style={{ flex: 1, fontSize: 11, fontWeight: 800, padding: "6px 0", borderRadius: 8, cursor: "pointer", background: quickType===t ? (t==="플로우"?"#059669":"#0891b2") : S.inputBg, border: `1px solid ${t==="플로우"?"#059669":"#0891b2"}`, color: quickType===t?"#fff":S.textSub, fontFamily: "inherit" }}>{t}</button>
              ))}
            </div>

            {/* 라인 선택 (불출 순서대로) */}
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {SEQ_LINES.map((l, i) => (
                <button key={l} onClick={() => setQuickLine(l)} style={{ flex: 1, fontSize: 11, fontWeight: 800, padding: "6px 0", borderRadius: 8, cursor: "pointer", background: quickLine===l ? "#7c3aed" : S.inputBg, border: "1px solid #7c3aed", color: quickLine===l?"#fff":S.textSub, fontFamily: "inherit" }}>
                  {i+1}번째 · {l}라인
                </button>
              ))}
            </div>

            {/* 존 × 번호 그리드 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SEQ_ZONES.map(z => {
                const checks = data[z][quickLine][quickType];
                const cnt = checks.filter(v=>v).length;
                return (
                  <div key={z} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ZONE_COLORS[z], minWidth: 30 }}>{z}</div>
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 3 }}>
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(n => {
                        const done = checks[n-1];
                        return (
                          <button key={n} onClick={() => quickSet(quickType, quickLine, z, n)} style={{
                            background: done ? ZONE_COLORS[z] : S.inputBg,
                            border: `1px solid ${done ? ZONE_COLORS[z] : S.border}`,
                            borderRadius: 5, padding: "5px 0", cursor: "pointer",
                            color: done ? "#fff" : S.textSub, fontSize: 10, fontWeight: 700, fontFamily: "inherit"
                          }}>{quickLine}{n}</button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: cnt===9?"#059669":S.textSub, minWidth: 26, textAlign: "right" }}>{cnt}/9</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 존별 요약 */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, boxShadow: S.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>존별 요약</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => toggleEventMode(true)} style={{
              fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 8, cursor: "pointer",
              background: eventMode ? "#dc2626" : "#f8fafc",
              border: "1px solid #dc2626",
              color: eventMode ? "#fff" : "#94a3b8",
              fontFamily: "inherit", transition: "all 0.15s"
            }}>행사</button>
            <button onClick={() => toggleEventMode(false)} style={{
              fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 8, cursor: "pointer",
              background: !eventMode ? "#059669" : "#f8fafc",
              border: "1px solid #059669",
              color: !eventMode ? "#fff" : "#94a3b8",
              fontFamily: "inherit", transition: "all 0.15s"
            }}>비행사</button>
          </div>
        </div>

        {/* 텍스트 미리보기 */}
        <div style={{ background: S.inputBg, borderRadius: 10, padding: "10px 12px", marginBottom: 10, fontSize: 12, lineHeight: 1.45, color: S.textSub, fontFamily: "monospace", whiteSpace: "pre-wrap", border: `1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(getSummaryText()).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000); }}
          style={{ width: "100%", background: copied ? "#059669" : "linear-gradient(135deg,#059669,#0891b2)", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 14, boxShadow: "0 2px 8px rgba(5,150,105,0.25)", fontFamily: "inherit" }}>
          {copied ? "✓ 복사됨!" : "📤 현황 공유"}
        </button>

        {/* 존별 바 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ZONES.map(z => {
            const { flowPct, shelfPct, pct } = stats[z];
            const totalPct = Math.round((flowPct + shelfPct) / 2);
            const color = ZONE_COLORS[z];
            return (
              <div key={z} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32 }}>{z.length<=1?z+"존":z}</div>
                <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4 }}>
                  <div style={{ height: 8, borderRadius: 4, background: `linear-gradient(90deg,${color},${color}88)`, width: `${totalPct}%`, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, minWidth: 40, textAlign: "right", color: totalPct===100?"#059669":S.text }}>{totalPct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 초기화 */}
      <button onClick={nextRound} style={{ width: "100%", background: nextRoundConfirm ? "#ede9fe" : "linear-gradient(135deg,#7c3aed,#0891b2)", border: nextRoundConfirm ? "1.5px solid #7c3aed" : "none", borderRadius: 12, padding: "13px 0", cursor: "pointer", color: nextRoundConfirm ? "#7c3aed" : "#fff", fontSize: 14, fontWeight: 800, marginTop: 16, boxShadow: "0 2px 12px rgba(124,58,237,0.25)", fontFamily: "inherit" }}>
        {nextRoundConfirm ? `한 번 더 탭하면 ${round + 1}차 시작 (기록 초기화)` : `▶ ${round + 1}차 피킹 시작`}
      </button>

      <button onClick={resetAll} style={{ width: "100%", background: resetConfirm ? "#fee2e2" : S.card, border: `1px solid ${resetConfirm ? "#dc2626" : "#fecaca"}`, borderRadius: 12, padding: "12px 0", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 700, marginTop: 10, boxShadow: S.shadow, fontFamily: "inherit" }}>
        {resetConfirm ? "한 번 더 탭하면 초기화됩니다" : "🔄 전체 초기화 (1차부터)"}
      </button>
    </div>
  );
}

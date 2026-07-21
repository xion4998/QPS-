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

const EDIT_PASSWORD = "001";
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
const MACHINES = { 1: [1, 2], 2: [3, 4] };
// 타입별 불출 순서
const LINE_ORDER = {
  "플로우": [1, 2, 3, 4],  // 1호기(1,2라인) → 2호기(3,4라인)
  "선반":   [2, 4, 3, 1],  // 2→4→3→1
};

// 라인 내 서브존: data[zone][line][subzone][type]
const SUB_ZONES = {
  "상부": ["BB", "BC", "BD"],
  "하부": ["AA", "AB", "AC", "AD"],
};
const SUB_COLORS = {
  "BB": "#7c3aed", "BC": "#9333ea", "BD": "#a855f7",
  "AA": "#2563eb", "AB": "#1d4ed8", "AC": "#3b82f6", "AD": "#60a5fa",
};

try {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
  document.head.appendChild(fontLink);
} catch (e) {}

// 데이터 초기화: data[zone][line] = { [type]: [] } 또는 data[zone][line][sub][type]
const initData = () => {
  try { const s = localStorage.getItem("qps_data"); if (s) return JSON.parse(s); } catch (e) {}
  const d = {};
  ZONES.forEach(z => {
    d[z] = { _pick: {} };
    const subs = SUB_ZONES[z];
    LINES.forEach(l => {
      if (subs) {
        d[z][l] = {};
        subs.forEach(sub => {
          d[z][l][sub] = {};
          TYPES.forEach(t => { d[z][l][sub][t] = Array(9).fill(false); });
        });
      } else {
        d[z][l] = {};
        TYPES.forEach(t => { d[z][l][t] = Array(9).fill(false); });
      }
    });
  });
  return d;
};

function CircleProgress({ percent, color, size = 80 }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r, dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState(initData);
  const [activeZone, setActiveZone] = useState(ZONES[0]);
  const [activeLine, setActiveLine] = useState(1);
  const [activeSubZone, setActiveSubZone] = useState(SUB_ZONES["상부"][0]);
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState(() => {
    try { return localStorage.getItem("qps_editable") === "true"; } catch (e) { return false; }
  });
  const [showPwInput, setShowPwInput] = useState(false);
  const [pwValue, setPwValue] = useState("");

  const tryUnlock = () => {
    if (pwValue === EDIT_PASSWORD) {
      setEditable(true);
      try { localStorage.setItem("qps_editable", "true"); } catch (e) {}
      setShowPwInput(false); setPwValue("");
    } else { setPwValue(""); }
  };
  const lockEdit = () => {
    setEditable(false);
    try { localStorage.setItem("qps_editable", "false"); } catch (e) {}
  };

  const [round, setRound] = useState(() => {
    try { return parseInt(localStorage.getItem("qps_round")) || 1; } catch (e) { return 1; }
  });
  const [nextRoundConfirm, setNextRoundConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [zoneResetConfirm, setZoneResetConfirm] = useState(null);

  const resetZone = (z, e) => {
    e.stopPropagation();
    if (!editable) return;
    if (zoneResetConfirm !== z) {
      setZoneResetConfirm(z);
      setTimeout(() => setZoneResetConfirm(null), 3000);
      return;
    }
    const subs = SUB_ZONES[z];
    const newZone = { _pick: {} };
    LINES.forEach(l => {
      if (subs) {
        newZone[l] = {};
        subs.forEach(sub => { newZone[l][sub] = {}; TYPES.forEach(t => { newZone[l][sub][t] = Array(9).fill(false); }); });
      } else {
        newZone[l] = {};
        TYPES.forEach(t => { newZone[l][t] = Array(9).fill(false); });
      }
    });
    saveData({ ...data, [z]: newZone });
    setZoneResetConfirm(null);
  };

  const saveData = (d) => {
    if (!editable) return;
    setData(d);
    try { localStorage.setItem("qps_data", JSON.stringify(d)); } catch (e) {}
    dbSet("qps/data", d);
  };

  useEffect(() => {
    if (!fdb) return;
    const u1 = onValue(ref(fdb, "qps/data"), snap => {
      const v = snap.val();
      if (v) { setData(v); try { localStorage.setItem("qps_data", JSON.stringify(v)); } catch (e) {} }
    });
    const u2 = onValue(ref(fdb, "qps/round"), snap => { const v = snap.val(); if (v) setRound(v); });
    return () => { u1(); u2(); };
  }, []);

  const selectZone = (z) => {
    setActiveZone(z);
    setActiveSubZone(SUB_ZONES[z] ? SUB_ZONES[z][0] : null);
  };

  // 번호 누적 체크/해제
  const toggleNum = (zone, line, type, idx, sub) => {
    const zd = data[zone];
    const current = sub ? (zd[line][sub] || {})[type] || Array(9).fill(false) : (zd[line][type] || Array(9).fill(false));
    const allChecked = current.slice(0, idx + 1).every(v => v);
    const newArr = [...current];
    if (allChecked) { for (let i = idx; i < 9; i++) newArr[i] = false; }
    else { for (let i = 0; i <= idx; i++) newArr[i] = true; }

    let newZone = { ...zd };
    if (sub) {
      // 서브존 순서대로 이전 서브존 전체 자동체크
      const subOrder = SUB_ZONES[zone] || [];
      const subIdx = subOrder.indexOf(sub);
      newZone[line] = { ...newZone[line] };
      // 이전 서브존들 전체 체크
      if (!allChecked) {
        for (let si = 0; si < subIdx; si++) {
          const prevSub = subOrder[si];
          newZone[line][prevSub] = { ...(newZone[line][prevSub] || {}), [type]: Array(9).fill(true) };
        }
      }
      newZone[line][sub] = { ...(newZone[line][sub] || {}), [type]: newArr };
    } else {
      newZone[line] = { ...newZone[line], [type]: newArr };
    }
    const pickKey = `line_${line}_${type}`;
    if (!newArr.every(v => v)) {
      newZone._pick = { ...(newZone._pick || {}), [pickKey]: false };
    }
    saveData({ ...data, [zone]: newZone });
  };

  // 라인완료 토글
  const toggleLine = (zone, line, type, sub) => {
    const zd = data[zone];
    const current = sub ? (zd[line][sub] || {})[type] || Array(9).fill(false) : (zd[line][type] || Array(9).fill(false));
    const isDone = current.every(v => v);
    const newArr = Array(9).fill(!isDone);
    let newData;
    if (sub) {
      newData = { ...data, [zone]: { ...zd, [line]: { ...zd[line], [sub]: { ...(zd[line][sub] || {}), [type]: newArr } } } };
    } else {
      newData = { ...data, [zone]: { ...zd, [line]: { ...zd[line], [type]: newArr } } };
    }
    saveData(newData);
  };

  // 존 전체 완료 (불출완료→피킹완료→해제) - 현재 서브존 기준
  const toggleZoneDone = (zone, type, sub) => {
    const zd = data[zone];
    const isPicked = (zd._pick || {})[`${type}_${sub||'all'}`] || false;
    const subs = SUB_ZONES[zone];
    const allDone = LINES.every(l => {
      if (sub) return ((zd[l][sub] || {})[type] || []).every(v => v);
      if (subs) return subs.every(s => ((zd[l][s] || {})[type] || []).every(v => v));
      return (zd[l][type] || []).every(v => v);
    });
    const newZone = { ...zd };
    const pickKey = `${type}_${sub||'all'}`;
    if (!allDone) {
      // 1단계: 불출완료 - 전체 체크
      LINES.forEach(l => {
        if (sub) {
          newZone[l] = { ...newZone[l], [sub]: { ...(newZone[l][sub] || {}), [type]: Array(9).fill(true) } };
        } else if (subs) {
          subs.forEach(s => { newZone[l] = { ...newZone[l], [s]: { ...(newZone[l][s] || {}), [type]: Array(9).fill(true) } }; });
        } else {
          newZone[l] = { ...newZone[l], [type]: Array(9).fill(true) };
        }
      });
      newZone._pick = { ...(newZone._pick || {}), [pickKey]: false };
    } else if (!isPicked) {
      // 2단계: 피킹완료
      newZone._pick = { ...(newZone._pick || {}), [pickKey]: true };
    } else {
      // 3단계: 해제
      LINES.forEach(l => {
        if (sub) {
          newZone[l] = { ...newZone[l], [sub]: { ...(newZone[l][sub] || {}), [type]: Array(9).fill(false) } };
        } else if (subs) {
          subs.forEach(s => { newZone[l] = { ...newZone[l], [s]: { ...(newZone[l][s] || {}), [type]: Array(9).fill(false) } }; });
        } else {
          newZone[l] = { ...newZone[l], [type]: Array(9).fill(false) };
        }
      });
      newZone._pick = { ...(newZone._pick || {}), [pickKey]: false };
    }
    saveData({ ...data, [zone]: newZone });
  };

  const resetAll = () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return; }
    const d = initData();
    setData(d);
    try { localStorage.setItem("qps_data", JSON.stringify(d)); } catch (e) {}
    dbSet("qps/data", d);
    setRound(1);
    try { localStorage.setItem("qps_round", "1"); } catch (e) {}
    dbSet("qps/round", 1);
    setResetConfirm(false);
  };

  const nextRound = () => {
    if (!nextRoundConfirm) { setNextRoundConfirm(true); setTimeout(() => setNextRoundConfirm(false), 3000); return; }
    const d = initData();
    setData(d);
    try { localStorage.setItem("qps_data", JSON.stringify(d)); } catch (e) {}
    dbSet("qps/data", d);
    const nr = round + 1;
    setRound(nr);
    try { localStorage.setItem("qps_round", String(nr)); } catch (e) {}
    dbSet("qps/round", nr);
    setNextRoundConfirm(false);
  };

  // 퍼센트 계산: 라인 기준 (서브존은 평균)
  const stats = useMemo(() => {
    const out = {};
    ZONES.forEach(z => {
      const subs = SUB_ZONES[z];
      const total = LINES.length * 9;
      let flowDone = 0, shelfDone = 0;
      LINES.forEach(l => {
        if (subs) {
          // 서브존별 체크 수 합산 후 서브존 수로 나눠 1라인분으로 환산
          let lFlow = 0, lShelf = 0;
          subs.forEach(sub => {
            const ld = (data[z][l] || {})[sub] || {};
            lFlow += (ld["플로우"] || []).filter(v=>v).length;
            lShelf += (ld["선반"] || []).filter(v=>v).length;
          });
          flowDone += Math.round(lFlow / subs.length);
          shelfDone += Math.round(lShelf / subs.length);
        } else {
          flowDone += ((data[z][l] || {})["플로우"] || []).filter(v=>v).length;
          shelfDone += ((data[z][l] || {})["선반"] || []).filter(v=>v).length;
        }
      });
      out[z] = {
        flowDone, shelfDone, total,
        flowPct: Math.min(100, Math.round((flowDone / total) * 100)),
        shelfPct: Math.min(100, Math.round((shelfDone / total) * 100)),
        pct: Math.min(100, Math.round(((flowDone + shelfDone) / (total * 2)) * 100)),
      };
    });
    return out;
  }, [data]);

  const grand = useMemo(() => {
    const total = ZONES.length * LINES.length * 9;
    const flowDone = ZONES.reduce((s, z) => s + stats[z].flowDone, 0);
    const shelfDone = ZONES.reduce((s, z) => s + stats[z].shelfDone, 0);

    // 호기별 계산
    const machineStats = {};
    Object.entries(MACHINES).forEach(([m, mLines]) => {
      let mFlowDone = 0, mShelfDone = 0;
      const mTotal = ZONES.length * mLines.length * 9;
      ZONES.forEach(z => {
        const subs = SUB_ZONES[z];
        const subCount = subs ? subs.length : 1;
        mLines.forEach(l => {
          if (subs) {
            subs.forEach(sub => {
              mFlowDone += (((data[z][l]||{})[sub]||{})["플로우"]||[]).filter(v=>v).length;
              mShelfDone += (((data[z][l]||{})[sub]||{})["선반"]||[]).filter(v=>v).length;
            });
            mFlowDone = Math.round(mFlowDone / subCount);
            mShelfDone = Math.round(mShelfDone / subCount);
          } else {
            mFlowDone += ((data[z][l]||{})["플로우"]||[]).filter(v=>v).length;
            mShelfDone += ((data[z][l]||{})["선반"]||[]).filter(v=>v).length;
          }
        });
      });
      machineStats[m] = {
        flowPct: Math.round((mFlowDone / mTotal) * 100),
        shelfPct: Math.round((mShelfDone / mTotal) * 100),
      };
    });

    return {
      flowDone, shelfDone, total,
      flowPct: Math.round((flowDone / total) * 100),
      shelfPct: Math.round((shelfDone / total) * 100),
      pct: Math.round(((flowDone + shelfDone) / (total * 2)) * 100),
      machineStats,
    };
  }, [stats, data]);

  useEffect(() => {
    dbSet("summary/qps", { pct: grand.pct, round, ts: Date.now() });
  }, [grand.pct, round]);

  const getSummaryText = () => {
    const now = new Date();
    const timeStr = `${now.getHours()}시${now.getMinutes().toString().padStart(2,"0")}분`;
    const month = now.getMonth() + 1, day = now.getDate();
    const lines = [`QPS ${round}차 (${timeStr})`, `${month}월${day}일자`, `──────────────`];
    const lineOrderMap = { "플로우": [1, 2, 3, 4], "선반": [2, 4, 3, 1] };

    const GROUPS = [
      { name: "상부", zones: ["상부"] },
      { name: "하부", zones: ["하부"] },
      { name: "B존", zones: ["B"] },
      { name: "D존", zones: ["D"] },
      { name: "P존", zones: ["P"] },
      { name: "W존", zones: ["W"] },
      { name: "Z존", zones: ["Z"] },
      { name: "C/T", zones: ["C", "T"] },
    ];

    const getLastNum = (z, type) => {
      const subs = SUB_ZONES[z];
      const lineOrder = lineOrderMap[type];
      let maxSeq = -1, maxInfo = null;
      lineOrder.forEach((l, li) => {
        if (subs) {
          // 서브존 중 가장 많이 진행된 서브존 기준
          subs.forEach(sub => {
            const arr = (((data[z][l]||{})[sub]||{})[type]||[]);
            const cnt = arr.filter(v=>v).length;
            if (cnt > 0) {
              const seq = li * 100 + cnt; // 라인 순서 × 100 + 체크 수
              if (seq > maxSeq) {
                maxSeq = seq;
                maxInfo = { line: l, num: `${l}${cnt}`, zone: sub };
              }
            }
          });
        } else {
          const cnt = ((data[z][l]||{})[type]||[]).filter(v=>v).length;
          if (cnt > 0) {
            const seq = li * 100 + cnt;
            if (seq > maxSeq) {
              maxSeq = seq;
              maxInfo = { line: l, num: `${l}${cnt}`, zone: z.length<=1?z+"존":z };
            }
          }
        }
      });
      return maxInfo;
    };

    const getGroupStatus = (zones) => {
      let flowDone = 0, shelfDone = 0, flowTotal = 0, shelfTotal = 0;
      zones.forEach(z => {
        const subs = SUB_ZONES[z];
        const subCount = subs ? subs.length : 1;
        flowTotal += LINES.length * 9;
        shelfTotal += LINES.length * 9;
        LINES.forEach(l => {
          if (subs) {
            subs.forEach(sub => {
              flowDone += (((data[z][l] || {})[sub] || {})["플로우"] || []).filter(v=>v).length;
              shelfDone += (((data[z][l] || {})[sub] || {})["선반"] || []).filter(v=>v).length;
            });
          } else {
            flowDone += ((data[z][l] || {})["플로우"] || []).filter(v=>v).length;
            shelfDone += ((data[z][l] || {})["선반"] || []).filter(v=>v).length;
          }
        });
        if (subs) { flowDone = Math.round(flowDone / subCount); shelfDone = Math.round(shelfDone / subCount); }
      });
      const flowPick = zones.every(z => (data[z]._pick || {})["플로우"]);
      const shelfPick = zones.every(z => (data[z]._pick || {})["선반"]);
      const flowAll = flowDone >= flowTotal;
      const shelfAll = shelfDone >= shelfTotal;
      if (flowPick && shelfPick) return "완료";
      if (flowAll && shelfAll) return "불출완료";
      if (flowDone === 0 && shelfDone === 0) return "미시작";
      const fn = zones.length === 1 ? getLastNum(zones[0], "플로우") : null;
      const sn = zones.length === 1 ? getLastNum(zones[0], "선반") : null;
      if (flowAll) return sn ? `플로우 피킹완료 / 선반 ${sn.zone} ${sn.num} 불출중` : "플로우 피킹완료";
      if (shelfAll) return fn ? `플로우 ${fn.zone} ${fn.num} 불출중 / 선반 피킹완료` : "선반 피킹완료";
      const fp = fn ? `플로우 ${fn.zone} ${fn.num} 불출중` : flowDone > 0 ? "플로우 불출중" : "";
      const sp = sn ? `선반 ${sn.zone} ${sn.num} 불출중` : shelfDone > 0 ? "선반 불출중" : "";
      return [fp, sp].filter(Boolean).join(" / ") || "미시작";
    };

    const zoneTypeDone = (z, type) => {
      const subs = SUB_ZONES[z];
      return LINES.every(l => subs ? subs.every(sub => (((data[z][l]||{})[sub]||{})[type]||[]).every(v=>v)) : ((data[z][l]||{})[type]||[]).every(v=>v));
    };
    const allFlow = ZONES.every(z => zoneTypeDone(z, "플로우"));
    const allShelf = ZONES.every(z => zoneTypeDone(z, "선반"));

    if (allFlow && allShelf) {
      lines.push("전체 불출완료");
    } else if (allFlow) {
      lines.push("플로우 피킹완료");
      const statusGroups = {};
      GROUPS.forEach(g => {
        const st = getGroupStatus(g.zones).replace("플로우 피킹완료 / ", "").replace("플로우 피킹완료", "선반 미불출");
        if (!statusGroups[st]) statusGroups[st] = [];
        statusGroups[st].push(g.name);
      });
      Object.entries(statusGroups).forEach(([status, names]) => {
        if (status === "선반 미불출") { lines.push("나머지 미불출"); return; }
        lines.push(`${names.join("/")} : ${status}`);
      });
    } else {
      const statusGroups = {};
      GROUPS.forEach(g => {
        const st = getGroupStatus(g.zones);
        if (!statusGroups[st]) statusGroups[st] = [];
        statusGroups[st].push(g.name);
      });
      const order = ["완료", "불출완료", "플로우 피킹완료"];
      const sorted = Object.entries(statusGroups).sort(([a],[b]) => {
        const ai = order.indexOf(a)>=0?order.indexOf(a):a==="미시작"?999:50;
        const bi = order.indexOf(b)>=0?order.indexOf(b):b==="미시작"?999:50;
        return ai-bi;
      });
      sorted.forEach(([status, names]) => { lines.push(`${names.join("/")} : ${status}`); });
    }

    lines.push("──────────────", `토탈 ${grand.pct}%`);
    return lines.join("\n");
  };

  const S = { bg:"#f0f4f8",card:"#ffffff",border:"#e2e8f0",text:"#0f172a",textSub:"#64748b",inputBg:"#f8fafc",shadow:"0 1px 8px rgba(0,0,0,0.08)",shadowMd:"0 2px 16px rgba(0,0,0,0.10)" };
  const activeColor = ZONE_COLORS[activeZone];
  const subs = SUB_ZONES[activeZone];
  const getChecks = (z, l, type, sub) => sub ? (((data[z][l]||{})[sub]||{})[type]||Array(9).fill(false)) : ((data[z][l]||{})[type]||Array(9).fill(false));

  return (
    <div style={{ minHeight:"100vh", background:S.bg, color:S.text, fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding:"20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:0, letterSpacing:"0.08em", background:"linear-gradient(135deg,#059669,#0891b2)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>QPS</h1>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color:S.textSub, textTransform:"uppercase", marginTop:4, fontWeight:500 }}>피킹 진행 현황</div>
        <div style={{ display:"inline-block", marginTop:8, fontSize:13, fontWeight:900, color:"#7c3aed", background:"#7c3aed15", border:"1.5px solid #7c3aed44", borderRadius:20, padding:"4px 16px" }}>{round}차 피킹</div>
        <div style={{ marginTop:10 }}>
          {editable ? (
            <button onClick={lockEdit} style={{ fontSize:11, fontWeight:700, padding:"5px 16px", borderRadius:20, cursor:"pointer", background:"#dcfce7", border:"1px solid #86efac", color:"#15803d", fontFamily:"inherit" }}>🔓 수정 가능 · 탭하여 잠금</button>
          ) : showPwInput ? (
            <div style={{ display:"flex", gap:6, justifyContent:"center", alignItems:"center" }}>
              <input type="password" inputMode="numeric" value={pwValue} autoFocus onChange={e=>setPwValue(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryUnlock()} placeholder="비밀번호" style={{ width:100, background:"#fff", border:"1.5px solid #7c3aed", borderRadius:10, padding:"6px 10px", fontSize:14, fontWeight:700, outline:"none", textAlign:"center", fontFamily:"inherit" }} />
              <button onClick={tryUnlock} style={{ fontSize:12, fontWeight:800, padding:"7px 14px", borderRadius:10, cursor:"pointer", background:"#7c3aed", border:"none", color:"#fff", fontFamily:"inherit" }}>확인</button>
              <button onClick={()=>{setShowPwInput(false);setPwValue("");}} style={{ fontSize:12, fontWeight:700, padding:"7px 10px", borderRadius:10, cursor:"pointer", background:"#f8fafc", border:"1px solid #e2e8f0", color:"#94a3b8", fontFamily:"inherit" }}>취소</button>
            </div>
          ) : (
            <button onClick={()=>setShowPwInput(true)} style={{ fontSize:11, fontWeight:700, padding:"5px 16px", borderRadius:20, cursor:"pointer", background:"#f8fafc", border:"1px solid #e2e8f0", color:"#94a3b8", fontFamily:"inherit" }}>🔒 보기 전용 · 탭하여 잠금해제</button>
          )}
        </div>
      </div>

      {/* Grand Total - 플로우/선반 도넛 분리 */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {[
          { label:"플로우 피킹률", pct:grand.flowPct, color:"#059669", grad:"linear-gradient(135deg,#059669,#047857)", key:"flowPct" },
          { label:"선반 피킹률",   pct:grand.shelfPct, color:"#d97706", grad:"linear-gradient(135deg,#d97706,#b45309)", key:"shelfPct" }
        ].map(({label, pct, color, grad, key}) => (
          <div key={key} style={{ flex:1, background:grad, borderRadius:16, padding:"16px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:8, boxShadow:`0 4px 16px ${color}44` }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{label}</div>
            <div style={{ position:"relative" }}>
              <CircleProgress percent={pct} color="#ffffff" size={80} />
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:17, fontWeight:800, color:"#fff" }}>{pct}%</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, width:"100%" }}>
              {[1, 2].map(m => (
                <div key={m} style={{ flex:1, background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"4px 0", textAlign:"center" }}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.75)" }}>{m}호기</div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{(grand.machineStats[m] || {})[key] || 0}%</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Zone Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {ZONES.map(z => {
          const { pct } = stats[z];
          const isActive = z === activeZone;
          const color = ZONE_COLORS[z];
          return (
            <div key={z} style={{ position:"relative" }}>
              <button onClick={()=>selectZone(z)} style={{ width:"100%", background:isActive?color+"12":S.card, border:`1.5px solid ${isActive?color:S.border}`, borderRadius:12, padding:"10px 6px", cursor:"pointer", textAlign:"center", boxShadow:S.shadow, transition:"all 0.2s" }}>
                <div style={{ fontSize:11, color, fontWeight:700, marginBottom:3 }}>{z} 존</div>
                <div style={{ fontSize:18, fontWeight:900, color:S.text, marginBottom:4 }}>{pct}%</div>
                <div style={{ height:4, background:"#e2e8f0", borderRadius:2 }}>
                  <div style={{ height:4, borderRadius:2, background:color, width:`${pct}%`, transition:"width 0.4s" }} />
                </div>
              </button>
              {editable && (
                <button onClick={e=>resetZone(z, e)} style={{ position:"absolute", top:4, right:4, fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:5, cursor:"pointer", background:zoneResetConfirm===z?"#fee2e2":"#f8fafc", border:`1px solid ${zoneResetConfirm===z?"#fecaca":"#e2e8f0"}`, color:zoneResetConfirm===z?"#dc2626":"#94a3b8", fontFamily:"inherit" }}>
                  {zoneResetConfirm===z?"확인":"↺"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 체크 패널 */}
      <div style={{ background:S.card, border:`1.5px solid ${activeColor}`, borderRadius:16, padding:16, marginBottom:16, boxShadow:S.shadowMd }}>
        {/* 존 + 라인 선택 + 라인 완료 버튼 */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:14, fontWeight:700, color:activeColor }}>{activeZone} 존</div>
            <div style={{ display:"flex", gap:6 }}>
              {LINES.map(l => {
                const lineFlowDone = subs
                  ? subs.every(sub => (((data[activeZone][l]||{})[sub]||{})["플로우"]||[]).every(v=>v))
                  : ((data[activeZone][l]||{})["플로우"]||[]).every(v=>v);
                const lineShelfDone = subs
                  ? subs.every(sub => (((data[activeZone][l]||{})[sub]||{})["선반"]||[]).every(v=>v))
                  : ((data[activeZone][l]||{})["선반"]||[]).every(v=>v);
                const isPicked = (data[activeZone]._pick||{})[`line_${l}`] || false;
                const bg = isPicked ? "#dcfce7" : (lineFlowDone && lineShelfDone) ? "#fef9c3" : activeLine===l ? activeColor : S.inputBg;
                const color = isPicked ? "#15803d" : (lineFlowDone && lineShelfDone) ? "#a16207" : activeLine===l ? "#fff" : S.textSub;
                return (
                  <button key={l} onClick={()=>setActiveLine(l)} style={{ background:bg, border:`1px solid ${activeLine===l?activeColor:S.border}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", color, fontSize:12, fontWeight:700, fontFamily:"inherit" }}>{l}라인</button>
                );
              })}
            </div>
          </div>

          {/* 라인 피킹완료 버튼 */}
          <div style={{ display:"flex", gap:8 }}>
            {TYPES.map(type => {
              const pickKey = `line_${activeLine}_${type}`;
              const isPicked = (data[activeZone]._pick||{})[pickKey] || false;
              const allDone = subs
                ? subs.every(sub => (((data[activeZone][activeLine]||{})[sub]||{})[type]||[]).every(v=>v))
                : ((data[activeZone][activeLine]||{})[type]||[]).every(v=>v);
              const LINE_ORDER = { "플로우": [1, 2, 3, 4], "선반": [2, 4, 3, 1] };
              const lineIdx = LINE_ORDER[type].indexOf(activeLine);
              return (
                <button key={type} onClick={() => {
                  const newZone = { ...data[activeZone] };
                  if (!isPicked) {
                    // 피킹완료: 현재 라인 + 이전 라인(순서 기준) 전부 체크 + 피킹완료
                    LINE_ORDER[type].slice(0, lineIdx + 1).forEach(l => {
                      if (subs) {
                        subs.forEach(sub => {
                          newZone[l] = { ...newZone[l], [sub]: { ...(newZone[l][sub]||{}), [type]: Array(9).fill(true) } };
                        });
                      } else {
                        newZone[l] = { ...newZone[l], [type]: Array(9).fill(true) };
                      }
                      newZone._pick = { ...(newZone._pick||{}), [`line_${l}_${type}`]: true };
                    });
                  } else {
                    // 해제: 현재 라인만 해제
                    if (subs) {
                      subs.forEach(sub => {
                        newZone[activeLine] = { ...newZone[activeLine], [sub]: { ...(newZone[activeLine][sub]||{}), [type]: Array(9).fill(false) } };
                      });
                    } else {
                      newZone[activeLine] = { ...newZone[activeLine], [type]: Array(9).fill(false) };
                    }
                    newZone._pick = { ...(newZone._pick||{}), [pickKey]: false };
                  }
                  saveData({ ...data, [activeZone]: newZone });
                }} style={{ flex:1, fontSize:11, fontWeight:800, padding:"8px 0", borderRadius:9, cursor:"pointer", transition:"all 0.15s",
                  background: isPicked?"#dcfce7":allDone?"#fef9c3":"#f8fafc",
                  border:`1.5px solid ${isPicked?"#86efac":allDone?"#fde047":"#e2e8f0"}`,
                  color: isPicked?"#15803d":allDone?"#a16207":"#94a3b8", fontFamily:"inherit" }}>
                  {isPicked?`✓ ${activeLine}라인 ${type} 피킹완료`:allDone?`✓ ${activeLine}라인 불출완료`:`${activeLine}라인 ${type} 피킹완료`}
                </button>
              );
            })}
          </div>
        </div>

        {/* 서브존 탭 (상부/하부) */}
        {subs && (
          <div style={{ display:"flex", gap:5, marginBottom:10 }}>
            {subs.map(sub => (
              <button key={sub} onClick={()=>setActiveSubZone(sub)} style={{ flex:1, fontSize:11, fontWeight:800, padding:"5px 0", borderRadius:8, cursor:"pointer", background:activeSubZone===sub?(SUB_COLORS[sub]||activeColor):S.inputBg, border:`1px solid ${SUB_COLORS[sub]||activeColor}`, color:activeSubZone===sub?"#fff":S.textSub, fontFamily:"inherit", transition:"all 0.15s" }}>{sub}</button>
            ))}
          </div>
        )}

        <div style={{ fontSize:11, color:S.textSub, marginBottom:10 }}>
          {subs && activeSubZone ? `${activeLine}라인 · ${activeSubZone}` : `${activeLine}라인`} · 탭하면 해당 번호까지 누적 체크
        </div>

        {/* 플로우/선반 체크 */}
        {TYPES.map(type => {
          const checks = getChecks(activeZone, activeLine, type, subs ? activeSubZone : null);
          const doneCnt = checks.filter(v=>v).length;
          const typeColor = type==="플로우"?"#059669":"#0891b2";
          const lineDone = doneCnt === 9;
          return (
            <div key={type} style={{ marginBottom:type==="플로우"?14:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ fontSize:12, fontWeight:700, color:typeColor, background:typeColor+"12", border:`1px solid ${typeColor}33`, borderRadius:7, padding:"3px 12px" }}>{type}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ fontSize:11, color:S.textSub }}>{doneCnt} / 9 완료</div>
                  <button onClick={()=>toggleLine(activeZone, activeLine, type, subs?activeSubZone:null)} style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:7, cursor:"pointer", transition:"all 0.15s", background:lineDone?"#fef9c3":"#f8fafc", border:`1px solid ${lineDone?"#fde047":"#e2e8f0"}`, color:lineDone?"#a16207":"#94a3b8", fontFamily:"inherit" }}>
                    {lineDone?"✓ 불출완료":"라인완료"}
                  </button>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(9,1fr)", gap:5 }}>
                {NUMBERS.map((n, idx) => {
                  const done = checks[idx];
                  const label = `${activeLine}${n}`;
                  return (
                    <button key={n} onClick={()=>toggleNum(activeZone, activeLine, type, idx, subs?activeSubZone:null)} style={{ background:done?typeColor:S.inputBg, border:`1.5px solid ${done?typeColor:S.border}`, borderRadius:8, padding:"8px 2px", cursor:"pointer", color:done?"#fff":S.textSub, fontSize:12, fontWeight:700, display:"flex", flexDirection:"column", alignItems:"center", gap:2, transition:"all 0.15s", transform:done?"scale(1.05)":"scale(1)", fontFamily:"inherit" }}>
                      {label}
                      <span style={{ fontSize:9 }}>{done?"✓":"·"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 존별 요약 */}
      <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:16, padding:16, boxShadow:S.shadow }}>
        <div style={{ fontSize:13, fontWeight:700, color:S.text, marginBottom:12 }}>존별 요약</div>
        <div style={{ background:S.inputBg, borderRadius:10, padding:"10px 12px", marginBottom:10, fontSize:12, lineHeight:1.45, color:S.textSub, fontFamily:"monospace", whiteSpace:"pre-wrap", border:`1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={()=>{navigator.clipboard.writeText(getSummaryText()).then(()=>setCopied(true));setTimeout(()=>setCopied(false),2000);}} style={{ width:"100%", background:copied?"#059669":"linear-gradient(135deg,#059669,#0891b2)", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, marginBottom:14, fontFamily:"inherit" }}>
          {copied?"✓ 복사됨!":"📤 현황 공유"}
        </button>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ZONES.map(z => {
            const pct = stats[z].pct;
            const color = ZONE_COLORS[z];
            return (
              <div key={z} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color, minWidth:32 }}>{z.length<=1?z+"존":z}</div>
                <div style={{ flex:1, height:8, background:"#e2e8f0", borderRadius:4 }}>
                  <div style={{ height:8, borderRadius:4, background:`linear-gradient(90deg,${color},${color}88)`, width:`${pct}%`, transition:"width 0.4s" }} />
                </div>
                <div style={{ fontSize:13, fontWeight:800, minWidth:40, textAlign:"right", color:pct===100?"#059669":S.text }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={nextRound} style={{ width:"100%", background:nextRoundConfirm?"#ede9fe":"linear-gradient(135deg,#7c3aed,#0891b2)", border:nextRoundConfirm?"1.5px solid #7c3aed":"none", borderRadius:12, padding:"13px 0", cursor:"pointer", color:nextRoundConfirm?"#7c3aed":"#fff", fontSize:14, fontWeight:800, marginTop:16, boxShadow:"0 2px 12px rgba(124,58,237,0.25)", fontFamily:"inherit" }}>
        {nextRoundConfirm?`한 번 더 탭하면 ${round+1}차 시작`:`▶ ${round+1}차 피킹 시작`}
      </button>
      <button onClick={resetAll} style={{ width:"100%", background:resetConfirm?"#fee2e2":S.card, border:`1px solid ${resetConfirm?"#dc2626":"#fecaca"}`, borderRadius:12, padding:"12px 0", cursor:"pointer", color:"#dc2626", fontSize:13, fontWeight:700, marginTop:10, boxShadow:S.shadow, fontFamily:"inherit" }}>
        {resetConfirm?"한 번 더 탭하면 초기화됩니다":"🔄 전체 초기화 (1차부터)"}
      </button>
    </div>
  );
}

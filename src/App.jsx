import { useState, useMemo } from "react";

const ZONES = ["상부", "하부", "B", "C", "D", "P", "T", "W", "Z"];
const ZONE_COLORS = {
  "상부": "#7c3aed", "하부": "#2563eb", "B": "#ea580c", "C": "#0891b2",
  "D": "#dc2626", "P": "#059669", "T": "#db2777", "W": "#65a30d", "Z": "#d97706",
};
const LINES = [1, 2, 3, 4];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TYPES = ["플로우", "선반"];

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
document.head.appendChild(fontLink);

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

  const saveData = (newData) => {
    setData(newData);
    try { localStorage.setItem("qps_data", JSON.stringify(newData)); } catch (e) {}
  };

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

  const resetAll = () => {
    if (!window.confirm("전체 초기화할까요?")) return;
    const d = {};
    ZONES.forEach(z => {
      d[z] = {};
      LINES.forEach(l => {
        d[z][l] = {};
        TYPES.forEach(t => { d[z][l][t] = Array(9).fill(false); });
      });
    });
    saveData(d);
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
    const lines = [
      `QPS (${timeStr})`,
      `${month}월${day}일자`,
      `──────────────`,
      `플로우  ${grand.flowPct}%`,
      `선반    ${grand.shelfPct}%`,
      `──────────────`,
      `토탈 ${grand.pct}%`,
    ];
    return lines.join("\n");
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "0.08em", background: "linear-gradient(135deg,#059669,#0891b2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>QPS</h1>
        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: S.textSub, textTransform: "uppercase", marginTop: 4, fontWeight: 500 }}>피킹 진행 현황</div>
      </div>

      {/* Grand Total - 플로우/선반 각각 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: "linear-gradient(135deg,#059669,#047857)", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(5,150,105,0.25)" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: "0.08em" }}>플로우 피킹률</div>
          <div style={{ position: "relative" }}>
            <CircleProgress percent={grand.flowPct} color="#ffffff" size={80} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{grand.flowPct}%</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{grand.flowDone} / {grand.total}</div>
        </div>
        <div style={{ flex: 1, background: "linear-gradient(135deg,#0891b2,#0e7490)", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(8,145,178,0.25)" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600, letterSpacing: "0.08em" }}>선반 피킹률</div>
          <div style={{ position: "relative" }}>
            <CircleProgress percent={grand.shelfPct} color="#ffffff" size={80} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{grand.shelfPct}%</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{grand.shelfDone} / {grand.total}</div>
        </div>
      </div>

      {/* Zone Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {ZONES.map(z => {
          const { flowPct, shelfPct, pct } = stats[z];
          const isActive = z === activeZone;
          const color = ZONE_COLORS[z];
          return (
            <button key={z} onClick={() => setActiveZone(z)} style={{ background: isActive ? color+"12" : S.card, border: `1.5px solid ${isActive ? color : S.border}`, borderRadius: 12, padding: "10px 6px", cursor: "pointer", textAlign: "center", boxShadow: S.shadow, transition: "all 0.2s" }}>
              <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 3 }}>{z} 존</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: S.text, marginBottom: 4 }}>{pct}%</div>
              <div style={{ height: 3, background: "#e2e8f0", borderRadius: 2, marginBottom: 4 }}>
                <div style={{ height: 3, borderRadius: 2, background: color, width: `${pct}%`, transition: "width 0.4s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: "#059669", fontWeight: 600 }}>플 {flowPct}%</span>
                <span style={{ fontSize: 9, color: "#0891b2", fontWeight: 600 }}>선 {shelfPct}%</span>
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

        {/* 플로우 / 선반 체크 */}
        {TYPES.map(type => {
          const checks = data[activeZone][activeLine][type];
          const doneCnt = checks.filter(v => v).length;
          const typeColor = type === "플로우" ? "#059669" : "#0891b2";
          return (
            <div key={type} style={{ marginBottom: type === "플로우" ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: typeColor, background: typeColor+"12", border: `1px solid ${typeColor}33`, borderRadius: 7, padding: "3px 12px" }}>{type}</div>
                <div style={{ fontSize: 11, color: S.textSub }}>{doneCnt} / 9 완료</div>
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

      {/* 존별 요약 */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, boxShadow: S.shadow }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 12 }}>존별 요약</div>

        {/* 텍스트 미리보기 */}
        <div style={{ background: S.inputBg, borderRadius: 10, padding: "12px 14px", marginBottom: 10, fontSize: 12, lineHeight: 1.8, color: S.textSub, fontFamily: "monospace", whiteSpace: "pre-wrap", border: `1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(getSummaryText()).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000); }}
          style={{ width: "100%", background: copied ? "#059669" : "linear-gradient(135deg,#059669,#0891b2)", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 14, boxShadow: "0 2px 8px rgba(5,150,105,0.25)", fontFamily: "inherit" }}>
          {copied ? "✓ 복사됨!" : "📤 현황 공유"}
        </button>

        {/* 존별 바 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ZONES.map(z => {
            const { flowPct, shelfPct } = stats[z];
            const color = ZONE_COLORS[z];
            return (
              <div key={z} style={{ background: S.inputBg, borderRadius: 10, padding: "10px 12px", border: `1px solid ${S.border}` }}>
                {/* 존 이름 + 전체 % */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color }}>{z.length<=1?z+"존":z}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>플 {flowPct}%</span>
                    <span style={{ fontSize: 11, color: "#0891b2", fontWeight: 700 }}>선 {shelfPct}%</span>
                  </div>
                </div>

                {/* 라인별 플로우/선반 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {LINES.map(l => {
                    const flowArr = data[z][l]["플로우"];
                    const shelfArr = data[z][l]["선반"];
                    const flowCnt = flowArr.filter(v=>v).length;
                    const shelfCnt = shelfArr.filter(v=>v).length;
                    const flowLinePct = Math.round((flowCnt/9)*100);
                    const shelfLinePct = Math.round((shelfCnt/9)*100);
                    return (
                      <div key={l} style={{ background: S.card, borderRadius: 8, padding: "6px 10px", border: `1px solid ${S.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: S.textSub }}>{l}라인 ({l}1~{l}9)</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <span style={{ fontSize: 10, color: "#059669", fontWeight: 600 }}>{flowCnt}/9</span>
                            <span style={{ fontSize: 10, color: "#0891b2", fontWeight: 600 }}>{shelfCnt}/9</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ fontSize: 9, color: "#059669", minWidth: 24, fontWeight: 600 }}>플로우</div>
                            <div style={{ flex: 1, height: 5, background: "#e2e8f0", borderRadius: 3 }}>
                              <div style={{ height: 5, borderRadius: 3, background: "#059669", width: `${flowLinePct}%`, transition: "width 0.3s" }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: flowLinePct===100?"#059669":S.text, minWidth: 28, textAlign: "right" }}>{flowLinePct}%</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ fontSize: 9, color: "#0891b2", minWidth: 24, fontWeight: 600 }}>선반</div>
                            <div style={{ flex: 1, height: 5, background: "#e2e8f0", borderRadius: 3 }}>
                              <div style={{ height: 5, borderRadius: 3, background: "#0891b2", width: `${shelfLinePct}%`, transition: "width 0.3s" }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: shelfLinePct===100?"#0891b2":S.text, minWidth: 28, textAlign: "right" }}>{shelfLinePct}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 초기화 */}
      <button onClick={resetAll} style={{ width: "100%", background: S.card, border: "1px solid #fecaca", borderRadius: 12, padding: "12px 0", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 600, marginTop: 16, boxShadow: S.shadow, fontFamily: "inherit" }}>🔄 전체 초기화</button>
    </div>
  );
}

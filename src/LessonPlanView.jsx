import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  KEYBOARD_ROWS,
  desiredKeyDistribution,
  groupLabel,
  keyDistribution,
  stageLabel,
  weakCharsForGroups,
} from "./progression.js";

const buttonStyle = {
  fontSize: 16,
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

// Blend from a dim base to bright cyan by intensity t (0..1); unused keys stay
// nearly black so what the round touches reads at a glance.
function heatColor(t) {
  if (t <= 0) return "#1b1b1b";
  const alpha = 0.18 + 0.82 * t;
  return `rgba(0, 229, 229, ${alpha})`;
}

const KEY_LABELS = { "1": "1", "-": "-", ";": ";", "'": "'", ",": ",", ".": ".", "/": "/" };

function Keyboard({ title, distribution, weakSet, total }) {
  const max = Math.max(1, ...Object.values(distribution));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <div style={{ fontSize: 14, fontWeight: "bold", color: "#ddd" }}>{title}</div>
      <div style={{ fontSize: 11, color: "#888", minHeight: 14 }}>
        {total > 0 ? `${total} keystrokes` : "no data"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 4, justifyContent: "center", paddingLeft: i * 10 }}>
            {row.map((key) => {
              const count = distribution[key] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const isWeak = weakSet.has(key);
              return (
                <div
                  key={key}
                  title={`${KEY_LABELS[key] ?? key.toUpperCase()}: ${count} (${pct}%)${isWeak ? " · weak-boosted" : ""}`}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 5,
                    background: heatColor(count / max),
                    border: isWeak ? "2px solid #ffcf5c" : "1px solid #333",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                    color: count / max > 0.55 ? "#00201f" : "#ccc",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: "bold" }}>{KEY_LABELS[key] ?? key.toUpperCase()}</span>
                  {count > 0 && <span style={{ fontSize: 8, lineHeight: 1 }}>{pct}%</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", color: "#aaa", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>less</span>
        <div
          style={{
            width: 140,
            height: 12,
            borderRadius: 6,
            background: `linear-gradient(90deg, ${heatColor(0.01)}, ${heatColor(1)})`,
          }}
        />
        <span>more</span>
        <span style={{ marginLeft: 4, color: "#666" }}>· dark = not used</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, border: "2px solid #ffcf5c", display: "inline-block" }} />
        <span>gold outline = weak group, given extra practice</span>
      </div>
    </div>
  );
}

// One selectable plan on the timeline: either the upcoming plan (kind "upcoming")
// or a completed round pulled from history (kind "completed").
function buildTimeline(upcomingPlan, history) {
  const entries = [
    {
      id: "upcoming",
      tabLabel: "Up next",
      stageIndex: upcomingPlan.stageIndex,
      words: upcomingPlan.words,
      weakChars: weakCharsForGroups(upcomingPlan.weakGroupIds),
      weakGroups: upcomingPlan.weakGroups ?? [],
      direction: upcomingPlan.direction,
      accuracy: null,
      wpm: null,
    },
  ];
  const recent = [...history].reverse(); // newest first
  recent.forEach((entry, i) => {
    entries.push({
      id: `h-${entry.ts ?? i}`,
      tabLabel: i === 0 ? "Just played" : `${i + 1} rounds ago`,
      stageIndex: entry.stageIndex,
      words: entry.words ?? null,
      weakChars: weakCharsForGroups(entry.weakGroupIds),
      weakGroups: (entry.weakGroupIds ?? []).map(groupLabel),
      direction: null,
      accuracy: entry.accuracy,
      wpm: entry.wpm,
    });
  });
  return entries;
}

export default function LessonPlanView({ upcomingPlan, history, onBack }) {
  const timeline = useMemo(() => buildTimeline(upcomingPlan, history), [upcomingPlan, history]);
  const [selectedId, setSelectedId] = useState(timeline[0].id);
  const selected = timeline.find((t) => t.id === selectedId) ?? timeline[0];

  // Recompute the Monte-Carlo "desired" distribution only when the plan itself
  // changes, since it samples 2000 words each time.
  const desired = useMemo(
    () => desiredKeyDistribution(selected.stageIndex, selected.weakChars),
    [selected.stageIndex, selected.weakChars]
  );
  const actual = useMemo(() => (selected.words ? keyDistribution(selected.words) : {}), [selected.words]);
  const weakSet = useMemo(() => new Set(selected.weakChars), [selected.weakChars]);

  const desiredTotal = Object.values(desired).reduce((a, b) => a + b, 0);
  const actualTotal = Object.values(actual).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: 780, padding: "16px" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ fontSize: 26, fontWeight: "bold" }}>Lesson Plan</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {timeline.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            style={{
              ...buttonStyle,
              fontSize: 13,
              padding: "6px 12px",
              background: t.id === selectedId ? "cyan" : "transparent",
              color: t.id === selectedId ? "black" : "#aaa",
              border: t.id === selectedId ? "none" : "1px solid #444",
            }}
          >
            {t.tabLabel}
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", color: "#ccc" }}>
        <div style={{ fontSize: 18, fontWeight: "bold" }}>{stageLabel(selected.stageIndex)}</div>
        <div style={{ fontSize: 13, color: "#888" }}>
          {selected.accuracy != null
            ? `${selected.wpm} wpm · ${selected.accuracy}% accuracy`
            : `direction: ${selected.direction}`}
        </div>
        {selected.weakGroups.length > 0 && (
          <div style={{ fontSize: 13, color: "#f96", marginTop: 2 }}>
            Extra practice: {selected.weakGroups.join(", ")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
        <Keyboard title="Desired (what the plan targets)" distribution={desired} weakSet={weakSet} total={desiredTotal} />
        <Keyboard title="Actual (this round's words)" distribution={actual} weakSet={weakSet} total={actualTotal} />
      </div>

      {selected.words == null && (
        <div style={{ fontSize: 12, color: "#a66", maxWidth: 420, textAlign: "center" }}>
          This round was played before words were recorded, so only the desired distribution is available.
        </div>
      )}

      <Legend />

      {selected.words && (
        <details style={{ color: "#888", fontSize: 12, maxWidth: 560 }}>
          <summary style={{ cursor: "pointer" }}>Show the {selected.words.length} words for this round</summary>
          <div style={{ fontFamily: "monospace", marginTop: 6, lineHeight: 1.6 }}>{selected.words.join(" ")}</div>
        </details>
      )}

      <button style={{ ...buttonStyle, background: "#333", color: "white", marginTop: 4 }} onClick={onBack}>
        Back to Menu
      </button>
    </motion.div>
  );
}

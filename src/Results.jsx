import { motion } from "framer-motion";
import { groupBreakdown } from "./progression.js";
import SnowLeopard from "./SnowLeopard.jsx";

const buttonStyle = {
  fontSize: 18,
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const DIRECTION_MESSAGES = {
  start: "Let's get started!",
  advance: "🎉 Great job — leveling up next time!",
  hold: "💪 Keep practicing these letters",
  "hold-speed": "⚡ You know these letters — let's build speed before moving on!",
  regress: "🐢 Let's slow down and review",
  mastered: "🏆 You've hit your speed goal on the full keyboard!",
};

export default function Results({ lesson, stats, wpmTarget, onPlayAgain, onBackToMenu }) {
  const groups = groupBreakdown(stats.letterStats);
  const goalPercent = wpmTarget ? Math.min(100, Math.round((stats.wpm / wpmTarget) * 100)) : null;
  const leopardProgress = wpmTarget ? Math.min(1, stats.wpm / wpmTarget) : 1;

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      <div style={{ fontSize: 28, fontWeight: "bold" }}>Nice work! 🎉</div>
      <SnowLeopard progress={leopardProgress} preyProgress={1} />
      <div style={{ color: "#aaa" }}>{lesson.label}</div>
      <motion.div
        style={{ fontSize: 56, fontWeight: "bold", color: "#6f6" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
      >
        {stats.wpm} wpm
      </motion.div>
      <div style={{ fontSize: 20 }}>{stats.accuracy}% accuracy</div>

      {goalPercent != null && (
        <div style={{ width: "100%", maxWidth: 260 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4, textAlign: "center" }}>
            {stats.wpm} / {wpmTarget} wpm goal
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "#333", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${goalPercent}%`,
                background: goalPercent >= 100 ? "#6f6" : "#5cf",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}

      <div style={{ fontSize: 16, color: "#ccc" }}>{DIRECTION_MESSAGES[stats.direction]}</div>
      {stats.weakGroups?.length > 0 && (
        <div style={{ fontSize: 14, color: "#f96" }}>Extra practice: {stats.weakGroups.join(", ")}</div>
      )}

      {groups.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 400 }}>
          {groups.map(({ group, label, accuracy, wpm, attempts }) => (
            <div
              key={group}
              title={`${attempts} typed`}
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                padding: "4px 8px",
                borderRadius: 6,
                background: accuracy >= 90 ? "#1a3" : accuracy >= 70 ? "#a71" : "#a22",
                color: "white",
              }}
            >
              {label} {accuracy}%{wpm != null ? ` · ${wpm} wpm` : ""}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button style={{ ...buttonStyle, background: "cyan", color: "black" }} onClick={onPlayAgain}>
          Next Lesson
        </button>
        <button style={{ ...buttonStyle, background: "#eee" }} onClick={onBackToMenu}>
          Back to Menu
        </button>
      </div>
    </motion.div>
  );
}

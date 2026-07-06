import { motion } from "framer-motion";
import { groupBreakdown, minWpmForTarget } from "./progression.js";
import SnowLeopard from "./SnowLeopard.jsx";

const buttonStyle = {
  fontSize: 18,
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

function verdictMessage(verdict, suggestedLevel) {
  if (verdict === "fit") return "✅ This level looks like a good fit!";
  if (verdict === "increase") {
    return suggestedLevel ? "🚀 You're doing great here — this level looks too easy!" : "🏆 You've mastered every level!";
  }
  return suggestedLevel ? "🐢 This level is tough right now." : "🐢 Let's keep practicing at this level.";
}

export default function TestResults({ level, stats, verdict, wpmTarget, suggestedLevel, onRetestLevel, onDone }) {
  const groups = groupBreakdown(stats.letterStats);
  const minWpm = wpmTarget ? minWpmForTarget(wpmTarget) : null;
  const leopardProgress = wpmTarget ? Math.min(1, stats.wpm / wpmTarget) : 1;

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      <div style={{ fontSize: 28, fontWeight: "bold" }}>Test Results</div>
      <SnowLeopard progress={leopardProgress} preyProgress={1} />
      <div style={{ color: "#aaa" }}>{level.label}</div>
      <motion.div
        style={{ fontSize: 56, fontWeight: "bold", color: "#6f6" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
      >
        {stats.wpm} wpm
      </motion.div>
      <div style={{ fontSize: 20 }}>{stats.accuracy}% accuracy</div>
      {minWpm != null && <div style={{ fontSize: 12, color: "#888" }}>Needed {minWpm}+ wpm to pass this level</div>}

      <div style={{ fontSize: 16, color: "#ccc", textAlign: "center", maxWidth: 320 }}>
        {verdictMessage(verdict, suggestedLevel)}
        {verdict !== "fit" && suggestedLevel && (
          <>
            {" "}
            Try <strong>{suggestedLevel.label}</strong> instead.
          </>
        )}
      </div>

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
        {verdict !== "fit" && suggestedLevel && (
          <button style={{ ...buttonStyle, background: "cyan", color: "black" }} onClick={() => onRetestLevel(suggestedLevel)}>
            Retest at {suggestedLevel.label}
          </button>
        )}
        <button style={{ ...buttonStyle, background: "#eee" }} onClick={onDone}>
          Done
        </button>
      </div>
    </motion.div>
  );
}

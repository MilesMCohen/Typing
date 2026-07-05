import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getCharStatuses, computeAccuracy, computeWpm } from "./typing.js";
import { getLetterStats } from "./progression.js";
import { WORDS_PER_LINE, splitIntoLines } from "./lessons.js";
import SnowLeopard from "./SnowLeopard.jsx";

const STATUS_COLORS = {
  correct: "#6f6",
  incorrect: "#f66",
};

// A lone space is both the leading and trailing whitespace of its own flex-item
// span, so browsers collapse it to zero width/height — which lets the echo span
// below it ride up into the sample row's line. A non-breaking space renders
// identically but isn't subject to that collapsing.
function displayChar(char) {
  return char === " " ? " " : char;
}

export default function Game({ lesson, words, onComplete, onExit }) {
  const target = words.join(" ");
  const [typed, setTyped] = useState("");
  const startTimeRef = useRef(null);
  const inputRef = useRef(null);

  const lines = useMemo(() => splitIntoLines(words, WORDS_PER_LINE), [words]);

  const progress = target.length > 0 ? typed.length / target.length : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typed.length === target.length && typed.length > 0) {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const wpm = computeWpm(target.length, elapsedSeconds);
      const accuracy = computeAccuracy(target, typed);
      const letterStats = getLetterStats(target, typed);
      onComplete({ wpm, accuracy, letterStats });
    }
  }, [typed, target, onComplete]);

  const handleChange = (e) => {
    if (startTimeRef.current === null && e.target.value.length > 0) {
      startTimeRef.current = Date.now();
    }
    setTyped(e.target.value.slice(0, target.length));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onExit();
  };

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 900, padding: "0 16px" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 20, color: "#aaa" }}>{lesson.label}</div>
        <button
          onClick={onExit}
          style={{ fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid #444", background: "transparent", color: "#888", cursor: "pointer" }}
        >
          Exit (Esc)
        </button>
      </div>
      <SnowLeopard progress={progress} />
      <div
        style={{ fontSize: 28, fontFamily: "monospace", letterSpacing: 1, textAlign: "center", display: "flex", flexDirection: "column", gap: 32 }}
        onClick={() => inputRef.current?.focus()}
      >
        {(() => {
          const statuses = getCharStatuses(target, typed);
          return lines.map((line, li) => {
            const indices = Array.from({ length: line.end - line.start }, (_, i) => line.start + i);
            return (
              <div key={li} style={{ display: "flex", justifyContent: "center", whiteSpace: "nowrap" }}>
                {indices.map((idx) => {
                  const status = statuses[idx];
                  const isTyped = status === "correct" || status === "incorrect";
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          color: STATUS_COLORS[status] ?? "#666",
                          background: status === "current" ? "#333" : "transparent",
                          borderRadius: 3,
                        }}
                      >
                        {displayChar(target[idx])}
                      </span>
                      <span style={{ color: isTyped ? "#fff" : "transparent" }}>
                        {displayChar(isTyped ? typed[idx] : target[idx])}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>
      <input
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
      />
    </motion.div>
  );
}

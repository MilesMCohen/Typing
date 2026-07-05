import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getCharStatuses, computeAccuracy, computeWpm } from "./typing.js";
import { getLetterStats } from "./progression.js";
import { WORDS_PER_LINE, splitIntoLines } from "./lessons.js";
import SnowLeopard from "./SnowLeopard.jsx";

const STATUS_COLORS = {
  correct: "#6f6",
  incorrect: "#f66",
  current: "#666",
  pending: "#666",
};

export default function Game({ lesson, words, onComplete }) {
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

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 700, padding: "0 16px" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ fontSize: 20, color: "#aaa" }}>{lesson.label}</div>
      <SnowLeopard progress={progress} />
      <div
        style={{ fontSize: 28, fontFamily: "monospace", lineHeight: 1.6, letterSpacing: 1, textAlign: "center" }}
        onClick={() => inputRef.current?.focus()}
      >
        {(() => {
          const statuses = getCharStatuses(target, typed);
          return lines.map((line, li) => (
            <div key={li}>
              {statuses.slice(line.start, line.end).map((status, i) => {
                const idx = line.start + i;
                return (
                  <span
                    key={idx}
                    style={{
                      color: STATUS_COLORS[status],
                      background: status === "current" ? "#333" : "transparent",
                      borderRadius: 3,
                    }}
                  >
                    {target[idx]}
                  </span>
                );
              })}
            </div>
          ));
        })()}
      </div>
      <input
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        autoFocus
        style={{ fontSize: 20, padding: 12, width: "100%", borderRadius: 8, border: "2px solid #444", background: "#1a1a1a", color: "white" }}
        placeholder="Start typing here..."
      />
    </motion.div>
  );
}

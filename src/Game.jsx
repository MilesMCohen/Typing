import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getCharStatuses, computeAccuracy, computeWpm } from "./typing.js";

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typed.length === target.length && typed.length > 0) {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const wpm = computeWpm(target.length, elapsedSeconds);
      const accuracy = computeAccuracy(target, typed);
      onComplete({ wpm, accuracy });
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
      <div
        style={{ fontSize: 32, fontFamily: "monospace", lineHeight: 1.5, letterSpacing: 1, textAlign: "center" }}
        onClick={() => inputRef.current?.focus()}
      >
        {getCharStatuses(target, typed).map((status, i) => (
          <span
            key={i}
            style={{
              color: STATUS_COLORS[status],
              background: status === "current" ? "#333" : "transparent",
              borderRadius: 3,
            }}
          >
            {target[i]}
          </span>
        ))}
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

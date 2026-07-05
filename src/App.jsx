import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { auth, db } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { buildLessonPlan } from "./progression.js";
import Menu from "./Menu.jsx";
import Game from "./Game.jsx";
import Results from "./Results.jsx";

const containerStyle = {
  fontFamily: "sans-serif",
  background: "#111",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  gap: 16,
  margin: 0,
  overflow: "hidden",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [bestScore, setBestScore] = useState(null);
  const [status, setStatus] = useState("");
  const [screen, setScreen] = useState("menu");
  const [history, setHistory] = useState([]);
  const [lessonPlan, setLessonPlan] = useState(null);
  const [resultsData, setResultsData] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setBestScore(null);
      setHistory([]);
      return;
    }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      const data = snap.exists() ? snap.data() : null;
      setBestScore(data?.bestScore ?? null);
      setHistory(data?.progression?.history ?? []);
    });
  }, [user]);

  const nextPlan = useMemo(() => buildLessonPlan(history), [history]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setStatus(`Sign-in error: ${err.message}`);
    }
  };

  const recordScore = useCallback(
    async (wpm) => {
      if (!user || (bestScore != null && wpm <= bestScore)) return;
      setBestScore(wpm);
      await setDoc(
        doc(db, "users", user.uid),
        { bestScore: wpm, lastPlayedAt: serverTimestamp() },
        { merge: true }
      );
    },
    [user, bestScore]
  );

  const startLesson = () => {
    setLessonPlan(nextPlan);
    setScreen("game");
  };

  const handleComplete = useCallback(
    (roundStats) => {
      const entry = {
        ts: Date.now(),
        stageIndex: lessonPlan.stageIndex,
        accuracy: roundStats.accuracy,
        wpm: roundStats.wpm,
        letterStats: roundStats.letterStats,
      };
      const newHistory = [...history, entry].slice(-5);
      setHistory(newHistory);
      setResultsData({
        wpm: roundStats.wpm,
        accuracy: roundStats.accuracy,
        letterStats: roundStats.letterStats,
        direction: lessonPlan.direction,
        unlockedLetters: lessonPlan.unlockedLetters,
        weakLetters: lessonPlan.weakLetters,
      });
      recordScore(roundStats.wpm);
      if (user) {
        setDoc(doc(db, "users", user.uid), { progression: { history: newHistory } }, { merge: true });
      }
      setScreen("results");
    },
    [lessonPlan, history, user, recordScore]
  );

  return (
    <div style={containerStyle}>
      <AnimatePresence mode="wait">
        {screen === "menu" && (
          <Menu
            key="menu"
            user={user}
            bestScore={bestScore}
            status={status}
            plan={nextPlan}
            onSignIn={handleSignIn}
            onSignOut={() => signOut(auth)}
            onStart={startLesson}
          />
        )}
        {screen === "game" && (
          <Game key="game" lesson={lessonPlan} words={lessonPlan.words} onComplete={handleComplete} />
        )}
        {screen === "results" && (
          <Results
            key="results"
            lesson={lessonPlan}
            stats={resultsData}
            onPlayAgain={startLesson}
            onBackToMenu={() => setScreen("menu")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { auth, db } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { TEST_LEVELS, buildLessonPlan, buildTestRound, evaluateTestResult } from "./progression.js";
import Menu from "./Menu.jsx";
import Game from "./Game.jsx";
import Results from "./Results.jsx";
import TestSelect from "./TestSelect.jsx";
import TestResults from "./TestResults.jsx";

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
  const [testLevel, setTestLevel] = useState(null);
  const [testWords, setTestWords] = useState([]);
  const [testStats, setTestStats] = useState(null);

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

  const persistHistory = useCallback(
    (newHistory) => {
      setHistory(newHistory);
      if (user) {
        setDoc(doc(db, "users", user.uid), { progression: { history: newHistory } }, { merge: true });
      }
    },
    [user]
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
      persistHistory([...history, entry].slice(-5));
      setResultsData({
        wpm: roundStats.wpm,
        accuracy: roundStats.accuracy,
        letterStats: roundStats.letterStats,
        direction: lessonPlan.direction,
        unlockedLetters: lessonPlan.unlockedLetters,
        weakLetters: lessonPlan.weakLetters,
      });
      recordScore(roundStats.wpm);
      setScreen("results");
    },
    [lessonPlan, history, persistHistory, recordScore]
  );

  const startTest = (level) => {
    setTestLevel(level);
    setTestWords(buildTestRound(level.stageIndex));
    setScreen("test-game");
  };

  const handleTestComplete = useCallback(
    (roundStats) => {
      const entry = {
        ts: Date.now(),
        stageIndex: testLevel.stageIndex,
        accuracy: roundStats.accuracy,
        wpm: roundStats.wpm,
        letterStats: roundStats.letterStats,
      };
      // A test result resets the calibration: it replaces history rather than appending to it.
      persistHistory([entry]);
      setTestStats({
        wpm: roundStats.wpm,
        accuracy: roundStats.accuracy,
        letterStats: roundStats.letterStats,
        verdict: evaluateTestResult(roundStats.accuracy),
      });
      recordScore(roundStats.wpm);
      setScreen("test-results");
    },
    [testLevel, persistHistory, recordScore]
  );

  const testLevelIndex = testLevel ? TEST_LEVELS.findIndex((l) => l.id === testLevel.id) : -1;
  const suggestedTestLevel =
    testStats?.verdict === "increase"
      ? TEST_LEVELS[testLevelIndex + 1]
      : testStats?.verdict === "decrease"
        ? TEST_LEVELS[testLevelIndex - 1]
        : undefined;

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
            onOpenTest={() => setScreen("test-select")}
          />
        )}
        {screen === "game" && (
          <Game
            key="game"
            lesson={lessonPlan}
            words={lessonPlan.words}
            onComplete={handleComplete}
            onExit={() => setScreen("menu")}
          />
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
        {screen === "test-select" && (
          <TestSelect key="test-select" onSelectLevel={startTest} onCancel={() => setScreen("menu")} />
        )}
        {screen === "test-game" && (
          <Game
            key="test-game"
            lesson={testLevel}
            words={testWords}
            onComplete={handleTestComplete}
            onExit={() => setScreen("test-select")}
          />
        )}
        {screen === "test-results" && (
          <TestResults
            key="test-results"
            level={testLevel}
            stats={testStats}
            verdict={testStats.verdict}
            suggestedLevel={suggestedTestLevel}
            onRetestLevel={startTest}
            onDone={() => setScreen("menu")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

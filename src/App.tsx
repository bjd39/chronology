import { useEffect, useState } from "react";
import { loadStore } from "./game/storage";
import Home from "./components/Home";
import DailyGame from "./components/DailyGame";
import SuddenDeath from "./components/SuddenDeath";
import Faq from "./components/Faq";

type Screen = "home" | "daily" | "sudden";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [store, setStore] = useState(loadStore);
  const [showFaq, setShowFaq] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("chronology-theme") as "light" | "dark" | null;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("chronology-theme", theme);
  }, [theme]);

  const refreshStore = () => setStore(loadStore());

  return (
    <div className="app">
      <header className="app-header">
        <button className="wordmark" onClick={() => setScreen("home")}>
          Chronology
        </button>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setShowFaq(true)} title="How it works" aria-label="How it works">
            ?
          </button>
          <button
            className="btn-icon"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <main>
        {screen === "home" && (
          <Home
            store={store}
            onPlayDaily={() => setScreen("daily")}
            onPlaySudden={() => setScreen("sudden")}
          />
        )}
        {screen === "daily" && (
          <DailyGame onExit={() => setScreen("home")} onStoreChange={refreshStore} />
        )}
        {screen === "sudden" && (
          <SuddenDeath onExit={() => setScreen("home")} onStoreChange={refreshStore} />
        )}
      </main>

      {showFaq && <Faq onClose={() => setShowFaq(false)} />}

      <footer className="app-footer">
        <button className="btn-text tiny" onClick={() => setShowFaq(true)}>
          How scoring works
        </button>
      </footer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { loadStore } from "./game/storage";
import Home from "./components/Home";
import DailyGame from "./components/DailyGame";
import SuddenDeath from "./components/SuddenDeath";
import PackGame from "./components/PackGame";
import History from "./components/History";
import Faq from "./components/Faq";
import { packFromUrl } from "./game/share";
import { themeById } from "./game/themes";

type Screen = "home" | "daily" | "sudden" | "pack" | "history";

/**
 * A shared pack result links to ?pack=<id>&seed=<base36>, so following one opens
 * that pack on the same five events. The parameters are consumed once and wiped
 * from the address bar: without that, going home and refreshing would throw you
 * back into the pack you had just left.
 */
function packFromLink(): { pack: string; seed: number | null } {
  const none = { pack: "", seed: null };
  if (typeof location === "undefined") return none;
  const asked = packFromUrl(location.href);
  if (asked === null) return none;
  if (typeof history !== "undefined" && history.replaceState) {
    history.replaceState(null, "", location.origin + location.pathname);
  }
  return themeById(asked.pack) ? asked : none;
}

export default function App() {
  const [linked] = useState(packFromLink);
  const [screen, setScreen] = useState<Screen>(linked.pack ? "pack" : "home");
  const [packTheme, setPackTheme] = useState(linked.pack);
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
            onPlayPack={(themeId) => {
              setPackTheme(themeId);
              setScreen("pack");
            }}
            onShowHistory={() => setScreen("history")}
          />
        )}
        {screen === "daily" && (
          <DailyGame onExit={() => setScreen("home")} onStoreChange={refreshStore} />
        )}
        {screen === "sudden" && (
          <SuddenDeath onExit={() => setScreen("home")} onStoreChange={refreshStore} />
        )}
        {screen === "history" && (
          <History store={store} onExit={() => setScreen("home")} />
        )}
        {screen === "pack" && (
          <PackGame
            themeId={packTheme}
            initialSeed={packTheme === linked.pack ? linked.seed : null}
            onExit={() => setScreen("home")}
            onStoreChange={refreshStore}
          />
        )}
      </main>

      {showFaq && <Faq onClose={() => setShowFaq(false)} />}

      <footer className="app-footer">
        <button className="btn-text tiny" onClick={() => setShowFaq(true)}>
          How scoring works
        </button>
        <span className="version" title={`Built ${__APP_BUILT__} from ${__APP_COMMIT__}`}>
          v{__APP_VERSION__} · {__APP_COMMIT__}
        </span>
      </footer>
    </div>
  );
}

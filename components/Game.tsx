"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Crosshair,
  Flag,
  Heart,
  Leaf,
  Map,
  MessageCircle,
  Settings,
  Sparkles,
  Swords,
  Users,
  X,
} from "lucide-react";
import {
  initialSave,
  makeMonster,
  maxHp,
  move,
  parseSave,
  REGIONS,
  regionAt,
  Save,
  SPECIES,
  tileAt,
  TOWNS,
} from "@/lib/game";
import {
  cloudEnabled,
  connectCloud,
  Trainer,
  watchAccount,
} from "@/lib/firebase";
import World from "./World";
import AccountPanel from "./AccountPanel";
import { Account, saveKey, chooseAccountSave } from "@/lib/account";
import { Battle, BattleAction, resolveBattle } from "@/lib/battle";
type Panel = "map" | "guide" | "bag" | "settings" | null;

function Sprite({ species, size = 72 }: { species: number; size?: number }) {
  return (
    <span
      role="img"
      aria-label={SPECIES[species].name}
      className="sprite"
      style={{
        width: size,
        height: size,
        backgroundPosition: `${((species % 4) * 100) / 3}% ${species < 4 ? 0 : 100}%`,
      }}
    />
  );
}
function Type({ species }: { species: number }) {
  return (
    <span className="type" style={{ color: SPECIES[species].color }}>
      {SPECIES[species].type}
    </span>
  );
}
export default function Game() {
  const [account, setAccount] = useState<Account | null>(null),
    [ready, setReady] = useState(!cloudEnabled),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!cloudEnabled) return;
    return watchAccount(
      (value) => {
        setAccount(value);
        setReady(true);
        setFailed(false);
      },
      () => {
        setFailed(true);
        setReady(true);
      },
    );
  }, []);
  if (!ready)
    return (
      <main className="loading">
        <Leaf size={40} />
        <p>Restoring your trainer session…</p>
      </main>
    );
  if (failed)
    return (
      <main className="loading">
        <p>Could not restore your account. Please reload to try again.</p>
        <button
          className="subtle-button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </main>
    );
  return <GameSession key={account?.uid ?? "guest"} account={account} />;
}
function GameSession({ account }: { account: Account | null }) {
  const storageKey = saveKey(account?.uid);
  const [sessionReady, setSessionReady] = useState(false),
    [sessionError, setSessionError] = useState(false);
  const [save, loadSave] = useState<Save | null>(null),
    [panel, setPanel] = useState<Panel>(null),
    [battle, setBattle] = useState<Battle | null>(null),
    [dialogue, setDialogue] = useState<{
      name: string;
      lines: string[];
      index: number;
    } | null>(null),
    [trainers, setTrainers] = useState<Trainer[]>([]),
    [cloud, setCloud] = useState(account ? "Connecting…" : "Local adventure"),
    [notice, setNotice] = useState(
      "A new adventure starts with a little curiosity.",
    ),
    [tab, setTab] = useState("explore"),
    [now, setNow] = useState(0);
  const cloudRef = useRef<Awaited<ReturnType<typeof connectCloud>> | null>(
      null,
    ),
    stateRef = useRef<Save | null>(null),
    lastMove = useRef(0),
    cloudReady = useRef(false);
  const setSave = useCallback((next: Save) => {
    const stamped = { ...next, updatedAt: Date.now() };
    stateRef.current = stamped;
    loadSave(stamped);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const modalOpen = Boolean(panel || battle || dialogue);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, [tabindex="0"]',
        ) ?? [],
      );
    controls()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = controls(),
        first = items[0],
        last = items[items.length - 1];
      if (!first) return;
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !dialog?.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !dialog?.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modalOpen, panel]);
  useEffect(() => {
    let current: Save | null = null;
    try {
      const raw =
        localStorage.getItem(storageKey) ??
        (account?.isAnonymous ? localStorage.getItem(saveKey()) : null);
      if (raw) current = parseSave(JSON.parse(raw));
    } catch {}
    current ??= { ...initialSave(), updatedAt: 0 };
    stateRef.current = current;
    loadSave(current);
    let cancelled = false;
    if (account)
      connectCloud(account.uid, setTrainers, () =>
        setCloud("Connection interrupted"),
      )
        .then((c) => {
          if (cancelled) {
            c.unsubscribe();
            return;
          }
          cloudRef.current = c;
          const selected = chooseAccountSave(stateRef.current, c.saved);
          if (selected) {
            stateRef.current = selected;
            loadSave(selected);
          }
          setSessionReady(true);
          cloudReady.current = true;
          setCloud("Online · cloud connected");
        })
        .catch(() => {
          if (cancelled) return;
          setSessionError(true);
          cloudReady.current = false;
          setCloud("Offline · saved locally");
        });
    else setSessionReady(true);
    return () => {
      cancelled = true;
      cloudRef.current?.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!save) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(save));
    } catch {
      setCloud("Local storage unavailable");
    }
  }, [save, storageKey]);
  useEffect(() => {
    if (!account) return;
    let disposed = false;
    let lastSent: Save | null = null,
      lastSentAt = 0,
      sending = false;
    const timer = setInterval(() => {
      const current = stateRef.current;
      if (
        !current ||
        !cloudReady.current ||
        !cloudRef.current ||
        sending ||
        (current === lastSent && Date.now() - lastSentAt < 30000)
      )
        return;
      sending = true;
      cloudRef.current
        .save(current)
        .then(() => {
          if (disposed) return;
          lastSent = current;
          lastSentAt = Date.now();
          setCloud("Online · cloud connected");
        })
        .catch(() => setCloud("Cloud save failed · local save kept"))
        .finally(() => {
          sending = false;
        });
    }, 1500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  const talk = useCallback(() => {
    const s = stateRef.current;
    if (!sessionReady || !s || battle || panel || dialogue) return;
    const r = regionAt(s.x, s.y),
      nx = (r % 5) * 32 + 19,
      ny = Math.floor(r / 5) * 24 + 12;
    if (Math.abs(s.x - nx) + Math.abs(s.y - ny) > 2) {
      setNotice("Look for a guide beside the main path, then press E.");
      return;
    }
    if (TOWNS.has(r)) {
      setSave({ ...s, team: s.team.map((m) => ({ ...m, hp: maxHp(m) })) });
      setDialogue({
        name: "Mira · Town keeper",
        index: 0,
        lines: [
          `Welcome to ${REGIONS[r]}, traveler. Let your companions rest here. Their health is restored!`,
          "Wild Bosmon hide in the darker grass. Weaken them before throwing a capture orb.",
          "Take the crossing paths to discover all 25 places in Solara. Every town has a keeper like me.",
        ],
      });
    } else
      setDialogue({
        name: "Rowan · Field researcher",
        index: 0,
        lines: [
          `You’ve reached ${REGIONS[r]}. Different parts of Solara are home to different creatures.`,
          "Bring three different species into your field guide. The research guild has a reward waiting for you.",
          "Your lead companion gains experience after each victory. You can change your lead in the team panel.",
        ],
      });
  }, [battle, panel, dialogue, setSave, sessionReady]);
  const step = useCallback(
    (dx: number, dy: number) => {
      const s = stateRef.current;
      if (
        !sessionReady ||
        !s ||
        battle ||
        panel ||
        dialogue ||
        Date.now() - lastMove.current < 100
      )
        return;
      lastMove.current = Date.now();
      const next = move(s, dx, dy);
      if (next === s) return;
      stateRef.current = next;
      setSave(next);
      if (tileAt(next.x, next.y) === "wild" && Math.random() < 0.22) {
        const r = regionAt(next.x, next.y),
          species = (Math.floor(Math.random() * 3) + r) % 8,
          level = 3 + Math.floor(r / 3) + Math.floor(Math.random() * 3);
        setBattle({
          monster: makeMonster(species, level),
          message: `A wild ${SPECIES[species].name} appeared!`,
          done: false,
        });
      }
    },
    [battle, panel, dialogue, setSave, sessionReady],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const dirs: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        w: [0, -1],
        ArrowDown: [0, 1],
        s: [0, 1],
        ArrowLeft: [-1, 0],
        a: [-1, 0],
        ArrowRight: [1, 0],
        d: [1, 0],
      };
      if (dirs[e.key]) {
        e.preventDefault();
        step(...dirs[e.key]);
      }
      if (e.key.toLowerCase() === "e") talk();
      if (e.key === "Escape" && !battle) {
        setPanel(null);
        setDialogue(null);
        setTab("explore");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [step, talk, battle]);
  function action(kind: BattleAction) {
    if (!save || !battle) return;
    const result = resolveBattle(save, battle, kind);
    setSave(result.save);
    setBattle(result.battle);
    if (!result.battle) setNotice("You slipped away safely.");
  }
  function buy(item: "orbs" | "potions") {
    if (!save) return;
    const cost = item === "orbs" ? 30 : 20;
    if (save.coins < cost) {
      setNotice("Not enough coins. Win wild battles to earn more.");
      return;
    }
    setSave({
      ...save,
      coins: save.coins - cost,
      [item]: save[item] + (item === "orbs" ? 5 : 1),
    });
    setNotice(
      item === "orbs" ? "Added 5 capture orbs." : "Added 1 healing potion.",
    );
  }
  if (sessionError)
    return (
      <main className="loading">
        <p>
          Could not load your cloud save. Your saved adventure has not been
          replaced.
        </p>
        <button
          className="subtle-button"
          onClick={() => window.location.reload()}
        >
          Retry connection
        </button>
        <AccountPanel
          account={account}
          beforeChange={() => {
            if (stateRef.current)
              localStorage.setItem(
                storageKey,
                JSON.stringify(stateRef.current),
              );
          }}
        />
      </main>
    );
  if (!save || !sessionReady)
    return (
      <main className="loading">
        <Leaf size={40} />
        <h1>
          bosmon<span>.</span>
        </h1>
        <p>Unfolding your little world…</p>
      </main>
    );
  const region = regionAt(save.x, save.y),
    active = trainers.filter(
      (t) =>
        t.updatedAt && (now || Date.now()) - t.updatedAt.toMillis() < 120000,
    ),
    lead = save.team[0];
  return (
    <div className="app-shell">
      <div inert={modalOpen}>
        <header>
          <a className="brand" href="/" aria-label="Bosmon home">
            <span className="brand-icon">
              <Leaf size={25} />
            </span>
            bosmon<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Main navigation">
            {[
              { id: "explore", label: "Explore", icon: Compass },
              { id: "guide", label: "Field guide", icon: BookOpen },
              { id: "map", label: "World map", icon: Map },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? "nav-active" : ""}
                onClick={() => {
                  setTab(id);
                  setPanel(id === "explore" ? null : (id as Panel));
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>
          <div className="header-right">
            <button
              className="subtle-button"
              onClick={() => setPanel("settings")}
            >
              {account && !account.isAnonymous ? "Account" : "Sign in"}
            </button>
            <span className="connection">
              <i className={cloud.startsWith("Online") ? "connected" : ""} />
              {cloud}
            </span>
            <button
              className="avatar"
              onClick={() => setPanel("settings")}
              aria-label="Trainer settings"
            >
              {save.name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main className="dashboard">
          <div className="page-heading">
            <div>
              <div className="eyebrow">THE SOLARA REGION</div>
              <h1>
                A little world. A big adventure<span>.</span>
              </h1>
              <p>Take the scenic route. You never know who you’ll meet.</p>
            </div>
            <button className="subtle-button" onClick={() => setPanel("bag")}>
              <Backpack size={17} /> Your bag{" "}
              <span>{save.orbs + save.potions}</span>
            </button>
          </div>
          <div className="game-layout">
            <section className="explore-column">
              <div className="world-card">
                <div className="world-toolbar">
                  <div>
                    <span className="location-marker">
                      <Compass size={19} />
                    </span>
                    <div>
                      <h2>{REGIONS[region]}</h2>
                      <span>
                        {TOWNS.has(region)
                          ? "A cozy place to begin again"
                          : "Wild encounters await"}{" "}
                        <b>·</b> Solara {String(region + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  <span className="weather">
                    ☀ <span>A lovely day</span>
                  </span>
                </div>
                <div className="world-container">
                  <World save={save} trainers={active} onMove={step} />
                  <div className="map-label">
                    <span className="live-dot" /> {REGIONS[region]}{" "}
                    <span>
                      {" "}
                      / {save.x}, {save.y}
                    </span>
                  </div>
                  <button
                    className="map-expand"
                    onClick={() => setPanel("map")}
                    aria-label="Open world map"
                  >
                    <Map size={19} />
                  </button>
                  <div className="world-hint">
                    <Leaf size={13} /> Step into tall grass to meet wild Bosmon
                  </div>
                </div>
                <div className="world-footer">
                  <span>
                    <kbd>W</kbd>
                    <kbd>A</kbd>
                    <kbd>S</kbd>
                    <kbd>D</kbd> <span>move</span>
                    <b>·</b>
                    <kbd>E</kbd> <span>interact</span>
                  </span>
                  <button onClick={talk}>
                    <MessageCircle size={16} /> Talk to a guide
                  </button>
                </div>
              </div>
              <div className="mobile-controls">
                <button onClick={() => step(-1, 0)} aria-label="Move left">
                  <ArrowLeft />
                </button>
                <button onClick={() => step(0, -1)} aria-label="Move up">
                  <ArrowUp />
                </button>
                <button onClick={() => step(0, 1)} aria-label="Move down">
                  <ArrowDown />
                </button>
                <button onClick={() => step(1, 0)} aria-label="Move right">
                  <ArrowRight />
                </button>
              </div>
              <div className="below-map">
                <div className="quest">
                  <div className="quest-icon">
                    <Flag size={22} />
                  </div>
                  <div>
                    <div className="eyebrow">YOUR NEXT CHAPTER</div>
                    <h3>A few new friends</h3>
                    <p>Discover 3 different Bosmon species.</p>
                    <div className="quest-progress">
                      <span
                        style={{
                          width: `${Math.min(save.caught.length / 3, 1) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    disabled={save.caught.length < 3 || save.questClaimed}
                    onClick={() => {
                      setSave({
                        ...save,
                        questClaimed: true,
                        coins: save.coins + 100,
                        orbs: save.orbs + 10,
                      });
                      setNotice(
                        "Research reward: 100 coins and 10 capture orbs!",
                      );
                    }}
                  >
                    {save.questClaimed ? (
                      <Check size={18} />
                    ) : save.caught.length >= 3 ? (
                      "Claim reward"
                    ) : (
                      `${save.caught.length} / 3`
                    )}
                  </button>
                </div>
                <div className="field-note">
                  <Sparkles size={18} />
                  <div className="eyebrow">A LITTLE FIELD NOTE</div>
                  <p>
                    “The best companion isn’t always the strongest. Sometimes,
                    it’s the one that stays.”
                  </p>
                  <span>— Mira, Willowbrook keeper</span>
                </div>
              </div>
            </section>
            <aside>
              <section className="team-card">
                <div className="section-heading">
                  <h2>
                    Your companions <span>{save.team.length}</span>
                  </h2>
                  <Heart size={17} />
                </div>
                <p className="section-subtitle">
                  Every great journey starts with a friend.
                </p>
                <div className="team-list">
                  {save.team.slice(0, 6).map((m, i) => (
                    <button
                      key={m.id}
                      className={`team-member ${i === 0 ? "lead" : ""}`}
                      onClick={() => {
                        if (battle) return;
                        setSave({
                          ...save,
                          team: [m, ...save.team.filter((v) => v.id !== m.id)],
                        });
                        setNotice(
                          `${SPECIES[m.species].name} is now leading your team.`,
                        );
                      }}
                    >
                      <Sprite species={m.species} size={64} />
                      <div>
                        <div className="monster-title">
                          <strong>{SPECIES[m.species].name}</strong>
                          <span>Lv. {m.level}</span>
                        </div>
                        <Type species={m.species} />
                        <div className="hp-track">
                          <span
                            style={{ width: `${(m.hp / maxHp(m)) * 100}%` }}
                          />
                        </div>
                        <small>
                          {m.hp} / {maxHp(m)} HP {i === 0 && <b>LEAD</b>}
                        </small>
                      </div>
                    </button>
                  ))}
                  {save.team.length < 3 &&
                    Array.from({ length: 3 - save.team.length }, (_, i) => (
                      <div className="empty-slot" key={i}>
                        <span>+</span>
                        <p>A friend you haven’t met yet</p>
                      </div>
                    ))}
                </div>
                <button
                  className="text-button full"
                  onClick={() => setPanel("guide")}
                >
                  Meet your field guide <ChevronRight size={16} />
                </button>
              </section>
              <section className="trainers-card">
                <div className="section-heading">
                  <h2>
                    <Users size={17} /> Fellow explorers
                  </h2>
                  <span className="online-count">{active.length} online</span>
                </div>
                {active.length ? (
                  active.slice(0, 3).map((t) => (
                    <div className="trainer-row" key={t.id}>
                      <span className="avatar small">{t.name.slice(0, 1)}</span>
                      <div>
                        <strong>{t.name}</strong>
                        <small>
                          {REGIONS[regionAt(t.x, t.y)]} · {t.caught} species
                        </small>
                      </div>
                      <span className="live-dot" />
                    </div>
                  ))
                ) : (
                  <div className="empty-online">
                    <div className="tiny-people">♧ ♧ ♧</div>
                    <p>
                      {cloudEnabled
                        ? "The trail is quiet for now."
                        : "Adventure is better together."}
                    </p>
                    <small>
                      {cloudEnabled
                        ? "Other active trainers will appear here."
                        : "Connect Firebase to see fellow explorers."}
                    </small>
                  </div>
                )}
                <div className="community-note">
                  <span className="live-dot" /> A shared world, at your own
                  pace.
                </div>
              </section>
              <div className="journey-stats">
                <div>
                  <strong>
                    {save.caught.length}
                    <span> / 8</span>
                  </strong>
                  <small>SPECIES FOUND</small>
                </div>
                <div>
                  <strong>
                    {save.visited.length}
                    <span> / 25</span>
                  </strong>
                  <small>PLACES VISITED</small>
                </div>
              </div>
            </aside>
          </div>
          <footer>
            <span>
              <Leaf size={14} /> Made for the joy of discovery.
            </span>
            <span role="status">{notice}</span>
            <button aria-label="Settings" onClick={() => setPanel("settings")}>
              <Settings size={16} />
            </button>
          </footer>
        </main>
      </div>
      {panel && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setPanel(null);
            setTab("explore");
          }}
        >
          <section
            className={`modal ${panel === "guide" ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              panel === "map"
                ? "World map"
                : panel === "guide"
                  ? "Field guide"
                  : panel === "bag"
                    ? "Your bag"
                    : "Settings"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => {
                setPanel(null);
                setTab("explore");
              }}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="eyebrow">YOUR ADVENTURE, YOUR PACE</div>
            <h2>
              {panel === "map"
                ? "The Solara region"
                : panel === "guide"
                  ? "A field guide to new friends"
                  : panel === "bag"
                    ? "A few things for the road"
                    : "Hello, explorer."}
            </h2>
            {panel === "map" && (
              <>
                <p>
                  10 towns. 15 wild routes. One connected world. Follow the
                  crossing paths to travel.
                </p>
                <div className="region-grid">
                  {REGIONS.map((name, i) => (
                    <div
                      key={name}
                      className={`${TOWNS.has(i) ? "town" : ""} ${i === region ? "current" : ""}`}
                    >
                      <span>
                        {i === region ? (
                          <Crosshair size={18} />
                        ) : TOWNS.has(i) ? (
                          "⌂"
                        ) : (
                          "♧"
                        )}
                      </span>
                      <strong>{name}</strong>
                      <small>
                        {save.visited.includes(i) ? "Explored" : "Undiscovered"}
                      </small>
                    </div>
                  ))}
                </div>
                <p className="muted">
                  You are in {REGIONS[region]}. The region spans 160 × 120
                  tiles, with connected paths, grasslands, water, and towns.
                </p>
              </>
            )}
            {panel === "guide" && (
              <>
                <p>
                  {save.caught.length} of 8 species discovered. Select a
                  companion below to make it your lead.
                </p>
                <div className="dex-grid">
                  {SPECIES.map((s, i) => (
                    <article
                      key={s.name}
                      className={save.caught.includes(i) ? "" : "undiscovered"}
                    >
                      <span className="dex-number">Nº 00{i + 1}</span>
                      <Sprite species={i} size={100} />
                      <h3>{s.name}</h3>
                      <Type species={i} />
                      <p>{s.description}</p>
                      <small>
                        {save.caught.includes(i)
                          ? "✓ Discovered"
                          : "Not yet discovered"}
                      </small>
                    </article>
                  ))}
                </div>
                <div className="reserve-list">
                  {save.team.map((m) => (
                    <button
                      key={m.id}
                      disabled={!!battle}
                      onClick={() => {
                        setSave({
                          ...save,
                          team: [m, ...save.team.filter((v) => v.id !== m.id)],
                        });
                        setNotice(`${SPECIES[m.species].name} is leading.`);
                      }}
                    >
                      {SPECIES[m.species].name} · Lv. {m.level} · {m.xp}/
                      {m.level * 20} XP {m.id === lead.id ? "★" : ""}
                    </button>
                  ))}
                </div>
              </>
            )}
            {panel === "bag" && (
              <>
                <p>
                  You have <strong>{save.coins} coins</strong>. Earn more by
                  winning encounters.
                </p>
                <div className="shop-item">
                  <div>
                    <h3>
                      Capture orbs <span>×{save.orbs}</span>
                    </h3>
                    <p>A little home for a new friend.</p>
                  </div>
                  <button
                    onClick={() => buy("orbs")}
                    disabled={save.coins < 30}
                  >
                    5 for 30 coins
                  </button>
                </div>
                <div className="shop-item">
                  <div>
                    <h3>
                      Healing potions <span>×{save.potions}</span>
                    </h3>
                    <p>Restore 35 HP during an encounter.</p>
                  </div>
                  <button
                    onClick={() => buy("potions")}
                    disabled={save.coins < 20}
                  >
                    1 for 20 coins
                  </button>
                </div>
                <p className="muted">
                  Town keepers heal your entire team for free. Find one beside a
                  town’s main path.
                </p>
              </>
            )}
            {panel === "settings" && (
              <>
                <label className="name-label">
                  Trainer name
                  <input
                    maxLength={24}
                    value={save.name}
                    onChange={(e) => setSave({ ...save, name: e.target.value })}
                  />
                </label>
                <p>
                  Your adventure saves automatically in this browser
                  {account
                    ? " and syncs to your Firebase account when connected."
                    : cloudEnabled
                      ? ". Sign in to enable cloud saves and other trainers."
                      : ". Configure Firebase to enable cloud saves and other trainers."}
                </p>
                <p className="muted">{cloud}</p>
                <AccountPanel
                  account={account}
                  beforeChange={() => {
                    if (stateRef.current)
                      localStorage.setItem(
                        storageKey,
                        JSON.stringify(stateRef.current),
                      );
                  }}
                />
              </>
            )}
          </section>
        </div>
      )}
      {dialogue && (
        <div
          className="dialogue"
          role="dialog"
          aria-modal="true"
          aria-label="NPC dialogue"
        >
          <div className="dialogue-portrait">♧</div>
          <div>
            <div className="eyebrow">{dialogue.name}</div>
            <p>{dialogue.lines[dialogue.index]}</p>
          </div>
          <button
            onClick={() =>
              dialogue.index + 1 < dialogue.lines.length
                ? setDialogue({ ...dialogue, index: dialogue.index + 1 })
                : setDialogue(null)
            }
          >
            {dialogue.index + 1 < dialogue.lines.length ? "Next" : "See you"}{" "}
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      {battle && (
        <div className="modal-backdrop">
          <section
            className="modal battle-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Wild encounter"
          >
            <div className="eyebrow">A CHANCE ENCOUNTER</div>
            <div className="battle-info">
              <h2>
                {SPECIES[battle.monster.species].name}{" "}
                <span>Lv. {battle.monster.level}</span>
              </h2>
              <Type species={battle.monster.species} />
              <div className="hp-track">
                <span
                  style={{
                    width: `${(battle.monster.hp / maxHp(battle.monster)) * 100}%`,
                  }}
                />
              </div>
              <small>
                {battle.monster.hp} / {maxHp(battle.monster)} HP
              </small>
            </div>
            <div className="battle-scene">
              <div className="ally">
                <Sprite species={lead.species} size={145} />
                <span>
                  {SPECIES[lead.species].name} · Lv. {lead.level}
                </span>
                <small>
                  {lead.hp} / {maxHp(lead)} HP
                </small>
              </div>
              <div className="wild">
                <Sprite species={battle.monster.species} size={165} />
              </div>
            </div>
            <p className="battle-message" role="status">
              {battle.message}
            </p>
            {battle.done ? (
              <button
                className="primary-button full"
                onClick={() => setBattle(null)}
              >
                Keep exploring <ArrowRight size={17} />
              </button>
            ) : (
              <div className="battle-actions">
                <button
                  className="primary-button"
                  onClick={() => action("attack")}
                >
                  <Swords size={17} /> Attack
                </button>
                <button onClick={() => action("catch")} disabled={!save.orbs}>
                  ◉ Catch · {save.orbs}
                </button>
                <button onClick={() => action("heal")} disabled={!save.potions}>
                  <Heart size={17} /> Potion · {save.potions}
                </button>
                <button onClick={() => action("run")}>
                  Run away <ArrowRight size={17} />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

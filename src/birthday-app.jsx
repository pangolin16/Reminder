import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db, configured } from "./firebase";

const COLLECTION = "contacts";

const EMOJIS = [
  "👤",
  "👩",
  "🧑",
  "👦",
  "👧",
  "🧓",
  "👴",
  "👵",
  "🧑‍💻",
  "🧑‍🎨",
  "🧑‍🍳",
  "🐶",
  "🐱",
  "🌟",
];

// Type config — single source of truth for birthday vs nameday styling/copy
const TYPE = {
  birthday: {
    label: "Birthday",
    emoji: "🎂",
    icon: "🎂",
    color: "#ff922b",
    colorLight: "rgba(255,146,43,0.25)",
    colorBorder: "rgba(255,146,43,0.4)",
    gradient: "linear-gradient(135deg, #ff6b6b, #ff922b)",
    gradientBg:
      "linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,146,43,0.2))",
    todayLabel: "🎉 Today's Birthdays",
    notifTitle: (name) => `🎂 Happy Birthday, ${name}!`,
    notifBody: (name) => `Don't forget to wish ${name} a happy birthday today!`,
    turningText: (age) => `Turning ${age} today!`,
    cardSuffix: (age) => (age ? ` · turning ${age + 1}` : ""),
  },
  nameday: {
    label: "Nameday",
    emoji: "🌸",
    icon: "🌸",
    color: "#cc5de8",
    colorLight: "rgba(204,93,232,0.2)",
    colorBorder: "rgba(204,93,232,0.35)",
    gradient: "linear-gradient(135deg, #cc5de8, #7950f2)",
    gradientBg:
      "linear-gradient(135deg, rgba(204,93,232,0.18), rgba(121,80,242,0.18))",
    todayLabel: "🌸 Today's Namedays",
    notifTitle: (name) => `🌸 Happy Nameday, ${name}!`,
    notifBody: (name) => `Don't forget to wish ${name} a happy nameday today!`,
    turningText: () => "Nameday today!",
    cardSuffix: () => "",
  },
};

function getDaysUntil(dateStr) {
  const today = new Date();
  const [, month, day] = dateStr.split("-").map(Number);
  const next = new Date(today.getFullYear(), month - 1, day);
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  return Math.round(
    (next - new Date(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000
  );
}

function formatDate(str) {
  const [, month, day] = str.split("-").map(Number);
  return new Date(2000, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function getAge(dateStr) {
  const [year] = dateStr.split("-").map(Number);
  if (year < 1900) return null;
  return new Date().getFullYear() - year;
}

// ── Confetti ────────────────────────────────────────────────
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 24 }, (_, i) => i);
  const colors = [
    "#ff6b6b",
    "#ffd93d",
    "#6bcb77",
    "#4d96ff",
    "#ff922b",
    "#cc5de8",
  ];
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      {pieces.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${Math.random() * 100}%`,
            top: "-10px",
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            background: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `fall ${1.5 + Math.random() * 2}s ease-in ${
              Math.random() * 0.8
            }s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ── Setup screen ─────────────────────────────────────────────
function SetupScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: "#fff",
        maxWidth: 430,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 28px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔥</div>
      <h1
        style={{
          margin: "0 0 10px",
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        Firebase not configured
      </h1>
      <p
        style={{
          margin: "0 0 32px",
          fontSize: 14,
          color: "rgba(255,255,255,0.55)",
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Open{" "}
        <code
          style={{
            background: "rgba(255,255,255,0.1)",
            padding: "2px 7px",
            borderRadius: 6,
          }}
        >
          src/firebase.js
        </code>{" "}
        and replace the placeholder values with your real Firebase project
        credentials.
      </p>
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {[
          [
            "1",
            "Go to",
            "console.firebase.google.com",
            "https://console.firebase.google.com",
          ],
          ["2", "Create a project → Add app →", "Web (</>)", null],
          ["3", "Copy the", "firebaseConfig object", null],
          ["4", "Paste values into", "src/firebase.js", null],
          ["5", "Firestore Database →", "Create database (test mode)", null],
        ].map(([num, pre, bold, href]) => (
          <div
            key={num}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "14px 16px",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#ff6b6b,#ff922b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {num}
            </span>
            <span
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {pre}{" "}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#ff922b",
                    textDecoration: "none",
                    fontWeight: "bold",
                  }}
                >
                  {bold}
                </a>
              ) : (
                <strong style={{ color: "#fff" }}>{bold}</strong>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function BirthdayApp() {
  if (!configured) return <SetupScreen />;

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("connecting");
  const [notifStatus, setNotifStatus] = useState("default");
  const [showAdd, setShowAdd] = useState(false);
  const [showData, setShowData] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [form, setForm] = useState({
    name: "",
    date: "",
    emoji: "👤",
    type: "birthday",
  });
  const [tab, setTab] = useState("upcoming"); // upcoming | all | birthdays | namedays
  const [toastMsg, setToastMsg] = useState("");
  const importRef = useRef(null);

  useEffect(() => {
    if ("Notification" in window) setNotifStatus(Notification.permission);
  }, []);

  useEffect(() => {
    setSyncStatus("connecting");
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setContacts(
          snapshot.docs.map((d) => ({ firestoreId: d.id, ...d.data() }))
        );
        setLoading(false);
        setSyncStatus("live");
      },
      (err) => {
        console.error(err);
        setLoading(false);
        setSyncStatus("error");
        showToast("⚠️ Sync error — check Firebase config");
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (contacts.some((c) => getDaysUntil(c.date) === 0)) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 4000);
    }
  }, [loading]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Silent auto-notification (no confetti, no toast — fired by the scheduler)
  const autoNotify = useCallback((contact) => {
    if (Notification.permission !== "granted") return;
    const t = TYPE[contact.type ?? "birthday"];
    new Notification(t.notifTitle(contact.name), {
      body: t.notifBody(contact.name),
      icon: "https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f382.png",
      tag: `auto-${contact.firestoreId || contact.name}`,
    });
  }, []);

  // ── Auto-notification scheduling ──────────────────────────
  // Layer 1: Service Worker  → fires at 6 AM even when app is closed/background
  // Layer 2: In-app timer    → fires at 6 AM while the tab is open
  // Layer 3: On-load catch-up → app opened after 6 AM, not yet notified today
  useEffect(() => {
    if (loading || notifStatus !== "granted") return;

    const NOTIFIED_KEY = "auto_notified_date";

    // Compute derived list here (normalised may not be in scope yet)
    const norm = contacts.map((c) => ({
      ...c,
      date: c.date ?? c.birthday,
      type: c.type ?? "birthday",
    }));

    // ── Register contacts with Service Worker ──
    async function registerWithSW() {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({
          type: "SCHEDULE_NOTIFICATIONS",
          contacts: norm,
        });
      } catch (e) {
        console.warn("SW scheduling:", e);
      }
    }
    registerWithSW();

    // ── SW tells us it just fired — record the date ──
    const onSWMessage = (e) => {
      if (e.data?.type === "NOTIFICATIONS_FIRED") {
        localStorage.setItem(NOTIFIED_KEY, e.data.date);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onSWMessage);

    // ── Catch-up: already past 6 AM and we haven't notified today ──
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    if (
      now.getHours() >= 6 &&
      localStorage.getItem(NOTIFIED_KEY) !== todayKey
    ) {
      const todayContacts = norm.filter((c) => getDaysUntil(c.date) === 0);
      if (todayContacts.length > 0) {
        setTimeout(() => {
          todayContacts.forEach((c) => autoNotify(c));
          localStorage.setItem(NOTIFIED_KEY, todayKey);
        }, 1500); // wait for app to finish rendering
      }
    }

    // ── In-app timer: fires at next 6 AM while tab stays open ──
    const next6AM = new Date();
    next6AM.setHours(6, 0, 0, 0);
    if (next6AM <= now) next6AM.setDate(next6AM.getDate() + 1);

    const timer = setTimeout(() => {
      const key = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(NOTIFIED_KEY) !== key) {
        const todayContacts = norm.filter((c) => getDaysUntil(c.date) === 0);
        todayContacts.forEach((c) => autoNotify(c));
        if (todayContacts.length > 0) localStorage.setItem(NOTIFIED_KEY, key);
      }
    }, next6AM - now);

    return () => {
      clearTimeout(timer);
      navigator.serviceWorker?.removeEventListener("message", onSWMessage);
    };
  }, [loading, notifStatus, contacts]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      showToast("Notifications not supported");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === "granted") showToast("🎉 Notifications enabled!");
  };

  const triggerNotification = useCallback(
    (contact) => {
      if (notifStatus !== "granted") {
        showToast("Enable notifications first!");
        return;
      }
      const t = TYPE[contact.type ?? "birthday"];
      new Notification(t.notifTitle(contact.name), {
        body: t.notifBody(contact.name),
        icon: "https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f382.png",
      });
      setConfetti(true);
      setTimeout(() => setConfetti(false), 4000);
      showToast(`Notification sent for ${contact.name}!`);
    },
    [notifStatus]
  );

  const addContact = async () => {
    if (!form.name.trim() || !form.date) {
      showToast("Please fill in name and date");
      return;
    }
    try {
      await addDoc(collection(db, COLLECTION), {
        name: form.name.trim(),
        date: form.date,
        emoji: form.emoji,
        type: form.type,
        createdAt: Date.now(),
      });
      setForm({ name: "", date: "", emoji: "👤", type: "birthday" });
      setShowAdd(false);
      const t = TYPE[form.type];
      showToast(`${form.name.trim()} added! ${t.emoji}`);
    } catch {
      showToast("❌ Failed to save — check connection");
    }
  };

  const removeContact = async (firestoreId) => {
    try {
      await deleteDoc(doc(db, COLLECTION, firestoreId));
    } catch {
      showToast("❌ Failed to delete");
    }
  };

  const exportData = () => {
    const exportable = contacts.map(({ firestoreId, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportable, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reminders-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📦 Data exported!");
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed)) throw new Error();
        let added = 0;
        for (const c of parsed) {
          const dateField = c.date ?? c.birthday; // support old format
          const dup = contacts.find(
            (x) => x.name === c.name && (x.date ?? x.birthday) === dateField
          );
          if (!dup) {
            await addDoc(collection(db, COLLECTION), {
              name: c.name,
              date: dateField,
              emoji: c.emoji ?? "👤",
              type: c.type ?? "birthday",
              createdAt: c.createdAt ?? Date.now(),
            });
            added++;
          }
        }
        showToast(`✅ Imported ${added} new contact${added !== 1 ? "s" : ""}!`);
      } catch {
        showToast("❌ Invalid file format");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const clearAllData = async () => {
    if (
      !window.confirm(
        "Delete ALL contacts from Firebase? This cannot be undone."
      )
    )
      return;
    try {
      const snapshot = await getDocs(collection(db, COLLECTION));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      showToast("🗑️ All contacts deleted");
    } catch {
      showToast("❌ Failed to clear data");
    }
  };

  // Derived lists — support legacy contacts that used "birthday" field
  const normalised = contacts.map((c) => ({
    ...c,
    date: c.date ?? c.birthday,
    type: c.type ?? "birthday",
  }));
  const sorted = [...normalised].sort(
    (a, b) => getDaysUntil(a.date) - getDaysUntil(b.date)
  );
  const todayAll = sorted.filter((c) => getDaysUntil(c.date) === 0);
  const todayBdays = todayAll.filter((c) => c.type === "birthday");
  const todayNames = todayAll.filter((c) => c.type === "nameday");
  const upcoming = sorted.filter((c) => getDaysUntil(c.date) > 0);
  const allAlpha = [...normalised].sort((a, b) => a.name.localeCompare(b.name));
  const onlyBdays = allAlpha.filter((c) => c.type === "birthday");
  const onlyNames = allAlpha.filter((c) => c.type === "nameday");

  const tabList = {
    upcoming,
    all: allAlpha,
    birthdays: onlyBdays,
    namedays: onlyNames,
  };
  const displayList = tabList[tab] ?? upcoming;

  const syncBadge = {
    connecting: {
      label: "CONNECTING",
      color: "#ffd93d",
      bg: "rgba(255,217,61,0.15)",
      border: "rgba(255,217,61,0.3)",
    },
    live: {
      label: "LIVE ●",
      color: "#6bcb77",
      bg: "rgba(107,203,119,0.15)",
      border: "rgba(107,203,119,0.3)",
    },
    error: {
      label: "ERROR",
      color: "#ff6b6b",
      bg: "rgba(255,107,107,0.15)",
      border: "rgba(255,107,107,0.3)",
    },
  }[syncStatus];

  const TABS = [
    ["upcoming", "Upcoming"],
    ["birthdays", "🎂 Bdays"],
    ["namedays", "🌸 Namedays"],
    ["all", "All"],
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: "#fff",
        maxWidth: 430,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes fall    { to { top: 110vh; transform: rotate(720deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop     { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes pulse   { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .card            { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; backdrop-filter: blur(10px); }
        .btn-primary     { background: linear-gradient(135deg, #ff6b6b, #ff922b); border: none; color: #fff; font-weight: bold; cursor: pointer; border-radius: 14px; font-size: 15px; transition: all 0.2s; }
        .btn-primary:hover { transform: scale(1.03); filter: brightness(1.1); }
        .btn-ghost       { background: transparent; border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); cursor: pointer; border-radius: 12px; font-size: 14px; transition: all 0.2s; }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .contact-card    { animation: slideUp 0.3s ease both; transition: all 0.2s; }
        .contact-card:hover { transform: translateY(-2px); }
        .tab             { border: none; cursor: pointer; border-radius: 20px; padding: 8px 6px; transition: all 0.2s; font-size: 13px; }
        .days-pill       { font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: bold; }
        .skeleton        { background: rgba(255,255,255,0.06); border-radius: 20px; animation: pulse 1.4s ease infinite; }
        .notif-banner    { display: flex; align-items: center; gap: 12px; background: rgba(255,146,43,0.12); border: 1px solid rgba(255,146,43,0.3); border-radius: 18px; padding: 14px 16px; }
        .type-toggle     { display: flex; background: rgba(255,255,255,0.06); border-radius: 14px; padding: 4px; gap: 4px; }
        .type-btn        { flex: 1; border: none; border-radius: 10px; padding: 10px 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; font-family: inherit; font-weight: bold; }
        input, select    { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: #fff; padding: 12px 14px; font-size: 15px; width: 100%; box-sizing: border-box; outline: none; }
        input:focus      { border-color: #ff922b; background: rgba(255,255,255,0.12); }
        input::placeholder { color: rgba(255,255,255,0.4); }
      `}</style>

      <Confetti active={confetti} />

      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,10,50,0.95)",
            border: "1px solid rgba(255,146,43,0.5)",
            borderRadius: 14,
            padding: "12px 22px",
            zIndex: 1000,
            fontSize: 14,
            whiteSpace: "nowrap",
            backdropFilter: "blur(10px)",
          }}
        >
          {toastMsg}
        </div>
      )}

      <input
        ref={importRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={importData}
      />

      {/* Header */}
      <div
        style={{
          padding: "48px 24px 24px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          className="btn-ghost"
          onClick={() => setShowData(true)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "6px 12px",
            fontSize: 18,
            borderRadius: 12,
          }}
        >
          ⚙️
        </button>
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 16,
            fontSize: 10,
            fontWeight: "bold",
            letterSpacing: "0.08em",
            background: syncBadge.bg,
            color: syncBadge.color,
            border: `1px solid ${syncBadge.border}`,
            borderRadius: 8,
            padding: "3px 9px",
          }}
        >
          {syncBadge.label}
        </div>
        <div
          style={{
            fontSize: 48,
            marginBottom: 8,
            filter: "drop-shadow(0 0 20px #ff922b88)",
          }}
        >
          🎂🌸
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: "normal",
            letterSpacing: "0.02em",
          }}
        >
          Special Day Reminders
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
          }}
        >
          {loading
            ? "Syncing with Firebase…"
            : `${contacts.length} contacts · ${
                contacts.filter((c) => (c.type ?? "birthday") === "birthday")
                  .length
              } 🎂 · ${contacts.filter((c) => c.type === "nameday").length} 🌸`}
        </p>
      </div>

      <div style={{ padding: "0 20px 100px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 80, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {!loading && (
          <>
            {notifStatus !== "granted" && (
              <div className="notif-banner" style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 22 }}>🔔</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      marginBottom: 2,
                    }}
                  >
                    Enable Notifications
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    Get alerts on birthdays & namedays
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                  onClick={requestNotifications}
                >
                  Enable
                </button>
              </div>
            )}

            {/* Today sections */}
            {[
              ["birthday", todayBdays],
              ["nameday", todayNames],
            ].map(([typeKey, list]) => {
              if (list.length === 0) return null;
              const t = TYPE[typeKey];
              return (
                <div
                  key={typeKey}
                  className="card"
                  style={{
                    padding: 20,
                    marginBottom: 16,
                    background: t.gradientBg,
                    borderColor: t.colorBorder,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: t.color,
                      fontWeight: "bold",
                      marginBottom: 12,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {t.todayLabel}
                  </div>
                  {list.map((c) => (
                    <div
                      key={c.firestoreId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom:
                          list.indexOf(c) < list.length - 1 ? 12 : 0,
                      }}
                    >
                      <span style={{ fontSize: 32 }}>{c.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", fontSize: 17 }}>
                          {c.name}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {typeKey === "birthday" && getAge(c.date)
                            ? t.turningText(getAge(c.date))
                            : t.turningText()}
                        </div>
                      </div>
                      <button
                        style={{
                          background: t.gradient,
                          border: "none",
                          color: "#fff",
                          fontWeight: "bold",
                          cursor: "pointer",
                          borderRadius: 12,
                          padding: "8px 14px",
                          fontSize: 13,
                        }}
                        onClick={() => triggerNotification(c)}
                      >
                        🔔 Notify
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 20,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 24,
                padding: 4,
              }}
            >
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  className="tab"
                  onClick={() => setTab(key)}
                  style={{
                    flex: 1,
                    background:
                      tab === key
                        ? "linear-gradient(135deg, #ff6b6b, #ff922b)"
                        : "transparent",
                    color: tab === key ? "#fff" : "rgba(255,255,255,0.5)",
                    fontWeight: tab === key ? "bold" : "normal",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Contact list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {displayList.map((c, i) => {
                const days = getDaysUntil(c.date);
                const age = c.type === "birthday" ? getAge(c.date) : null;
                const t = TYPE[c.type ?? "birthday"];
                return (
                  <div
                    key={c.firestoreId}
                    className="card contact-card"
                    style={{
                      padding: "16px 18px",
                      animationDelay: `${i * 0.05}s`,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <div style={{ position: "relative" }}>
                        <span style={{ fontSize: 36 }}>{c.emoji}</span>
                        {/* type badge on avatar */}
                        <span
                          style={{
                            position: "absolute",
                            bottom: -2,
                            right: -4,
                            fontSize: 14,
                          }}
                        >
                          {t.icon}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 3,
                          }}
                        >
                          <span style={{ fontWeight: "bold", fontSize: 16 }}>
                            {c.name}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: "bold",
                              letterSpacing: "0.06em",
                              background: t.colorLight,
                              color: t.color,
                              border: `1px solid ${t.colorBorder}`,
                              borderRadius: 6,
                              padding: "1px 7px",
                            }}
                          >
                            {t.label.toUpperCase()}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.55)",
                          }}
                        >
                          {formatDate(c.date)}
                          {t.cardSuffix(age)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 8,
                        }}
                      >
                        <span
                          className="days-pill"
                          style={{
                            background:
                              days <= 7
                                ? t.gradient
                                : days <= 30
                                ? t.colorLight
                                : "rgba(255,255,255,0.1)",
                            color:
                              days <= 7
                                ? "#fff"
                                : days <= 30
                                ? t.color
                                : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {days === 0
                            ? `Today! ${t.icon}`
                            : days === 1
                            ? "Tomorrow"
                            : `${days}d`}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn-ghost"
                            style={{ padding: "5px 10px", fontSize: 12 }}
                            onClick={() => triggerNotification(c)}
                          >
                            🔔
                          </button>
                          <button
                            className="btn-ghost"
                            style={{
                              padding: "5px 10px",
                              fontSize: 12,
                              color: "rgba(255,100,100,0.7)",
                              borderColor: "rgba(255,100,100,0.2)",
                            }}
                            onClick={() => removeContact(c.firestoreId)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {displayList.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "rgba(255,255,255,0.35)",
                    padding: "40px 0",
                    fontSize: 15,
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🎈</div>
                  No contacts here yet. Add someone below!
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Contact Sheet */}
      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowAdd(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              margin: "0 auto",
              background: "linear-gradient(135deg, #1f0d3a, #2d1b4e)",
              borderRadius: "24px 24px 0 0",
              padding: "28px 24px 48px",
              animation: "slideUp 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 2,
                margin: "0 auto 24px",
              }}
            />

            {/* Type toggle */}
            <div className="type-toggle" style={{ marginBottom: 20 }}>
              {["birthday", "nameday"].map((typeKey) => {
                const t = TYPE[typeKey];
                const active = form.type === typeKey;
                return (
                  <button
                    key={typeKey}
                    className="type-btn"
                    onClick={() => setForm((f) => ({ ...f, type: typeKey }))}
                    style={{
                      background: active ? t.gradient : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,0.45)",
                    }}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>

            <h2
              style={{ margin: "0 0 20px", fontSize: 20, fontWeight: "bold" }}
            >
              Add {TYPE[form.type].label} {TYPE[form.type].emoji}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Name
                </label>
                <input
                  placeholder="e.g. Sarah"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {form.type === "birthday" ? "Birthday" : "Nameday"} Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Avatar
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                      style={{
                        width: 44,
                        height: 44,
                        fontSize: 22,
                        border: "2px solid",
                        borderColor:
                          form.emoji === e
                            ? TYPE[form.type].color
                            : "transparent",
                        background:
                          form.emoji === e
                            ? TYPE[form.type].colorLight
                            : "rgba(255,255,255,0.05)",
                        borderRadius: 12,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <button
                style={{
                  background: TYPE[form.type].gradient,
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                  borderRadius: 14,
                  padding: "16px",
                  marginTop: 8,
                  fontSize: 16,
                  transition: "all 0.2s",
                }}
                onClick={addContact}
              >
                Add {TYPE[form.type].label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className="btn-primary"
        onClick={() => setShowAdd(true)}
        style={{
          position: "fixed",
          bottom: 32,
          right: 24,
          width: 62,
          height: 62,
          borderRadius: "50%",
          fontSize: 28,
          boxShadow: "0 8px 30px rgba(255,107,107,0.5)",
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>

      {/* Data Sheet */}
      {showData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setShowData(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              margin: "0 auto",
              background: "linear-gradient(135deg, #1f0d3a, #2d1b4e)",
              borderRadius: "24px 24px 0 0",
              padding: "28px 24px 48px",
              animation: "slideUp 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 2,
                margin: "0 auto 24px",
              }}
            />
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: "bold" }}>
              Data & Sync ⚙️
            </h2>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.5,
              }}
            >
              Contacts are stored in Firebase — changes sync instantly across
              all your devices.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                className="card"
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>🔥</span>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      marginBottom: 2,
                    }}
                  >
                    Firebase Firestore
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    {contacts.length} contacts ·{" "}
                    {
                      contacts.filter(
                        (c) => (c.type ?? "birthday") === "birthday"
                      ).length
                    }{" "}
                    🎂 · {contacts.filter((c) => c.type === "nameday").length}{" "}
                    🌸
                  </div>
                </div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    fontWeight: "bold",
                    background: syncBadge.bg,
                    color: syncBadge.color,
                    border: `1px solid ${syncBadge.border}`,
                    borderRadius: 8,
                    padding: "3px 10px",
                  }}
                >
                  {syncBadge.label}
                </span>
              </div>

              {/* Auto-notification info */}
              <div
                className="card"
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>⏰</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      marginBottom: 2,
                    }}
                  >
                    Auto Notifications
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    {notifStatus === "granted"
                      ? "Fires at 6:00 AM on each event day"
                      : "Enable notifications to activate"}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    background:
                      notifStatus === "granted"
                        ? "rgba(107,203,119,0.15)"
                        : "rgba(255,217,61,0.15)",
                    color: notifStatus === "granted" ? "#6bcb77" : "#ffd93d",
                    border: `1px solid ${
                      notifStatus === "granted"
                        ? "rgba(107,203,119,0.3)"
                        : "rgba(255,217,61,0.3)"
                    }`,
                    borderRadius: 8,
                    padding: "3px 10px",
                  }}
                >
                  {notifStatus === "granted" ? "ON" : "OFF"}
                </span>
              </div>

              {/* Test button — fires notifications immediately */}
              {notifStatus === "granted" && (
                <button
                  className="btn-ghost"
                  style={{
                    padding: "14px 16px",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                  onClick={async () => {
                    setShowData(false);
                    // Reset the "notified today" flag so the test can re-fire
                    localStorage.removeItem("auto_notified_date");
                    // Ask SW to fire immediately
                    try {
                      const reg = await navigator.serviceWorker?.ready;
                      reg?.active?.postMessage({ type: "FIRE_NOW" });
                    } catch {}
                    // Also fire in-app for good measure
                    const norm = contacts.map((c) => ({
                      ...c,
                      date: c.date ?? c.birthday,
                      type: c.type ?? "birthday",
                    }));
                    const todayContacts = norm.filter(
                      (c) => getDaysUntil(c.date) === 0
                    );
                    if (todayContacts.length === 0) {
                      showToast("No birthdays or namedays today to test with");
                    } else {
                      todayContacts.forEach((c) => autoNotify(c));
                      showToast(
                        `🔔 Sent ${todayContacts.length} test notification${
                          todayContacts.length !== 1 ? "s" : ""
                        }!`
                      );
                    }
                  }}
                >
                  <span style={{ fontSize: 18 }}>🧪</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "bold" }}>
                      Test Today's Notifications
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.45)",
                        marginTop: 1,
                      }}
                    >
                      Fire immediately for contacts due today
                    </div>
                  </div>
                </button>
              )}
              <button
                className="btn-ghost"
                style={{
                  padding: "16px",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onClick={() => {
                  exportData();
                  setShowData(false);
                }}
              >
                <span style={{ fontSize: 20 }}>📤</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "bold" }}>Export to JSON</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.45)",
                      marginTop: 1,
                    }}
                  >
                    Download a local backup
                  </div>
                </div>
              </button>
              <button
                className="btn-ghost"
                style={{
                  padding: "16px",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onClick={() => {
                  importRef.current?.click();
                  setShowData(false);
                }}
              >
                <span style={{ fontSize: 20 }}>📥</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: "bold" }}>Import from JSON</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.45)",
                      marginTop: 1,
                    }}
                  >
                    Merge contacts from a backup
                  </div>
                </div>
              </button>
              <div
                style={{
                  borderTop: "1px solid rgba(255,100,100,0.2)",
                  paddingTop: 12,
                  marginTop: 4,
                }}
              >
                <button
                  className="btn-ghost"
                  style={{
                    padding: "14px 16px",
                    fontSize: 14,
                    width: "100%",
                    color: "rgba(255,100,100,0.7)",
                    borderColor: "rgba(255,100,100,0.25)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                  onClick={() => {
                    clearAllData();
                    setShowData(false);
                  }}
                >
                  <span style={{ fontSize: 18 }}>🗑️</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "bold" }}>Clear All Data</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,100,100,0.45)",
                        marginTop: 1,
                      }}
                    >
                      Delete all contacts from Firebase
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

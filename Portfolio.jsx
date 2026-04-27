import { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useLang } from "./useLang";

const TYPES_META = {
  "акції": { emoji: "📈", ua: "Акції", en: "Stocks" },
  "крипто": { emoji: "₿", ua: "Крипто", en: "Crypto" },
  "депозит": { emoji: "🏦", ua: "Депозит", en: "Deposit" },
  "нерухомість": { emoji: "🏠", ua: "Нерухомість", en: "Real Estate" },
  "готівка": { emoji: "💵", ua: "Готівка", en: "Cash" },
  "інше": { emoji: "🪙", ua: "Інше", en: "Other" },
};

const TYPES = Object.keys(TYPES_META).map((value) => ({ value }));

export default function Portfolio({ user }) {
  const { lang } = useLang();
  const [assets, setAssets] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("акції");
  const [invested, setInvested] = useState("");
  const [current, setCurrent] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");

  const getTypeLabel = (value) => {
    const meta = TYPES_META[value];
    if (!meta) return value;
    return `${meta.emoji} ${lang === "en" ? meta.en : meta.ua}`;
  };

  useEffect(() => {
    if (!user) return undefined;

    const portfolioQuery = query(collection(db, "portfolio"), where("userId", "==", user.uid));

    const unsub = onSnapshot(portfolioQuery, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAssets(data);
    });

    return () => unsub();
  }, [user]);

  const addAsset = async () => {
    if (!user || !name.trim() || !invested) return;

    await addDoc(collection(db, "portfolio"), {
      name: name.trim(),
      type,
      invested: Number(invested),
      current: Number(current) || Number(invested),
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setName("");
    setInvested("");
    setCurrent("");
    setAdding(false);
  };

  const updateCurrent = async (id) => {
    if (!user || !editVal) return;
    await updateDoc(doc(db, "portfolio", id), { current: Number(editVal) });
    setEditing(null);
    setEditVal("");
  };

  const deleteAsset = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "portfolio", id));
  };

  const totalInvested = assets.reduce((sum, asset) => sum + asset.invested, 0);
  const totalCurrent = assets.reduce((sum, asset) => sum + asset.current, 0);
  const totalProfit = totalCurrent - totalInvested;
  const totalPct = totalInvested ? ((totalProfit / totalInvested) * 100).toFixed(1) : 0;

  const getProfit = (asset) => asset.current - asset.invested;
  const getPct = (asset) =>
    asset.invested ? (((asset.current - asset.invested) / asset.invested) * 100).toFixed(1) : 0;

  const byType = TYPES
    .map((t) => ({
      ...t,
      total: assets.filter((asset) => asset.type === t.value).reduce((sum, asset) => sum + asset.current, 0),
    }))
    .filter((t) => t.total > 0);

  if (!user) {
    return (
      <div className="container">
        <h1>{lang === "en" ? "📊 Portfolio" : "📊 Портфель"}</h1>
        <div className="card">
          <p>{lang === "en" ? "Sign in with Google to manage your portfolio." : "Увійдіть через Google, щоб керувати власним портфелем."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>{lang === "en" ? "📊 Portfolio" : "📊 Портфель"}</h1>

      <div className="dash-grid">
        <div className="dash-card blue">
          <p className="dash-label">{lang === "en" ? "💵 Invested" : "💵 Вкладено"}</p>
          <h2>₴{totalInvested.toLocaleString()}</h2>
        </div>
        <div className="dash-card">
          <p className="dash-label">{lang === "en" ? "📈 Current value" : "📈 Поточна вартість"}</p>
          <h2>₴{totalCurrent.toLocaleString()}</h2>
        </div>
        <div className={`dash-card ${totalProfit >= 0 ? "" : "budget-over-card"}`}>
          <p className="dash-label">{lang === "en" ? "💹 Profit" : "💹 Приріст"}</p>
          <h2 style={{ color: totalProfit >= 0 ? "#22c55e" : "#ef4444" }}>
            {totalProfit >= 0 ? "+" : ""}₴{totalProfit.toLocaleString()}
          </h2>
          <p className="dash-sub">{totalPct}% {lang === "en" ? "of invested" : "від вкладеного"}</p>
        </div>
        <div className="dash-card">
          <p className="dash-label">{lang === "en" ? "🗂 Assets" : "🗂 Активів"}</p>
          <h2>{assets.length}</h2>
        </div>
      </div>

      {byType.length > 0 && totalCurrent > 0 && (
        <div className="card dash-section">
          <h3>{lang === "en" ? "📊 Portfolio distribution" : "📊 Розподіл портфеля"}</h3>
          {byType.map((typeItem) => {
            const pct = ((typeItem.total / totalCurrent) * 100).toFixed(1);
            return (
              <div key={typeItem.value} className="portfolio-type">
                <div className="dash-goal-info">
                  <span>{getTypeLabel(typeItem.value)}</span>
                  <span className="dash-pct">{pct}% · ₴{typeItem.total.toLocaleString()}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: "#3b82f6" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!adding && (
        <button className="add-goal-btn" onClick={() => setAdding(true)}>
          {lang === "en" ? "+ Add asset" : "+ Додати актив"}
        </button>
      )}

      {adding && (
        <div className="card goal-form">
          <h3>{lang === "en" ? "New asset" : "Новий актив"}</h3>
          <input
            placeholder={lang === "en" ? "Asset name" : "Назва активу"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="form" style={{ marginTop: 8 }}>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((typeItem) => (
                <option key={typeItem.value} value={typeItem.value}>
                  {getTypeLabel(typeItem.value)}
                </option>
              ))}
            </select>
          </div>
          <div className="form" style={{ marginTop: 8 }}>
            <input
              type="number"
              placeholder={lang === "en" ? "Invested (₴)" : "Вкладено (₴)"}
              value={invested}
              onChange={(e) => setInvested(e.target.value)}
            />
            <input
              type="number"
              placeholder={lang === "en" ? "Current value (₴)" : "Поточна вартість (₴)"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="form" style={{ marginTop: 10 }}>
            <button onClick={addAsset}>{lang === "en" ? "✓ Save" : "✓ Зберегти"}</button>
            <button className="cancel-btn" onClick={() => setAdding(false)}>
              {lang === "en" ? "Cancel" : "Скасувати"}
            </button>
          </div>
        </div>
      )}

      <div className="portfolio-list">
        {assets.length === 0 ? (
          <p className="empty">{lang === "en" ? "Add your first asset." : "Додайте перший актив."}</p>
        ) : (
          assets.map((asset) => {
            const profit = getProfit(asset);
            const pct = getPct(asset);
            const isPositive = profit >= 0;

            return (
              <div key={asset.id} className="portfolio-card">
                <div className="portfolio-header">
                  <span className="goal-cat">{getTypeLabel(asset.type)}</span>
                  <h3 className="portfolio-name">{asset.name}</h3>
                  <button className="del-btn" onClick={() => deleteAsset(asset.id)}>
                    ✕
                  </button>
                </div>

                <div className="portfolio-stats">
                  <div className="portfolio-stat">
                    <p className="dash-label">{lang === "en" ? "Invested" : "Вкладено"}</p>
                    <p>₴{asset.invested.toLocaleString()}</p>
                  </div>
                  <div className="portfolio-stat">
                    <p className="dash-label">{lang === "en" ? "Now" : "Зараз"}</p>
                    <p>₴{asset.current.toLocaleString()}</p>
                  </div>
                  <div className="portfolio-stat">
                    <p className="dash-label">{lang === "en" ? "Profit" : "Приріст"}</p>
                    <p style={{ color: isPositive ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                      {isPositive ? "+" : ""}₴{profit.toLocaleString()}
                    </p>
                  </div>
                  <div className="portfolio-stat">
                    <p className="dash-label">%</p>
                    <p style={{ color: isPositive ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                      {isPositive ? "+" : ""}{pct}%
                    </p>
                  </div>
                </div>

                {editing === asset.id ? (
                  <div className="form" style={{ marginTop: 10 }}>
                    <input
                      type="number"
                      placeholder={lang === "en" ? "New current value (₴)" : "Нова поточна вартість (₴)"}
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && updateCurrent(asset.id)}
                    />
                    <button onClick={() => updateCurrent(asset.id)}>✓</button>
                    <button className="cancel-btn" onClick={() => setEditing(null)}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    className="update-btn"
                    onClick={() => {
                      setEditing(asset.id);
                      setEditVal(String(asset.current));
                    }}
                  >
                    {lang === "en" ? "📈 Update value" : "📈 Оновити вартість"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


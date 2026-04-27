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

const CATEGORY_META = {
  "їжа": { emoji: "🍔", ua: "Їжа", en: "Food" },
  "транспорт": { emoji: "🚗", ua: "Транспорт", en: "Transport" },
  "житло": { emoji: "🏠", ua: "Житло", en: "Housing" },
  "здоров'я": { emoji: "💊", ua: "Здоров'я", en: "Health" },
  "розваги": { emoji: "🎮", ua: "Розваги", en: "Entertainment" },
  "одяг": { emoji: "👕", ua: "Одяг", en: "Clothes" },
  "навчання": { emoji: "📚", ua: "Навчання", en: "Education" },
  "комуналка": { emoji: "💡", ua: "Комуналка", en: "Utilities" },
  "інше": { emoji: "🛒", ua: "Інше", en: "Other" },
};

const CATEGORIES = Object.keys(CATEGORY_META).map((value) => ({ value }));

export default function Budget({ expenses, user }) {
  const { lang } = useLang();
  const [budgets, setBudgets] = useState([]);
  const [cat, setCat] = useState("їжа");
  const [limit, setLimit] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const getCatLabel = (value) => {
    const meta = CATEGORY_META[value];
    if (!meta) return value;
    return `${meta.emoji} ${lang === "en" ? meta.en : meta.ua}`;
  };

  useEffect(() => {
    if (!user) return undefined;

    const q = query(
      collection(db, "budgets"),
      where("userId", "==", user.uid),
    );

    const unsub = onSnapshot(q, (snap) => {
      setBudgets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user]);

  const addBudget = async () => {
    if (!limit || !user) return;

    const existing = budgets.find((b) => b.cat === cat && b.month === month);

    if (existing) {
      await updateDoc(doc(db, "budgets", existing.id), {
        limit: Number(limit),
      });
    } else {
      await addDoc(collection(db, "budgets"), {
        cat,
        limit: Number(limit),
        month,
        userId: user.uid,
      });
    }

    setLimit("");
  };

  const deleteBudget = async (id) => {
    await deleteDoc(doc(db, "budgets", id));
  };

  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.createdAt);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return m === month;
  });

  const spentByCategory = (catVal) =>
    monthExpenses
      .filter((e) => e.cat === catVal)
      .reduce((s, e) => s + e.amt, 0);

  const totalLimit = budgets
    .filter((b) => b.month === month)
    .reduce((s, b) => s + b.limit, 0);

  const totalSpent = monthExpenses.reduce((s, e) => s + e.amt, 0);
  const monthBudgets = budgets.filter((b) => b.month === month);

  return (
    <div className="container">
      <h1>{lang === "en" ? "💰 Budget" : "💰 Бюджет"}</h1>

      <div className="card form">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <span className="date-label">
          {new Date(`${month}-01`).toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {totalLimit > 0 && (
        <div className="card progress-wrap">
          <div className="progress-info">
            <span>₴{totalSpent}</span>
            <span>{lang === "en" ? "of" : "з"} ₴{totalLimit}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="card form">
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {getCatLabel(c.value)}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder={lang === "en" ? "Limit (₴)" : "Ліміт (₴)"}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />

        <button onClick={addBudget}>{lang === "en" ? "+ Set" : "+ Встановити"}</button>
      </div>

      <div className="budget-list">
        {monthBudgets.map((b) => {
          const spent = spentByCategory(b.cat);
          const pct = Math.min((spent / b.limit) * 100, 100);

          return (
            <div key={b.id} className="budget-card">
              <span>{getCatLabel(b.cat)}</span>
              <span>₴{spent} / ₴{b.limit}</span>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>

              <button onClick={() => deleteBudget(b.id)}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


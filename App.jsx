import { useEffect, useState } from "react";
import "./App.css";
import Chart from "./Chart";
import Journal from "./Journal";
import CalendarView from "./Calendar";
import Budget from "./Budget";
import Portfolio from "./Portfolio";
import Dashboard from "./Dashboard";
import TradingJournal from "./TradingJournal";
import Planner from "./Planner";
import { db } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Auth from "./Auth";
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

const TABS = [
  { id: "дашборд", labelKey: "tabDashboard" },
  { id: "портфель", labelKey: "tabPortfolio" },
  { id: "витрати", labelKey: "tabExpenses" },
  { id: "трейд", labelKey: "tabTradingJournal" },
  { id: "планер", labelKey: "tabPlanner" },
  { id: "записник", labelKey: "tabJournal" },
];

export default function App() {
  const { lang, setLang, t } = useLang();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("витрати");
  const [expenses, setExpenses] = useState([]);
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [cat, setCat] = useState("їжа");
  const [income, setIncome] = useState(0);
  const [incomeInput, setIncomeInput] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const getCatLabel = (value) => {
    const meta = CATEGORY_META[value];
    if (!meta) return value;
    return `${meta.emoji} ${lang === "en" ? meta.en : meta.ua}`;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const expensesQuery = query(
      collection(db, "expenses"),
      where("userId", "==", user.uid),
    );

    const unsub = onSnapshot(expensesQuery, (snapshot) => {
      const data = snapshot.docs.map((expenseDoc) => ({
        id: expenseDoc.id,
        ...expenseDoc.data(),
      }));

      data.sort((a, b) => b.createdAt - a.createdAt);
      setExpenses(data);
    });

    return () => unsub();
  }, [user]);

  const scopedExpenses = user ? expenses : [];

  const addIncome = () => {
    if (!incomeInput) return;
    setIncome((prev) => prev + Number(incomeInput));
    setIncomeInput("");
  };

  const addExpense = async () => {
    if (!user || !desc.trim() || !amt) return;

    await addDoc(collection(db, "expenses"), {
      desc: desc.trim(),
      amt: Number(amt),
      cat,
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setDesc("");
    setAmt("");
  };

  const deleteExpense = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "expenses", id));
  };

  const filtered = filterCat === "all"
    ? scopedExpenses
    : scopedExpenses.filter((expense) => expense.cat === filterCat);

  const total = scopedExpenses.reduce((sum, expense) => sum + expense.amt, 0);
  const filteredTotal = filtered.reduce((sum, expense) => sum + expense.amt, 0);
  const balance = income - total;

  return (
    <div className="container app-shell">
      <div className="lang-switch lang-switch-floating">
        <button
          type="button"
          className={lang === "ua" ? "lang-btn active" : "lang-btn"}
          onClick={() => setLang("ua")}
        >
          {t("langUa")}
        </button>
        <button
          type="button"
          className={lang === "en" ? "lang-btn active" : "lang-btn"}
          onClick={() => setLang("en")}
        >
          {t("langEn")}
        </button>
      </div>

      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <img className="brand-logo" src="/logo.png" alt="TEA XYZ logo" />
            <div className="brand-copy">
              <p className="brand-kicker">TEA XYZ</p>
              <h2 className="brand-title">{t("appName")}</h2>
            </div>
          </div>

          <Auth user={user} />
        </div>

        <nav className="tabs">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              className={tab === tabItem.id ? "tab active" : "tab"}
              onClick={() => setTab(tabItem.id)}
            >
              {t(tabItem.labelKey)}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        {tab === "дашборд" && <Dashboard expenses={scopedExpenses} income={income} user={user} />}
        {tab === "портфель" && <Portfolio user={user} />}
        {tab === "трейд" && <TradingJournal user={user} />}
        {tab === "планер" && <Planner user={user} />}
        {tab === "записник" && <Journal user={user} />}

        {tab === "витрати" && (
          <>
            <h1>{t("expensesTitle")}</h1>

            {!user ? (
              <div className="card">
                <p>{t("expensesLoginHint")}</p>
              </div>
            ) : (
              <>
                <div className="card form">
                  <input
                    placeholder={t("addIncomePlaceholder")}
                    value={incomeInput}
                    onChange={(e) => setIncomeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addIncome()}
                  />
                  <button onClick={addIncome}>{t("addIncome")}</button>
                </div>

                <div className="top">
                  <div className="card stat green">
                    <p>{t("income")}</p>
                    <h2>₴{income}</h2>
                  </div>
                  <div className="card stat">
                    <p>{t("balance")}</p>
                    <h2 style={{ color: balance < 0 ? "#ef4444" : "#22c55e" }}>
                      ₴{balance}
                    </h2>
                  </div>
                  <div className="card stat red">
                    <p>{t("expenses")}</p>
                    <h2>₴{total}</h2>
                  </div>
                </div>

                <div className="card form">
                  <input
                    placeholder={t("description")}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addExpense()}
                  />
                  <input
                    type="number"
                    placeholder={t("amount")}
                    value={amt}
                    onChange={(e) => setAmt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addExpense()}
                  />
                  <select value={cat} onChange={(e) => setCat(e.target.value)}>
                    {CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {getCatLabel(category.value)}
                      </option>
                    ))}
                  </select>
                  <button onClick={addExpense}>{t("addExpense")}</button>
                </div>

                <div className="filters">
                  <button
                    className={filterCat === "all" ? "filter-btn active" : "filter-btn"}
                    onClick={() => setFilterCat("all")}
                  >
                    {t("all")}
                  </button>
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      className={filterCat === category.value ? "filter-btn active" : "filter-btn"}
                      onClick={() => setFilterCat(category.value)}
                    >
                      {getCatLabel(category.value)}
                    </button>
                  ))}
                </div>

                <div className="card list">
                  {filtered.length === 0 ? (
                    <p className="empty">{t("noExpensesInCategory")}</p>
                  ) : (
                    <>
                      <div className="list-header">
                        <span>{filtered.length} {t("records")}</span>
                        <span>{t("total")}: ₴{filteredTotal}</span>
                      </div>
                      {filtered.map((expense) => (
                        <div key={expense.id} className="item">
                          <span className="item-cat">{getCatLabel(expense.cat)}</span>
                          <span className="item-desc">{expense.desc}</span>
                          <span className="item-amt">₴{expense.amt}</span>
                          <button className="del-btn" onClick={() => deleteExpense(expense.id)}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                <Budget expenses={scopedExpenses} user={user} />
                <Chart expenses={scopedExpenses} getCatLabel={getCatLabel} />
                <CalendarView expenses={scopedExpenses} getCatLabel={getCatLabel} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}


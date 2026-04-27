import { useState, useEffect } from "react";
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
  "фінанси": { label: "💰", ua: "Фінанси", en: "Finance" },
  "здоров'я": { label: "💪", ua: "Здоров'я", en: "Health" },
  "навчання": { label: "📚", ua: "Навчання", en: "Learning" },
  "кар'єра": { label: "🚀", ua: "Кар'єра", en: "Career" },
  "особистість": { label: "🧠", ua: "Особистість", en: "Personal" },
  "інше": { label: "🎯", ua: "Інше", en: "Other" },
};

const CATEGORIES = Object.keys(CATEGORY_META).map((value) => ({ value }));

export default function Goals({ user }) {
  const { lang } = useLang();
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [cat, setCat] = useState("фінанси");
  const [unit, setUnit] = useState("₴");
  const [deadline, setDeadline] = useState("");
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [updateVal, setUpdateVal] = useState("");

  const getCatLabel = (value) => {
    const meta = CATEGORY_META[value];
    if (!meta) return value;
    return `${meta.label} ${lang === "en" ? meta.en : meta.ua}`;
  };

  useEffect(() => {
    if (!user) return undefined;

    const goalsQuery = query(collection(db, "goals"), where("userId", "==", user.uid));

    const unsub = onSnapshot(goalsQuery, (snapshot) => {
      const data = snapshot.docs.map((goalDoc) => ({ id: goalDoc.id, ...goalDoc.data() }));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setGoals(data);
    });

    return () => unsub();
  }, [user]);

  const addGoal = async () => {
    if (!user || !title.trim() || !target) return;

    await addDoc(collection(db, "goals"), {
      title: title.trim(),
      target: Number(target),
      current: Number(current) || 0,
      cat,
      unit,
      deadline: deadline || null,
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setTitle("");
    setTarget("");
    setCurrent("");
    setUnit("₴");
    setDeadline("");
    setAdding(false);
  };

  const updateProgress = async (id) => {
    if (!user || !updateVal) return;

    await updateDoc(doc(db, "goals", id), {
      current: Number(updateVal),
    });

    setUpdating(null);
    setUpdateVal("");
  };

  const deleteGoal = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "goals", id));
  };

  const getPercent = (goalCurrent, goalTarget) =>
    Math.min(Math.round((goalCurrent / goalTarget) * 100), 100);

  const getDaysLeft = (goalDeadline) => {
    if (!goalDeadline) return null;
    const diff = new Date(goalDeadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (!user) {
    return (
      <div className="container">
        <h1>{lang === "en" ? "🎯 Goals" : "🎯 Цілі"}</h1>
        <div className="card">
          <p>{lang === "en" ? "Sign in with Google to manage your goals." : "Увійдіть через Google, щоб керувати власними цілями."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>{lang === "en" ? "🎯 Goals" : "🎯 Цілі"}</h1>

      {!adding && (
        <button className="add-goal-btn" onClick={() => setAdding(true)}>
          {lang === "en" ? "+ New goal" : "+ Нова ціль"}
        </button>
      )}

      {adding && (
        <div className="card goal-form">
          <h3>{lang === "en" ? "New goal" : "Нова ціль"}</h3>
          <input
            placeholder={lang === "en" ? "Goal title" : "Назва цілі"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="form" style={{ marginTop: 8 }}>
            <input
              type="number"
              placeholder={lang === "en" ? "Target" : "Ціль"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <input
              type="number"
              placeholder={lang === "en" ? "Current progress" : "Поточний прогрес"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <input
              placeholder={lang === "en" ? "Unit (₴, kg, h...)" : "Одиниця (₴, кг, год...)"}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={{ maxWidth: 120 }}
            />
          </div>
          <div className="form" style={{ marginTop: 8 }}>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {getCatLabel(category.value)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="form" style={{ marginTop: 10 }}>
            <button onClick={addGoal}>{lang === "en" ? "✓ Save" : "✓ Зберегти"}</button>
            <button className="cancel-btn" onClick={() => setAdding(false)}>
              {lang === "en" ? "Cancel" : "Скасувати"}
            </button>
          </div>
        </div>
      )}

      <div className="goals-list">
        {goals.length === 0 ? (
          <p className="empty">{lang === "en" ? "No goals yet." : "Ще немає цілей."}</p>
        ) : (
          goals.map((goal) => {
            const pct = getPercent(goal.current, goal.target);
            const daysLeft = getDaysLeft(goal.deadline);
            const done = pct >= 100;

            return (
              <div key={goal.id} className={`goal-card ${done ? "goal-done" : ""}`}>
                <div className="goal-header">
                  <span className="goal-cat">{getCatLabel(goal.cat)}</span>
                  {daysLeft !== null && (
                    <span className={`goal-days ${daysLeft < 7 ? "urgent" : ""}`}>
                      {daysLeft > 0
                        ? (lang === "en" ? `⏳ ${daysLeft} days` : `⏳ ${daysLeft} днів`)
                        : (lang === "en" ? "⚠️ Deadline passed" : "⚠️ Дедлайн минув")}
                    </span>
                  )}
                  <button className="del-btn" onClick={() => deleteGoal(goal.id)}>
                    ✕
                  </button>
                </div>

                <h3 className="goal-title">
                  {done ? "✅ " : ""}
                  {goal.title}
                </h3>

                <div className="goal-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: done ? "#22c55e" : pct > 60 ? "#f59e0b" : "#3b82f6",
                      }}
                    />
                  </div>
                  <div className="goal-stats">
                    <span>{goal.current} {goal.unit}</span>
                    <span className="goal-pct">{pct}%</span>
                    <span>{goal.target} {goal.unit}</span>
                  </div>
                </div>

                {!done &&
                  (updating === goal.id ? (
                    <div className="form" style={{ marginTop: 10 }}>
                      <input
                        type="number"
                        placeholder={lang === "en" ? `New progress (${goal.unit})` : `Новий прогрес (${goal.unit})`}
                        value={updateVal}
                        onChange={(e) => setUpdateVal(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && updateProgress(goal.id)}
                      />
                      <button onClick={() => updateProgress(goal.id)}>✓</button>
                      <button className="cancel-btn" onClick={() => setUpdating(null)}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      className="update-btn"
                      onClick={() => {
                        setUpdating(goal.id);
                        setUpdateVal(String(goal.current));
                      }}
                    >
                      {lang === "en" ? "📈 Update progress" : "📈 Оновити прогрес"}
                    </button>
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


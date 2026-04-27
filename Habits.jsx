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

const today = () => new Date().toISOString().split("T")[0];
const ICONS = ["💪", "📚", "🧘", "🏃", "💧", "🥗", "😴", "🚫", "✍️", "🎯"];

export default function Habits({ user }) {
  const { lang } = useLang();
  const [habits, setHabits] = useState([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💪");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    const habitsQuery = query(collection(db, "habits"), where("userId", "==", user.uid));

    const unsub = onSnapshot(habitsQuery, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setHabits(data);
    });

    return () => unsub();
  }, [user]);

  const addHabit = async () => {
    if (!user || !name.trim()) return;

    await addDoc(collection(db, "habits"), {
      name: name.trim(),
      icon,
      streak: 0,
      lastDone: null,
      doneToday: false,
      history: [],
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setName("");
    setAdding(false);
  };

  const toggleHabit = async (habit) => {
    if (!user) return;

    const todayStr = today();
    const alreadyDone = habit.doneToday;
    const history = habit.history || [];

    if (!alreadyDone) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];
      const newStreak = habit.lastDone === yStr ? habit.streak + 1 : 1;

      await updateDoc(doc(db, "habits", habit.id), {
        doneToday: true,
        lastDone: todayStr,
        streak: newStreak,
        history: [...history, todayStr],
      });
    } else {
      await updateDoc(doc(db, "habits", habit.id), {
        doneToday: false,
        streak: Math.max(0, habit.streak - 1),
        history: history.filter((d) => d !== todayStr),
      });
    }
  };

  const deleteHabit = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "habits", id));
  };

  useEffect(() => {
    if (!user) return;

    habits.forEach(async (habit) => {
      if (habit.lastDone && habit.lastDone !== today() && habit.doneToday) {
        await updateDoc(doc(db, "habits", habit.id), { doneToday: false });
      }
    });
  }, [habits, user]);

  const doneCount = habits.filter((h) => h.doneToday).length;
  const total = habits.length;

  if (!user) {
    return (
      <div className="container">
        <h1>{lang === "en" ? "🔥 Habits" : "🔥 Звички"}</h1>
        <div className="card">
          <p>{lang === "en" ? "Sign in with Google to manage your habits." : "Увійдіть через Google, щоб керувати власними звичками."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>{lang === "en" ? "🔥 Habits" : "🔥 Звички"}</h1>

      {total > 0 && (
        <div className="card progress-wrap">
          <div className="progress-info">
            <span>{lang === "en" ? "Today" : "Сьогодні"}: {doneCount} {lang === "en" ? "of" : "з"} {total}</span>
            <span>{Math.round((doneCount / total) * 100)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(doneCount / total) * 100}%`,
                background: doneCount === total ? "#22c55e" : "#3b82f6",
              }}
            />
          </div>
        </div>
      )}

      {!adding && (
        <button className="add-goal-btn" onClick={() => setAdding(true)}>
          {lang === "en" ? "+ New habit" : "+ Нова звичка"}
        </button>
      )}

      {adding && (
        <div className="card goal-form">
          <h3>{lang === "en" ? "New habit" : "Нова звичка"}</h3>
          <input
            placeholder={lang === "en" ? "Habit name" : "Назва звички"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
          />

          <div className="icon-picker">
            {ICONS.map((ic) => (
              <button
                key={ic}
                className={`icon-btn ${icon === ic ? "icon-active" : ""}`}
                onClick={() => setIcon(ic)}
              >
                {ic}
              </button>
            ))}
          </div>

          <div className="form" style={{ marginTop: 10 }}>
            <button onClick={addHabit}>{lang === "en" ? "✓ Add" : "✓ Додати"}</button>
            <button className="cancel-btn" onClick={() => setAdding(false)}>
              {lang === "en" ? "Cancel" : "Скасувати"}
            </button>
          </div>
        </div>
      )}

      <div className="habits-list">
        {habits.length === 0 ? (
          <p className="empty">{lang === "en" ? "No habits yet. Add your first one." : "Ще немає звичок. Додайте першу."}</p>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className={`habit-card ${habit.doneToday ? "habit-done" : ""}`}
            >
              <button className="habit-toggle" onClick={() => toggleHabit(habit)}>
                {habit.doneToday ? "✅" : "⬜"}
              </button>

              <span className="habit-icon">{habit.icon}</span>

              <div className="habit-info">
                <p className="habit-name">{habit.name}</p>
                <p className="habit-streak">
                  🔥 {habit.streak} {lang === "en" ? "days in a row" : "дн. поспіль"}
                </p>
              </div>

              <div className="habit-week">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const dStr = d.toISOString().split("T")[0];
                  const done = (habit.history || []).includes(dStr);

                  return (
                    <div
                      key={i}
                      className={`week-dot ${done ? "dot-done" : ""}`}
                      title={dStr}
                    />
                  );
                })}
              </div>

              <button className="del-btn" onClick={() => deleteHabit(habit.id)}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


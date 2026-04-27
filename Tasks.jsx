import { useEffect, useRef, useState } from "react";
import { db } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import Achievements from "./Achievements";
import { addXP } from "./xp";
import { useLang } from "./useLang";

const today = () => new Date().toISOString().split("T")[0];
const POMODORO = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, високий: 0, середній: 1, низький: 2 };
const PRIORITY_META = {
  high: { emoji: "🔴", ua: "Високий", en: "High", color: "#ef4444" },
  medium: { emoji: "🟠", ua: "Середній", en: "Medium", color: "#f59e0b" },
  low: { emoji: "🟢", ua: "Низький", en: "Low", color: "#22c55e" },
  високий: { emoji: "🔴", ua: "Високий", en: "High", color: "#ef4444" },
  середній: { emoji: "🟠", ua: "Середній", en: "Medium", color: "#f59e0b" },
  низький: { emoji: "🟢", ua: "Низький", en: "Low", color: "#22c55e" },
};

export default function Tasks({ user }) {
  const { lang } = useLang();
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("medium");
  const [date, setDate] = useState(today());

  const [pomMode, setPomMode] = useState("work");
  const [pomTime, setPomTime] = useState(POMODORO.work);
  const [pomRunning, setPomRunning] = useState(false);
  const [pomCount, setPomCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;

    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      where("date", "==", date),
    );

    const unsub = onSnapshot(tasksQuery, (snapshot) => {
      const data = snapshot.docs.map((taskDoc) => ({
        id: taskDoc.id,
        ...taskDoc.data(),
      }));

      data.sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
      );

      setTasks(data);
    });

    return () => unsub();
  }, [date, user]);

  useEffect(() => {
    if (pomRunning) {
      intervalRef.current = setInterval(() => {
        setPomTime((timeLeft) => {
          if (timeLeft <= 1) {
            clearInterval(intervalRef.current);
            setPomRunning(false);

            try {
              new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
            } catch {
              // ignore audio autoplay errors
            }

            if (pomMode === "work") {
              const nextCount = pomCount + 1;
              setPomCount(nextCount);

              if (nextCount % 4 === 0) {
                setPomMode("long");
                return POMODORO.long;
              }

              setPomMode("short");
              return POMODORO.short;
            }

            setPomMode("work");
            return POMODORO.work;
          }

          return timeLeft - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [pomRunning, pomMode, pomCount]);

  const addTask = async () => {
    if (!user || !input.trim()) return;

    await addDoc(collection(db, "tasks"), {
      text: input.trim(),
      done: false,
      priority,
      date,
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setInput("");
  };

  const toggleTask = async (id, done) => {
    if (!user) return;
    await updateDoc(doc(db, "tasks", id), { done: !done });

    if (!done) {
      await addXP(user, 10);
    }
  };

  const deleteTask = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "tasks", id));
  };

  const done = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const pomMinutes = String(Math.floor(pomTime / 60)).padStart(2, "0");
  const pomSeconds = String(pomTime % 60).padStart(2, "0");

  const title = lang === "en" ? "Tasks" : "Таски";
  const loginHint = lang === "en"
    ? "Sign in with Google to see and save your own tasks."
    : "Увійдіть через Google, щоб бачити й зберігати власні задачі.";
  const emptyTasks = lang === "en" ? "No tasks for this date yet." : "На цю дату задач ще немає.";
  const progressLabel = lang === "en" ? "Progress" : "Прогрес";
  const xpLabel = lang === "en" ? "10 XP for each completed task" : "10 XP за кожен виконаний таск";

  const getPriorityMeta = (value) => PRIORITY_META[value] || PRIORITY_META.medium;

  return (
    <div className="container">
      <h1>{title}</h1>

      {!user ? (
        <div className="card">
          <p>{loginHint}</p>
        </div>
      ) : (
        <>
          <div className="card form">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <span className="date-label">
              Pomodoro {pomMinutes}:{pomSeconds}
            </span>
          </div>

          <div className="card form">
            <input
              placeholder={lang === "en" ? "New task..." : "Нова задача..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="high">{lang === "en" ? "High" : "Високий"}</option>
              <option value="medium">{lang === "en" ? "Medium" : "Середній"}</option>
              <option value="low">{lang === "en" ? "Low" : "Низький"}</option>
            </select>
            <button onClick={addTask}>{lang === "en" ? "+ Add" : "+ Додати"}</button>
          </div>

          <div className="card list">
            {tasks.length === 0 ? (
              <p className="empty">{emptyTasks}</p>
            ) : (
              tasks.map((task) => {
                const priorityMeta = getPriorityMeta(task.priority);

                return (
                  <div
                    key={task.id}
                    className={`task-item ${task.done ? "done" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id, task.done)}
                    />
                    <span
                      className="priority-dot"
                      style={{ background: priorityMeta.color }}
                      title={lang === "en" ? priorityMeta.en : priorityMeta.ua}
                    />
                    <span className="task-priority">
                      {priorityMeta.emoji}
                    </span>
                    <span className="task-text">{task.text}</span>
                    <span className="task-chip">
                      {lang === "en" ? priorityMeta.en : priorityMeta.ua}
                    </span>
                    <button className="del-btn" onClick={() => deleteTask(task.id)}>✕</button>
                  </div>
                );
              })
            )}
          </div>

          <div className="card progress-wrap">
            <div className="progress-info">
              <span>{progressLabel}: {done}/{total}</span>
              <span>{xpLabel}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <Achievements tasks={tasks} />
        </>
      )}
    </div>
  );
}



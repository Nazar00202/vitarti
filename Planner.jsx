import { useEffect, useMemo, useRef, useState } from "react";
import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
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
import { db } from "./firebase";
import { useLang } from "./useLang";
import { addXP } from "./xp";

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
const GOAL_CATEGORY_META = {
  "фінанси": { label: "💰", ua: "Фінанси", en: "Finance" },
  "здоров'я": { label: "💪", ua: "Здоров'я", en: "Health" },
  "навчання": { label: "📚", ua: "Навчання", en: "Learning" },
  "кар'єра": { label: "🚀", ua: "Кар'єра", en: "Career" },
  "особистість": { label: "🧠", ua: "Особистість", en: "Personal" },
  "інше": { label: "🎯", ua: "Інше", en: "Other" },
};
const GOAL_CATEGORIES = Object.keys(GOAL_CATEGORY_META).map((value) => ({ value }));
const HABIT_ICONS = ["💪", "📚", "🧘", "🏃", "💧", "🥗", "😴", "🚫", "✍️", "🎯"];

const formatDate = (lang, value) =>
  new Date(value).toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function Planner({ user }) {
  const { lang } = useLang();
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [taskInput, setTaskInput] = useState("");
  const [priority, setPriority] = useState("medium");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalUnit, setGoalUnit] = useState("₴");
  const [goalCategory, setGoalCategory] = useState("фінанси");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalUpdate, setGoalUpdate] = useState({ id: "", value: "" });
  const [habitName, setHabitName] = useState("");
  const [habitIcon, setHabitIcon] = useState("💪");
  const [pomMode, setPomMode] = useState("work");
  const [pomTime, setPomTime] = useState(POMODORO.work);
  const [pomRunning, setPomRunning] = useState(false);
  const [pomCount, setPomCount] = useState(0);
  const [plannerError, setPlannerError] = useState("");
  const intervalRef = useRef(null);

  const copy = useMemo(
    () => ({
      title: lang === "en" ? "Planner" : "Планер",
      subtitle: lang === "en"
        ? "Tasks, long-term goals, habits and deadlines in one place."
        : "Задачі, довгострокові цілі, звички і дедлайни в одному місці.",
      loginHint: lang === "en"
        ? "Sign in with Google to manage your plans."
        : "Увійди через Google, щоб керувати своїм плануванням.",
      plannerDate: lang === "en" ? "Planning date" : "Дата планування",
      plannerCalendar: lang === "en" ? "Calendar & deadlines" : "Календар і дедлайни",
      plannerAgenda: lang === "en" ? "Agenda for selected day" : "План на вибраний день",
      taskSection: lang === "en" ? "Tasks for the day" : "Задачі на день",
      taskPlaceholder: lang === "en" ? "New task..." : "Нова задача...",
      addTask: lang === "en" ? "+ Add task" : "+ Додати задачу",
      noTasks: lang === "en" ? "No tasks for this date yet." : "На цю дату задач ще немає.",
      progress: lang === "en" ? "Progress" : "Прогрес",
      xpHint: lang === "en" ? "10 XP for each completed task" : "10 XP за кожен виконаний таск",
      high: lang === "en" ? "High" : "Високий",
      medium: lang === "en" ? "Medium" : "Середній",
      low: lang === "en" ? "Low" : "Низький",
      goalSection: lang === "en" ? "Long-term goals" : "Довгострокові цілі",
      goalTitle: lang === "en" ? "Goal title" : "Назва цілі",
      goalTarget: lang === "en" ? "Target" : "Ціль",
      goalCurrent: lang === "en" ? "Current progress" : "Поточний прогрес",
      goalUnit: lang === "en" ? "Unit (₴, kg, h...)" : "Одиниця (₴, кг, год...)",
      goalDeadline: lang === "en" ? "Deadline" : "Дедлайн",
      addGoal: lang === "en" ? "+ Add goal" : "+ Додати ціль",
      noGoals: lang === "en" ? "No goals yet." : "Ще немає цілей.",
      updateGoal: lang === "en" ? "Update progress" : "Оновити прогрес",
      saveUpdate: lang === "en" ? "Save" : "Зберегти",
      habitSection: lang === "en" ? "Habits" : "Звички",
      habitPlaceholder: lang === "en" ? "Habit name" : "Назва звички",
      addHabit: lang === "en" ? "+ Add habit" : "+ Додати звичку",
      noHabits: lang === "en" ? "No habits yet." : "Ще немає звичок.",
      today: lang === "en" ? "Today" : "Сьогодні",
      streak: lang === "en" ? "days in a row" : "дн. поспіль",
      noAgenda: lang === "en" ? "Nothing planned for this day yet." : "На цей день ще нічого не заплановано.",
      tasksLabel: lang === "en" ? "Tasks" : "Задачі",
      deadlinesLabel: lang === "en" ? "Deadlines" : "Дедлайни",
      habitsLabel: lang === "en" ? "Habits today" : "Звички на сьогодні",
      permissionHint: lang === "en"
        ? "If nothing loads, check Firestore rules for tasks/goals/habits."
        : "Якщо нічого не вантажиться, перевір правила Firestore для tasks/goals/habits.",
      pomodoro: lang === "en" ? "Pomodoro" : "Помодоро",
      work: lang === "en" ? "Work" : "Фокус",
      shortBreak: lang === "en" ? "Short break" : "Коротка пауза",
      longBreak: lang === "en" ? "Long break" : "Довга пауза",
      start: lang === "en" ? "Start" : "Старт",
      pause: lang === "en" ? "Pause" : "Пауза",
      reset: lang === "en" ? "Reset" : "Скинути",
      sessions: lang === "en" ? "Completed sessions" : "Завершено сесій",
    }),
    [lang],
  );

  const getPriorityMeta = (value) => PRIORITY_META[value] || PRIORITY_META.medium;
  const getGoalCategoryLabel = (value) => {
    const meta = GOAL_CATEGORY_META[value];
    if (!meta) return value;
    return `${meta.label} ${lang === "en" ? meta.en : meta.ua}`;
  };

  useEffect(() => {
    if (!user) return undefined;

    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const data = snapshot.docs.map((taskDoc) => ({
          id: taskDoc.id,
          ...taskDoc.data(),
        }));
        data.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
        setTasks(data);
      },
      (error) => setPlannerError(`${copy.permissionHint} (${error.code || "unknown"})`),
    );

    return () => unsub();
  }, [copy.permissionHint, user]);

  useEffect(() => {
    if (!user) return undefined;

    const goalsQuery = query(collection(db, "goals"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      goalsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((goalDoc) => ({
          id: goalDoc.id,
          ...goalDoc.data(),
        }));
        data.sort((a, b) => (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31"));
        setGoals(data);
      },
      (error) => setPlannerError(`${copy.permissionHint} (${error.code || "unknown"})`),
    );

    return () => unsub();
  }, [copy.permissionHint, user]);

  useEffect(() => {
    if (!user) return undefined;

    const habitsQuery = query(collection(db, "habits"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      habitsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((habitDoc) => ({
          id: habitDoc.id,
          ...habitDoc.data(),
        }));
        data.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setHabits(data);
      },
      (error) => setPlannerError(`${copy.permissionHint} (${error.code || "unknown"})`),
    );

    return () => unsub();
  }, [copy.permissionHint, user]);

  useEffect(() => {
    if (!pomRunning) {
      clearInterval(intervalRef.current);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      setPomTime((timeLeft) => {
        if (timeLeft <= 1) {
          clearInterval(intervalRef.current);
          setPomRunning(false);

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

    return () => clearInterval(intervalRef.current);
  }, [pomCount, pomMode, pomRunning]);

  useEffect(() => {
    if (!user) return;

    habits.forEach(async (habit) => {
      if (habit.lastDone && habit.lastDone !== today() && habit.doneToday) {
        await updateDoc(doc(db, "habits", habit.id), { doneToday: false });
      }
    });
  }, [habits, user]);

  const resetPomodoro = (mode) => {
    setPomMode(mode);
    setPomTime(POMODORO[mode]);
    setPomRunning(false);
  };

  const addTask = async () => {
    if (!user || !taskInput.trim()) return;

    await addDoc(collection(db, "tasks"), {
      text: taskInput.trim(),
      done: false,
      priority,
      date: selectedDate,
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setTaskInput("");
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

  const addGoal = async () => {
    if (!user || !goalTitle.trim() || !goalTarget) return;

    await addDoc(collection(db, "goals"), {
      title: goalTitle.trim(),
      target: Number(goalTarget),
      current: Number(goalCurrent) || 0,
      cat: goalCategory,
      unit: goalUnit || "₴",
      deadline: goalDeadline || null,
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setGoalTitle("");
    setGoalTarget("");
    setGoalCurrent("");
    setGoalUnit("₴");
    setGoalDeadline("");
  };

  const saveGoalUpdate = async (id) => {
    if (!user || !goalUpdate.value) return;
    await updateDoc(doc(db, "goals", id), { current: Number(goalUpdate.value) });
    setGoalUpdate({ id: "", value: "" });
  };

  const deleteGoal = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "goals", id));
  };

  const addHabit = async () => {
    if (!user || !habitName.trim()) return;

    await addDoc(collection(db, "habits"), {
      name: habitName.trim(),
      icon: habitIcon,
      streak: 0,
      lastDone: null,
      doneToday: false,
      history: [],
      userId: user.uid,
      userName: user.displayName ?? "",
      userEmail: user.email ?? "",
      createdAt: Date.now(),
    });

    setHabitName("");
  };

  const toggleHabit = async (habit) => {
    if (!user) return;

    const todayStr = today();
    const history = habit.history || [];

    if (!habit.doneToday) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const newStreak = habit.lastDone === yesterdayStr ? habit.streak + 1 : 1;

      await updateDoc(doc(db, "habits", habit.id), {
        doneToday: true,
        lastDone: todayStr,
        streak: newStreak,
        history: [...history, todayStr],
      });
      return;
    }

    await updateDoc(doc(db, "habits", habit.id), {
      doneToday: false,
      streak: Math.max(0, habit.streak - 1),
      history: history.filter((item) => item !== todayStr),
    });
  };

  const deleteHabit = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, "habits", id));
  };

  const tasksForDay = tasks
    .filter((task) => task.date === selectedDate)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
  const doneTasks = tasksForDay.filter((task) => task.done).length;
  const tasksTotal = tasksForDay.length;
  const goalsForDay = goals.filter((goal) => goal.deadline === selectedDate);
  const habitsDoneToday = habits.filter((habit) => habit.doneToday).length;
  const agendaItemsCount = tasksForDay.length + goalsForDay.length + (selectedDate === today() ? habits.length : 0);
  const pomMinutes = String(Math.floor(pomTime / 60)).padStart(2, "0");
  const pomSeconds = String(pomTime % 60).padStart(2, "0");

  const tileClassName = ({ date }) => {
    const dateStr = date.toISOString().split("T")[0];
    const hasTask = tasks.some((task) => task.date === dateStr);
    const hasGoal = goals.some((goal) => goal.deadline === dateStr);

    if (hasTask && hasGoal) return "planner-calendar-mixed";
    if (hasTask) return "planner-calendar-task";
    if (hasGoal) return "planner-calendar-goal";
    return null;
  };

  if (!user) {
    return (
      <div className="container">
        <h1>🗓 {copy.title}</h1>
        <div className="card">
          <p>{copy.loginHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🗓 {copy.title}</h1>
      <p className="dash-sub">{copy.subtitle}</p>

      {plannerError ? (
        <div className="card">
          <p className="empty planner-error">{plannerError}</p>
        </div>
      ) : null}

      <div className="planner-grid">
        <div className="planner-main">
          <div className="card">
            <div className="planner-section-head">
              <div>
                <h3>{copy.taskSection}</h3>
                <p className="dash-sub">{copy.plannerDate}: {formatDate(lang, selectedDate)}</p>
              </div>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>

            <div className="form" style={{ marginTop: 12 }}>
              <input
                placeholder={copy.taskPlaceholder}
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="high">{copy.high}</option>
                <option value="medium">{copy.medium}</option>
                <option value="low">{copy.low}</option>
              </select>
              <button type="button" onClick={addTask}>{copy.addTask}</button>
            </div>

            <div className="card progress-wrap planner-inner-card">
              <div className="progress-info">
                <span>{copy.progress}: {doneTasks}/{tasksTotal}</span>
                <span>{copy.xpHint}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: tasksTotal ? `${(doneTasks / tasksTotal) * 100}%` : "0%" }}
                />
              </div>
            </div>

            <div className="list planner-list">
              {tasksForDay.length === 0 ? (
                <p className="empty">{copy.noTasks}</p>
              ) : (
                tasksForDay.map((task) => {
                  const priorityMeta = getPriorityMeta(task.priority);

                  return (
                    <div key={task.id} className={`task-item ${task.done ? "done" : ""}`}>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id, task.done)}
                      />
                      <span className="priority-dot" style={{ background: priorityMeta.color }} />
                      <span className="task-priority">{priorityMeta.emoji}</span>
                      <span className="task-text">{task.text}</span>
                      <span className="task-chip">{lang === "en" ? priorityMeta.en : priorityMeta.ua}</span>
                      <button type="button" className="del-btn" onClick={() => deleteTask(task.id)}>✕</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="planner-section-head">
              <div>
                <h3>{copy.goalSection}</h3>
                <p className="dash-sub">{copy.deadlinesLabel}</p>
              </div>
            </div>

            <input
              placeholder={copy.goalTitle}
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
            />

            <div className="form" style={{ marginTop: 10 }}>
              <input
                type="number"
                placeholder={copy.goalTarget}
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
              />
              <input
                type="number"
                placeholder={copy.goalCurrent}
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
              />
              <input
                placeholder={copy.goalUnit}
                value={goalUnit}
                onChange={(e) => setGoalUnit(e.target.value)}
              />
            </div>

            <div className="form" style={{ marginTop: 10 }}>
              <select value={goalCategory} onChange={(e) => setGoalCategory(e.target.value)}>
                {GOAL_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {getGoalCategoryLabel(category.value)}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
              />
              <button type="button" onClick={addGoal}>{copy.addGoal}</button>
            </div>

            <div className="goals-list">
              {goals.length === 0 ? (
                <p className="empty">{copy.noGoals}</p>
              ) : (
                goals.map((goal) => {
                  const percent = Math.min(Math.round(((goal.current || 0) / (goal.target || 1)) * 100), 100);
                  const done = percent >= 100;

                  return (
                    <div key={goal.id} className={`goal-card ${done ? "goal-done" : ""}`}>
                      <div className="goal-header">
                        <span className="goal-cat">{getGoalCategoryLabel(goal.cat)}</span>
                        {goal.deadline ? (
                          <span className="goal-days">
                            {formatDate(lang, goal.deadline)}
                          </span>
                        ) : null}
                        <button type="button" className="del-btn" onClick={() => deleteGoal(goal.id)}>✕</button>
                      </div>

                      <h3 className="goal-title">{done ? "✅ " : ""}{goal.title}</h3>

                      <div className="goal-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${percent}%`,
                              background: done ? "#22c55e" : percent > 60 ? "#f59e0b" : "#3b82f6",
                            }}
                          />
                        </div>
                        <div className="goal-stats">
                          <span>{goal.current} {goal.unit}</span>
                          <span className="goal-pct">{percent}%</span>
                          <span>{goal.target} {goal.unit}</span>
                        </div>
                      </div>

                      {goalUpdate.id === goal.id ? (
                        <div className="form" style={{ marginTop: 10 }}>
                          <input
                            type="number"
                            placeholder={copy.goalCurrent}
                            value={goalUpdate.value}
                            onChange={(e) => setGoalUpdate({ id: goal.id, value: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && saveGoalUpdate(goal.id)}
                          />
                          <button type="button" onClick={() => saveGoalUpdate(goal.id)}>{copy.saveUpdate}</button>
                          <button
                            type="button"
                            className="cancel-btn"
                            onClick={() => setGoalUpdate({ id: "", value: "" })}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="update-btn"
                          onClick={() => setGoalUpdate({ id: goal.id, value: String(goal.current || 0) })}
                        >
                          📈 {copy.updateGoal}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="planner-section-head">
              <div>
                <h3>{copy.habitSection}</h3>
                <p className="dash-sub">{copy.today}: {habitsDoneToday}/{habits.length}</p>
              </div>
            </div>

            <div className="form" style={{ marginTop: 12 }}>
              <input
                placeholder={copy.habitPlaceholder}
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
              />
              <button type="button" onClick={addHabit}>{copy.addHabit}</button>
            </div>

            <div className="icon-picker">
              {HABIT_ICONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`icon-btn ${habitIcon === item ? "icon-active" : ""}`}
                  onClick={() => setHabitIcon(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="habits-list">
              {habits.length === 0 ? (
                <p className="empty">{copy.noHabits}</p>
              ) : (
                habits.map((habit) => (
                  <div key={habit.id} className={`habit-card ${habit.doneToday ? "habit-done" : ""}`}>
                    <button type="button" className="habit-toggle" onClick={() => toggleHabit(habit)}>
                      {habit.doneToday ? "✅" : "⬜"}
                    </button>
                    <span className="habit-icon">{habit.icon}</span>
                    <div className="habit-info">
                      <p className="habit-name">{habit.name}</p>
                      <p className="habit-streak">🔥 {habit.streak} {copy.streak}</p>
                    </div>
                    <div className="habit-week">
                      {Array.from({ length: 7 }).map((_, index) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - index));
                        const dateStr = date.toISOString().split("T")[0];
                        const done = (habit.history || []).includes(dateStr);

                        return <div key={dateStr} className={`week-dot ${done ? "dot-done" : ""}`} title={dateStr} />;
                      })}
                    </div>
                    <button type="button" className="del-btn" onClick={() => deleteHabit(habit.id)}>✕</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <Achievements tasks={tasksForDay} />
        </div>

        <div className="planner-side">
          <div className="card pom-card">
            <div className="planner-section-head planner-section-head-tight">
              <div>
                <h3>{copy.pomodoro}</h3>
                <p className="dash-sub">{copy.sessions}: {pomCount}</p>
              </div>
            </div>

            <div className="pom-modes">
              <button
                type="button"
                className={pomMode === "work" ? "pom-mode-btn pom-mode-active" : "pom-mode-btn"}
                onClick={() => resetPomodoro("work")}
              >
                {copy.work}
              </button>
              <button
                type="button"
                className={pomMode === "short" ? "pom-mode-btn pom-mode-active" : "pom-mode-btn"}
                onClick={() => resetPomodoro("short")}
              >
                {copy.shortBreak}
              </button>
              <button
                type="button"
                className={pomMode === "long" ? "pom-mode-btn pom-mode-active" : "pom-mode-btn"}
                onClick={() => resetPomodoro("long")}
              >
                {copy.longBreak}
              </button>
            </div>

            <div className="pom-time">{pomMinutes}:{pomSeconds}</div>

            <div className="pom-controls">
              <button type="button" className="pom-btn" onClick={() => setPomRunning((value) => !value)}>
                {pomRunning ? copy.pause : copy.start}
              </button>
              <button type="button" className="pom-btn pom-reset" onClick={() => resetPomodoro(pomMode)}>
                {copy.reset}
              </button>
            </div>
          </div>

          <div className="card calendar-wrap planner-calendar">
            <h3>{copy.plannerCalendar}</h3>
            <ReactCalendar
              onChange={(value) => {
                setCalendarDate(value);
                setSelectedDate(value.toISOString().split("T")[0]);
              }}
              value={calendarDate}
              tileClassName={tileClassName}
              locale={lang === "en" ? "en-US" : "uk-UA"}
            />

            <div className="day-summary">
              <div className="day-summary-header">
                <span>{copy.plannerAgenda}</span>
                <span>{agendaItemsCount}</span>
              </div>

              {agendaItemsCount === 0 ? (
                <p className="empty">{copy.noAgenda}</p>
              ) : (
                <div className="planner-agenda">
                  {tasksForDay.length > 0 ? (
                    <div className="planner-agenda-block">
                      <p className="planner-agenda-title">{copy.tasksLabel}</p>
                      {tasksForDay.map((task) => (
                        <div key={task.id} className="planner-agenda-item">
                          <span>{task.done ? "✅" : "⬜"} {task.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {goalsForDay.length > 0 ? (
                    <div className="planner-agenda-block">
                      <p className="planner-agenda-title">{copy.deadlinesLabel}</p>
                      {goalsForDay.map((goal) => (
                        <div key={goal.id} className="planner-agenda-item">
                          <span>🎯 {goal.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {selectedDate === today() && habits.length > 0 ? (
                    <div className="planner-agenda-block">
                      <p className="planner-agenda-title">{copy.habitsLabel}</p>
                      {habits.map((habit) => (
                        <div key={habit.id} className="planner-agenda-item">
                          <span>{habit.doneToday ? "✅" : "⬜"} {habit.icon} {habit.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

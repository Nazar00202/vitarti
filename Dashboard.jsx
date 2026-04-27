import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useLang } from "./useLang";

const today = () => new Date().toISOString().split("T")[0];

const greeting = (t) => {
  const hour = new Date().getHours();

  if (hour < 6) return t("dashboardGreetingNight");
  if (hour < 12) return t("dashboardGreetingMorning");
  if (hour < 18) return t("dashboardGreetingDay");
  return t("dashboardGreetingEvening");
};

export default function Dashboard({ expenses, income, user }) {
  const { lang, t } = useLang();
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!user) return undefined;

    const tasksQuery = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      where("date", "==", today()),
    );

    const unsub = onSnapshot(tasksQuery, (snap) => {
      setTasks(
        snap.docs.map((taskDoc) => ({
          id: taskDoc.id,
          ...taskDoc.data(),
        })),
      );
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const goalsQuery = query(
      collection(db, "goals"),
      where("userId", "==", user.uid),
    );

    const unsub = onSnapshot(goalsQuery, (snap) => {
      setGoals(
        snap.docs.map((goalDoc) => ({
          id: goalDoc.id,
          ...goalDoc.data(),
        })),
      );
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) {
        setXp(0);
        setLevel(0);
        return;
      }

      const data = snap.data();
      setXp(data.xp || 0);
      setLevel(data.level || 0);
    });

    return () => unsub();
  }, [user]);

  const scopedTasks = user ? tasks : [];
  const scopedGoals = user ? goals : [];
  const scopedXp = user ? xp : 0;
  const scopedLevel = user ? level : 0;
  const total = expenses.reduce((sum, expense) => sum + expense.amt, 0);
  const balance = income - total;
  const doneTasks = scopedTasks.filter((task) => task.done).length;
  const activeGoals = scopedGoals.filter((goal) => goal.current / goal.target < 1);

  const todayExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.createdAt).toISOString().split("T")[0];
    return expenseDate === today();
  });

  const todayTotal = todayExpenses.reduce((sum, expense) => sum + expense.amt, 0);

  return (
    <div className="container">
      <div className="dash-header">
        <h1>{greeting(t)}</h1>
        <p className="dash-date">
          {new Date().toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <div className="dash-grid">
        <div className="dash-card blue">
          <p className="dash-label">{t("balance")}</p>
          <h2 style={{ color: balance < 0 ? "#ef4444" : "#22c55e" }}>
            ₴{balance}
          </h2>
          <p className="dash-sub">{t("dashboardToday")}: ₴{todayTotal}</p>
        </div>

        <div className="dash-card">
          <p className="dash-label">{t("dashboardTasks")}</p>
          <h2>
            {doneTasks}/{scopedTasks.length}
          </h2>
          <div className="dash-mini-bar">
            <div
              className="dash-mini-fill"
              style={{
                width: scopedTasks.length ? `${(doneTasks / scopedTasks.length) * 100}%` : "0%",
              }}
            />
          </div>
          <p className="dash-sub">{t("dashboardDoneToday")}</p>
        </div>

        <div className="dash-card">
          <p className="dash-label dash-label-goals">{t("dashboardGoals")}</p>
          <h2 className="dash-value-green">{activeGoals.length}</h2>
          <p className="dash-sub">{t("dashboardActiveGoals")}</p>
        </div>

        <div className="dash-card purple">
          <p className="dash-label">{t("dashboardLevel")}</p>
          <h2 className="dash-value-green">LVL {scopedLevel}</h2>
          <p className="dash-sub dash-xp-text">{scopedXp} XP</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${scopedXp % 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card dash-section">
        <h3>{t("dashboardTasksToday")}</h3>
        {scopedTasks.length === 0 ? (
          <p className="empty">{t("dashboardNoTasks")}</p>
        ) : (
          scopedTasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className={`dash-task ${task.done ? "done" : ""}`}
            >
              <span className="dash-check">{task.done ? "✓" : "⬜"}</span>
              <span>{task.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="card dash-section">
        <h3>{t("dashboardExpensesToday")}</h3>
        {todayExpenses.length === 0 ? (
          <p className="empty">{t("dashboardNoExpenses")}</p>
        ) : (
          todayExpenses.slice(0, 4).map((expense) => (
            <div key={expense.id} className="dash-expense">
              <span>
                {expense.cat} · {expense.desc}
              </span>
              <span className="dash-amt">₴{expense.amt}</span>
            </div>
          ))
        )}
      </div>

      {activeGoals.length > 0 && (
        <div className="card dash-section">
          <h3 className="dash-title-green">{t("dashboardActiveGoalsTitle")}</h3>
          {activeGoals.slice(0, 3).map((goal) => {
            const percent = Math.min(
              Math.round((goal.current / goal.target) * 100),
              100,
            );

            return (
              <div key={goal.id} className="dash-goal">
                <div className="dash-goal-info">
                  <span className="dash-goal-title">{goal.title}</span>
                  <span className="dash-pct dash-value-green">{percent}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


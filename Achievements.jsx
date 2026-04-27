import { useLang } from "./useLang";

export default function Achievements({ tasks }) {
  const { lang } = useLang();
  const doneTasks = tasks.filter((t) => t.done).length;

  const achievements = [
    {
      id: "first_task",
      emoji: "🏆",
      title: lang === "en" ? "First Step" : "Перший крок",
      desc: lang === "en" ? "Complete your first task" : "Виконай перший таск",
      unlocked: doneTasks >= 1,
    },
    {
      id: "five_tasks",
      emoji: "🔥",
      title: lang === "en" ? "In The Flow" : "У потоці",
      desc: lang === "en" ? "Complete 5 tasks" : "Виконай 5 тасків",
      unlocked: doneTasks >= 5,
    },
    {
      id: "ten_tasks",
      emoji: "💎",
      title: lang === "en" ? "Machine" : "Машина",
      desc: lang === "en" ? "Complete 10 tasks" : "Виконай 10 тасків",
      unlocked: doneTasks >= 10,
    },
  ];

  return (
    <div className="card achievements">
      <h3>{lang === "en" ? "🏅 Achievements" : "🏅 Досягнення"}</h3>
      <div className="ach-list">
        {achievements.map((a) => (
          <div key={a.id} className={`ach-item ${a.unlocked ? "unlocked" : "locked"}`}>
            <span className="ach-emoji">{a.emoji}</span>
            <div>
              <p className="ach-title">{a.title}</p>
              <p className="ach-desc">{a.desc}</p>
            </div>
            {a.unlocked && <span className="ach-badge">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}


import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useState } from "react";
import { useLang } from "./useLang";

export default function CalendarView({ expenses, getCatLabel }) {
  const { lang } = useLang();
  const [selected, setSelected] = useState(new Date());

  const selectedStr = selected.toDateString();

  const dayExpenses = expenses.filter((e) => {
    const d = new Date(e.createdAt).toDateString();
    return d === selectedStr;
  });

  const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amt, 0);
  const expenseDates = expenses.map((e) => new Date(e.createdAt).toDateString());

  const tileClassName = ({ date }) => {
    if (expenseDates.includes(date.toDateString())) {
      return "has-expense";
    }
    return null;
  };

  const title = lang === "en" ? "📅 Expense Calendar" : "📅 Календар витрат";
  const noDayExpenses = lang === "en" ? "No expenses for this day" : "Немає витрат за цей день";

  return (
    <div className="card calendar-wrap">
      <h3>{title}</h3>
      <ReactCalendar
        onChange={setSelected}
        value={selected}
        tileClassName={tileClassName}
        locale={lang === "en" ? "en-US" : "uk-UA"}
      />

      <div className="day-summary">
        <div className="day-summary-header">
          <span>{selected.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", { dateStyle: "long" })}</span>
          {dayTotal > 0 && <span className="day-total">₴{dayTotal}</span>}
        </div>

        {dayExpenses.length === 0 ? (
          <p className="empty">{noDayExpenses}</p>
        ) : (
          dayExpenses.map((e) => (
            <div key={e.id} className="item">
              <span className="item-cat">{getCatLabel ? getCatLabel(e.cat) : e.cat}</span>
              <span className="item-desc">{e.desc}</span>
              <span className="item-amt">₴{e.amt}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


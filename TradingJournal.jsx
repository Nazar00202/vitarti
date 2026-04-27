import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useLang } from "./useLang";

const round = (value) => Math.round((value + Number.EPSILON) * 10000) / 10000;
const toNumber = (value) => Number(String(value).replace(",", "."));

const calculateTrade = ({
  direction,
  capital,
  riskPercent,
  entry,
  stopLoss,
  takeProfit,
  spread,
}) => {
  const capitalValue = toNumber(capital);
  const riskPercentValue = toNumber(riskPercent);
  const entryValue = toNumber(entry);
  const stopValue = toNumber(stopLoss);
  const targetValue = toNumber(takeProfit);
  const spreadValue = toNumber(spread) || 0;

  if (!capitalValue || !riskPercentValue || !entryValue || !stopValue) {
    return null;
  }

  const riskAmount = capitalValue * (riskPercentValue / 100);
  const isLong = direction === "long";
  const unitRisk = isLong
    ? entryValue + spreadValue - stopValue
    : stopValue - (entryValue - spreadValue);

  if (unitRisk <= 0) {
    return {
      valid: false,
      riskAmount: round(riskAmount),
    };
  }

  const quantity = riskAmount / unitRisk;
  const positionValue = quantity * entryValue;

  let rewardPerUnit = 0;
  let rewardAmount = 0;
  let rr = 0;

  if (targetValue) {
    rewardPerUnit = isLong
      ? targetValue - (entryValue + spreadValue)
      : (entryValue - spreadValue) - targetValue;

    if (rewardPerUnit > 0) {
      rewardAmount = rewardPerUnit * quantity;
      rr = rewardAmount / riskAmount;
    }
  }

  return {
    valid: true,
    riskAmount: round(riskAmount),
    unitRisk: round(unitRisk),
    quantity: round(quantity),
    positionValue: round(positionValue),
    rewardAmount: round(rewardAmount),
    rr: round(rr),
    effectiveEntry: round(isLong ? entryValue + spreadValue : entryValue - spreadValue),
  };
};

export default function TradingJournal({ user }) {
  const { lang } = useLang();
  const [entries, setEntries] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [setup, setSetup] = useState("");
  const [direction, setDirection] = useState("long");
  const [capital, setCapital] = useState("");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [spread, setSpread] = useState("0");
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState({ type: "", message: "" });

  const copy = useMemo(
    () => ({
      title: lang === "en" ? "Trading Journal" : "Торговий журнал",
      loginHint: lang === "en"
        ? "Sign in with Google to save your trade plans."
        : "Увійди через Google, щоб зберігати свої торгові угоди.",
      symbol: lang === "en" ? "Symbol" : "Інструмент",
      setup: lang === "en" ? "Setup" : "Сетап",
      long: lang === "en" ? "Long" : "Лонг",
      short: lang === "en" ? "Short" : "Шорт",
      capital: lang === "en" ? "Capital (USDT/$)" : "Капітал (USDT/$)",
      riskPercent: lang === "en" ? "Risk %" : "Ризик %",
      entry: lang === "en" ? "Entry" : "Вхід",
      stopLoss: lang === "en" ? "Stop loss" : "Стоп",
      takeProfit: lang === "en" ? "Take profit" : "Тейк",
      spread: lang === "en" ? "Spread" : "Спред",
      notes: lang === "en" ? "Notes" : "Нотатки",
      save: lang === "en" ? "+ Save trade" : "+ Зберегти угоду",
      calculations: lang === "en" ? "Auto calculation" : "Авто-розрахунок",
      riskAmount: lang === "en" ? "Risk amount" : "Сума ризику",
      unitRisk: lang === "en" ? "Risk per unit" : "Ризик на 1 юніт",
      quantity: lang === "en" ? "Position size" : "Розмір позиції",
      positionValue: lang === "en" ? "Position value" : "Обсяг позиції",
      effectiveEntry: lang === "en" ? "Entry with spread" : "Вхід зі спредом",
      rewardAmount: lang === "en" ? "Potential profit" : "Потенційний профіт",
      rr: "R:R",
      invalid: lang === "en"
        ? "Check entry, stop loss, spread and direction."
        : "Перевір вхід, стоп, спред і напрямок.",
      empty: lang === "en" ? "No saved trades yet." : "Ще немає збережених угод.",
      journal: lang === "en" ? "Saved trades" : "Збережені угоди",
      created: lang === "en" ? "Created" : "Створено",
      required: lang === "en"
        ? "Fill in symbol, capital, risk, entry and stop loss."
        : "Заповни інструмент, капітал, ризик, вхід і стоп.",
      saved: lang === "en" ? "Trade saved successfully." : "Угоду успішно збережено.",
      loadError: lang === "en"
        ? "Could not load trades. Check Firestore rules."
        : "Не вдалося завантажити угоди. Перевір правила Firestore.",
      saveError: lang === "en"
        ? "Could not save trade. Check Firestore rules."
        : "Не вдалося зберегти угоду. Перевір правила Firestore.",
      deleteLabel: lang === "en" ? "Delete trade" : "Видалити угоду",
    }),
    [lang],
  );

  useEffect(() => {
    if (!user) return undefined;

    const entriesQuery = query(
      collection(db, "tradingJournal"),
      where("userId", "==", user.uid),
    );

    const unsub = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((tradeDoc) => ({
          id: tradeDoc.id,
          ...tradeDoc.data(),
        }));

        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setEntries(data);
      },
      (error) => {
        setSaveState({
          type: "error",
          message: `${copy.loadError} (${error.code || "unknown"})`,
        });
      },
    );

    return () => unsub();
  }, [copy.loadError, user]);

  const calculation = calculateTrade({
    direction,
    capital,
    riskPercent,
    entry,
    stopLoss,
    takeProfit,
    spread,
  });

  const resetForm = () => {
    setSymbol("");
    setSetup("");
    setDirection("long");
    setCapital("");
    setRiskPercent("1");
    setEntry("");
    setStopLoss("");
    setTakeProfit("");
    setSpread("0");
    setNotes("");
  };

  const addTrade = async () => {
    if (!user) return;

    if (!symbol.trim() || !calculation || !calculation.valid) {
      setSaveState({ type: "error", message: copy.required });
      return;
    }

    try {
      await addDoc(collection(db, "tradingJournal"), {
        symbol: symbol.trim().toUpperCase(),
        setup: setup.trim(),
        direction,
        capital: toNumber(capital),
        riskPercent: toNumber(riskPercent),
        entry: toNumber(entry),
        stopLoss: toNumber(stopLoss),
        takeProfit: takeProfit ? toNumber(takeProfit) : null,
        spread: toNumber(spread) || 0,
        notes: notes.trim(),
        calc: calculation,
        userId: user.uid,
        userName: user.displayName ?? "",
        userEmail: user.email ?? "",
        createdAt: Date.now(),
      });

      resetForm();
      setSaveState({ type: "success", message: copy.saved });
    } catch (error) {
      setSaveState({
        type: "error",
        message: `${copy.saveError} (${error.code || "unknown"})`,
      });
    }
  };

  const deleteTrade = async (id) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "tradingJournal", id));
      setSaveState({ type: "", message: "" });
    } catch (error) {
      setSaveState({
        type: "error",
        message: `${copy.saveError} (${error.code || "unknown"})`,
      });
    }
  };

  if (!user) {
    return (
      <div className="container">
        <h1>📔 {copy.title}</h1>
        <div className="card">
          <p>{copy.loginHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>📔 {copy.title}</h1>

      {saveState.message ? (
        <div className="card">
          <p className={saveState.type === "error" ? "empty planner-error" : "dash-sub planner-success"}>
            {saveState.message}
          </p>
        </div>
      ) : null}

      <div className="card goal-form trade-grid">
        <input placeholder={copy.symbol} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder={copy.setup} value={setup} onChange={(e) => setSetup(e.target.value)} />
        <select value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="long">{copy.long}</option>
          <option value="short">{copy.short}</option>
        </select>
        <input type="number" placeholder={copy.capital} value={capital} onChange={(e) => setCapital(e.target.value)} />
        <input type="number" step="0.01" placeholder={copy.riskPercent} value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} />
        <input type="number" step="0.0001" placeholder={copy.entry} value={entry} onChange={(e) => setEntry(e.target.value)} />
        <input type="number" step="0.0001" placeholder={copy.stopLoss} value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
        <input type="number" step="0.0001" placeholder={copy.takeProfit} value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
        <input type="number" step="0.0001" placeholder={copy.spread} value={spread} onChange={(e) => setSpread(e.target.value)} />
        <textarea
          className="journal-textarea trade-notes"
          placeholder={copy.notes}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />

        <div className="card trade-calc">
          <div className="trade-calc-header">
            <h3>{copy.calculations}</h3>
            {!calculation?.valid && calculation ? <span className="empty planner-error">{copy.invalid}</span> : null}
          </div>

          <div className="trade-calc-grid">
            <div className="dash-card">
              <p className="dash-label">{copy.riskAmount}</p>
              <h2>{calculation ? `$${calculation.riskAmount || 0}` : "-"}</h2>
            </div>
            <div className="dash-card">
              <p className="dash-label">{copy.unitRisk}</p>
              <h2>{calculation?.valid ? calculation.unitRisk : "-"}</h2>
            </div>
            <div className="dash-card">
              <p className="dash-label">{copy.quantity}</p>
              <h2>{calculation?.valid ? calculation.quantity : "-"}</h2>
            </div>
            <div className="dash-card">
              <p className="dash-label">{copy.positionValue}</p>
              <h2>{calculation?.valid ? `$${calculation.positionValue}` : "-"}</h2>
            </div>
            <div className="dash-card">
              <p className="dash-label">{copy.effectiveEntry}</p>
              <h2>{calculation?.valid ? calculation.effectiveEntry : "-"}</h2>
            </div>
            <div className="dash-card">
              <p className="dash-label">{copy.rr}</p>
              <h2>{calculation?.valid && calculation.rr ? calculation.rr : "-"}</h2>
              <p className="dash-sub">
                {calculation?.valid && calculation.rewardAmount
                  ? `$${calculation.rewardAmount}`
                  : copy.rewardAmount}
              </p>
            </div>
          </div>
        </div>

        <button onClick={addTrade}>{copy.save}</button>
      </div>

      <div className="card dash-section">
        <h3>{copy.journal}</h3>
        {entries.length === 0 ? (
          <p className="empty">{copy.empty}</p>
        ) : (
          entries.map((trade) => (
            <div key={trade.id} className="trade-item">
              <div className="trade-item-head">
                <div>
                  <strong>{trade.symbol}</strong>
                  {trade.setup ? <span className="dash-sub"> · {trade.setup}</span> : null}
                </div>
                <div className={`goal-cat ${trade.direction === "long" ? "" : "budget-over-card"}`}>
                  {trade.direction === "long" ? copy.long : copy.short}
                </div>
              </div>

              <div className="trade-metrics">
                <span>{copy.riskAmount}: ${trade.calc?.riskAmount ?? "-"}</span>
                <span>{copy.quantity}: {trade.calc?.quantity ?? "-"}</span>
                <span>{copy.rr}: {trade.calc?.rr ?? "-"}</span>
                <span>
                  {copy.created}: {new Date(trade.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "uk-UA")}
                </span>
              </div>

              {trade.notes ? <p className="dash-sub">{trade.notes}</p> : null}

              <button
                type="button"
                className="del-btn"
                aria-label={copy.deleteLabel}
                onClick={() => deleteTrade(trade.id)}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

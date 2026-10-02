import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Plus,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";

const money = (value, currency = "KZT") =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function Dashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("expense");
  const [form, setForm] = useState({
    category_id: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    payment_method: "",
    description: "",
    is_recurring: false,
    source: "",
    comment: "",
  });
  const [error, setError] = useState("");

  const load = async () => {
    const [expenseRes, incomeRes, categoryRes] = await Promise.all([
      api.get("/expenses"),
      api.get("/income"),
      api.get("/categories"),
    ]);
    setExpenses(expenseRes.data.expenses);
    setIncome(incomeRes.data.income);
    setCategories(categoryRes.data.categories);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const monthKey = new Date().toISOString().slice(0, 7);

  const monthExpenses = useMemo(
    () => expenses.filter((x) => String(x.date).slice(0, 7) === monthKey),
    [expenses, monthKey]
  );

  const monthIncome = useMemo(
    () => income.filter((x) => String(x.date).slice(0, 7) === monthKey),
    [income, monthKey]
  );

  const totalExpenses = monthExpenses.reduce((sum, x) => sum + Number(x.amount), 0);
  const totalIncome = monthIncome.reduce((sum, x) => sum + Number(x.amount), 0);
  const balance = totalIncome - totalExpenses;

  const openAdd = (selectedType = "expense") => {
    setType(selectedType);
    setForm({
      category_id: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      payment_method: "",
      description: "",
      is_recurring: false,
      source: "",
      comment: "",
    });
    setError("");
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (type === "expense") {
        await api.post("/expenses", {
          category_id: form.category_id,
          amount: Number(form.amount),
          date: form.date,
          payment_method: form.payment_method || null,
          description: form.description || null,
          is_recurring: form.is_recurring,
        });
      } else {
        await api.post("/income", {
          category_id: form.category_id || null,
          amount: Number(form.amount),
          source: form.source,
          date: form.date,
          comment: form.comment || null,
        });
      }

      setOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось сохранить запись");
    }
  };

  const recent = [...expenses, ...income]
    .map((item) => ({
      ...item,
      kind: item.source ? "income" : "expense",
      displayTitle: item.source || item.category_name || "Расход",
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const expenseCategories = categories.filter((x) => x.type === "expense");
  const incomeCategories = categories.filter((x) => x.type === "income");

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Сегодня {new Date().toLocaleDateString("ru-RU")}</span>
          <h1>Привет, {user?.name} 👋</h1>
          <p>Вот как выглядят ваши финансы за текущий месяц.</p>
        </div>

        <div className="heading-actions">
          <button className="secondary-button" onClick={() => openAdd("income")}>
            <Plus size={18} /> Доход
          </button>
          <button className="primary-button compact" onClick={() => openAdd("expense")}>
            <Plus size={18} /> Расход
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Баланс за месяц"
          value={money(balance, user?.currency)}
          icon={CircleDollarSign}
          tone="balance"
          subtitle="доходы − расходы"
        />
        <StatCard
          title="Доходы"
          value={money(totalIncome, user?.currency)}
          icon={TrendingUp}
          tone="income"
          subtitle={`${monthIncome.length} записей`}
        />
        <StatCard
          title="Расходы"
          value={money(totalExpenses, user?.currency)}
          icon={TrendingDown}
          tone="expense"
          subtitle={`${monthExpenses.length} записей`}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Последние операции</h2>
              <p>Ваши последние доходы и расходы</p>
            </div>
            <ReceiptText size={20} />
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="Пока нет операций"
              text="Добавьте первый расход или доход."
            />
          ) : (
            <div className="transaction-list">
              {recent.map((item) => (
                <div className="transaction" key={`${item.kind}-${item.id}`}>
                  <div className={`transaction-icon ${item.kind}`}>
                    {item.kind === "income" ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}
                  </div>
                  <div className="transaction-main">
                    <strong>{item.displayTitle}</strong>
                    <span>
                      {new Date(item.date).toLocaleDateString("ru-RU")}
                      {item.description ? ` · ${item.description}` : ""}
                    </span>
                  </div>
                  <strong className={item.kind === "income" ? "amount-income" : "amount-expense"}>
                    {item.kind === "income" ? "+" : "-"}
                    {money(item.amount, user?.currency)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Быстрый старт</h2>
              <p>Минимум действий для учета</p>
            </div>
            <CalendarDays size={20} />
          </div>

          <div className="quick-actions">
            <button onClick={() => openAdd("expense")}>
              <TrendingDown size={20} />
              <span><strong>Добавить расход</strong><small>Еда, транспорт, покупки...</small></span>
            </button>
            <button onClick={() => openAdd("income")}>
              <TrendingUp size={20} />
              <span><strong>Добавить доход</strong><small>Зарплата, фриланс...</small></span>
            </button>
          </div>
        </section>
      </div>

      {open && (
        <Modal title={type === "expense" ? "Новый расход" : "Новый доход"} onClose={() => setOpen(false)}>
          {error && <div className="alert error">{error}</div>}

          <form className="form" onSubmit={submit}>
            <label>
              Сумма
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                required
              />
            </label>

            <label>
              Категория
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required={type === "expense"}
              >
                <option value="">Выберите категорию</option>
                {(type === "expense" ? expenseCategories : incomeCategories).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {type === "income" ? (
              <>
                <label>
                  Источник
                  <input
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="Например, зарплата"
                    required
                  />
                </label>
                <label>
                  Комментарий
                  <input
                    value={form.comment}
                    onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    placeholder="Необязательно"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Способ оплаты
                  <input
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    placeholder="Kaspi, наличные, карта..."
                  />
                </label>
                <label>
                  Описание
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Необязательно"
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                  />
                  Регулярный расход
                </label>
              </>
            )}

            <label>
              Дата
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>

            <button className="primary-button" type="submit">
              Сохранить
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
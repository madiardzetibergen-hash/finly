import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, TrendingUp } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";

const money = (value, currency) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "KZT",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function Income() {
  const { user } = useAuth();
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category_id: "",
    amount: "",
    source: "",
    date: new Date().toISOString().slice(0, 10),
    comment: "",
  });

  const load = async () => {
    const [incomeRes, categoriesRes] = await Promise.all([
      api.get("/income"),
      api.get("/categories"),
    ]);
    setIncome(incomeRes.data.income);
    setCategories(categoriesRes.data.categories.filter((x) => x.type === "income"));
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return income;

    return income.filter((item) =>
      `${item.source} ${item.category_name || ""} ${item.comment || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [income, search]);

  const total = filtered.reduce((sum, item) => sum + Number(item.amount), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/income", {
        ...form,
        amount: Number(form.amount),
      });

      setOpen(false);
      setForm({
        category_id: "",
        amount: "",
        source: "",
        date: new Date().toISOString().slice(0, 10),
        comment: "",
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось добавить доход");
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Учет доходов</span>
          <h1>Доходы</h1>
          <p>Зарплата, подработка и другие поступления.</p>
        </div>
        <button className="primary-button compact" onClick={() => setOpen(true)}>
          <Plus size={18} /> Добавить доход
        </button>
      </div>

      <div className="toolbar panel">
        <div className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по доходам..."
          />
        </div>
        <div className="toolbar-total">
          <span>Показано</span>
          <strong>{money(total, user?.currency)}</strong>
        </div>
      </div>

      <section className="panel">
        {filtered.length === 0 ? (
          <EmptyState title="Доходов пока нет" text="Добавьте первое поступление." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Источник</th>
                  <th>Категория</th>
                  <th>Комментарий</th>
                  <th>Дата</th>
                  <th>Сумма</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-title">
                        <div className="small-icon income"><TrendingUp size={16} /></div>
                        <strong>{item.source}</strong>
                      </div>
                    </td>
                    <td>{item.category_name || "—"}</td>
                    <td>{item.comment || "—"}</td>
                    <td>{new Date(item.date).toLocaleDateString("ru-RU")}</td>
                    <td className="amount-income">+{money(item.amount, user?.currency)}</td>
                    <td>
                      <span className="muted">Удаление пока не поддерживается API</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <Modal title="Добавить доход" onClose={() => setOpen(false)}>
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
                placeholder="350000"
                required
              />
            </label>

            <label>
              Источник
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Зарплата"
                required
              />
            </label>

            <label>
              Категория
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label>
              Дата
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
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

            <button className="primary-button" type="submit">Сохранить доход</button>
          </form>
        </Modal>
      )}
    </>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, TrendingDown } from "lucide-react";
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

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    category_id: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    payment_method: "",
    description: "",
    is_recurring: false,
  });

  const load = async () => {
    const [expensesRes, categoriesRes] = await Promise.all([
      api.get("/expenses"),
      api.get("/categories"),
    ]);
    setExpenses(expensesRes.data.expenses);
    setCategories(categoriesRes.data.categories.filter((x) => x.type === "expense"));
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return expenses;

    return expenses.filter((item) =>
      `${item.category_name} ${item.description || ""} ${item.payment_method || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [expenses, search]);

  const total = filtered.reduce((sum, item) => sum + Number(item.amount), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/expenses", {
        ...form,
        amount: Number(form.amount),
      });

      setOpen(false);
      setForm({
        category_id: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        payment_method: "",
        description: "",
        is_recurring: false,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось добавить расход");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Удалить этот расход?")) return;

    try {
      await api.delete(`/expenses/${id}`);
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Не удалось удалить расход");
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Учет расходов</span>
          <h1>Расходы</h1>
          <p>Все ваши траты в одном месте.</p>
        </div>
        <button className="primary-button compact" onClick={() => setOpen(true)}>
          <Plus size={18} /> Добавить расход
        </button>
      </div>

      <div className="toolbar panel">
        <div className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по расходам..."
          />
        </div>
        <div className="toolbar-total">
          <span>Показано</span>
          <strong>{money(total, user?.currency)}</strong>
        </div>
      </div>

      <section className="panel">
        {filtered.length === 0 ? (
          <EmptyState
            title="Расходов пока нет"
            text={search ? "Попробуйте изменить поиск." : "Добавьте первую трату."}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Описание</th>
                  <th>Дата</th>
                  <th>Оплата</th>
                  <th>Сумма</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-title">
                        <div className="small-icon"><TrendingDown size={16} /></div>
                        <strong>{item.category_name}</strong>
                      </div>
                    </td>
                    <td>{item.description || "—"}</td>
                    <td>{new Date(item.date).toLocaleDateString("ru-RU")}</td>
                    <td>{item.payment_method || "—"}</td>
                    <td className="amount-expense">-{money(item.amount, user?.currency)}</td>
                    <td>
                      <button className="danger-icon" onClick={() => remove(item.id)} title="Удалить">
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <Modal title="Добавить расход" onClose={() => setOpen(false)}>
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
                placeholder="3500"
                required
              />
            </label>

            <label>
              Категория
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                <option value="">Выберите категорию</option>
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
              Способ оплаты
              <input
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                placeholder="Kaspi / карта / наличные"
              />
            </label>

            <label>
              Описание
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Например, обед"
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

            <button className="primary-button" type="submit">Сохранить расход</button>
          </form>
        </Modal>
      )}
    </>
  );
}
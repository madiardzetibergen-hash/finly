import { useEffect, useState } from "react";
import { FolderPlus, Plus, Tag } from "lucide-react";
import api from "../lib/api";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "expense",
    icon: "tag",
    color: "",
  });

  const load = async () => {
    const { data } = await api.get("/categories");
    setCategories(data.categories);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { data } = await api.post("/categories", form);
      setCategories((prev) => [...prev, data.category]);
      setOpen(false);
      setForm({ name: "", type: "expense", icon: "tag", color: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Не удалось создать категорию");
    }
  };

  const expenses = categories.filter((x) => x.type === "expense");
  const incomes = categories.filter((x) => x.type === "income");

  const Group = ({ title, items }) => (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{items.length} категорий</p>
        </div>
        <Tag size={20} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="Нет категорий" text="Создайте первую категорию." />
      ) : (
        <div className="category-grid">
          {items.map((category) => (
            <div className="category-card" key={category.id}>
              <div className="category-icon"><Tag size={18} /></div>
              <div>
                <strong>{category.name}</strong>
                <span>{category.icon || "tag"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Настройка учета</span>
          <h1>Категории</h1>
          <p>Настройте категории под себя.</p>
        </div>
        <button className="primary-button compact" onClick={() => setOpen(true)}>
          <Plus size={18} /> Новая категория
        </button>
      </div>

      <div className="category-layout">
        <Group title="Расходы" items={expenses} />
        <Group title="Доходы" items={incomes} />
      </div>

      {open && (
        <Modal title="Новая категория" onClose={() => setOpen(false)}>
          {error && <div className="alert error">{error}</div>}
          <form className="form" onSubmit={create}>
            <label>
              Название
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Например, Животные"
                required
              />
            </label>

            <label>
              Тип
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
            </label>

            <label>
              Иконка
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="tag"
              />
            </label>

            <label>
              Цвет
              <input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#111827"
              />
            </label>

            <button className="primary-button" type="submit">
              <FolderPlus size={18} /> Создать категорию
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
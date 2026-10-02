export default function StatCard({ title, value, icon: Icon, tone = "default", subtitle }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div className="stat-content">
        <span>{title}</span>
        <strong>{value}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  );
}
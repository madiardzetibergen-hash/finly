import { Inbox } from "lucide-react";

export default function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Inbox size={22} /></div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
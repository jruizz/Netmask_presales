import { IconBox } from './icons.jsx';

export default function EmptyState({ icon: Icon = IconBox, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon width={36} height={36} /></div>
      {title && <p style={{ fontWeight: 600, color: 'var(--nm-text-2)' }}>{title}</p>}
      {description && <p className="text-sm">{description}</p>}
      {action}
    </div>
  );
}

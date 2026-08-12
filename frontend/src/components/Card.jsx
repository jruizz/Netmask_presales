import { IconChevronRight } from './icons.jsx';

export default function Card({ title, subtitle, actions, children, className = '', style, collapsible = false, defaultOpen = true }) {
  if (collapsible) {
    return (
      <details className={`card ${className}`} style={style} open={defaultOpen}>
        <summary className="card-summary">
          <span className="row" style={{ gap: 8 }}>
            <IconChevronRight width={16} height={16} className="card-summary-chevron" />
            {title && <h3 className="card-title" style={{ marginBottom: 0 }}>{title}</h3>}
          </span>
          {actions}
        </summary>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        <div className="card-details-body">{children}</div>
      </details>
    );
  }

  return (
    <div className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div className="row-between" style={{ marginBottom: subtitle ? 0 : 14 }}>
          {title && <h3 className="card-title">{title}</h3>}
          {actions}
        </div>
      )}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </div>
  );
}

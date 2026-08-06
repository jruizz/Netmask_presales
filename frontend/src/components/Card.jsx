export default function Card({ title, subtitle, actions, children, className = '', style }) {
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

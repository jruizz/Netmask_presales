import { Link } from 'react-router-dom';
import { IconChevronLeft } from './icons.jsx';

export default function PageHeader({ title, subtitle, back, backLabel = 'Volver', actions }) {
  return (
    <>
      {back && (
        <Link to={back} className="page-back row" style={{ gap: 4 }}>
          <IconChevronLeft width={14} height={14} /> {backLabel}
        </Link>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </>
  );
}

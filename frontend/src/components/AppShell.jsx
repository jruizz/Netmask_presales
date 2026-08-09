import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import logo from '../assets/logo.png';
import { IconDashboard, IconLibrary, IconAudit, IconUsers, IconLogout, IconBriefcase, IconWrench, IconBox } from './icons.jsx';

const ROLES_VISIBILIDAD_AMPLIADA = ['superadmin', 'gerencia'];
const ROLES_ADMINISTRAN_CATALOGOS = ['lider_tecnico', 'preventa', 'superadmin'];

function NavLink({ to, icon: Icon, children, exact }) {
  const location = useLocation();
  const active = exact ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <Link to={to} className={`sidebar-link${active ? ' active' : ''}`}>
      <Icon width={17} height={17} />
      {children}
    </Link>
  );
}

export default function AppShell() {
  const { token, me, loading, logout } = useAuth();

  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;

  const puedeVerTodos = me && ROLES_VISIBILIDAD_AMPLIADA.includes(me.rol);
  const administraCatalogos = me && ROLES_ADMINISTRAN_CATALOGOS.includes(me.rol);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo-badge">
          <img src={logo} alt="Netmask" />
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" icon={IconDashboard} exact>Dashboard</NavLink>
          <NavLink to="/documentos" icon={IconLibrary}>Biblioteca</NavLink>
          {puedeVerTodos && <NavLink to="/auditoria" icon={IconAudit}>Auditoría</NavLink>}
          {administraCatalogos && <NavLink to="/comerciales" icon={IconBriefcase}>Comerciales</NavLink>}
          {administraCatalogos && <NavLink to="/catalogo-hardware" icon={IconBox}>Biblioteca Hardware</NavLink>}
          {administraCatalogos && <NavLink to="/catalogo-implementacion" icon={IconWrench}>Biblioteca Implementación</NavLink>}
          {me?.rol === 'superadmin' && <NavLink to="/usuarios" icon={IconUsers}>Usuarios y Roles</NavLink>}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-name">{me?.nombre}</div>
          <div className="sidebar-user-role">{me?.rol_nombre}</div>
          <button onClick={logout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IconLogout width={16} height={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}

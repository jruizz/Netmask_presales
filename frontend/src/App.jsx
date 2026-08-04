import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BomNuevo from './pages/BomNuevo.jsx';
import BomResumen from './pages/BomResumen.jsx';
import BomHardware from './pages/BomHardware.jsx';
import BomImplementacion from './pages/BomImplementacion.jsx';
import BomServicios from './pages/BomServicios.jsx';
import Biblioteca from './pages/Biblioteca.jsx';
import Auditoria from './pages/Auditoria.jsx';
import Usuarios from './pages/Usuarios.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/boms/nuevo" element={<BomNuevo />} />
        <Route path="/boms/:id" element={<BomResumen />} />
        <Route path="/boms/:id/hardware" element={<BomHardware />} />
        <Route path="/boms/:id/implementacion" element={<BomImplementacion />} />
        <Route path="/boms/:id/servicios" element={<BomServicios />} />
        <Route path="/documentos" element={<Biblioteca />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Route>
    </Routes>
  );
}

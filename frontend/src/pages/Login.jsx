import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import Button from '../components/Button.jsx';
import logo from '../assets/logo.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(correo, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 20% 20%, var(--nm-navy-700), var(--nm-navy) 60%)',
      padding: 20,
    }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 380, boxShadow: 'var(--nm-shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img src={logo} alt="Netmask" style={{ width: 180 }} />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--nm-text-muted)', fontSize: 13, marginBottom: 24 }}>
          Plataforma de Preventa
        </p>

        <div className="field">
          <label>Correo</label>
          <input className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoFocus />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <Button type="submit" block disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </div>
  );
}

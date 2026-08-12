const SECTORES = ['OT', 'IT', 'IT/OT'];

// Select de comercial agrupado por sector (OT/IT/IT-OT) -- antes duplicado
// entero (filtro + <select> con 3 <optgroup>) en BomNuevo.jsx y BomResumen.jsx.
export default function ComercialSelect({ comerciales, value, onChange, required = false }) {
  return (
    <select className="input" value={value} onChange={onChange} required={required}>
      <option value="">-- Selecciona --</option>
      {SECTORES.map((sector) => {
        const items = comerciales.filter((c) => c.sector === sector);
        if (items.length === 0) return null;
        return (
          <optgroup key={sector} label={sector}>
            {items.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </optgroup>
        );
      })}
    </select>
  );
}

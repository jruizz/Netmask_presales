// Envoltorio de campo de formulario ("<label> + input") -- antes repetido a
// mano (`<div className="field"><label>...</label>...</div>`) unas 66 veces
// en 11 paginas distintas.
export default function Field({ label, children, style, className = 'field' }) {
  return (
    <div className={className} style={style}>
      <label>{label}</label>
      {children}
    </div>
  );
}

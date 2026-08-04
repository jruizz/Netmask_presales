export default function Button({ variant = 'primary', size, block, className = '', children, ...props }) {
  const classes = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

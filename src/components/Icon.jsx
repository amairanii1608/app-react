export default function Icon({ name, size = 20, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`icon icon-${name}${className ? ` ${className}` : ''}`}
      style={{ '--icon-size': `${size}px` }}
    />
  );
}

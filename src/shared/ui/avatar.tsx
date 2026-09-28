export function Avatar({ name, id, large = false }: { name: string; id: string; large?: boolean }) {
  const color = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5;
  const initials =
    name.startsWith('+') || /^\d/.test(name)
      ? name.slice(-2)
      : name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase();
  return (
    <span className={`avatar avatar--${color} ${large ? 'avatar--large' : ''}`} aria-hidden="true">
      {initials}
    </span>
  );
}

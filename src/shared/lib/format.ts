export function normalizePhone(value: string): string {
  if (/[^\d\s()+-]/.test(value))
    throw new Error('Используйте только цифры, пробелы, скобки и знак +.');
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!/^7\d{10}$|^375\d{9}$/.test(digits)) {
    throw new Error('Введите номер РФ (+7) или Беларуси (+375) в международном формате.');
  }
  return digits;
}

export function formatPhone(value?: string): string {
  if (!value) return '';
  if (/^7\d{10}$/.test(value))
    return `+7 ${value.slice(1, 4)} ${value.slice(4, 7)} ${value.slice(7, 9)} ${value.slice(9)}`;
  return `+${value}`;
}

export const formatTime = (time: number) =>
  new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(time);
export const dayKey = (time: number) => new Date(time).toDateString();
export function formatDay(time: number): string {
  const today = new Date();
  if (dayKey(time) === today.toDateString()) return 'Сегодня';
  today.setDate(today.getDate() - 1);
  if (dayKey(time) === today.toDateString()) return 'Вчера';
  return new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    time,
  );
}

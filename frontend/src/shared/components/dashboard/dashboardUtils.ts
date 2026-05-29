export function getDeadlineColor(type: string): string {
  const t = (type || '').toLowerCase();
  if (t.includes('ct')) return 'bg-amber-500';
  if (t.includes('mid')) return 'bg-indigo-600';
  if (t.includes('final')) return 'bg-rose-600';
  if (t.includes('presentation')) return 'bg-emerald-500';
  if (t.includes('project')) return 'bg-violet-600';
  if (t.includes('assignment')) return 'bg-blue-500';
  if (t.includes('lab')) return 'bg-cyan-600';
  return 'bg-slate-600';
}

export function getGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function isLabCourse(name: string): boolean {
  return (name || '').toLowerCase().includes('lab');
}

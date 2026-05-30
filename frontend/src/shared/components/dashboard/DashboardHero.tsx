import React from 'react';
import { format } from 'date-fns';
import { Sunrise, Sun, Moon } from 'lucide-react';
import { getGreeting } from './dashboardUtils';

interface Props {
  section: string;
}

function SectionBadge({ section }: { section: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-indigo-600/25 ring-1 ring-indigo-400/30 dark:ring-indigo-500/40">
      Section {section}
    </span>
  );
}

const DashboardHero: React.FC<Props> = ({ section }) => {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const TimeIcon = hour < 12 ? Sunrise : hour < 17 ? Sun : Moon;

  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 tour-stats">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-50/80 via-transparent to-transparent dark:from-indigo-950/30" />
      <div className="pointer-events-none absolute -top-12 -right-8 w-48 h-48 rounded-full bg-indigo-100/50 dark:bg-indigo-900/20 blur-3xl" />

      <div className="relative flex items-center justify-between gap-4 p-5 lg:p-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
            <TimeIcon size={26} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {getGreeting(now)}
              </p>
              <SectionBadge section={section} />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight mt-1 truncate">
              {format(now, 'EEEE')}
            </h1>
            <p className="text-sm font-medium text-slate-400 mt-1">
              {format(now, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-right shrink-0">
          <p className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">
            {format(now, 'h:mm')}
            <span className="text-sm font-bold text-slate-400 ml-1">{format(now, 'a')}</span>
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">
            {format(now, "'Week' w")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default DashboardHero;

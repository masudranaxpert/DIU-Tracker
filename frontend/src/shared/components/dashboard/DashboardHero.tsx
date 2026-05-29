import React from 'react';
import { format } from 'date-fns';
import { Activity, Clock, GraduationCap, Layers, LucideIcon } from 'lucide-react';
import { getGreeting } from './dashboardUtils';

interface Stat {
  label: string;
  val: React.ReactNode;
  icon: LucideIcon;
}

interface Props {
  section: string;
  subLabel: string;
  todayCount: number;
  totalCredits: number;
  dueSoonCount: number;
}

const DashboardHero: React.FC<Props> = ({
  section,
  subLabel,
  todayCount,
  totalCredits,
  dueSoonCount,
}) => {
  const now = new Date();
  const stats: Stat[] = [
    { label: 'Today', val: todayCount, icon: Activity },
    { label: 'Sub', val: subLabel, icon: Layers },
    { label: 'Credits', val: totalCredits, icon: GraduationCap },
    { label: 'Due Soon', val: dueSoonCount, icon: Clock },
  ];

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 lg:p-6 tour-stats">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-1.5">
            {getGreeting(now)} • Section {section}
          </p>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {format(now, 'EEEE')}
          </h1>
          <p className="text-[13px] font-medium text-slate-400 mt-0.5">{format(now, 'MMMM d, yyyy')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto lg:min-w-[420px]">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon size={13} className="text-slate-400" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                  {item.label}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white truncate tabular-nums">{item.val}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardHero;

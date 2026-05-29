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
    <section className="relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 lg:p-10 text-white shadow-xl shadow-indigo-900/20 tour-stats">
      <div className="absolute -top-20 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-violet-400/20 rounded-full blur-2xl" />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200 mb-2">
            {getGreeting(now)} • Section {section}
          </p>
          <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight leading-tight">
            {format(now, 'EEEE')}
          </h1>
          <p className="text-sm font-bold text-indigo-100/90 mt-1">{format(now, 'MMMM d, yyyy')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[420px]">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <item.icon size={14} className="text-indigo-200" />
                <span className="text-[8px] font-black uppercase tracking-widest text-indigo-200">
                  {item.label}
                </span>
              </div>
              <p className="text-lg font-black truncate">{item.val}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DashboardHero;

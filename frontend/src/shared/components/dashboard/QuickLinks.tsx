import React from 'react';
import { ArrowUpRight, BookOpen, Calendar, LucideIcon, Sparkles, Users } from 'lucide-react';

interface Props {
  courseCount: number;
  noticeCount: number;
  onAction: (tab: string) => void;
}

interface LinkDef {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  tab: string;
}

const QuickLinks: React.FC<Props> = ({ courseCount, noticeCount, onAction }) => {
  const links: LinkDef[] = [
    { id: 'calendar', label: 'Calendar', desc: 'Full schedule', icon: Calendar, color: 'from-indigo-500 to-violet-600', tab: 'calendar' },
    { id: 'courses', label: 'Courses', desc: `${courseCount} enrolled`, icon: BookOpen, color: 'from-emerald-500 to-teal-600', tab: 'courses' },
    { id: 'groups', label: 'Group List', desc: 'PIN protected', icon: Users, color: 'from-amber-500 to-orange-600', tab: 'groups' },
    { id: 'notices', label: 'Notices', desc: `${noticeCount} active`, icon: Sparkles, color: 'from-rose-500 to-pink-600', tab: 'notices' },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          onClick={() => onAction(link.tab)}
          className="group relative overflow-hidden rounded-2xl p-4 lg:p-5 text-left border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <div
            className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${link.color}`}
          />
          <div className="relative z-10 flex items-start justify-between">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} text-white flex items-center justify-center shadow-lg group-hover:bg-white/20 transition-colors`}
            >
              <link.icon size={18} />
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-white transition-colors" />
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-white transition-colors">
              {link.label}
            </p>
            <p className="text-[9px] font-bold text-slate-400 group-hover:text-white/80 transition-colors mt-0.5">
              {link.desc}
            </p>
          </div>
        </button>
      ))}
    </section>
  );
};

export default QuickLinks;

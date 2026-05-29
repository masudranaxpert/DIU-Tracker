import React, { useState } from 'react';
import {
  X, Github, Linkedin, ShieldAlert, Heart,
  ChevronRight, Sun, Moon, LogOut,
  Type, Eye, EyeOff,
  Facebook
} from 'lucide-react';
import { Theme } from '@/shared/types/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdminClick: () => void;
  theme: Theme;
  toggleTheme: () => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  userProfile?: any;
}

const SettingsOverlay: React.FC<Props> = ({
  isOpen, onClose, onAdminClick, theme, toggleTheme, fontScale, setFontScale, onLogout, isLoggedIn
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFocusMode, setIsFocusMode] = React.useState(false);

  React.useEffect(() => {
    if (isFocusMode) {
      document.documentElement.style.filter = 'grayscale(1) contrast(1.1)';
    } else {
      document.documentElement.style.filter = '';
    }
    return () => {
      document.documentElement.style.filter = '';
    };
  }, [isFocusMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-end p-4 sm:p-8 overflow-hidden">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />

      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">Settings </h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Control Center</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-2">Quick Actions</h3>
            <div className="flex gap-4">
              <button
                onClick={toggleTheme}
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all group"
              >
                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-indigo-500 group-hover:scale-90 transition-transform shadow-sm">
                  {theme === 'light' ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
                </div>
                <p className="font-black text-[11px] uppercase tracking-widest text-slate-900 dark:text-white">{theme === 'dark' ? 'Dark' : 'Light'}</p>
              </button>

              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="flex-1 flex flex-col items-center justify-center gap-3 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500 transition-all group"
              >
                <div className={`w-10 h-10 rounded-[1.25rem] flex items-center justify-center text-white group-hover:scale-90 transition-transform shadow-md ${isFocusMode ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-400 shadow-slate-400/20'}`}>
                  {isFocusMode ? <Eye size={18} strokeWidth={2.5} /> : <EyeOff size={18} strokeWidth={2.5} />}
                </div>
                <p className="font-black text-[11px] uppercase tracking-widest text-slate-900 dark:text-white">Eye Comport</p>
              </button>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Font Size</h3>
                <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-black">
                  {fontScale}%
                </div>
              </div>

              <div className="relative pt-1 pb-6 px-2">
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={fontScale}
                  onChange={(e) => setFontScale(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 outline-none transition-colors accent-indigo-600"
                />

                <div className="absolute -bottom-1 left-0 right-0 px-2 flex justify-between text-[10px] font-bold text-slate-400">
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                </div>
                <div className="absolute -bottom-5 left-0 right-0 px-2 flex justify-between text-[9px] font-bold text-slate-400">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </section>



          {/* Development Team */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-2">DCT Team</h3>

            <div className="space-y-4">
              {/* Naim Hossain */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 group/dev">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-indigo-100 dark:bg-indigo-900 shadow-md">
                    <img src="https://media.licdn.com/dms/image/v2/D5603AQHAJ73NfiP-EA/profile-displayphoto-crop_800_800/B56Zvuy.5dK4AI-/0/1769237902610?e=1779926400&v=beta&t=jU4JHT8mSkCK8oVPqJN_wBr9svKGJRXMyg31ABcwGTk" alt="Naim" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase truncate">Naim Hossain</h4>
                    <p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest truncate">Full Stack • Sys Admin</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight leading-relaxed mb-4">
                  Frontend • Backend  • Architecture
                </p>
                <div className="flex gap-2">
                  <a href="https://www.facebook.com/naim.hossain.355d" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-[#0077b5] hover:text-white transition-all text-[9px] font-black uppercase">
                    <Facebook size={12} /> Facebook
                  </a>
                  <a href="https://github.com/Naim-006" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white transition-all text-[9px] font-black uppercase">
                    <Github size={12} /> Github
                  </a>
                  <a href="https://www.linkedin.com/in/naim-hossain-973a9432a/" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-[#0077b5] hover:text-white transition-all text-[9px] font-black uppercase">
                    <Linkedin size={12} /> Linkedin
                  </a>
                </div>
              </div>

              {/* Masud Rana */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 group/dev">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-emerald-100 dark:bg-emerald-900 shadow-md">
                    <img src="https://avatars.githubusercontent.com/u/205129836?v=4" alt="masud" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase truncate">Masud Rana</h4>
                    <p className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest truncate">Database </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight leading-relaxed mb-4">
                  AI Integration • DataBase
                </p>
                <div className="flex gap-2">
                  <a href="https://www.facebook.com/masudranafaizan/" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-[#0077b5] hover:text-white transition-all text-[9px] font-black uppercase">
                    <Facebook size={12} /> Facebook
                  </a>
                  <a href="https://github.com/masudranaxpert" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white transition-all text-[9px] font-black uppercase">
                    <Github size={12} /> Github
                  </a>
                  <a href="https://www.linkedin.com/in/masud-rana-216b6b222/" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-[#0077b5] hover:text-white transition-all text-[9px] font-black uppercase">
                    <Linkedin size={12} /> Linkedin
                  </a>
                </div>
              </div>
            </div>
          </section>



          {/* Coordinator Team */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-2">CR coordinator</h3>

            <div className="space-y-4">
              {/* Mostak ratul  */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 group/dev">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-indigo-100 dark:bg-indigo-900 shadow-md">
                    <img src="https://media.licdn.com/dms/image/v2/D4E03AQFr1wZoluCgmg/profile-displayphoto-crop_800_800/B4EZhHkay1GYAM-/0/1753547387466?e=1779926400&v=beta&t=xr7kjE4w3TIczmPU5ud23kjeDScfSiCqeEZ16VLsc0g" alt="Naim" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase truncate">Mostak Ahmmed Ratul</h4>

                  </div>
                </div>

                <div className="flex gap-2">

                  <a href="https://www.facebook.com/md.mostak.ahmmed.ratul" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-[#0077b5] hover:text-white transition-all text-[9px] font-black uppercase">
                    <Facebook size={12} /> Facebook
                  </a>
                  <a href="https://www.linkedin.com/in/md-mostak-ahmmed-ratul" target="_blank" rel="noreferrer" className="flex-1 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 hover:bg-[#0077b5] hover:text-white transition-all text-[9px] font-black uppercase">
                    <Linkedin size={12} /> Linkedin
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Statistics & Rating */}

        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          {isLoggedIn && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-4 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-500 hover:text-white transition-all shadow-sm shadow-rose-500/10 active:scale-95"
            >
              <LogOut size={16} /> Logout Account
            </button>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest">
              <Heart size={14} fill="currentColor" /> DIU CSE DEPT.
            </div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">v1.0-STABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverlay;

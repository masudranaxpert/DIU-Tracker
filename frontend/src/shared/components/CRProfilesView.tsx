
import React, { useState, useEffect } from 'react';
import { UserProfile, Section } from '@/shared/types/types';
import { studentService } from '@/shared/services/studentService';
import { resolveMediaUrl } from '@/shared/utils/mediaUrl';
import {
  UserCircle,
  Facebook,
  MessageCircle,
  Send,
  ShieldCheck,
  Mail,
  ExternalLink,
  Loader2,
  AlertCircle,
  GraduationCap,
  Phone,
  PhoneCall
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  batchId: string;
  section: Section;
}

const CRProfilesView: React.FC<Props> = ({ batchId, section }) => {
  const [crs, setCrs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCRs = async () => {
      try {
        setLoading(true);
        const data = await studentService.getSectionCRs(batchId, section);
        setCrs(data);
      } catch (err) {
        console.error('[CRProfilesView] Error fetching CRs:', err);
        setError('Failed to load CR profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchCRs();
  }, [batchId, section]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing CR Profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">Connection Issue</h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-10 p-2 lg:p-6 pb-20">
      <div className="relative overflow-hidden bg-indigo-600 rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl shadow-indigo-600/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Class Representatives</h2>
                <p className="text-xs font-black text-indigo-100 uppercase tracking-[0.3em]">Official CR • Section {section}</p>
              </div>
            </div>

          </div>
          <div className="hidden lg:block">
            <div className="px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1 text-center">Verified CRs</p>
              <div className="text-3xl font-black text-white text-center">{crs.length}</div>
            </div>
          </div>
        </div>
      </div>

      {crs.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-400">
            <UserCircle size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">No CR Profiles Linked</h3>
          <p className="text-slate-400 font-bold text-sm mt-2 max-w-sm mx-auto">Wait for your Section CRs to register and complete their profiles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {crs.map((cr, idx) => (
            <motion.div
              key={cr.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500"
            >
              <div className="p-8 pb-4">
                <div className="flex items-start justify-between">
                  <div className="w-20 h-20 rounded-[1.8rem] overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-inner group-hover:border-indigo-600 transition-all duration-500 relative">
                    {cr.avatar_url ? (
                      <img
                        src={resolveMediaUrl(cr.avatar_url)}
                        alt={cr.full_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ''; // Force fallback
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        <UserCircle size={40} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-lg uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck size={10} /> Official CR
                    </span>
                    {cr.sub_section && (
                      <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black rounded-lg uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-1.5 shadow-sm">
                        Group {cr.sub_section}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{cr.full_name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">
                    <GraduationCap size={14} className="text-indigo-500" />
                    {(cr as any).batches?.name || 'Academic Batch'}
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8 space-y-6">
                <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

                <div className="grid grid-cols-4 gap-2">
                  {cr.facebook_url ? (
                    <a href={cr.facebook_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-600/20 transition-all group/icon">
                      <Facebook size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">FB</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/20 rounded-2xl text-slate-300 opacity-50">
                      <Facebook size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">N/A</span>
                    </div>
                  )}

                  {cr.whatsapp_number ? (
                    <a href={`https://wa.me/${cr.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all group/icon">
                      <MessageCircle size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">WA</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/20 rounded-2xl text-slate-300 opacity-50">
                      <MessageCircle size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">N/A</span>
                    </div>
                  )}

                  {cr.telegram_username ? (
                    <a href={`https://t.me/${cr.telegram_username.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 hover:bg-sky-500 hover:text-white hover:shadow-lg hover:shadow-sky-500/20 transition-all group/icon">
                      <Send size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">TG</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/20 rounded-2xl text-slate-300 opacity-50">
                      <Send size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">N/A</span>
                    </div>
                  )}

                  {cr.whatsapp_number ? (
                    <a href={`tel:${cr.whatsapp_number.replace(/\D/g, '')}`} className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 transition-all group/icon">
                      <Phone size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">Call</span>
                    </a>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/20 rounded-2xl text-slate-300 opacity-50">
                      <Phone size={18} />
                      <span className="text-[7px] font-black uppercase tracking-widest">N/A</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-indigo-500 shadow-sm flex-shrink-0">
                        <Mail size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Institutional Email</p>
                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate tracking-tight">{cr.email}</p>
                      </div>
                    </div>
                    <a href={`mailto:${cr.email}`} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {cr.whatsapp_number && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                          <PhoneCall size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Direct Contact</p>
                          <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 tracking-wider">
                            {cr.whatsapp_number}
                          </p>
                        </div>
                      </div>
                      <a href={`tel:${cr.whatsapp_number.replace(/\D/g, '')}`} className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-indigo-600/20">
                        Call
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CRProfilesView;

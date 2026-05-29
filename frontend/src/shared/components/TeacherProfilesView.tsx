import React, { useState, useEffect } from 'react';
import { TeacherProfile } from '@/shared/types/types';
import { Search, Phone, Mail, MapPin, GraduationCap, UserSquare2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminService } from '@/shared/services/adminService';

const TeacherProfilesView: React.FC = () => {
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.fetchTeacherProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Failed to load teacher profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(
    p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
      <div className="p-8 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <UserSquare2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Teachers Profiles</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">View only — contact admin to update</p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] font-bold uppercase outline-none focus:border-emerald-500 transition-all dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading profiles...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
              <UserSquare2 size={32} />
            </div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {searchQuery ? 'No matching profiles found' : 'No profiles available'}
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all relative overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors">
                  <GraduationCap size={120} />
                </div>

                <div className="relative z-10 space-y-5">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded mb-2">
                      {profile.designation || 'Faculty'}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                      {profile.name}
                    </h3>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  <div className="space-y-3">
                    {profile.email && (
                      <a href={`mailto:${profile.email}`} className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors group/link">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover/link:bg-emerald-50 group-hover/link:text-emerald-600 transition-colors">
                          <Mail size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                          <p className="text-[11px] font-bold truncate">{profile.email}</p>
                        </div>
                      </a>
                    )}

                    {profile.contact_number && (
                      <a href={`tel:${profile.contact_number}`} className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors group/link">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover/link:bg-emerald-50 group-hover/link:text-emerald-600 transition-colors">
                          <Phone size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                          <p className="text-[11px] font-bold">{profile.contact_number}</p>
                        </div>
                      </a>
                    )}

                    {profile.room_no && (
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <MapPin size={14} className="text-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Office / Room</p>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{profile.room_no}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherProfilesView;

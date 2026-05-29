import React, { useState, useEffect } from 'react';
import { Section, Batch } from '@/shared/types/types';
import { SECTIONS } from '@/shared/utils/constants';
import { Layers, ChevronRight, Hash, Users, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  batches: Batch[];
  onSelect: (batchId: string, section: Section, subSection?: string) => void;
}

const SectionSelector: React.FC<Props> = ({ batches, onSelect }) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<Section | ''>('');
  const [selectedSubSection, setSelectedSubSection] = useState<string>('');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);

  // Reset downstream selections when upstream changes
  useEffect(() => {
    setSelectedSection('');
    setSelectedSubSection('');
  }, [selectedBatchId]);

  useEffect(() => {
    setSelectedSubSection('');
  }, [selectedSection]);

  const handleEnter = () => {
    if (selectedBatchId && selectedSection) {
      onSelect(selectedBatchId, selectedSection, selectedSubSection || undefined);
    }
  };

  const isReady = selectedBatchId && selectedSection;
  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-6 bg-slate-50 dark:bg-slate-900 relative overflow-hidden transition-colors duration-500">
      {/* Background Mesh Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white/20 dark:border-slate-800 p-8 md:p-10"
        >
          <div className="flex flex-col items-center text-center mb-10">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-indigo-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 shadow-xl p-3 overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase italic">DIU CLASS <span className="text-indigo-500">TRACKER</span></h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] px-4">Academic Portal Entrance</p>
          </div>

          <div className="space-y-6">
            {/* Batch Selector (Custom Dropdown) */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Layers size={12} className="text-indigo-500" /> 01. Select Batch
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                  className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between font-bold text-slate-700 dark:text-white transition-all hover:border-indigo-300 dark:hover:border-indigo-900 ${isBatchDropdownOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''}`}
                >
                  <span className={selectedBatchId ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                    {selectedBatch ? selectedBatch.name : 'Choose your Batch...'}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isBatchDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isBatchDropdownOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-transparent cursor-pointer"
                        onClick={() => setIsBatchDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar"
                      >
                        {batches.map(b => (
                          <button
                            key={b.id}
                            onClick={() => {
                              setSelectedBatchId(b.id);
                              setIsBatchDropdownOpen(false);
                            }}
                            className={`w-full px-6 py-4 text-left font-bold transition-colors flex items-center justify-between ${selectedBatchId === b.id ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            {b.name}
                            {selectedBatchId === b.id && <CheckCircle2 size={16} />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Section Selector (Custom Dropdown) */}
            <div className={`space-y-3 transition-opacity duration-300 ${!selectedBatchId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Hash size={12} className="text-emerald-500" /> 02. Select Section
              </label>
              <div className="relative">
                <button
                  disabled={!selectedBatchId}
                  onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                  className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between font-bold text-slate-700 dark:text-white transition-all hover:border-emerald-300 dark:hover:border-emerald-900 ${isSectionDropdownOpen ? 'ring-2 ring-emerald-500/20 border-emerald-500' : ''} disabled:opacity-50`}
                >
                  <span className={selectedSection ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                    {selectedSection ? `Section ${selectedSection}` : 'Choose your Section...'}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isSectionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isSectionDropdownOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-transparent cursor-pointer"
                        onClick={() => setIsSectionDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto no-scrollbar"
                      >
                        {SECTIONS.map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              setSelectedSection(s as Section);
                              setIsSectionDropdownOpen(false);
                            }}
                            className={`w-full px-6 py-4 text-left font-bold transition-colors flex items-center justify-between ${selectedSection === s ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            Section {s}
                            {selectedSection === s && <CheckCircle2 size={16} />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Group Selector (Animated Pill) */}
            <div className={`space-y-3 transition-opacity duration-300 ${!selectedSection ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                <Users size={12} className="text-amber-500" /> 03. Group Context
              </label>
              <div className="flex p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  disabled={!selectedSection}
                  onClick={() => setSelectedSubSection('')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!selectedSubSection ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Whole
                </button>
                <button
                  disabled={!selectedSection}
                  onClick={() => setSelectedSubSection('1')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedSubSection === '1' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {selectedSection || '?'}1
                </button>
                <button
                  disabled={!selectedSection}
                  onClick={() => setSelectedSubSection('2')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedSubSection === '2' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {selectedSection || '?'}2
                </button>
              </div>
            </div>
          </div>

          <motion.button
            onClick={handleEnter}
            disabled={!isReady}
            whileHover={isReady ? { scale: 1.02, y: -2 } : {}}
            whileTap={isReady ? { scale: 0.98 } : {}}
            className={`w-full mt-8 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-2xl transition-all duration-300 ${isReady
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-600/30 ring-4 ring-indigo-500/10'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed grayscale'
              }`}
          >
            Access Portal <ChevronRight size={16} className={isReady ? 'animate-bounce-x' : ''} />
          </motion.button>
        </motion.div>

        <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 opacity-60">
          Academic Sync System • v3.6
        </p>
      </div>
    </div>
  );
};

export default SectionSelector;

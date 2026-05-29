
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Code2 } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const SplashScreen: React.FC<Props> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 2.8, duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[1000] bg-slate-900 flex flex-col items-center justify-center overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.05, 1], opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative mb-8"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-32 h-32 bg-white/10 backdrop-blur-md p-4 rounded-[3rem] border border-white/20 shadow-[0_0_60px_rgba(79,70,229,0.3)] flex items-center justify-center overflow-hidden"
        >
          <img src="/logo.png" alt="DCT Logo" className="w-full h-full object-contain" />
        </motion.div>

        {/* Orbiting Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-6 border-[3px] border-indigo-500/10 border-t-indigo-500 rounded-[4rem]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-10 border-[1px] border-emerald-500/10 border-b-emerald-500 rounded-[5rem]"
        />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black text-white tracking-tighter mb-2 italic">
          DIU <span className="text-indigo-500">TRACKER</span>
        </h1>
        <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold text-[10px] tracking-[0.5em] uppercase px-4">
          <div className="w-8 h-px bg-indigo-500/30" />
          Your Academic Assistant
          <div className="w-8 h-px bg-indigo-500/30" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-12 text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase"
      >
        Version 1.0 Stable
      </motion.div>

      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />
    </motion.div>
  );
};

export default SplashScreen;

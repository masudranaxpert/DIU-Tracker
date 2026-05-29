import React, { useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { Check, Pencil, Trash2, UserPlus, Users, X } from 'lucide-react';
import { GroupMember, Student } from '@/shared/types/types';
import { initials, avatarClass } from '@/shared/lib/avatar';

interface Props {
  groupNumber: number;
  members: GroupMember[];
  available: Student[];
  onAdd: (student: { student_id: string; name: string }) => void;
  onRemove: (memberIdx: number) => void;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    bgcolor: 'transparent',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: 600,
    '& fieldset': { borderColor: 'rgba(100,116,139,0.25)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
};

const GroupEditorCard: React.FC<Props> = ({ groupNumber, members, available, onAdd, onRemove }) => {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');

  const filledCount = members.filter((m) => m.student_id || m.name).length;

  const closeManual = () => {
    setManualOpen(false);
    setManualId('');
    setManualName('');
  };

  const submitManual = () => {
    const id = manualId.trim();
    const name = manualName.trim();
    if (!id && !name) return;
    onAdd({ student_id: id, name: name || id });
    closeManual();
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
            G{groupNumber}
          </span>
          <span className="text-[13px] font-bold text-slate-900 dark:text-white">
            Group {groupNumber}
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
          {filledCount} {filledCount === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Members */}
      <div className="p-2.5 space-y-1.5 flex-1">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 text-center text-slate-300 dark:text-slate-600">
            <Users size={20} className="mb-1.5" />
            <p className="text-[9px] font-bold uppercase tracking-widest">No members yet</p>
          </div>
        ) : (
          members.map((member, idx) => (
            <div
              key={member.id || `${member.student_id}-${idx}`}
              className="group flex items-center gap-2.5 px-2 py-2 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
            >
              <span
                className={`w-8 h-8 rounded-md ${avatarClass} flex items-center justify-center text-[10px] font-bold shrink-0`}
              >
                {initials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {member.name || 'Unnamed'}
                </p>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300 leading-none">
                  {member.student_id || '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shrink-0 cursor-pointer"
                aria-label="Remove member"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add controls */}
      <div className="p-2.5 pt-0 space-y-2">
        <Autocomplete
          size="small"
          options={available}
          value={null}
          blurOnSelect
          clearOnBlur
          getOptionLabel={(o) => `${o.name} — ${o.student_id}`}
          filterOptions={(opts, state) => {
            const q = state.inputValue.trim().toLowerCase();
            if (!q) return opts;
            return opts.filter(
              (o) => o.name.toLowerCase().includes(q) || o.student_id.toLowerCase().includes(q)
            );
          }}
          onChange={(_, student) => {
            if (student) onAdd({ student_id: student.student_id, name: student.name });
          }}
          isOptionEqualToValue={(a, b) => a.student_id === b.student_id}
          noOptionsText="No available students"
          renderOption={(props, option) => (
            <li {...props} key={option.student_id}>
              <span
                className={`w-6 h-6 rounded-md ${avatarClass} flex items-center justify-center text-[8px] font-bold mr-2 shrink-0`}
              >
                {initials(option.name)}
              </span>
              <span className="flex flex-col">
                <span className="text-[12px] font-semibold text-slate-800 leading-tight">
                  {option.name}
                </span>
                <span className="text-[10px] font-mono text-indigo-500">{option.student_id}</span>
              </span>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Add from roster…"
              sx={fieldSx}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <UserPlus size={14} className="text-slate-400 ml-1.5 mr-0.5 shrink-0" />
                ),
              }}
            />
          )}
        />
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
        >
          <Pencil size={12} /> Add manually
        </button>
      </div>

      {/* Manual add modal */}
      {manualOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={closeManual}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">
                  G{groupNumber}
                </span>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                    Add to Group {groupNumber}
                  </h4>
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                    Manual entry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeManual}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Student ID
                </label>
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder="e.g. 252-15-346"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  sx={fieldSx}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Full name
                </label>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="e.g. Masud Rana"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitManual()}
                  sx={fieldSx}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeManual}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitManual}
                disabled={!manualId.trim() && !manualName.trim()}
                className="flex-[1.4] inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                <Check size={15} /> Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupEditorCard;

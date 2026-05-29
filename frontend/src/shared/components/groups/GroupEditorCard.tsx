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
    minHeight: 38,
    bgcolor: 'transparent',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 600,
    '& fieldset': { borderColor: 'rgba(100,116,139,0.25)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
};

const GroupEditorCard: React.FC<Props> = ({ groupNumber, members, available, onAdd, onRemove }) => {
  const [manualMode, setManualMode] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');

  const filledCount = members.filter((m) => m.student_id || m.name).length;

  const submitManual = () => {
    const id = manualId.trim();
    const name = manualName.trim();
    if (!id && !name) return;
    onAdd({ student_id: id, name: name || id });
    setManualId('');
    setManualName('');
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
              className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span
                className={`w-7 h-7 rounded-md ${avatarClass} flex items-center justify-center text-[9px] font-bold shrink-0`}
              >
                {initials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {member.name || 'Unnamed'}
                </p>
                <p className="text-[9px] font-mono text-slate-400 truncate">
                  {member.student_id || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                aria-label="Remove member"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add */}
      <div className="p-2.5 pt-0 space-y-2">
        {manualMode ? (
          <div className="space-y-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <TextField
              size="small"
              fullWidth
              placeholder="Student ID"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              sx={fieldSx}
            />
            <TextField
              size="small"
              fullWidth
              placeholder="Full name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitManual()}
              sx={fieldSx}
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={submitManual}
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                <Check size={13} /> Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualMode(false);
                  setManualId('');
                  setManualName('');
                }}
                className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Cancel manual add"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <>
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
                  (o) =>
                    o.name.toLowerCase().includes(q) || o.student_id.toLowerCase().includes(q)
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
                    <span className="text-[10px] font-mono text-slate-400">{option.student_id}</span>
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
              onClick={() => setManualMode(true)}
              className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-slate-200 dark:border-slate-700 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
            >
              <Pencil size={11} /> Add manually
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupEditorCard;

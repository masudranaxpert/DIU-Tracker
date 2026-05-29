import React, { useState } from 'react';
import { Autocomplete, IconButton, TextField } from '@mui/material';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { GroupMember, Student } from '@/shared/types/types';
import { initials, gradientFor } from '@/shared/lib/avatar';

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
    bgcolor: 'rgba(255,255,255,0.92)',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: 700,
    '& fieldset': { borderColor: 'rgba(99,102,241,0.16)' },
    '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.34)' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
};

const GroupEditorCard: React.FC<Props> = ({ groupNumber, members, available, onAdd, onRemove }) => {
  const [inputValue, setInputValue] = useState('');

  const filledCount = members.filter((m) => m.student_id || m.name).length;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center text-[11px] font-black shadow-sm shadow-indigo-600/20">
            G{groupNumber}
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Group {groupNumber}
          </span>
        </div>
        <span className="px-2.5 py-1 bg-white/70 dark:bg-slate-900/60 rounded-md text-[9px] font-black text-indigo-600 dark:text-indigo-300 uppercase">
          {filledCount}
        </span>
      </div>

      {/* Members */}
      <div className="p-3 space-y-1.5 flex-1">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 text-center text-slate-300 dark:text-slate-600">
            <Users size={22} className="mb-1.5" />
            <p className="text-[9px] font-black uppercase tracking-widest">No members yet</p>
          </div>
        ) : (
          members.map((member, idx) => (
            <div
              key={member.id || `${member.student_id}-${idx}`}
              className="group flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
            >
              <span
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientFor(
                  member.student_id || member.name
                )} text-white flex items-center justify-center text-[9px] font-black shrink-0`}
              >
                {initials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {member.name || 'Unnamed'}
                </p>
                <p className="text-[9px] font-mono font-semibold text-indigo-500 dark:text-indigo-400 truncate">
                  {member.student_id || '—'}
                </p>
              </div>
              <IconButton
                size="small"
                onClick={() => onRemove(idx)}
                sx={{ color: '#cbd5e1', '&:hover': { color: '#ef4444' } }}
              >
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))
        )}
      </div>

      {/* Add student */}
      <div className="p-3 pt-0">
        <Autocomplete
          size="small"
          options={available}
          inputValue={inputValue}
          onInputChange={(_, val, reason) => {
            if (reason !== 'reset') setInputValue(val);
          }}
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
            if (student) {
              onAdd({ student_id: student.student_id, name: student.name });
              setInputValue('');
            }
          }}
          isOptionEqualToValue={(a, b) => a.student_id === b.student_id}
          noOptionsText="No available students"
          renderOption={(props, option) => (
            <li {...props} key={option.student_id}>
              <span
                className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradientFor(
                  option.student_id || option.name
                )} text-white flex items-center justify-center text-[8px] font-black mr-2 shrink-0`}
              >
                {initials(option.name)}
              </span>
              <span className="flex flex-col">
                <span className="text-[12px] font-bold text-slate-800 leading-tight">
                  {option.name}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{option.student_id}</span>
              </span>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Add by name or ID…"
              sx={fieldSx}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <UserPlus size={15} className="text-indigo-400 ml-1.5 mr-0.5 shrink-0" />
                ),
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default GroupEditorCard;

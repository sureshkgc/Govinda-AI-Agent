
import React from 'react';
import { Transcript } from '../types';
import { BotIcon, UserIcon } from './icons';

interface TranscriptEntryProps {
  entry: Transcript;
}

const TranscriptEntry: React.FC<TranscriptEntryProps> = ({ entry }) => {
  const isModel = entry.speaker === 'model';
  const isSystem = entry.speaker === 'system';

  if (isSystem) {
      return (
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 my-2">
              --- {entry.text} ---
          </div>
      )
  }

  return (
    <div className={`flex items-start gap-3 my-2 ${isModel ? 'justify-start' : 'justify-end'}`}>
      {isModel && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-slate-500" />
        </div>
      )}
      <div
        className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-sm break-words ${
          isModel
            ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
            : 'bg-blue-600 text-white rounded-br-none'
        }`}
      >
        <p className="text-sm leading-relaxed">{entry.text}</p>
      </div>
       {!isModel && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
        </div>
      )}
    </div>
  );
};

export default TranscriptEntry;

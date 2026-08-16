import React from 'react';
import { JobType } from '../types';
import { JOBS } from '../jobData';

interface JobSelectModalProps {
  currentJob: JobType;
  onSelectJob: (job: JobType) => void;
  onClose: () => void;
}

export const JobSelectModal: React.FC<JobSelectModalProps> = ({
  currentJob,
  onSelectJob,
  onClose,
}) => {
  const jobKeys = Object.keys(JOBS) as JobType[];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="pixel-panel max-w-xl w-full bg-slate-900 border-2 border-indigo-500 p-4 sm:p-5 text-slate-100 shadow-[0_0_30px_rgba(99,102,241,0.3)] my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-indigo-300">特化職（ジョブ）神殿</h2>
              <p className="text-[10px] text-slate-400">プレイスタイルに合わせて特化能力をいつでも自由に選択・変更可能！</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn text-xs !py-1 !px-2.5 !bg-slate-800 !text-slate-400 hover:!text-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Job List */}
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {jobKeys.map(jobKey => {
            const job = JOBS[jobKey];
            const isSelected = currentJob === jobKey;

            return (
              <div
                key={jobKey}
                className={`p-3.5 rounded-lg border-2 transition-all relative ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.25)]'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-3 px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500 text-white shadow-sm">
                    選択中
                  </span>
                )}

                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-2xl">{job.icon}</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                      {job.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-tight">{job.description}</p>
                  </div>
                </div>

                {/* Perk list */}
                <div className="bg-slate-900/90 rounded p-2 border border-slate-800/80 mt-2 space-y-1">
                  <div className="text-[9px] text-indigo-300 font-bold mb-1">✨ 特化パッシブ能力:</div>
                  {job.perks.map((perk, idx) => (
                    <div key={idx} className="text-[10px] text-slate-200 flex items-start gap-1.5 leading-snug">
                      <span className="text-indigo-400 font-bold shrink-0">•</span>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>

                {/* Select button */}
                <div className="mt-3 flex justify-end">
                  {isSelected ? (
                    <button
                      disabled
                      className="pixel-btn text-[10px] !py-1 !px-4 opacity-60 cursor-default bg-indigo-900 text-indigo-200 border-indigo-500"
                    >
                      現在適用中
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectJob(jobKey);
                        onClose();
                      }}
                      className="pixel-btn text-[10px] !py-1 !px-4 !bg-indigo-600 hover:!bg-indigo-500 !text-white !border-indigo-400 active font-bold"
                    >
                      {job.icon} {job.name} に転職する
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="pixel-btn text-xs !py-1.5 !px-5 !bg-slate-800 !text-slate-300 !border-slate-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

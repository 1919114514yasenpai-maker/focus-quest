import React from 'react';
import { JobType } from '../types';
import { JOBS } from '../jobData';
import { isJobUnlocked, canChangeJobNow, getNextJobChangeLevel } from '../jobUtils';

interface JobSelectModalProps {
  currentJob: JobType;
  level: number;
  lastJobChangeLevel?: number;
  isMilestoneTrigger?: boolean;
  onSelectJob: (job: JobType) => void;
  onClose: () => void;
  onDismissMilestone?: () => void;
}

export const JobSelectModal: React.FC<JobSelectModalProps> = ({
  currentJob,
  level,
  lastJobChangeLevel,
  isMilestoneTrigger = false,
  onSelectJob,
  onClose,
  onDismissMilestone,
}) => {
  const jobKeys = Object.keys(JOBS) as JobType[];
  const unlocked = isJobUnlocked(level);
  const eligibleToChange = canChangeJobNow(level, lastJobChangeLevel);
  const nextChangeLevel = getNextJobChangeLevel(level);

  const handleClose = () => {
    if (isMilestoneTrigger && onDismissMilestone) {
      onDismissMilestone();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="pixel-panel max-w-xl w-full bg-slate-900 border-2 border-indigo-500 p-4 sm:p-5 text-slate-100 shadow-[0_0_35px_rgba(99,102,241,0.35)] my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isMilestoneTrigger ? '⚡' : '🏛️'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-indigo-300">
                  {isMilestoneTrigger ? `祝・Lv.${level}到達！ 転職の儀式` : '特化職（ジョブ）神殿'}
                </h2>
                {eligibleToChange ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                    ✨ 転職可能！
                  </span>
                ) : !unlocked ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    🔒 未解禁
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                    👁️ 閲覧モード
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {!unlocked
                  ? `特化職は【Lv.100】到達で解禁されます（現在 Lv.${level}）。`
                  : eligibleToChange
                  ? `現在その場でのみ1回だけ特化職の変更が可能です！（※スキップすると次回 Lv.${nextChangeLevel} まで変更できません）`
                  : `特化職は Lv.100解禁後、Lv.500ごと（次回: Lv.${nextChangeLevel}）にその場でのみ変更可能です（貯蓄不可）。`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="pixel-btn text-xs !py-1 !px-2.5 !bg-slate-800 !text-slate-400 hover:!text-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Milestone Warning Box */}
        {eligibleToChange && (
          <div className="mb-3 p-2.5 bg-amber-950/70 border border-amber-500/80 rounded text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <strong className="text-amber-300">【転職ルールのご案内】</strong>
              <p className="mt-0.5 text-[10px] text-amber-200/90">
                特化職の選択・変更は<strong>「この到達レベルのその場でのみ」</strong>有効です。権利を貯めて後から変更することはできません。
              </p>
            </div>
          </div>
        )}

        {!unlocked && (
          <div className="mb-3 p-2.5 bg-slate-950/90 border border-slate-700 rounded text-slate-300 text-[11px] flex items-center gap-2">
            <span className="text-base shrink-0">🔒</span>
            <p className="text-[10px] text-slate-300 leading-snug">
              勇者レベルが <strong>Lv.100</strong> に到達すると神殿の封印が解かれ、好きな特化職を選択できるようになります！
            </p>
          </div>
        )}

        {/* Job List */}
        <div className="space-y-3 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto pr-1">
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
                    現在選択中
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

                {/* Action button */}
                <div className="mt-3 flex justify-end">
                  {isSelected ? (
                    <button
                      disabled
                      className="pixel-btn text-[10px] !py-1 !px-4 opacity-60 cursor-default bg-indigo-900 text-indigo-200 border-indigo-500"
                    >
                      現在適用中
                    </button>
                  ) : eligibleToChange ? (
                    <button
                      onClick={() => {
                        onSelectJob(jobKey);
                        onClose();
                      }}
                      className="pixel-btn text-[10px] !py-1 !px-4 !bg-amber-600 hover:!bg-amber-500 !text-white !border-amber-400 active font-bold animate-bounce"
                    >
                      {job.icon} {job.name} に転職する
                    </button>
                  ) : !unlocked ? (
                    <button
                      disabled
                      className="pixel-btn text-[10px] !py-1 !px-4 opacity-40 cursor-not-allowed bg-slate-900 text-slate-400 border-slate-700"
                    >
                      🔒 Lv.100で解禁
                    </button>
                  ) : (
                    <button
                      disabled
                      className="pixel-btn text-[10px] !py-1 !px-4 opacity-40 cursor-not-allowed bg-slate-900 text-slate-400 border-slate-700"
                    >
                      🔒 次回 Lv.{nextChangeLevel} で変更可
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[10px] text-slate-400">
            {unlocked ? (
              <span>次回転職チャンス: <strong className="text-amber-300">Lv.{nextChangeLevel}</strong></span>
            ) : (
              <span>解禁まであと: <strong className="text-amber-300">{Math.max(0, 100 - level)} レベル</strong></span>
            )}
          </div>
          <div className="flex gap-2">
            {eligibleToChange && isMilestoneTrigger && (
              <button
                onClick={handleClose}
                className="pixel-btn text-xs !py-1.5 !px-3 !bg-slate-800 !text-amber-300 !border-amber-600 hover:!bg-slate-700"
              >
                現職を維持して進む
              </button>
            )}
            <button
              onClick={handleClose}
              className="pixel-btn text-xs !py-1.5 !px-5 !bg-slate-800 !text-slate-300 !border-slate-600"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const fs = require('fs');
let code = fs.readFileSync('src/components/Inventory.tsx', 'utf8');

// Title area patch
code = code.replace(
/                <span className="text-base font-bold text-slate-100">\{compiled\.name\}<\/span>/g,
`                <span className="text-base font-bold text-slate-100">{compiled.name}</span>
                {detailPlayerItem.engraving && (
                  <span className="text-[10px] bg-slate-800 text-indigo-300 border border-slate-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                    🛡️ {detailPlayerItem.engraving}
                  </span>
                )}`);

// Button area patch
// Look for   <div className="flex gap-2 flex-wrap"> (after <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">)
// or just find where 'onToggleLock' is used
code = code.replace(
/              \{onToggleLock && \(\n                <button/g,
`              {guildName && !detailPlayerItem.engraving && onEngraveItem && (
                <button 
                  onClick={() => {
                    if (confirm(\`「\${compiled.name}」にギルド名「\${guildName}」を刻印しますか？\`)) {
                      onEngraveItem(detailPlayerItem.uid, guildName);
                      setDetailPlayerItem(null);
                    }
                  }}
                  className="pixel-btn text-[10px] sm:text-xs !py-1.5 !px-2 !bg-indigo-700 !border-indigo-500 hover:!bg-indigo-600 flex-1"
                >
                  🛡️ ギルド刻印
                </button>
              )}
              {onToggleLock && (
                <button`
);

fs.writeFileSync('src/components/Inventory.tsx', code);

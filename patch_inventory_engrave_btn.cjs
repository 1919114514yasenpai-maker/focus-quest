const fs = require('fs');
let code = fs.readFileSync('src/components/Inventory.tsx', 'utf8');

code = code.replace(
/            <div className="flex gap-2">\n              <button\n                onClick=\{\(\) => onToggleLock && onToggleLock\(detailPlayerItem\.uid\)\}/g,
`            <div className="flex gap-2 flex-wrap">
              {guildName && !detailPlayerItem.engraving && onEngraveItem && (
                <button 
                  onClick={() => {
                    if (confirm(\`「\${compiled.name}」にギルド名「\${guildName}」を刻印しますか？\`)) {
                      onEngraveItem(detailPlayerItem.uid, guildName);
                      setDetailPlayerItem(null);
                    }
                  }}
                  className="pixel-btn text-xs flex-1 min-w-[40%] !bg-indigo-700 !border-indigo-500 hover:!bg-indigo-600"
                >
                  🛡️ ギルド刻印
                </button>
              )}
              <button
                onClick={() => onToggleLock && onToggleLock(detailPlayerItem.uid)}`
);

fs.writeFileSync('src/components/Inventory.tsx', code);

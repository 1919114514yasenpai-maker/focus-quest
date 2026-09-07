const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
/      \{showGuildRanking && <GuildRanking onClose=\{\(\) => setShowGuildRanking\(false\)\} \/>\}/g,
`      {showGuildRanking && <GuildRanking onClose={() => setShowGuildRanking(false)} inventory={inventory} onEngrave={(uid, text) => {
        setInventory(prev => prev.map(item => item.uid === uid ? { ...item, engraving: text } : item));
        showToast('✨ ギルド名を刻印しました！');
      }} />}`
);

fs.writeFileSync('src/App.tsx', code);

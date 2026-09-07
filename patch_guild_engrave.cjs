const fs = require('fs');
let code = fs.readFileSync('src/components/GuildRanking.tsx', 'utf8');

// Need to import ItemIcon and ITEMS
if (!code.includes("import { ItemIcon }")) {
  code = code.replace(/import \{ generateUid \} from '\.\.\/gameData';/g, "import { generateUid } from '../gameData';\nimport { ItemIcon } from './Inventory';\nimport { ITEMS } from '../gameData';\nimport { PlayerItem } from '../types';");
}

code = code.replace(
/  const \[iVotedFor, setIVotedFor\] = useState<string \| null>\(null\);/g,
`  const [iVotedFor, setIVotedFor] = useState<string | null>(null);
  const [showEngraveModal, setShowEngraveModal] = useState(false);`
);

code = code.replace(
/                      <button onClick=\{handleLeaveGuild\} className="pixel-btn text-\[10px\] !py-1 !px-2 !bg-rose-900 !border-rose-700 hover:!bg-rose-800">\n                        \{myGuild\.leaderId === auth\.currentUser\?\.uid && myGuildMembers\.length > 1 \? '解散・引退する' : '脱退する'\}\n                      <\/button>\n                    <\/div>/g,
`                      <button onClick={handleLeaveGuild} className="pixel-btn text-[10px] !py-1 !px-2 !bg-rose-900 !border-rose-700 hover:!bg-rose-800">
                        {myGuild.leaderId === auth.currentUser?.uid && myGuildMembers.length > 1 ? '解散・引退する' : '脱退する'}
                      </button>
                    </div>
                    <div className="mt-2 text-right">
                      <button 
                        onClick={() => setShowEngraveModal(true)} 
                        className="pixel-btn text-[10px] !py-1 !px-2 !bg-indigo-700 hover:!bg-indigo-600"
                      >
                        🛡️ 武具にギルド名を刻印する
                      </button>
                    </div>`
);

const engraveModalCode = `
      {showEngraveModal && myGuild && (
        <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="pixel-panel border-indigo-500 bg-slate-900 p-4 max-w-md w-full max-h-[80vh] flex flex-col">
            <h3 className="text-sm font-bold text-indigo-300 mb-2">🛡️ 刻印するアイテムを選択</h3>
            <p className="text-[10px] text-slate-400 mb-4">現在所持している装備にギルド名を刻印できます。</p>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {inventory.length === 0 && <div className="text-center text-slate-500 text-xs py-4">アイテムを持っていません</div>}
              {inventory.map(item => {
                const myRankIndex = guilds.findIndex(g => g.id === myGuild.id);
                const rankText = myRankIndex !== -1 ? \` (\${myRankIndex + 1}位)\` : '';
                const engraveText = \`\${myGuild.name}\${rankText}\`;
                const isAlreadyEngraved = item.engraving === engraveText;
                
                return (
                  <div key={item.uid} className="bg-slate-950 border border-slate-700 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ItemIcon item={item} />
                      <div>
                        <div className="font-bold text-xs text-slate-200">{ITEMS[item.itemId].name} {item.plus > 0 ? \`+\${item.plus}\` : ''}</div>
                        {item.engraving && <div className="text-[9px] text-indigo-400">現在の刻印: {item.engraving}</div>}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        onEngrave(item.uid, engraveText);
                        setShowEngraveModal(false);
                      }}
                      disabled={isAlreadyEngraved}
                      className="pixel-btn text-[10px] !py-1 !px-2 !bg-indigo-800 disabled:opacity-50"
                    >
                      {isAlreadyEngraved ? '刻印済' : '刻印する'}
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowEngraveModal(false)} className="pixel-btn !bg-slate-800">閉じる</button>
          </div>
        </div>
      )}
`;

code = code.replace(
/    <\/div>\n  \);\n\};/g,
`${engraveModalCode}
    </div>
  );
};`
);

fs.writeFileSync('src/components/GuildRanking.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/components/Inventory.tsx', 'utf-8');

// 1. Add props
code = code.replace('onOpenSocket?: (uid: string) => void;', 'onOpenSocket?: (uid: string) => void;\n  onPackBox?: (boxUid: string, itemUids: string[]) => void;');

// 2. Add state
code = code.replace('const [uncurseConfirmItem, setUncurseConfirmItem]', 'const [packBoxItem, setPackBoxItem] = useState(null);\n  const [selectedPackItemUids, setSelectedPackItemUids] = useState([]);\n  const [uncurseConfirmItem, setUncurseConfirmItem]');

// 3. Add to renderDetailModal
const packBtn = `
            {detailPlayerItem.baseId.startsWith('c_empty_box_') && !detailPlayerItem.packedItems && (
              <button
                onClick={() => {
                  setPackBoxItem(detailPlayerItem);
                  setSelectedPackItemUids([]);
                  setDetailPlayerItem(null);
                }}
                className="pixel-btn text-xs w-full !bg-amber-700 !text-amber-100 !border-amber-500 font-bold py-2 mb-2"
              >
                📦 アイテムを詰める
              </button>
            )}
            {detailPlayerItem.packedItems && (
               <div className="bg-slate-900 p-2 rounded border border-amber-600 mb-2">
                 <div className="text-amber-400 text-xs font-bold mb-1">🎁 梱包済みのアイテム:</div>
                 <div className="flex flex-col gap-1">
                   {detailPlayerItem.packedItems.map(p => (
                      <div key={p.uid} className="text-[10px] text-slate-300">- {ITEMS[p.baseId]?.name} {p.upgradeLevel > 0 ? '+'+p.upgradeLevel : ''}</div>
                   ))}
                 </div>
               </div>
            )}
`;
code = code.replace('{/* アクションボタン */}', packBtn + '\n          {/* アクションボタン */}');

// 4. Add the Packing Modal UI at the end of the component
const packModal = `
      {packBoxItem && (
        <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pixel-panel w-full max-w-lg bg-slate-900 border-2 border-amber-500 p-4 relative shadow-xl flex flex-col h-[80vh]">
            <h3 className="text-sm font-bold text-amber-400 mb-2">📦 箱に詰めるアイテムを選択</h3>
            <div className="text-xs text-slate-300 mb-2 bg-slate-950 p-2 rounded border border-slate-700">
              <span className="text-amber-300">{ITEMS[packBoxItem.baseId]?.name}</span>
              <br/>最大3個までアイテムを選択できます。
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 bg-slate-950 p-2 border border-slate-700 rounded mb-3 space-y-1">
              {inventory.filter(i => i.uid !== packBoxItem.uid && !i.isLocked && !i.packedItems).map(item => {
                const base = ITEMS[item.baseId];
                if (!base) return null;
                // Simplified rank check based on price
                const maxPrice = packBoxItem.baseId === 'c_empty_box_c' ? 10000 : packBoxItem.baseId === 'c_empty_box_b' ? 100000 : 999999999;
                const canPack = base.price <= maxPrice;
                const isSelected = selectedPackItemUids.includes(item.uid);
                
                return (
                  <div 
                    key={item.uid}
                    onClick={() => {
                       if (!canPack) return;
                       if (isSelected) {
                         setSelectedPackItemUids(prev => prev.filter(uid => uid !== item.uid));
                       } else {
                         if (selectedPackItemUids.length >= 3) {
                           alert('最大3個までしか詰められません');
                           return;
                         }
                         setSelectedPackItemUids(prev => [...prev, item.uid]);
                       }
                    }}
                    className={\`flex items-center justify-between p-2 rounded border \${canPack ? (isSelected ? 'bg-amber-900 border-amber-500 cursor-pointer' : 'bg-slate-900 border-slate-700 cursor-pointer hover:border-slate-500') : 'bg-slate-900 opacity-50 border-rose-900 cursor-not-allowed'}\`}
                  >
                    <div className="text-xs text-slate-200">
                      {base.name} {item.upgradeLevel ? '+'+item.upgradeLevel : ''}
                      {!canPack && <span className="ml-2 text-[10px] text-rose-400">ランク上限オーバー</span>}
                    </div>
                    {isSelected && <div className="text-amber-400 text-xs font-bold">✓ 選択中</div>}
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setPackBoxItem(null)}
                className="pixel-btn flex-1 !bg-slate-800 hover:!bg-slate-700 text-slate-300 text-xs"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (onPackBox) onPackBox(packBoxItem.uid, selectedPackItemUids);
                  setPackBoxItem(null);
                  setSelectedPackItemUids([]);
                }}
                disabled={selectedPackItemUids.length === 0}
                className="pixel-btn flex-1 !bg-amber-600 hover:!bg-amber-500 text-white font-bold text-xs disabled:opacity-50"
              >
                📦 梱包する ({selectedPackItemUids.length}/3)
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace('    </div>\n  );\n};', packModal + '    </div>\n  );\n};');

fs.writeFileSync('src/components/Inventory.tsx', code);

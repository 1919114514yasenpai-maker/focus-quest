#!/bin/bash
sed -i -e '/const renderMaterialCard = (pItem: PlayerItem, count: number = 1) => {/,/      <\/div>\n    );\n  };/c\
  const renderMaterialCard = (pItems: PlayerItem[]) => {\
    if (pItems.length === 0) return null;\
    const pItem = pItems[0];\
    const count = pItems.length;\
    const baseMat = ITEMS[pItem.baseId];\
    if (!baseMat) return null;\
    const isChest = baseMat.type === '\''chest'\'';\
    const isConsumable = baseMat.type === '\''consumable'\'';\
    const sellPrice = calculateSellPrice(pItem, job);\
    \
    // For batch sell, check how many are selected\
    const selectedCount = pItems.filter(i => selectedSellUids.includes(i.uid)).length;\
    const canSelectForSell = !pItem.isLocked && !isQuestActive;\
\
    return (\
      <div \
        key={pItem.uid} \
        onClick={() => {\
          if (batchSellMode && canSelectForSell) {\
            // If some are selected, toggle the next unselected one. If all selected, deselect all.\
            if (selectedCount === count) {\
               pItems.forEach(i => toggleSelectSell(i.uid)); // this would toggle them off (need to handle carefully if toggleSelectSell just toggles)\
               // Actually toggleSelectSell toggles based on current state. If we call it for each, it flips them.\
               // Let'\''s just let the user click to select ONE from the stack in batch mode.\
               const unselected = pItems.find(i => !selectedSellUids.includes(i.uid));\
               if (unselected) toggleSelectSell(unselected.uid);\
               else pItems.forEach(i => toggleSelectSell(i.uid));\
            } else {\
               const unselected = pItems.find(i => !selectedSellUids.includes(i.uid));\
               if (unselected) toggleSelectSell(unselected.uid);\
            }\
          } else {\
            setDetailPlayerItem(pItem);\
          }\
        }}\
        className={`pixel-panel flex flex-col gap-2 bg-slate-900/90 border-2 ${\
          isChest ? '\''border-amber-500/70 bg-slate-900/95'\'' : '\''border-slate-700'\''\
        } ${batchSellMode ? (canSelectForSell ? '\''cursor-pointer hover:border-amber-400'\'' : '\''opacity-60 cursor-not-allowed'\'') : '\'\''} ${\
          selectedCount > 0 ? '\''!border-amber-400 !bg-amber-950/60 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]'\'' : '\'\''\
        }`}\
      >\
        <div className="flex items-center gap-2">\
          <div className="w-8 h-8 flex items-center justify-center bg-slate-950 border border-slate-700 rounded shadow-inner flex-shrink-0">\
            {pItem.isLocked && (\
              <div className="absolute -top-1 -right-1 z-10 bg-slate-900 rounded-full border border-slate-700 p-0.5" title="ロック中">\
                🔒\
              </div>\
            )}\
            {isChest ? (\
              <span className="text-xl select-none">\
                {baseMat.name.includes('\''伝説'\'') ? '\''👑'\'' : baseMat.name.includes('\''金'\'') ? '\''🧰'\'' : baseMat.name.includes('\''銀'\'') ? '\''🎁'\'' : '\''📦'\''}\
              </span>\
            ) : isConsumable ? (\
              <span className="text-xl select-none">📜</span>\
            ) : (\
              <ItemIcon item={{ ...baseMat, id: pItem.baseId }} />\
            )}\
          </div>\
          <div className="flex-1 min-w-0">\
            <span className="text-sm font-bold truncate block" style={{ color: baseMat.color }}>{baseMat.name}{count > 1 ? ` x${count}` : ""}</span>\
            <div className="text-[10px] text-slate-400">\
              売却価格: <span className="text-amber-300 font-bold">🪙 {sellPrice} G</span>\
            </div>\
            {batchSellMode && selectedCount > 0 && (\
              <div className="text-[10px] text-amber-400 font-bold">\
                売却選択中: {selectedCount} 個\
              </div>\
            )}\
          </div>\
        </div>\
      </div>\
    );\
  };\
' src/components/Inventory.tsx

#!/bin/bash
sed -i -e '/<span className="text-amber-300 font-bold">💎 素材・宝箱・消費アイテム一覧<\/span>/,/<\/div>/c\
            <div className="flex items-center gap-2">\
              <span className="text-amber-300 font-bold hidden sm:inline">💎 素材・宝箱・消費アイテム一覧</span>\
              <select \
                value={materialFilter} \
                onChange={e => setMaterialFilter(e.target.value as any)}\
                className="pixel-input text-xs p-1 bg-slate-900 border border-slate-700 text-slate-200"\
              >\
                <option value="all">すべて</option>\
                <option value="material">📦 素材</option>\
                <option value="gem">💎 宝石</option>\
                <option value="consumable">📜 護符/巻物</option>\
                <option value="chest">🧰 宝箱</option>\
              </select>\
            </div>\
            <span className="text-slate-400">所持数: {nonEquipItems.length} 個</span>\
          </div>\
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">\
            {groupedNonEquipItems.length > 0 ? groupedNonEquipItems.filter(group => {\
              if (materialFilter === '\''all'\'') return true;\
              return ITEMS[group[0].baseId]?.type === materialFilter;\
            }).map(group => renderMaterialCard(group)) : <div className="text-xs text-slate-500 p-4 text-center col-span-2">素材や宝箱を持っていません。集中クエストを完遂してモンスターを討伐し、宝箱や素材を獲得しましょう！</div>}\
          </div>\
' src/components/Inventory.tsx

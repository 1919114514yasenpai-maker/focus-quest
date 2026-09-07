const fs = require('fs');
let code = fs.readFileSync('src/components/GuildShop.tsx', 'utf-8');

const regex = /{item.note && \(\s*<span className="text-slate-500 italic">「{item.note}」<\/span>\s*\)}/g;

code = code.replace(regex, `{item.note && (
                                <span className="text-slate-500 italic">「{item.note}」</span>
                              )}
                              {item.itemData.packedItems && item.itemData.packedItems.length > 0 && (
                                <span className="text-amber-300 font-bold">🎁 {item.itemData.packedItems.length}個のアイテム同梱</span>
                              )}`);
fs.writeFileSync('src/components/GuildShop.tsx', code);

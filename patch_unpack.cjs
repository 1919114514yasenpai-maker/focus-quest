const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const handleOpenChest = \(uid: string\) => \{([\s\S]*?)setInventory\(prev => prev.filter\(i => i\.uid !== uid\)\);/;
const match = code.match(regex);

if (match) {
  const replacement = `const handleOpenChest = (uid: string) => {
    const item = inventory.find(i => i.uid === uid);
    if (!item) return;

    if (item.packedItems && item.packedItems.length > 0) {
      setInventory(prev => [
        ...prev.filter(i => i.uid !== uid),
        ...item.packedItems.map(p => ({ ...p, uid: Math.random().toString(36).substr(2, 9) })) // assign new uids just in case
      ]);
      setEventLogs(prev => [...prev.slice(-49), \`【梱包解除】\${ITEMS[item.baseId]?.name} を開け、中身を取り出しました。\n獲得: \${item.packedItems.map(p => ITEMS[p.baseId]?.name).join(', ')}\`]);
      return;
    }

${match[1]}setInventory(prev => prev.filter(i => i.uid !== uid));`;
  code = code.replace(match[0], replacement);
  fs.writeFileSync('src/App.tsx', code);
}

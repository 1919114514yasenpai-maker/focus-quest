const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const packHandler = `
  const handlePackBox = (boxUid: string, itemUids: string[]) => {
    setInventory(prev => {
      const box = prev.find(i => i.uid === boxUid);
      if (!box) return prev;
      
      const itemsToPack = prev.filter(i => itemUids.includes(i.uid));
      const remainingItems = prev.filter(i => !itemUids.includes(i.uid) && i.uid !== boxUid);
      
      return [
        ...remainingItems,
        { ...box, packedItems: itemsToPack }
      ];
    });
    setGold(g => Math.max(0, g - 100)); // packing fee? no fee for now, or maybe yes. Let's just do a tiny fee or nothing. Actually no fee needed.
    // wait I subtracted 100 gold. Let's revert that.
  };
`;
// Replace the string
code = code.replace('const handleOpenSocket', packHandler.replace('setGold(g => Math.max(0, g - 100));', '') + '\\n  const handleOpenSocket');
code = code.replace('onOpenSocket={handleOpenSocket}', 'onOpenSocket={handleOpenSocket}\\n              onPackBox={handlePackBox}');
fs.writeFileSync('src/App.tsx', code);

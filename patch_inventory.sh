#!/bin/bash
sed -i -e '/const { ownedItems, weapons, armors, materials, chests, nonEquipItems } = useMemo/,/}, \[inventory\]);/c\
  const { ownedItems, weapons, armors, materials, chests, nonEquipItems, groupedNonEquipItems } = useMemo(() => {\
    const owned = inventory.map(pItem => getCompiledItem(pItem)).filter(Boolean) as GameItem[];\
    const weps = owned.filter(item => item.type === '\''weapon'\'');\
    const arms = owned.filter(item => item.type === '\''armor'\'');\
    const mats = inventory.filter(i => ITEMS[i.baseId]?.type === '\''material'\'');\
    const chs = inventory.filter(i => ITEMS[i.baseId]?.type === '\''chest'\'');\
    const nonEq = inventory.filter(i => {\
      const type = ITEMS[i.baseId]?.type;\
      return type === '\''material'\'' || type === '\''chest'\'' || type === '\''gem'\'' || type === '\''consumable'\'';\
    });\
    const grouped = nonEq.reduce((acc, item) => {\
      const key = `${item.baseId}_${item.isLocked ? '\''locked'\'' : '\''unlocked'\''}`;\
      if (!acc[key]) acc[key] = { items: [] };\
      acc[key].items.push(item);\
      return acc;\
    }, {} as Record<string, { items: PlayerItem[] }>);\
    const groupedArr = Object.values(grouped).map(g => g.items);\
\
    return {\
      ownedItems: owned,\
      weapons: weps,\
      armors: arms,\
      materials: mats,\
      chests: chs,\
      nonEquipItems: nonEq,\
      groupedNonEquipItems: groupedArr,\
    };\
  }, [inventory]);\
' src/components/Inventory.tsx

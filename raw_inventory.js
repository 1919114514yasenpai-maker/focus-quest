import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=8229aee0"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=8229aee0"; const React = __vite__cjsImport1_react.__esModule ? __vite__cjsImport1_react.default : __vite__cjsImport1_react; const useState = __vite__cjsImport1_react["useState"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useRef = __vite__cjsImport1_react["useRef"]; const useMemo = __vite__cjsImport1_react["useMemo"];
import { ITEMS, isCraftExclusiveItem } from "/src/gameData.ts";
import { WEAPON_SPRITES, ARMOR_SPRITES, drawIconSprite } from "/src/sprites.ts";
import {
  getCompiledItem,
  calculateSellPrice,
  calculateUncurseCost,
  calculateBatchEnchantCost,
  calculateMaxEnchantLevels,
  performBatchEnchant,
  performBatchSpecialEnchant
} from "/src/itemUtils.ts";
import { generateDailyShopItems, getTodayDateString } from "/src/dailyShopUtils.ts";
import { getShopDiscountMultiplier } from "/src/jobUtils.ts";
const iconCache = /* @__PURE__ */ new Map();
const getIconCacheKey = (item) => {
  return `${item.type}_${item.baseId || item.id}_${item.color || ""}_${item.name || ""}`;
};
export const ItemIcon = React.memo(({ item, size = 32 }) => {
  const canvasRef = useRef(null);
  const cacheKey = getIconCacheKey(item);
  const cachedUrl = iconCache.get(cacheKey);
  useEffect(() => {
    if (cachedUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (item.type === "material" || item.type === "gem") {
      ctx.fillStyle = item.color || "#94a3b8";
      ctx.fillRect(8, 8, 16, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(10, 10, 4, 4);
      iconCache.set(cacheKey, canvas.toDataURL());
      return;
    }
    if (item.type === "chest") {
      const isGold = item.name?.includes("金") || item.color === "#f59e0b";
      const isSilver = item.name?.includes("銀") || item.color === "#94a3b8";
      const isLegend = item.name?.includes("伝説") || item.color === "#a855f7";
      const bodyColor = isLegend ? "#581c87" : isGold ? "#b45309" : isSilver ? "#475569" : "#78350f";
      const lidColor = isLegend ? "#9333ea" : isGold ? "#f59e0b" : isSilver ? "#94a3b8" : "#b45309";
      const lockColor = isLegend ? "#facc15" : isGold ? "#fde047" : "#e2e8f0";
      ctx.fillStyle = bodyColor;
      ctx.fillRect(6, 12, 20, 14);
      ctx.fillStyle = lidColor;
      ctx.fillRect(5, 7, 22, 6);
      ctx.fillStyle = lockColor;
      ctx.fillRect(14, 11, 4, 5);
      iconCache.set(cacheKey, canvas.toDataURL());
      return;
    }
    if (item.type === "consumable") {
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(8, 6, 16, 20);
      ctx.fillStyle = "#d97706";
      ctx.fillRect(10, 9, 12, 2);
      ctx.fillRect(10, 13, 12, 2);
      ctx.fillRect(10, 17, 12, 2);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(6, 5, 20, 2);
      ctx.fillRect(6, 25, 20, 2);
      iconCache.set(cacheKey, canvas.toDataURL());
      return;
    }
    const spriteKey = item.baseId || item.id;
    const spriteData = item.type === "weapon" ? WEAPON_SPRITES[spriteKey] || WEAPON_SPRITES[item.id] || WEAPON_SPRITES["w_wood_sword"] : ARMOR_SPRITES[spriteKey] || ARMOR_SPRITES[item.id] || ARMOR_SPRITES["a_cloth"];
    if (spriteData) {
      if (item.type === "weapon") {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 4);
        drawIconSprite(ctx, spriteData, -16, -16, 2);
        ctx.restore();
      } else {
        drawIconSprite(ctx, spriteData, 0, 0, 2);
      }
    }
    iconCache.set(cacheKey, canvas.toDataURL());
  }, [cacheKey, cachedUrl, item]);
  if (cachedUrl) {
    return /* @__PURE__ */ jsxDEV(
      "img",
      {
        src: cachedUrl,
        alt: item.name,
        style: { width: size, height: size, imageRendering: "pixelated" },
        className: "rounded-sm pixel-panel p-0 bg-slate-800 flex-shrink-0",
        loading: "lazy"
      },
      void 0,
      false,
      {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 109,
        columnNumber: 7
      },
      this
    );
  }
  return /* @__PURE__ */ jsxDEV(
    "canvas",
    {
      ref: canvasRef,
      width: 32,
      height: 32,
      style: { width: size, height: size, imageRendering: "pixelated" },
      className: "rounded-sm pixel-panel p-0 bg-slate-800 flex-shrink-0"
    },
    void 0,
    false,
    {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 120,
      columnNumber: 5
    },
    this
  );
});
export const Inventory = ({
  inventory,
  equipment,
  gold,
  job = "balanced",
  maxStage = 1,
  playerName = "名無し勇者",
  onEquip,
  onBuyItem,
  onBuyDailyItem,
  onBatchBuyItem,
  onBatchBuyDailyItems,
  soldOutDailyItemIds = [],
  onEnchantItem,
  onLimitBreak,
  onBatchLimitBreak,
  onSpecialEnchant,
  onBatchSpecialEnchant,
  onSellItem,
  onBatchSellItems,
  onDismantleItem,
  onToggleLock,
  onUncurseItem,
  onOpenChest,
  onCraftItem,
  onUseConsumable,
  onOpenSocket,
  onInsertGem,
  onTransferEnhancements,
  isQuestActive = false,
  guildName,
  onEngraveItem
}) => {
  const [tab, setTab] = useState("inventory");
  const [selectedMaterialUid, setSelectedMaterialUid] = useState("");
  const [detailPlayerItem, setDetailPlayerItem] = useState(null);
  const [dismantleConfirmItem, setDismantleConfirmItem] = useState(null);
  const [uncurseConfirmItem, setUncurseConfirmItem] = useState(null);
  const [transferScrollUid, setTransferScrollUid] = useState(null);
  const [transferSourceUid, setTransferSourceUid] = useState("");
  const [transferTargetUid, setTransferTargetUid] = useState("");
  const [batchSellMode, setBatchSellMode] = useState(false);
  const [selectedSellUids, setSelectedSellUids] = useState([]);
  const [shopQuantities, setShopQuantities] = useState({});
  const [specialEnchantQty, setSpecialEnchantQty] = useState(1);
  const todayStr = getTodayDateString();
  const dailyItems = useMemo(() => generateDailyShopItems(todayStr), [todayStr]);
  const { ownedItems, weapons, armors, materials, chests, nonEquipItems } = useMemo(() => {
    const owned = inventory.map((pItem) => getCompiledItem(pItem)).filter(Boolean);
    const weps = owned.filter((item) => item.type === "weapon");
    const arms = owned.filter((item) => item.type === "armor");
    const mats = inventory.filter((i) => ITEMS[i.baseId]?.type === "material");
    const chs = inventory.filter((i) => ITEMS[i.baseId]?.type === "chest");
    const nonEq = inventory.filter((i) => {
      const type = ITEMS[i.baseId]?.type;
      return type === "material" || type === "chest" || type === "gem" || type === "consumable";
    });
    return {
      ownedItems: owned,
      weapons: weps,
      armors: arms,
      materials: mats,
      chests: chs,
      nonEquipItems: nonEq
    };
  }, [inventory]);
  const shopItems = useMemo(() => {
    return Object.values(ITEMS).filter(
      (item) => item.type === "weapon" || item.type === "armor" || item.id === "c_transfer_scroll"
    ).filter(
      (item) => item.price > 0 && !item.isCursed && !item.effect?.isCursed && !isCraftExclusiveItem(item)
    );
  }, []);
  useEffect(() => {
    if (materials.length > 0 && !materials.find((m) => m.uid === selectedMaterialUid)) {
      setSelectedMaterialUid(materials[0].uid);
    }
  }, [materials, selectedMaterialUid]);
  const selectedSellTotalPrice = useMemo(() => {
    return selectedSellUids.reduce((sum, uid) => {
      const item = inventory.find((i) => i.uid === uid);
      if (!item) return sum;
      return sum + calculateSellPrice(item, job);
    }, 0);
  }, [selectedSellUids, inventory, job]);
  const toggleSelectSell = (uid) => {
    const item = inventory.find((i) => i.uid === uid);
    if (!item || item.isLocked || equipment.statWeaponId === uid || equipment.statArmorId === uid) return;
    setSelectedSellUids(
      (prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };
  const handleSelectAllUnusedEquip = () => {
    const valid = inventory.filter((i) => {
      const type = ITEMS[i.baseId]?.type;
      const isEquip = type === "weapon" || type === "armor";
      const isEquipped = equipment.statWeaponId === i.uid || equipment.statArmorId === i.uid;
      return isEquip && !i.isLocked && !isEquipped;
    }).map((i) => i.uid);
    setSelectedSellUids(valid);
  };
  const handleSelectAllUnenhanced = () => {
    const valid = inventory.filter((i) => {
      const type = ITEMS[i.baseId]?.type;
      const isEquip = type === "weapon" || type === "armor";
      const isEquipped = equipment.statWeaponId === i.uid || equipment.statArmorId === i.uid;
      const isClean = i.upgradeLevel === 0 && (!i.limitBreak || i.limitBreak === 0) && (!i.specialEnchantCount || i.specialEnchantCount === 0) && i.addedPower === 0;
      return isEquip && !i.isLocked && !isEquipped && isClean;
    }).map((i) => i.uid);
    setSelectedSellUids(valid);
  };
  const handleSelectAllDuplicates = () => {
    const groups = {};
    inventory.forEach((i) => {
      const type = ITEMS[i.baseId]?.type;
      if (type === "weapon" || type === "armor") {
        if (!groups[i.baseId]) groups[i.baseId] = [];
        groups[i.baseId].push(i);
      }
    });
    const selected = [];
    Object.values(groups).forEach((items) => {
      if (items.length <= 1) return;
      const sorted = [...items].sort((a, b) => {
        const aEq = equipment.statWeaponId === a.uid || equipment.statArmorId === a.uid;
        const bEq = equipment.statWeaponId === b.uid || equipment.statArmorId === b.uid;
        if (aEq && !bEq) return -1;
        if (!aEq && bEq) return 1;
        if (a.isLocked && !b.isLocked) return -1;
        if (!a.isLocked && b.isLocked) return 1;
        const aPower = a.upgradeLevel * 3 + (a.limitBreak || 0) * 5 + a.addedPower;
        const bPower = b.upgradeLevel * 3 + (b.limitBreak || 0) * 5 + b.addedPower;
        return bPower - aPower;
      });
      for (let idx = 1; idx < sorted.length; idx++) {
        const it = sorted[idx];
        const isEq = equipment.statWeaponId === it.uid || equipment.statArmorId === it.uid;
        if (!it.isLocked && !isEq) {
          selected.push(it.uid);
        }
      }
    });
    setSelectedSellUids(selected);
  };
  const handleSelectAllMaterials = () => {
    const valid = inventory.filter((i) => {
      const type = ITEMS[i.baseId]?.type;
      return (type === "material" || type === "gem") && !i.isLocked;
    }).map((i) => i.uid);
    setSelectedSellUids(valid);
  };
  const totalBatchSellPrice = useMemo(() => {
    return selectedSellUids.reduce((sum, uid) => {
      const item = inventory.find((i) => i.uid === uid);
      return sum + (item ? calculateSellPrice(item, job) : 0);
    }, 0);
  }, [selectedSellUids, inventory, job]);
  const handleExecuteBatchSell = () => {
    if (!selectedSellUids.length) return;
    if (onBatchSellItems) {
      onBatchSellItems(selectedSellUids, totalBatchSellPrice);
    } else {
      selectedSellUids.forEach((uid) => {
        const it = inventory.find((i) => i.uid === uid);
        if (it && onSellItem) onSellItem(uid, calculateSellPrice(it, job));
      });
    }
    setSelectedSellUids([]);
  };
  const handleEnchant = (pItem) => {
    const cost = 200 + pItem.upgradeLevel * 100;
    if (gold < cost) return;
    const addedPower = pItem.addedPower + Math.floor(Math.random() * 3) + 1;
    const newLevel = pItem.upgradeLevel + 1;
    const prefixes = ["鋭利な", "炎の", "伝説の", "祝福された", "呪われた", "名工の", "神聖なる"];
    const customPrefix = newLevel % 3 === 0 ? prefixes[Math.floor(Math.random() * prefixes.length)] : pItem.customPrefix;
    onEnchantItem(pItem.uid, cost, {
      ...pItem,
      upgradeLevel: newLevel,
      addedPower,
      customPrefix
    });
  };
  const handleLimitBreakClick = (pItem) => {
    if (!onLimitBreak) return;
    const duplicate = inventory.find((i) => i.uid !== pItem.uid && i.baseId === pItem.baseId);
    if (duplicate) {
      onLimitBreak(pItem.uid, duplicate.uid);
    }
  };
  const handleSpecialEnchantClick = (pItem) => {
    if (!onSpecialEnchant || !selectedMaterialUid) return;
    const mat = materials.find((m) => m.uid === selectedMaterialUid);
    if (!mat) return;
    const baseMatItem = ITEMS[mat.baseId];
    if (!baseMatItem) return;
    const cost = 0;
    const addedPower = pItem.addedPower + Math.floor(Math.random() * 5) + 3;
    const prevEffect = pItem.addedEffect || { description: "" };
    let matEffect = { ...prevEffect };
    let prefix = prevEffect.description ? "キメラの" : "神秘の";
    if (mat.baseId === "m_slime_jelly") {
      prefix = prevEffect.description ? "キメラの" : "粘性の";
      matEffect.enemySlowRate = Math.min(0.9, (matEffect.enemySlowRate || 0) + 0.15);
    } else if (mat.baseId === "m_goblin_ear") {
      prefix = prevEffect.description ? "キメラの" : "野蛮な";
      matEffect.critChance = Math.min(1, (matEffect.critChance || 0) + 0.05);
    } else if (mat.baseId === "m_orc_fang") {
      prefix = prevEffect.description ? "キメラの" : "豪傑の";
      matEffect.lifesteal = Math.min(1, (matEffect.lifesteal || 0) + 0.03);
    } else if (mat.baseId === "m_demon_horn") {
      prefix = prevEffect.description ? "キメラの" : "魔性の";
      matEffect.hpRegen = (matEffect.hpRegen || 0) + 2;
      matEffect.damageMultiplier = (matEffect.damageMultiplier || 0) + 0.05;
    } else if (mat.baseId === "m_dragon_scale") {
      prefix = prevEffect.description ? "キメラの" : "覇竜の";
      matEffect.maxHpBonus = (matEffect.maxHpBonus || 0) + 30;
      matEffect.goldBonus = (matEffect.goldBonus || 0) + 0.1;
    }
    const descParts = [];
    if (matEffect.enemySlowRate) descParts.push(`遅延${Math.round(matEffect.enemySlowRate * 100)}%`);
    if (matEffect.critChance) descParts.push(`会心+${Math.round(matEffect.critChance * 100)}%`);
    if (matEffect.lifesteal) descParts.push(`吸血+${Math.round(matEffect.lifesteal * 100)}%`);
    if (matEffect.hpRegen || matEffect.damageMultiplier) {
      descParts.push(`毎秒HP+${matEffect.hpRegen || 0}/ダメ+${Math.round((matEffect.damageMultiplier || 0) * 100)}%`);
    }
    if (matEffect.maxHpBonus || matEffect.goldBonus) {
      descParts.push(`HP+${matEffect.maxHpBonus || 0}/金+${Math.round((matEffect.goldBonus || 0) * 100)}%`);
    }
    matEffect.description = descParts.join(" | ") || "特殊強化済";
    const newEffect = {
      ...pItem,
      addedPower,
      specialEnchantCount: (pItem.specialEnchantCount || 0) + 1,
      customPrefix: prefix,
      addedEffect: matEffect
    };
    onSpecialEnchant(pItem.uid, selectedMaterialUid, cost, newEffect);
  };
  const renderInventoryCard = (item) => {
    const pItem = inventory.find((i) => i.uid === item.id);
    const isStatEq = equipment.statWeaponId === item.id || equipment.statArmorId === item.id;
    const isAppEq = equipment.appearanceWeaponId === pItem.baseId || equipment.appearanceArmorId === pItem.baseId;
    const statSlot = item.type === "weapon" ? "statWeaponId" : "statArmorId";
    const appSlot = item.type === "weapon" ? "appearanceWeaponId" : "appearanceArmorId";
    const duplicate = inventory.find((i) => i.uid !== pItem.uid && i.baseId === pItem.baseId);
    const sellPrice = calculateSellPrice(pItem, job);
    const isEnchanted = pItem.upgradeLevel > 0 || pItem.limitBreak && pItem.limitBreak > 0 || pItem.addedPower > 0;
    const specialCount = pItem.specialEnchantCount || 0;
    const baseItemDef = ITEMS[pItem.baseId];
    const isCursedItem = (item.isCursed || baseItemDef?.isCursed) && !pItem.isUncursed;
    const uncurseCost = calculateUncurseCost(pItem, job);
    let cardBorderColor = "border-slate-700";
    let cardShadow = "";
    let cardBg = "bg-slate-900/90";
    if ((pItem.limitBreak || 0) >= 1) {
      cardBorderColor = "border-rose-500";
      cardBg = "bg-slate-950";
      cardShadow = "shadow-[0_0_15px_rgba(244,63,94,0.4)]";
    } else if (pItem.upgradeLevel >= 15) {
      cardBorderColor = "border-fuchsia-500";
      cardBg = "bg-slate-950";
      cardShadow = "shadow-[0_0_12px_rgba(217,70,239,0.4)]";
    } else if (pItem.upgradeLevel >= 10) {
      cardBorderColor = "border-amber-400";
      cardShadow = "shadow-[0_0_10px_rgba(251,191,36,0.3)]";
    } else if (pItem.upgradeLevel >= 5) {
      cardBorderColor = "border-sky-400";
      cardShadow = "shadow-[0_0_8px_rgba(56,189,248,0.2)]";
    } else if (pItem.upgradeLevel >= 1 || (pItem.addedPower || 0) > 0) {
      cardBorderColor = "border-emerald-500";
      cardShadow = "shadow-[0_0_5px_rgba(16,185,129,0.15)]";
    } else if (pItem.baseId.includes("craft")) {
      cardBorderColor = "border-amber-600";
      cardShadow = "shadow-[0_0_8px_rgba(217,119,6,0.3)]";
    }
    const isSelectedForSell = selectedSellUids.includes(pItem.uid);
    const canSelectForSell = !isStatEq && !pItem.isLocked && !isQuestActive;
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        onClick: () => {
          if (batchSellMode && canSelectForSell) {
            toggleSelectSell(pItem.uid);
          }
        },
        className: `pixel-panel flex flex-col gap-2 border-2 ${cardBg} ${cardBorderColor} ${cardShadow} relative transition-all duration-300 hover:scale-[1.01] ${batchSellMode ? canSelectForSell ? "cursor-pointer hover:border-amber-400" : "opacity-60 cursor-not-allowed" : ""} ${isSelectedForSell ? "!border-amber-400 !bg-amber-950/60 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : ""}`,
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              batchSellMode && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center", children: /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "checkbox",
                  checked: isSelectedForSell,
                  onChange: () => toggleSelectSell(pItem.uid),
                  disabled: !canSelectForSell,
                  className: "w-4 h-4 accent-amber-400 cursor-pointer rounded"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 506,
                  columnNumber: 17
                },
                this
              ) }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 505,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV(ItemIcon, { item: { ...item, id: pItem.baseId } }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 515,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold text-slate-100", children: item.name }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 518,
                    columnNumber: 17
                  }, this),
                  specialCount > 0 && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] bg-purple-900/90 text-purple-200 border border-purple-600 px-1 py-0.2 rounded font-extrabold", children: [
                    "★特殊強化 ",
                    specialCount,
                    "回"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 520,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 517,
                  columnNumber: 15
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400", children: [
                  item.type === "weapon" ? "攻撃力" : "防御力",
                  ": ",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-amber-400 font-bold", children: [
                    "+",
                    item.power
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 526,
                    columnNumber: 59
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 525,
                  columnNumber: 15
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 516,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 503,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", onClick: (e) => e.stopPropagation(), children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => onToggleLock && onToggleLock(pItem.uid),
                  className: "pixel-btn text-[10px] !py-1 !px-2.5 active hover:!bg-slate-700",
                  title: "ロックして売却・分解を防止",
                  children: pItem.isLocked ? "🔒" : "🔓"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 532,
                  columnNumber: 13
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setDetailPlayerItem(pItem),
                  className: "pixel-btn text-[10px] !py-1 !px-2.5 active !border-sky-400 !text-sky-300 hover:!bg-sky-950",
                  children: "🔍 詳細"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 539,
                  columnNumber: 13
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 531,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 502,
            columnNumber: 9
          }, this),
          item.effect && /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-sky-300 bg-slate-950 p-2 border border-slate-800 rounded", children: [
            "✨ ",
            item.effect.description
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 549,
            columnNumber: 11
          }, this),
          tab === "inventory" ? /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-2 mt-1", onClick: (e) => e.stopPropagation(), children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => onEquip(statSlot, item.id),
                  disabled: isStatEq || isQuestActive,
                  className: `pixel-btn text-xs flex-1 ${isStatEq ? "active !border-emerald-400 !text-emerald-300" : ""} ${isQuestActive ? "opacity-50 cursor-not-allowed" : ""}`,
                  children: isStatEq ? "能力: 装備中" : "能力を装備"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 557,
                  columnNumber: 15
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => onEquip(appSlot, pItem.baseId),
                  disabled: isAppEq || isQuestActive,
                  className: `pixel-btn text-xs flex-1 ${isAppEq ? "active !border-purple-400 !text-purple-300" : ""} ${isQuestActive ? "opacity-50 cursor-not-allowed" : ""}`,
                  children: isAppEq ? "見た目: 装備中" : "見た目を装備"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 564,
                  columnNumber: 15
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 556,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-400", children: [
                "売却価格: ",
                /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold", children: [
                  "🪙 ",
                  sellPrice,
                  " G"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 574,
                  columnNumber: 66
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 574,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => onSellItem && onSellItem(pItem.uid, sellPrice),
                  disabled: isStatEq || isQuestActive || pItem.isLocked,
                  className: "pixel-btn text-[10px] !py-1 !px-3 active !border-amber-400 disabled:opacity-40",
                  children: isStatEq ? "装備中不可" : pItem.isLocked ? "ロック中" : "💰 売却する"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 575,
                  columnNumber: 15
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 573,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 555,
            columnNumber: 11
          }, this) : /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-2 mt-1 pt-2 border-t border-slate-800", onClick: (e) => e.stopPropagation(), children: [
            isCursedItem && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between bg-purple-950/80 p-2 border border-purple-700 rounded", children: [
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-purple-300 font-bold flex items-center gap-1", children: /* @__PURE__ */ jsxDEV("span", { children: "✝️ 呪いを解除 (解呪)" }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 591,
                  columnNumber: 21
                }, this) }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 590,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-purple-200/80", children: [
                  "費用: ",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold", children: [
                    "🪙 ",
                    uncurseCost.toLocaleString(),
                    " G"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 594,
                    columnNumber: 25
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] text-purple-300/80 ml-1", children: "(毎秒HPドレインを浄化)" }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 595,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 593,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 589,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setUncurseConfirmItem({ item: pItem, gameItem: item, cost: uncurseCost }),
                  disabled: gold < uncurseCost || isQuestActive,
                  className: "pixel-btn text-[10px] !py-1 !px-3 active !bg-purple-800 !text-purple-100 !border-purple-400 hover:!bg-purple-700 disabled:opacity-40 font-bold",
                  children: "✝️ 解呪する"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 598,
                  columnNumber: 17
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 588,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1.5 bg-slate-950 p-2 border border-slate-800 rounded", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-400 font-bold", children: [
                  "基本強化 (現在 Lv.",
                  pItem.upgradeLevel,
                  ")"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 611,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-amber-300 font-bold", children: [
                  "次: 🪙 ",
                  (200 + pItem.upgradeLevel * 100).toLocaleString(),
                  " G"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 612,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 610,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-4 gap-1", children: (() => {
                const cost1 = 200 + pItem.upgradeLevel * 100;
                const cost5 = calculateBatchEnchantCost(pItem.upgradeLevel, 5);
                const cost10 = calculateBatchEnchantCost(pItem.upgradeLevel, 10);
                const { maxLevels, totalCost: maxCost } = calculateMaxEnchantLevels(pItem.upgradeLevel, gold);
                const formatCost = (c) => c >= 1e4 ? `${(c / 1e3).toFixed(0)}k` : c >= 1e3 ? `${(c / 1e3).toFixed(1)}k` : `${c}`;
                return /* @__PURE__ */ jsxDEV(Fragment, { children: [
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        const { updatedItem, totalCost } = performBatchEnchant(pItem, 1);
                        onEnchantItem(pItem.uid, totalCost, updatedItem);
                      },
                      disabled: gold < cost1 || isQuestActive,
                      className: "pixel-btn text-[10px] !py-1 active !border-rose-400 disabled:opacity-40",
                      title: `1回強化 (費用: 🪙${cost1.toLocaleString()}G)`,
                      children: [
                        "+1 (",
                        formatCost(cost1),
                        ")"
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 625,
                      columnNumber: 23
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        const { updatedItem, totalCost } = performBatchEnchant(pItem, 5);
                        onEnchantItem(pItem.uid, totalCost, updatedItem);
                      },
                      disabled: gold < cost5 || isQuestActive,
                      className: "pixel-btn text-[10px] !py-1 active !border-rose-400 !bg-rose-950/40 hover:!bg-rose-900 disabled:opacity-40 font-bold",
                      title: `5回まとめ強化 (費用: 🪙${cost5.toLocaleString()}G)`,
                      children: [
                        "+5 (",
                        formatCost(cost5),
                        ")"
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 636,
                      columnNumber: 23
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        const { updatedItem, totalCost } = performBatchEnchant(pItem, 10);
                        onEnchantItem(pItem.uid, totalCost, updatedItem);
                      },
                      disabled: gold < cost10 || isQuestActive,
                      className: "pixel-btn text-[10px] !py-1 active !border-amber-400 !bg-amber-950/40 hover:!bg-amber-900 disabled:opacity-40 font-bold",
                      title: `10回まとめ強化 (費用: 🪙${cost10.toLocaleString()}G)`,
                      children: [
                        "+10 (",
                        formatCost(cost10),
                        ")"
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 647,
                      columnNumber: 23
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        if (maxLevels <= 0) return;
                        const { updatedItem, totalCost } = performBatchEnchant(pItem, maxLevels);
                        onEnchantItem(pItem.uid, totalCost, updatedItem);
                      },
                      disabled: maxLevels <= 0 || isQuestActive,
                      className: "pixel-btn text-[10px] !py-1 active !border-emerald-400 !bg-emerald-950/60 hover:!bg-emerald-900 text-emerald-200 disabled:opacity-40 font-black",
                      title: `所持金で最大強化 (+${maxLevels}回 / 費用: 🪙${maxCost.toLocaleString()}G)`,
                      children: [
                        "MAX",
                        maxLevels > 0 ? `(+${maxLevels})` : ""
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 658,
                      columnNumber: 23
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 624,
                  columnNumber: 21
                }, this);
              })() }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 614,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 609,
              columnNumber: 13
            }, this),
            (() => {
              const duplicates = inventory.filter(
                (i) => i.uid !== pItem.uid && i.baseId === pItem.baseId && !i.isLocked && equipment.statWeaponId !== i.uid && equipment.statArmorId !== i.uid
              );
              return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between border-t border-slate-800/50 pt-2 flex-wrap gap-1", children: [
                /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400", children: [
                  "同名装備合体 (",
                  duplicates.length,
                  "個 所持)"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 688,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
                  duplicates.length > 0 && /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        if (onLimitBreak) onLimitBreak(pItem.uid, duplicates[0].uid);
                      },
                      disabled: isQuestActive,
                      className: "pixel-btn text-[10px] !py-1 active disabled:opacity-40",
                      children: "+1凸"
                    },
                    void 0,
                    false,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 693,
                      columnNumber: 23
                    },
                    this
                  ),
                  duplicates.length > 1 && /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        if (onBatchLimitBreak) {
                          onBatchLimitBreak(pItem.uid, duplicates.map((d) => d.uid));
                        } else if (onLimitBreak) {
                          duplicates.forEach((d) => onLimitBreak(pItem.uid, d.uid));
                        }
                      },
                      disabled: isQuestActive,
                      className: "pixel-btn text-[10px] !py-1 active !bg-rose-900 !text-rose-100 !border-rose-400 hover:!bg-rose-800 disabled:opacity-40 font-bold",
                      children: [
                        "🔨 全",
                        duplicates.length,
                        "個一括合体 (+",
                        duplicates.length,
                        "凸)"
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 704,
                      columnNumber: 23
                    },
                    this
                  ),
                  duplicates.length === 0 && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-600", children: "合体可能品なし" }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 719,
                    columnNumber: 23
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 691,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 687,
                columnNumber: 17
              }, this);
            })(),
            /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1.5 bg-slate-950 p-2 border border-slate-800 rounded mt-1", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-0.5", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-400", children: "素材で特殊強化 (ゴールド不要)" }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 729,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-purple-300 font-bold bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800", children: [
                  "累計 ",
                  specialCount,
                  "回 強化済"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 730,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 728,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxDEV(
                "select",
                {
                  value: selectedMaterialUid,
                  onChange: (e) => setSelectedMaterialUid(e.target.value),
                  className: "bg-slate-900 text-[10px] text-slate-200 border border-slate-700 rounded p-1 flex-1",
                  children: [
                    /* @__PURE__ */ jsxDEV("option", { value: "", disabled: true, children: "素材を選択" }, void 0, false, {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 740,
                      columnNumber: 19
                    }, this),
                    materials.map((m) => {
                      const baseMat = ITEMS[m.baseId];
                      const count = materials.filter((mat) => mat.baseId === m.baseId).length;
                      return /* @__PURE__ */ jsxDEV("option", { value: m.uid, children: [
                        baseMat?.name,
                        " (所持: ",
                        count,
                        "個)"
                      ] }, m.uid, true, {
                        fileName: "/app/applet/src/components/Inventory.tsx",
                        lineNumber: 745,
                        columnNumber: 23
                      }, this);
                    })
                  ]
                },
                void 0,
                true,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 735,
                  columnNumber: 17
                },
                this
              ) }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 734,
                columnNumber: 15
              }, this),
              selectedMaterialUid && (() => {
                const selMat = materials.find((m) => m.uid === selectedMaterialUid);
                if (!selMat) return null;
                const availableMats = materials.filter((m) => m.baseId === selMat.baseId);
                const matCount = availableMats.length;
                const curQty = Math.min(specialEnchantQty || 1, matCount);
                const matInfo = {
                  "m_slime_jelly": `🟢 粘り属性: 敵の攻撃速度 -${Math.min(90, 15 * curQty)}% (粘液スロー)`,
                  "m_goblin_ear": `🔴 会心属性: クリティカル率 +${Math.min(100, 5 * curQty)}%`,
                  "m_orc_fang": `🟣 吸血属性: 攻撃時HP吸収 +${Math.min(100, 3 * curQty)}%`,
                  "m_demon_horn": `🟡 魔性属性: 毎秒HP回復+${2 * curQty} & 与ダメ+${5 * curQty}%`,
                  "m_dragon_scale": `🐲 覇竜属性: 最大HP+${30 * curQty} & 獲得G+${10 * curQty}%`
                };
                return /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1.5 mt-1", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "text-[9px] text-purple-200 bg-purple-950/90 p-1.5 rounded border border-purple-800/90", children: [
                    "【",
                    curQty,
                    "個消費時の付与予定】",
                    matInfo[selMat.baseId] || "✨ 特殊効果付与",
                    " (能力+",
                    3 * curQty,
                    "〜",
                    7 * curQty,
                    ")"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 768,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between gap-1 flex-wrap", children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-400", children: "消費数:" }, void 0, false, {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 773,
                      columnNumber: 23
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1", children: [
                      [1, 5, 10].map((q) => {
                        if (q > matCount && q !== 1) return null;
                        return /* @__PURE__ */ jsxDEV(
                          "button",
                          {
                            type: "button",
                            onClick: () => setSpecialEnchantQty(q),
                            className: `pixel-btn text-[9px] !py-0.5 !px-1.5 ${curQty === q ? "active !border-purple-400 !text-purple-300" : ""}`,
                            children: [
                              "×",
                              q
                            ]
                          },
                          q,
                          true,
                          {
                            fileName: "/app/applet/src/components/Inventory.tsx",
                            lineNumber: 778,
                            columnNumber: 29
                          },
                          this
                        );
                      }),
                      matCount > 1 && /* @__PURE__ */ jsxDEV(
                        "button",
                        {
                          type: "button",
                          onClick: () => setSpecialEnchantQty(matCount),
                          className: `pixel-btn text-[9px] !py-0.5 !px-1.5 ${curQty === matCount ? "active !border-purple-400 !text-purple-300" : ""}`,
                          children: [
                            "全数(×",
                            matCount,
                            ")"
                          ]
                        },
                        void 0,
                        true,
                        {
                          fileName: "/app/applet/src/components/Inventory.tsx",
                          lineNumber: 789,
                          columnNumber: 27
                        },
                        this
                      )
                    ] }, void 0, true, {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 774,
                      columnNumber: 23
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 772,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        const toConsume = availableMats.slice(0, curQty).map((m) => m.uid);
                        const updatedItem = performBatchSpecialEnchant(pItem, selMat.baseId, curQty);
                        if (onBatchSpecialEnchant) {
                          onBatchSpecialEnchant(pItem.uid, toConsume, 0, updatedItem);
                        } else if (onSpecialEnchant) {
                          onSpecialEnchant(pItem.uid, toConsume[0], 0, updatedItem);
                        }
                      },
                      disabled: !selectedMaterialUid || matCount === 0 || isQuestActive,
                      className: "pixel-btn text-[10px] !py-1 active !border-purple-400 !bg-purple-900 hover:!bg-purple-800 !text-purple-100 disabled:opacity-40 font-bold mt-0.5",
                      children: [
                        "✨ 特殊強化を実行 (素材 ×",
                        curQty,
                        "個 消費)"
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 800,
                      columnNumber: 21
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 767,
                  columnNumber: 19
                }, this);
              })()
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 727,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between bg-amber-950/30 p-2 border border-amber-800/60 rounded mt-1", children: [
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-amber-200 font-bold", children: "💰 鍛冶屋で売却・分解" }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 824,
                    columnNumber: 19
                  }, this),
                  isEnchanted && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] bg-amber-800 text-amber-100 px-1 py-0.2 rounded font-bold", children: "高価買取中!" }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 826,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 823,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-amber-300/80", children: [
                  "査定額: ",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold text-xs", children: [
                    "🪙 ",
                    sellPrice,
                    " G"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 830,
                    columnNumber: 24
                  }, this),
                  isEnchanted && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] text-amber-400/90 ml-1", children: "(強化・凸ボーナス反映済)" }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 831,
                    columnNumber: 35
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 829,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 822,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1.5", children: [
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => onSellItem && onSellItem(pItem.uid, sellPrice),
                    disabled: isStatEq || isQuestActive || pItem.isLocked,
                    className: "pixel-btn text-[10px] !py-1 !px-3 active !border-amber-400 disabled:opacity-40",
                    children: isStatEq ? "装備中不可" : pItem.isLocked ? "ロック中" : "売却する"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 835,
                    columnNumber: 17
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => setDismantleConfirmItem({ item: pItem, gameItem: item }),
                    disabled: isStatEq || isQuestActive || pItem.isLocked,
                    className: "pixel-btn text-[10px] !py-1 !px-3 active !bg-slate-800 !text-slate-300 hover:!bg-slate-700 disabled:opacity-40",
                    children: isStatEq ? "装備中不可" : pItem.isLocked ? "ロック中" : "分解する"
                  },
                  void 0,
                  false,
                  {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 842,
                    columnNumber: 17
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 834,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 821,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 585,
            columnNumber: 11
          }, this)
        ]
      },
      item.id,
      true,
      {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 491,
        columnNumber: 7
      },
      this
    );
  };
  const renderShopCard = (item) => {
    const shopDiscountMult = getShopDiscountMultiplier(job);
    const finalPrice = Math.floor(item.price * shopDiscountMult);
    const hasJobDiscount = shopDiscountMult < 1;
    const qty = shopQuantities[item.id] || 1;
    const totalCost = finalPrice * qty;
    const maxAffordable = Math.max(1, Math.floor(gold / finalPrice));
    const setQty = (val) => {
      const sanitized = Math.max(1, Math.min(999, Math.floor(val)));
      setShopQuantities((prev) => ({ ...prev, [item.id]: sanitized }));
    };
    return /* @__PURE__ */ jsxDEV("div", { className: "pixel-panel flex flex-col gap-2 bg-slate-900/90 border-2 border-slate-700", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV(ItemIcon, { item }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 874,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold text-slate-100", children: item.name }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 875,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 873,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-amber-400 font-bold", children: item.type === "weapon" ? `攻撃力 ${item.power}` : item.type === "armor" ? `防御力 ${item.power}` : "" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 877,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 872,
        columnNumber: 9
      }, this),
      item.effect && /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-sky-300 bg-slate-950 p-2 border border-slate-800 rounded", children: [
        "✨ ",
        item.effect.description
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 882,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-800", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-amber-300 font-bold", children: [
              "🪙 ",
              finalPrice,
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 891,
              columnNumber: 15
            }, this),
            hasJobDiscount && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-500 line-through", children: [
              "🪙 ",
              item.price,
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 893,
              columnNumber: 17
            }, this),
            hasJobDiscount && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] bg-emerald-900 text-emerald-300 px-1 py-0.2 rounded font-bold border border-emerald-600", children: "特化割引" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 896,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 890,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setQty(qty - 1),
                disabled: qty <= 1,
                className: "pixel-btn text-[10px] !py-0.5 !px-1.5 disabled:opacity-30",
                children: "-"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 904,
                columnNumber: 15
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: "number",
                min: 1,
                max: 999,
                value: qty,
                onChange: (e) => setQty(parseInt(e.target.value) || 1),
                className: "w-10 text-center bg-slate-900 text-slate-200 text-xs font-bold border border-slate-700 rounded py-0.5"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 912,
                columnNumber: 15
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setQty(qty + 1),
                className: "pixel-btn text-[10px] !py-0.5 !px-1.5",
                children: "+"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 920,
                columnNumber: 15
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 903,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 889,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between gap-1 flex-wrap", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1", children: [
            [1, 5, 10].map((preset) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setQty(preset),
                className: `pixel-btn text-[9px] !py-0.5 !px-1.5 ${qty === preset ? "active !border-amber-400 !text-amber-300" : ""}`,
                children: [
                  preset,
                  "個"
                ]
              },
              preset,
              true,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 934,
                columnNumber: 17
              },
              this
            )),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => setQty(maxAffordable),
                className: `pixel-btn text-[9px] !py-0.5 !px-1.5 ${qty === maxAffordable ? "active !border-amber-400 !text-amber-300" : ""}`,
                children: [
                  "MAX(",
                  maxAffordable,
                  "個)"
                ]
              },
              void 0,
              true,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 943,
                columnNumber: 15
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 932,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                if (qty === 1) {
                  onBuyItem(item.id, finalPrice);
                } else if (onBatchBuyItem) {
                  onBatchBuyItem(item.id, qty, finalPrice);
                } else {
                  for (let i = 0; i < qty; i++) onBuyItem(item.id, finalPrice);
                }
              },
              disabled: gold < totalCost || isQuestActive,
              className: "pixel-btn text-xs active !border-amber-400 !bg-amber-950/60 hover:!bg-amber-900 font-bold disabled:opacity-40 !py-1 !px-3",
              children: qty > 1 ? `🛒 ${qty}個購入 (🪙${totalCost.toLocaleString()}G)` : "購入する"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 952,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 931,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 888,
        columnNumber: 9
      }, this)
    ] }, item.id, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 871,
      columnNumber: 7
    }, this);
  };
  const renderDailyShopCard = (item) => {
    const baseItem = ITEMS[item.baseId];
    if (!baseItem) return null;
    const shopDiscountMult = getShopDiscountMultiplier(job);
    const finalPrice = Math.floor(item.price * shopDiscountMult);
    const hasJobDiscount = shopDiscountMult < 1;
    const isSoldOut = soldOutDailyItemIds.includes(item.shopItemId) || item.isSoldOut;
    const isCursed = item.isCursed || baseItem.isCursed;
    let displayName = baseItem.name;
    if (item.customPrefix) displayName = `${item.customPrefix}${displayName}`;
    if (isCursed && !displayName.startsWith("💀")) displayName = `💀${displayName}`;
    if (item.upgradeLevel > 0) displayName = `${displayName} Lv.${item.upgradeLevel}`;
    const totalPower = baseItem.power + item.addedPower + item.upgradeLevel * 3;
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: `pixel-panel flex flex-col gap-2 relative transition-all ${isCursed ? "bg-purple-950/40 border-2 border-purple-600/80 shadow-[0_0_15px_rgba(147,51,234,0.25)]" : "bg-slate-900/90 border-2 border-slate-700"} ${isSoldOut ? "opacity-50 grayscale" : ""}`,
        children: [
          item.discountPercent > 0 && !isSoldOut && /* @__PURE__ */ jsxDEV("div", { className: "absolute -top-2.5 -right-2 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-md z-10 border border-rose-400 animate-pulse", children: [
            item.discountPercent,
            "% OFF"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1001,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV(ItemIcon, { item: { ...baseItem, id: item.baseId } }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1008,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", children: [
                isCursed && /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-purple-400 font-extrabold", children: "【呪い】" }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1011,
                  columnNumber: 30
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: `text-sm font-bold ${isCursed ? "text-purple-300" : "text-slate-100"}`, children: displayName }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1012,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1010,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400", children: [
                baseItem.type === "weapon" ? "攻撃力" : baseItem.type === "armor" ? "防御力" : "アイテム",
                ": ",
                /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold", children: [
                  "+",
                  totalPower
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1017,
                  columnNumber: 100
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1016,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1009,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1007,
            columnNumber: 11
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1006,
            columnNumber: 9
          }, this),
          baseItem.effect && /* @__PURE__ */ jsxDEV("div", { className: `text-[11px] p-2 border rounded ${isCursed ? "text-purple-200 bg-purple-950/80 border-purple-800" : "text-sky-300 bg-slate-950 border-slate-800"}`, children: [
            isCursed ? "💀 " : "✨ ",
            baseItem.effect.description
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1024,
            columnNumber: 11
          }, this),
          isCursed && /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-rose-400 font-bold bg-rose-950/60 p-1.5 border border-rose-800/80 rounded flex items-center gap-1", children: /* @__PURE__ */ jsxDEV("span", { children: "⚠️ 圧倒的威力と引き換えに毎秒HPドレイン・デバフの呪いが発動！" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1031,
            columnNumber: 13
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1030,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mt-1 pt-2 border-t border-slate-800", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-amber-300 font-bold", children: [
                "🪙 ",
                finalPrice,
                " G"
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1037,
                columnNumber: 13
              }, this),
              item.price > finalPrice && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-500 line-through", children: [
                "🪙 ",
                item.price,
                " G"
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1039,
                columnNumber: 15
              }, this),
              hasJobDiscount && /* @__PURE__ */ jsxDEV("span", { className: "text-[9px] bg-emerald-900 text-emerald-300 px-1 py-0.2 rounded font-bold border border-emerald-600", children: "特化割引" }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1042,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1036,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => onBuyDailyItem && onBuyDailyItem({ ...item, price: finalPrice }),
                disabled: gold < finalPrice || isSoldOut || isQuestActive,
                className: `pixel-btn text-xs active disabled:opacity-40 ${isCursed ? "!bg-purple-700 !text-purple-100 !border-purple-400 hover:!bg-purple-600" : "!border-amber-400"}`,
                children: isSoldOut ? "売切れ" : "購入する"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1047,
                columnNumber: 11
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1035,
            columnNumber: 9
          }, this)
        ]
      },
      item.shopItemId,
      true,
      {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 992,
        columnNumber: 7
      },
      this
    );
  };
  const renderDetailModal = () => {
    if (!detailPlayerItem) return null;
    const compiled = getCompiledItem(detailPlayerItem);
    const baseItem = ITEMS[detailPlayerItem.baseId];
    if (!baseItem || !compiled) return null;
    const isStatEq = equipment.statWeaponId === detailPlayerItem.uid || equipment.statArmorId === detailPlayerItem.uid;
    const isAppEq = equipment.appearanceWeaponId === detailPlayerItem.baseId || equipment.appearanceArmorId === detailPlayerItem.baseId;
    const statSlot = compiled.type === "weapon" ? "statWeaponId" : "statArmorId";
    const appSlot = compiled.type === "weapon" ? "appearanceWeaponId" : "appearanceArmorId";
    const sellPrice = calculateSellPrice(detailPlayerItem, job);
    const basePrice = baseItem.price || 100;
    const halfBase = Math.floor(basePrice * 0.5);
    const enchantBonus = detailPlayerItem.upgradeLevel > 0 ? Math.floor(basePrice * 0.2 * detailPlayerItem.upgradeLevel) : 0;
    const limitBreakBonus = (detailPlayerItem.limitBreak || 0) > 0 ? Math.floor(basePrice * 0.5 * detailPlayerItem.limitBreak) : 0;
    const specialEnchantBonus = (detailPlayerItem.specialEnchantCount || 0) > 0 ? Math.floor(basePrice * 0.3 * detailPlayerItem.specialEnchantCount) : 0;
    const addedPowerBonus = detailPlayerItem.addedPower > 0 ? detailPlayerItem.addedPower * 12 : 0;
    const specialCount = detailPlayerItem.specialEnchantCount || 0;
    const isCursedDetail = (compiled.isCursed || baseItem.isCursed) && !detailPlayerItem.isUncursed;
    const uncurseDetailCost = calculateUncurseCost(detailPlayerItem, job);
    return /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "pixel-panel max-w-md w-full bg-slate-900 border-2 border-amber-400 p-4 relative shadow-[0_0_30px_rgba(245,158,11,0.3)] max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setDetailPlayerItem(null),
          className: "absolute top-2 right-2 text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded",
          children: "✕"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1089,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 border-b border-slate-800 pb-3 mb-3", children: [
        /* @__PURE__ */ jsxDEV(ItemIcon, { item: { ...compiled, id: detailPlayerItem.baseId }, size: 48 }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1097,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-base font-bold text-slate-100", children: compiled.name }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1100,
              columnNumber: 17
            }, this),
            detailPlayerItem.engraving && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] bg-slate-800 text-indigo-300 border border-slate-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap", children: [
              "🛡️ ",
              detailPlayerItem.engraving
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1102,
              columnNumber: 19
            }, this),
            compiled.isCursed && /* @__PURE__ */ jsxDEV("span", { className: "text-xs bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700 font-extrabold", children: "💀 呪い装備" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1107,
              columnNumber: 19
            }, this),
            specialCount > 0 && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] bg-purple-900 text-purple-200 border border-purple-600 px-1.5 py-0.5 rounded font-bold", children: [
              "★ 特殊強化 ",
              specialCount,
              "回"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1112,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1099,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-400 flex items-center gap-2 mt-1", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "種別: ",
              compiled.type === "weapon" ? "⚔️ 武器" : "🛡️ 防具"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1118,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "(ベース: ",
              baseItem.name,
              ")"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1119,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1117,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1098,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1096,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-950 p-3 rounded border border-slate-800 mb-3", children: [
        /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1", children: "📊 能力値・強化ステータス詳細" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1126,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-2 text-xs mb-3", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-900/90 p-2 rounded border border-slate-800", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400", children: [
              "基本",
              compiled.type === "weapon" ? "攻撃力" : "防御力"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1130,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-slate-200", children: [
              "+",
              baseItem.power
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1131,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1129,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-900/90 p-2 rounded border border-slate-800", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400", children: [
              "基本強化 (Lv.",
              detailPlayerItem.upgradeLevel,
              ")"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1134,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-rose-300", children: [
              "+",
              detailPlayerItem.upgradeLevel * 3
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1135,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1133,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-900/90 p-2 rounded border border-slate-800", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-purple-300 font-bold", children: [
              "★ 特殊強化 (",
              specialCount,
              "回実施)"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1138,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-purple-300", children: [
              "+",
              detailPlayerItem.addedPower
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1139,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1137,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-900/90 p-2 rounded border border-slate-800", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400", children: "限界突破" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1142,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "text-sm font-bold text-sky-300", children: (detailPlayerItem.limitBreak || 0) > 0 ? `+${detailPlayerItem.limitBreak}凸` : "未実施" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1143,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1141,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1128,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between bg-amber-950/40 p-2.5 rounded border border-amber-800/80", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold text-amber-200", children: [
            "🔥 総合 ",
            compiled.type === "weapon" ? "攻撃力" : "防御力",
            ":"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1148,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-lg font-black text-amber-300", children: [
            "+",
            compiled.power
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1149,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1147,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1125,
        columnNumber: 11
      }, this),
      compiled.effect && /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-950 p-3 rounded border border-slate-800 mb-3", children: [
        /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-sky-300 mb-1", children: "✨ 付与効果・スキル" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1156,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-sky-200 leading-relaxed", children: compiled.effect.description }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1157,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1155,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-950 p-3 rounded border border-slate-800 mb-3", children: [
        /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1", children: "💰 鍛冶屋売却査定価格の内訳" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1165,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-1 text-[11px] text-slate-300 mb-2", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-slate-400", children: "基本価格 (定価の50%):" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1168,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "🪙 ",
              halfBase,
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1169,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1167,
            columnNumber: 15
          }, this),
          enchantBonus > 0 && /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-rose-300", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "基本強化ボーナス (Lv.",
              detailPlayerItem.upgradeLevel,
              "):"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1173,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "+🪙 ",
              enchantBonus,
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1174,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1172,
            columnNumber: 17
          }, this),
          limitBreakBonus > 0 && /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-sky-300", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "限界突破ボーナス (",
              detailPlayerItem.limitBreak,
              "凸):"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1179,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "+🪙 ",
              limitBreakBonus,
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1180,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1178,
            columnNumber: 17
          }, this),
          specialEnchantBonus > 0 && /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-purple-300", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "特殊強化ボーナス (",
              specialCount,
              "回):"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1185,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "+🪙 ",
              specialEnchantBonus,
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1186,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1184,
            columnNumber: 17
          }, this),
          addedPowerBonus > 0 && /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between text-amber-300", children: [
            /* @__PURE__ */ jsxDEV("span", { children: "追加能力ボーナス:" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1191,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              "+🪙 ",
              addedPowerBonus,
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1192,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1190,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1166,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-center pt-1 border-t border-slate-800 text-xs font-bold", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-amber-200", children: "合計売却査定額:" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1197,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 text-sm font-black", children: [
            "🪙 ",
            sellPrice,
            " G"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1198,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1196,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1164,
        columnNumber: 11
      }, this),
      compiled.type === "weapon" && /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-950 p-3 rounded border border-slate-800 mb-3", children: [
        /* @__PURE__ */ jsxDEV("h4", { className: "text-xs font-bold text-emerald-300 mb-2 border-b border-slate-800 pb-1 flex items-center justify-between", children: /* @__PURE__ */ jsxDEV("span", { children: [
          "💎 宝石スロット (",
          detailPlayerItem.slottedGems?.length || 0,
          "/",
          detailPlayerItem.unlockedSockets || 0,
          ")"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1206,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1205,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "space-y-2 mb-3", children: [
          Array.from({ length: Math.max(detailPlayerItem.unlockedSockets || 0, 1) }).map((_, idx) => {
            if (idx >= (detailPlayerItem.unlockedSockets || 0)) return null;
            const gemId = detailPlayerItem.slottedGems?.[idx];
            const gem = gemId ? ITEMS[gemId] : null;
            return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "w-6 h-6 rounded bg-slate-950 border border-slate-700 flex items-center justify-center flex-shrink-0", children: gem ? "💎" : /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-600", children: "空" }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1217,
                columnNumber: 39
              }, this) }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1216,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "flex-1 text-[10px]", children: gem ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
                /* @__PURE__ */ jsxDEV("div", { className: "font-bold text-slate-200", children: gem.name }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1222,
                  columnNumber: 29
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "text-sky-300", children: gem.effect?.description }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1223,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1221,
                columnNumber: 27
              }, this) : /* @__PURE__ */ jsxDEV("div", { className: "text-slate-500", children: "空きスロット" }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1226,
                columnNumber: 27
              }, this) }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1219,
                columnNumber: 23
              }, this)
            ] }, idx, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1215,
              columnNumber: 21
            }, this);
          }),
          (detailPlayerItem.unlockedSockets || 0) === 0 && /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-500 text-center py-2", children: "スロットが空いていません。穴開けを行ってください。" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1233,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1209,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-2", children: [
          (detailPlayerItem.unlockedSockets || 0) < 3 && /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                if (onOpenSocket) onOpenSocket(detailPlayerItem.uid);
                setDetailPlayerItem(null);
              },
              disabled: detailPlayerItem.isLocked || isQuestActive || gold < 5e3 * ((detailPlayerItem.unlockedSockets || 0) + 1),
              className: "pixel-btn text-[10px] w-full !bg-slate-800 active disabled:opacity-40",
              children: [
                "⛏️ 穴を開ける (🪙 ",
                5e3 * ((detailPlayerItem.unlockedSockets || 0) + 1),
                " G / 成功率 ",
                Math.floor((0.5 - (detailPlayerItem.unlockedSockets || 0) * 0.15 + (job === "artisan" ? 0.3 : 0)) * 100),
                "%)"
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1242,
              columnNumber: 19
            },
            this
          ),
          (detailPlayerItem.unlockedSockets || 0) > (detailPlayerItem.slottedGems?.length || 0) && /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxDEV(
              "select",
              {
                id: "gem-select",
                className: "pixel-input text-[10px] flex-1 !p-1 bg-slate-900 border border-slate-700 text-slate-300",
                children: [
                  /* @__PURE__ */ jsxDEV("option", { value: "", children: "宝石を選択..." }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 1261,
                    columnNumber: 23
                  }, this),
                  inventory.filter((i) => ITEMS[i.baseId]?.type === "gem" && !i.isLocked).map((i) => /* @__PURE__ */ jsxDEV("option", { value: i.uid, children: ITEMS[i.baseId].name }, i.uid, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 1263,
                    columnNumber: 25
                  }, this))
                ]
              },
              void 0,
              true,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1257,
                columnNumber: 21
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => {
                  const select = document.getElementById("gem-select");
                  if (select && select.value && onInsertGem) {
                    onInsertGem(detailPlayerItem.uid, select.value);
                    setDetailPlayerItem(null);
                  }
                },
                disabled: detailPlayerItem.isLocked || isQuestActive,
                className: "pixel-btn text-[10px] !py-1 !bg-emerald-900 !text-emerald-100 !border-emerald-600 active disabled:opacity-40",
                children: "はめ込む"
              },
              void 0,
              false,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1266,
                columnNumber: 21
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1256,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1239,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1204,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-2", children: [
        isCursedDetail && /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setUncurseConfirmItem({ item: detailPlayerItem, gameItem: compiled, cost: uncurseDetailCost });
            },
            disabled: gold < uncurseDetailCost || isQuestActive,
            className: "pixel-btn text-xs w-full !bg-purple-900 !text-purple-100 !border-purple-400 font-bold py-2 active disabled:opacity-40",
            children: [
              "✝️ 呪いを解除（解呪）する (費用: 🪙 ",
              uncurseDetailCost.toLocaleString(),
              " G)"
            ]
          },
          void 0,
          true,
          {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1288,
            columnNumber: 15
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                onEquip(statSlot, compiled.id);
                setDetailPlayerItem(null);
              },
              disabled: isStatEq || isQuestActive,
              className: `pixel-btn text-xs flex-1 ${isStatEq ? "active !border-emerald-400 !text-emerald-300" : ""}`,
              children: isStatEq ? "能力: 装備中" : "能力を装備"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1300,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                onEquip(appSlot, detailPlayerItem.baseId);
                setDetailPlayerItem(null);
              },
              disabled: isAppEq || isQuestActive,
              className: `pixel-btn text-xs flex-1 ${isAppEq ? "active !border-purple-400 !text-purple-300" : ""}`,
              children: isAppEq ? "見た目: 装備中" : "見た目を装備"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1310,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1299,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                if (onSellItem) onSellItem(detailPlayerItem.uid, sellPrice);
                setDetailPlayerItem(null);
              },
              disabled: isStatEq || isQuestActive || detailPlayerItem.isLocked,
              className: "pixel-btn text-xs flex-1 !border-amber-400 disabled:opacity-40",
              children: isStatEq ? "装備中不可" : detailPlayerItem.isLocked ? "🔒 ロック中" : `💰 🪙${sellPrice}G で売却`
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1323,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                setDismantleConfirmItem({ item: detailPlayerItem, gameItem: baseItem });
              },
              disabled: isStatEq || isQuestActive || detailPlayerItem.isLocked,
              className: "pixel-btn text-xs flex-1 !bg-slate-800 !text-slate-300 hover:!bg-slate-700 disabled:opacity-40",
              children: isStatEq ? "装備中不可" : detailPlayerItem.isLocked ? "🔒 ロック中" : "🔨 分解する"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1333,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1322,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 flex-wrap", children: [
          guildName && !detailPlayerItem.engraving && onEngraveItem && /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                if (confirm(`「${compiled.name}」にギルド名「${guildName}」を刻印しますか？`)) {
                  onEngraveItem(detailPlayerItem.uid, guildName);
                  setDetailPlayerItem(null);
                }
              },
              className: "pixel-btn text-xs flex-1 min-w-[40%] !bg-indigo-700 !border-indigo-500 hover:!bg-indigo-600",
              children: "🛡️ ギルド刻印"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1346,
              columnNumber: 17
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => onToggleLock && onToggleLock(detailPlayerItem.uid),
              className: "pixel-btn text-xs flex-1 !bg-slate-800 !border-slate-600",
              children: detailPlayerItem.isLocked ? "🔒 ロック解除" : "🔓 ロックする"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1358,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setDetailPlayerItem(null),
              className: "pixel-btn text-xs flex-1 !bg-slate-800 !text-slate-300 !border-slate-600",
              children: "閉じる"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1364,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1344,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1286,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1088,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1087,
      columnNumber: 7
    }, this);
  };
  const renderMaterialCard = (pItem) => {
    const baseMat = ITEMS[pItem.baseId];
    if (!baseMat) return null;
    const isChest = baseMat.type === "chest";
    const isConsumable = baseMat.type === "consumable";
    const sellPrice = calculateSellPrice(pItem, job);
    const isSelected = selectedSellUids.includes(pItem.uid);
    const canSelectForSell = !pItem.isLocked && !isQuestActive;
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        onClick: () => {
          if (batchSellMode && canSelectForSell) {
            toggleSelectSell(pItem.uid);
          }
        },
        className: `pixel-panel flex flex-col gap-2 bg-slate-900/90 border-2 ${isChest ? "border-amber-500/70 bg-slate-900/95" : "border-slate-700"} ${batchSellMode ? canSelectForSell ? "cursor-pointer hover:border-amber-400" : "opacity-60 cursor-not-allowed" : ""} ${isSelected ? "!border-amber-400 !bg-amber-950/60 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : ""}`,
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
              batchSellMode && /* @__PURE__ */ jsxDEV("div", { className: "flex items-center", children: /* @__PURE__ */ jsxDEV(
                "input",
                {
                  type: "checkbox",
                  checked: isSelected,
                  onChange: () => toggleSelectSell(pItem.uid),
                  disabled: !canSelectForSell,
                  className: "w-4 h-4 accent-amber-400 cursor-pointer rounded"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1404,
                  columnNumber: 17
                },
                this
              ) }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1403,
                columnNumber: 15
              }, this),
              isChest ? /* @__PURE__ */ jsxDEV("span", { className: "text-xl select-none", children: baseMat.name.includes("伝説") ? "👑" : baseMat.name.includes("金") ? "🧰" : baseMat.name.includes("銀") ? "🎁" : "📦" }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1414,
                columnNumber: 15
              }, this) : isConsumable ? /* @__PURE__ */ jsxDEV("span", { className: "text-xl select-none", children: "📜" }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1418,
                columnNumber: 15
              }, this) : /* @__PURE__ */ jsxDEV(ItemIcon, { item: { ...baseMat, id: pItem.baseId } }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1420,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: baseMat.color }, children: baseMat.name }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1423,
                  columnNumber: 15
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] text-slate-400", children: [
                  "売却価格: ",
                  /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold", children: [
                    "🪙 ",
                    sellPrice,
                    " G"
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 1425,
                    columnNumber: 23
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1424,
                  columnNumber: 15
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1422,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1401,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1", onClick: (e) => e.stopPropagation(), children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => onToggleLock && onToggleLock(pItem.uid),
                  className: "pixel-btn text-[10px] !py-1 !px-2 active hover:!bg-slate-700",
                  title: "ロックして売却・消費を防止",
                  children: pItem.isLocked ? "🔒" : "🔓"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1431,
                  columnNumber: 13
                },
                this
              ),
              isChest && onOpenChest && /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => onOpenChest(pItem),
                  disabled: isQuestActive || pItem.isLocked,
                  className: "pixel-btn text-xs !py-1 !px-2 font-bold !bg-amber-500 !text-slate-950 !border-amber-300 hover:!bg-amber-400 active:scale-95 disabled:opacity-40",
                  children: "🔓 開封"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1439,
                  columnNumber: 15
                },
                this
              ),
              isConsumable && onUseConsumable && /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => {
                    if (baseMat.id === "c_transfer_scroll") {
                      setTransferScrollUid(pItem.uid);
                    } else {
                      onUseConsumable(pItem.uid);
                    }
                  },
                  disabled: isQuestActive || pItem.isLocked,
                  className: "pixel-btn text-xs !py-1 !px-2 font-bold !bg-emerald-700 !text-emerald-100 hover:!bg-emerald-600 active:scale-95 disabled:opacity-40",
                  children: "使用する"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1448,
                  columnNumber: 15
                },
                this
              ),
              !isChest && !isConsumable && onSellItem && /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => onSellItem(pItem.uid, sellPrice),
                  disabled: isQuestActive || pItem.isLocked,
                  className: "pixel-btn text-[10px] !py-1 !px-2 active !border-amber-400 disabled:opacity-40",
                  children: "売却"
                },
                void 0,
                false,
                {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1463,
                  columnNumber: 15
                },
                this
              )
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1430,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1400,
            columnNumber: 9
          }, this),
          baseMat.effect && /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-slate-300 bg-slate-950 p-2 border border-slate-800 rounded", children: baseMat.effect.description }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1474,
            columnNumber: 11
          }, this)
        ]
      },
      pItem.uid,
      true,
      {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1387,
        columnNumber: 7
      },
      this
    );
  };
  const renderBatchSellToolbar = () => {
    return /* @__PURE__ */ jsxDEV("div", { className: "mb-4 bg-slate-950 p-3 rounded border-2 border-amber-500/80 shadow-md", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-slate-800", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-bold text-amber-300 flex items-center gap-1", children: /* @__PURE__ */ jsxDEV("span", { children: "💰 まとめ売り・一括売却モード" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1488,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1487,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => {
                setBatchSellMode(!batchSellMode);
                if (batchSellMode) setSelectedSellUids([]);
              },
              className: `pixel-btn text-xs !py-1 !px-3 font-bold ${batchSellMode ? "active !border-rose-400 !bg-rose-950 !text-rose-200" : "!border-amber-400 !bg-amber-950/60 !text-amber-200"}`,
              children: batchSellMode ? "✕ 一括売却モードを終了" : "⚡ 一括売却モードを開始"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1490,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1486,
          columnNumber: 11
        }, this),
        batchSellMode && /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-300 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxDEV("span", { children: [
            "選択中: ",
            /* @__PURE__ */ jsxDEV("strong", { className: "text-amber-300", children: selectedSellUids.length }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1505,
              columnNumber: 26
            }, this),
            " 個"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1505,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            "合計: ",
            /* @__PURE__ */ jsxDEV("strong", { className: "text-amber-300 font-bold", children: [
              "🪙 ",
              selectedSellTotalPrice.toLocaleString(),
              " G"
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1506,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1506,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1504,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1485,
        columnNumber: 9
      }, this),
      batchSellMode && /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-2", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] text-slate-400 font-bold", children: "一括選択:" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1514,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: handleSelectAllUnusedEquip,
              className: "pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800",
              children: "未装備武具を全選択"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1515,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: handleSelectAllUnenhanced,
              className: "pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800",
              children: "未強化武具を全選択"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1522,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: handleSelectAllDuplicates,
              className: "pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800",
              children: "重複所持品を全選択"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1529,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: handleSelectAllMaterials,
              className: "pixel-btn text-[10px] !py-0.5 !px-2 active hover:!bg-slate-800",
              children: "素材・宝石を全選択"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1536,
              columnNumber: 15
            },
            this
          ),
          selectedSellUids.length > 0 && /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: () => setSelectedSellUids([]),
              className: "pixel-btn text-[10px] !py-0.5 !px-2 !border-slate-600 !text-slate-400 hover:!bg-slate-800",
              children: "選択全解除"
            },
            void 0,
            false,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1544,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1513,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between pt-2 border-t border-slate-800/80", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-slate-400", children: "※ ロック中のアイテムおよび装備中の武具は売却対象外です。" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1555,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              onClick: () => {
                if (selectedSellUids.length === 0) return;
                if (onBatchSellItems) {
                  onBatchSellItems(selectedSellUids, selectedSellTotalPrice);
                  setSelectedSellUids([]);
                }
              },
              disabled: selectedSellUids.length === 0 || isQuestActive,
              className: "pixel-btn text-xs !py-1.5 !px-4 active !border-amber-400 !bg-amber-900 hover:!bg-amber-800 !text-amber-100 font-black disabled:opacity-30 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
              children: [
                "💰 選択した ",
                selectedSellUids.length,
                " 個を一括売却 (+🪙 ",
                selectedSellTotalPrice.toLocaleString(),
                " G)"
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1558,
              columnNumber: 15
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1554,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1512,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1484,
      columnNumber: 7
    }, this);
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "pixel-panel max-h-[480px] overflow-y-auto", children: [
    isQuestActive && /* @__PURE__ */ jsxDEV("div", { className: "mb-4 text-xs font-bold text-rose-300 bg-rose-950/80 p-3 border-2 border-rose-600 rounded flex items-center gap-2", children: [
      /* @__PURE__ */ jsxDEV("span", { children: "⚠️" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1583,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "集中クエスト中は装備の変更・購入・強化ができません。" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1584,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1582,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "flex gap-1 mb-4 border-b-2 border-slate-700 pb-3 flex-wrap", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setTab("inventory"),
          className: `pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === "inventory" ? "active" : ""}`,
          children: "🎒 装備"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1589,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setTab("forge"),
          className: `pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === "forge" ? "active" : ""}`,
          children: "🔨 鍛冶屋"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1595,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setTab("craft"),
          className: `pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === "craft" ? "active !border-amber-400 !text-amber-300" : ""}`,
          children: "🛠️ クラフト"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1601,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setTab("materials"),
          className: `pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === "materials" ? "active" : ""}`,
          children: [
            "💎 素材 ",
            chests.length > 0 ? `(🎁${chests.length})` : ""
          ]
        },
        void 0,
        true,
        {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1607,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setTab("dailyShop"),
          className: `pixel-btn text-[11px] flex-1 min-w-[95px] ${tab === "dailyShop" ? "active !border-purple-400 !text-purple-300" : ""}`,
          children: "📅 日替わり店"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1613,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => setTab("shop"),
          className: `pixel-btn text-[11px] flex-1 min-w-[70px] ${tab === "shop" ? "active" : ""}`,
          children: "🏪 通常店"
        },
        void 0,
        false,
        {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1619,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1588,
      columnNumber: 7
    }, this),
    tab === "inventory" || tab === "forge" ? /* @__PURE__ */ jsxDEV("div", { children: [
      renderBatchSellToolbar(),
      tab === "forge" ? /* @__PURE__ */ jsxDEV("div", { className: "mb-4 text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 border-2 border-slate-800 rounded", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-rose-400 font-bold mb-1", children: "🔨 鍛冶屋工房" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1633,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "【解呪 (呪い解除)】: ゴールドを消費し、呪い装備のHPドレインやデバフを聖なる力で浄化！" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1634,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "【基本強化】: +1 / +5 / +10 / MAXまとめ強化に対応！" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1635,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "【限界突破】: 重複装備の一括合体に対応！" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1636,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "【特殊強化】: 素材を複数個まとめて一括消費強化に対応！" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1637,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1632,
        columnNumber: 13
      }, this) : /* @__PURE__ */ jsxDEV("div", { className: "mb-4 text-xs leading-relaxed text-slate-300 bg-slate-950 p-3 border-2 border-slate-800 rounded", children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-amber-400 font-bold mb-1", children: "💡 装備システムのヒント" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1641,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "・【能力を装備】：攻撃力・防御力や自動HP回復・獲得量UP効果が反映されます。" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1642,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "・【見た目を装備】：ステータスはそのままで、キャラクターの見た目だけを変更できます！" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1643,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: "・【まとめ売り】：不要な装備や重複装備を一括選択してワンタップで換金できます！" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1644,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1640,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1", children: "🗡️ 武器" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1647,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 mb-6", children: weapons.length > 0 ? weapons.map((item) => renderInventoryCard(item)) : /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-500", children: "所持していません" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1649,
        columnNumber: 84
      }, this) }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1648,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-amber-300 mb-2 border-b border-slate-800 pb-1", children: "🛡️ 防具" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1652,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: armors.length > 0 ? armors.map((item) => renderInventoryCard(item)) : /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-500", children: "所持していません" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1654,
        columnNumber: 82
      }, this) }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1653,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1628,
      columnNumber: 9
    }, this) : tab === "craft" ? /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-4 bg-slate-950 p-3.5 rounded border-2 border-amber-500/70 shadow-md", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-1.5 flex-wrap gap-1", children: [
          /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-amber-300 flex items-center gap-1.5", children: /* @__PURE__ */ jsxDEV("span", { children: "🛠️ 秘術・深層クラフト工房" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1662,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1661,
            columnNumber: 15
          }, this),
          job === "artisan" && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] bg-amber-950 text-amber-300 border border-amber-500 px-2 py-0.5 rounded font-bold", children: "🏛️ アルティザン特権: 素材20%軽減適用中！" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1665,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1660,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-300 leading-relaxed mb-2", children: "モンスターのドロップ素材・属性宝石・深層素材を組み合わせて、特別な武具や護符を鍛造します。" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1670,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-sky-300 bg-sky-950/60 p-2 border border-sky-800/80 rounded flex items-center justify-between flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxDEV("span", { children: [
            "🌌 ",
            /* @__PURE__ */ jsxDEV("strong", { children: "深層武具ボーナス" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1674,
              columnNumber: 24
            }, this),
            ": クラフト時の最高到達階層（地下 ",
            /* @__PURE__ */ jsxDEV("strong", { children: maxStage }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1674,
              columnNumber: 67
            }, this),
            " 階）に応じてボーナス付与！"
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1674,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold", children: [
            "付与威力: +",
            Math.floor(maxStage * 1.5)
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1675,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1673,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1659,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-3.5", children: (() => {
        const isArtisan = job === "artisan";
        const matNormal = isArtisan ? 40 : 50;
        const gemNormal = isArtisan ? 4 : 5;
        const curseMat = isArtisan ? 8 : 10;
        const deepCrystal = isArtisan ? 8 : 10;
        const abyssCore = isArtisan ? 1 : 2;
        const deepBonus = Math.floor(maxStage * 1.5);
        const matCounts = {};
        inventory.forEach((item) => {
          matCounts[item.baseId] = (matCounts[item.baseId] || 0) + 1;
        });
        const recipes = [
          {
            id: "c_curse_breaker",
            name: "📜 呪い封じの護符",
            category: "消耗品 / 護符",
            color: "#f59e0b",
            desc: "使用すると解呪を行うまで呪い装備のマイナス効果を完全に無効化する。",
            statsPreview: "マイナス効果無効化",
            isDeep: false,
            materials: [
              { id: "m_slime_jelly", name: "スライムゼリー", count: curseMat },
              { id: "m_goblin_ear", name: "ゴブリンの耳", count: curseMat },
              { id: "m_orc_fang", name: "オークの牙", count: curseMat },
              { id: "m_demon_horn", name: "悪魔の角", count: curseMat },
              { id: "m_dragon_scale", name: "竜の鱗", count: curseMat }
            ]
          },
          {
            id: "w_craft_ragnarok",
            name: "⚔️ 終焉剣ラグナロク",
            category: "神話武器",
            color: "#f43f5e",
            desc: "神話の終焉を告げる究極の大剣。圧倒的な攻撃力とステータスを宿す。",
            statsPreview: "基本攻撃力 +250",
            isDeep: false,
            materials: [
              { id: "m_slime_jelly", name: "スライムゼリー", count: matNormal },
              { id: "m_goblin_ear", name: "ゴブリンの耳", count: matNormal },
              { id: "m_orc_fang", name: "オークの牙", count: matNormal },
              { id: "m_demon_horn", name: "悪魔の角", count: matNormal },
              { id: "m_dragon_scale", name: "竜の鱗", count: matNormal },
              { id: "g_fire_ruby", name: "火のルビー", count: gemNormal },
              { id: "g_water_sapphire", name: "水のサファイア", count: gemNormal },
              { id: "g_thunder_topaz", name: "雷のトパーズ", count: gemNormal },
              { id: "g_light_diamond", name: "光のダイヤモンド", count: gemNormal },
              { id: "g_dark_onyx", name: "闇のオニキス", count: gemNormal }
            ]
          },
          {
            id: "a_craft_aegis",
            name: "🛡️ 創星盾イージス",
            category: "神話防具",
            color: "#38bdf8",
            desc: "あらゆる厄災を跳ね返す究極の聖盾。絶大な防御力と加護を得る。",
            statsPreview: "基本防御力 +250",
            isDeep: false,
            materials: [
              { id: "m_slime_jelly", name: "スライムゼリー", count: matNormal },
              { id: "m_goblin_ear", name: "ゴブリンの耳", count: matNormal },
              { id: "m_orc_fang", name: "オークの牙", count: matNormal },
              { id: "m_demon_horn", name: "悪魔の角", count: matNormal },
              { id: "m_dragon_scale", name: "竜の鱗", count: matNormal },
              { id: "g_fire_ruby", name: "火のルビー", count: gemNormal },
              { id: "g_water_sapphire", name: "水のサファイア", count: gemNormal },
              { id: "g_thunder_topaz", name: "雷のトパーズ", count: gemNormal },
              { id: "g_light_diamond", name: "光のダイヤモンド", count: gemNormal },
              { id: "g_dark_onyx", name: "闇のオニキス", count: gemNormal }
            ]
          },
          {
            id: "w_deep_sword",
            name: "⚔️ 深淵の魔剣",
            category: "深層スケーリング武器",
            color: "#38bdf8",
            desc: "500F/1000F深層素材から鍛造される魔剣。最高到達階層に応じたボーナス威力が永久付与され、作成者名が永遠に刻印される。",
            statsPreview: `基本攻撃力 +180 ＋ 階層ボーナス +${deepBonus} ＝ 合計 +${180 + deepBonus}`,
            isDeep: true,
            materials: [
              { id: "m_deep_crystal", name: "深層の結晶 (500F~)", count: deepCrystal },
              { id: "m_abyss_core", name: "奈落のコア (1000F~)", count: abyssCore }
            ]
          },
          {
            id: "a_deep_armor",
            name: "🛡️ 奈落の鎧",
            category: "深層スケーリング防具",
            color: "#a855f7",
            desc: "500F/1000F深層素材から鍛造される重鎧。最高到達階層に応じたボーナス威力が永久付与され、作成者名が永遠に刻印される。",
            statsPreview: `基本防御力 +180 ＋ 階層ボーナス +${deepBonus} ＝ 合計 +${180 + deepBonus}`,
            isDeep: true,
            materials: [
              { id: "m_deep_crystal", name: "深層の結晶 (500F~)", count: deepCrystal },
              { id: "m_abyss_core", name: "奈落のコア (1000F~)", count: abyssCore }
            ]
          }
        ];
        return recipes.map((recipe) => {
          const canCraft = recipe.materials.every((m) => (matCounts[m.id] || 0) >= m.count);
          const mockGameItem = ITEMS[recipe.id] || { id: recipe.id, name: recipe.name, type: "weapon", color: recipe.color, price: 0, power: 0 };
          return /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: `pixel-panel bg-slate-900 border-2 p-3 sm:p-3.5 transition-all ${canCraft ? "border-amber-400/90 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20" : "border-slate-800 opacity-90"}`,
              children: [
                /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2.5 flex-wrap", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2.5", children: [
                    /* @__PURE__ */ jsxDEV(ItemIcon, { item: { ...mockGameItem, id: recipe.id }, size: 36 }, void 0, false, {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 1797,
                      columnNumber: 25
                    }, this),
                    /* @__PURE__ */ jsxDEV("div", { children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 flex-wrap", children: [
                        /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: recipe.color }, children: recipe.name }, void 0, false, {
                          fileName: "/app/applet/src/components/Inventory.tsx",
                          lineNumber: 1800,
                          columnNumber: 29
                        }, this),
                        /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700", children: recipe.category }, void 0, false, {
                          fileName: "/app/applet/src/components/Inventory.tsx",
                          lineNumber: 1801,
                          columnNumber: 29
                        }, this),
                        recipe.isDeep && /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded font-bold", children: [
                          "🛡️ 刻印: ",
                          playerName
                        ] }, void 0, true, {
                          fileName: "/app/applet/src/components/Inventory.tsx",
                          lineNumber: 1805,
                          columnNumber: 31
                        }, this)
                      ] }, void 0, true, {
                        fileName: "/app/applet/src/components/Inventory.tsx",
                        lineNumber: 1799,
                        columnNumber: 27
                      }, this),
                      /* @__PURE__ */ jsxDEV("div", { className: "text-[11px] text-amber-300/90 font-bold mt-0.5", children: [
                        "📊 ",
                        recipe.statsPreview
                      ] }, void 0, true, {
                        fileName: "/app/applet/src/components/Inventory.tsx",
                        lineNumber: 1810,
                        columnNumber: 27
                      }, this)
                    ] }, void 0, true, {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 1798,
                      columnNumber: 25
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 1796,
                    columnNumber: 23
                  }, this),
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        if (onCraftItem) onCraftItem(recipe.id);
                      },
                      disabled: !canCraft || isQuestActive,
                      className: `pixel-btn text-xs !py-1.5 !px-3.5 font-bold whitespace-nowrap self-center sm:self-start ${canCraft ? "!bg-amber-600 !text-white !border-amber-300 hover:!bg-amber-500 active:scale-95 animate-pulse" : "opacity-40 !bg-slate-800 !text-slate-400 !border-slate-700 cursor-not-allowed"}`,
                      children: isQuestActive ? "🔒 クエスト中" : canCraft ? "✨ 鍛造する" : "素材不足"
                    },
                    void 0,
                    false,
                    {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 1816,
                      columnNumber: 23
                    },
                    this
                  )
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1795,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-slate-400 mb-2 leading-relaxed", children: recipe.desc }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1831,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-950/80 p-2.5 rounded border border-slate-800/80", children: [
                  /* @__PURE__ */ jsxDEV("div", { className: "text-[10px] font-bold text-slate-400 mb-1.5 flex justify-between items-center", children: [
                    /* @__PURE__ */ jsxDEV("span", { children: "📋 必要素材" }, void 0, false, {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 1838,
                      columnNumber: 25
                    }, this),
                    canCraft && /* @__PURE__ */ jsxDEV("span", { className: "text-emerald-400 font-bold", children: "✅ クラフト可能です" }, void 0, false, {
                      fileName: "/app/applet/src/components/Inventory.tsx",
                      lineNumber: 1839,
                      columnNumber: 38
                    }, this)
                  ] }, void 0, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 1837,
                    columnNumber: 23
                  }, this),
                  /* @__PURE__ */ jsxDEV("div", { className: "flex flex-wrap gap-1.5", children: recipe.materials.map((mat) => {
                    const current = matCounts[mat.id] || 0;
                    const satisfied = current >= mat.count;
                    return /* @__PURE__ */ jsxDEV(
                      "span",
                      {
                        className: `text-[10px] sm:text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 ${satisfied ? "bg-emerald-950/80 text-emerald-300 border-emerald-700 font-bold" : "bg-rose-950/40 text-rose-300 border-rose-800/60"}`,
                        children: [
                          /* @__PURE__ */ jsxDEV("span", { children: [
                            ITEMS[mat.id]?.name || mat.name,
                            ":"
                          ] }, void 0, true, {
                            fileName: "/app/applet/src/components/Inventory.tsx",
                            lineNumber: 1854,
                            columnNumber: 31
                          }, this),
                          /* @__PURE__ */ jsxDEV("span", { className: satisfied ? "text-emerald-200 font-black" : "text-rose-400 font-black", children: [
                            current,
                            "/",
                            mat.count
                          ] }, void 0, true, {
                            fileName: "/app/applet/src/components/Inventory.tsx",
                            lineNumber: 1855,
                            columnNumber: 31
                          }, this)
                        ]
                      },
                      mat.id,
                      true,
                      {
                        fileName: "/app/applet/src/components/Inventory.tsx",
                        lineNumber: 1846,
                        columnNumber: 29
                      },
                      this
                    );
                  }) }, void 0, false, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 1841,
                    columnNumber: 23
                  }, this)
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1836,
                  columnNumber: 21
                }, this)
              ]
            },
            recipe.id,
            true,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1787,
              columnNumber: 19
            },
            this
          );
        });
      })() }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1679,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1658,
      columnNumber: 9
    }, this) : tab === "materials" ? /* @__PURE__ */ jsxDEV("div", { children: [
      renderBatchSellToolbar(),
      /* @__PURE__ */ jsxDEV("div", { className: "mb-3 bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center text-xs", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold", children: "💎 素材・宝箱・消費アイテム一覧" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1873,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-slate-400", children: [
          "所持数: ",
          nonEquipItems.length,
          " 個"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1874,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1872,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: nonEquipItems.length > 0 ? nonEquipItems.map((item) => renderMaterialCard(item)) : /* @__PURE__ */ jsxDEV("div", { className: "text-xs text-slate-500 p-4 text-center col-span-2", children: "素材や宝箱を持っていません。集中クエストを完遂してモンスターを討伐し、宝箱や素材を獲得しましょう！" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1877,
        columnNumber: 95
      }, this) }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1876,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1870,
      columnNumber: 9
    }, this) : tab === "dailyShop" ? /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "mb-4 text-xs leading-relaxed text-purple-200 bg-purple-950/80 p-3 border-2 border-purple-700/80 rounded shadow-md", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-1 flex-wrap gap-1", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "text-purple-300 font-bold text-sm", children: "📅 本日の闇市・限定日替わりショップ" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1884,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "text-[10px] text-purple-400 font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700", children: "【日付連動更新】" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1885,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1883,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[11px] text-purple-300/90 mb-2", children: [
          "毎日新しい商品が入荷！驚異的な能力と凶悪なデバフを併せ持つ",
          /* @__PURE__ */ jsxDEV("span", { className: "text-purple-300 font-bold", children: "【💀 呪われた装備】" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1888,
            columnNumber: 44
          }, this),
          "や、割引限定品が並びます。"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1887,
          columnNumber: 13
        }, this),
        (() => {
          const availableItems = dailyItems.filter((item) => !soldOutDailyItemIds.includes(item.shopItemId));
          const shopDiscountMult = getShopDiscountMultiplier(job);
          const totalBulkCost = availableItems.reduce((sum, item) => {
            const finalPrice = Math.floor(item.price * shopDiscountMult);
            return sum + finalPrice;
          }, 0);
          if (availableItems.length === 0) {
            return /* @__PURE__ */ jsxDEV("div", { className: "bg-purple-900/40 p-2 rounded border border-purple-800 text-[11px] text-purple-300 text-center font-bold", children: "✅ 本日の日替わり商品はすべて完売しました！また明日お越しください。" }, void 0, false, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1902,
              columnNumber: 19
            }, this);
          }
          return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between bg-purple-900/60 p-2.5 rounded border border-purple-500/80 flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "text-[11px]", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "text-purple-200 font-bold", children: "🛒 本日の入荷品まとめ買い" }, void 0, false, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1911,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "text-slate-300 text-[10px]", children: [
                "未購入 ",
                availableItems.length,
                " 品を一括購入: ",
                /* @__PURE__ */ jsxDEV("span", { className: "text-amber-300 font-bold", children: [
                  "🪙 ",
                  totalBulkCost.toLocaleString(),
                  " G"
                ] }, void 0, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1913,
                  columnNumber: 59
                }, this)
              ] }, void 0, true, {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1912,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1910,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                onClick: () => {
                  if (onBatchBuyDailyItems) {
                    const itemsWithDiscount = availableItems.map((item) => ({
                      ...item,
                      price: Math.floor(item.price * shopDiscountMult)
                    }));
                    onBatchBuyDailyItems(itemsWithDiscount, totalBulkCost);
                  } else if (onBuyDailyItem) {
                    availableItems.forEach((item) => {
                      onBuyDailyItem({ ...item, price: Math.floor(item.price * shopDiscountMult) });
                    });
                  }
                },
                disabled: gold < totalBulkCost || isQuestActive,
                className: "pixel-btn text-xs !py-1.5 !px-3.5 !bg-purple-800 hover:!bg-purple-700 !text-purple-100 !border-purple-300 font-bold active disabled:opacity-40 shadow-sm",
                children: [
                  "⚡ 残り全",
                  availableItems.length,
                  "品を一括購入"
                ]
              },
              void 0,
              true,
              {
                fileName: "/app/applet/src/components/Inventory.tsx",
                lineNumber: 1916,
                columnNumber: 19
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1909,
            columnNumber: 17
          }, this);
        })()
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1882,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-purple-300 mb-3 border-b border-purple-900 pb-1 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxDEV("span", { children: [
          "💀 日替わり限定アイテム (",
          todayStr,
          ")"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1941,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-xs text-slate-400 font-normal", children: "全5品" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1942,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1940,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: dailyItems.map((item) => renderDailyShopCard(item)) }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1944,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1881,
      columnNumber: 9
    }, this) : /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold text-amber-300 mb-3 border-b border-slate-800 pb-1", children: "✨ 新しいベース装備品" }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1950,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: shopItems.map((item) => renderShopCard(item)) }, void 0, false, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1951,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1949,
      columnNumber: 9
    }, this),
    renderDetailModal(),
    transferScrollUid && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "pixel-panel max-w-md w-full bg-slate-900 border-2 border-purple-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(168,85,247,0.3)]", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-purple-400 font-bold", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-xl", children: "📜" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1963,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold", children: "強化の継承" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1964,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1962,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-200 mb-3 leading-relaxed", children: [
        "抽出元（失われる）と継承先（強化される）の装備を選択してください。",
        /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1967,
          columnNumber: 48
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "text-rose-400", children: "※同じ種類（武器同士、防具同士）のみ継承可能です。" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1968,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1966,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "space-y-3 mb-4", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("label", { className: "block text-[10px] text-purple-300 mb-1", children: "抽出元（消滅します）:" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1973,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            "select",
            {
              value: transferSourceUid,
              onChange: (e) => {
                setTransferSourceUid(e.target.value);
                setTransferTargetUid("");
              },
              className: "pixel-input text-xs w-full p-2 bg-slate-950 border border-slate-700 text-slate-200",
              children: [
                /* @__PURE__ */ jsxDEV("option", { value: "", children: "抽出元の装備を選択..." }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1982,
                  columnNumber: 19
                }, this),
                ownedItems.filter((i) => (i.type === "weapon" || i.type === "armor") && !inventory.find((inv) => inv.uid === i.id)?.isLocked).map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: [
                  item.type === "weapon" ? "⚔️" : "🛡️",
                  " ",
                  item.name
                ] }, item.id, true, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 1986,
                  columnNumber: 23
                }, this))
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1974,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1972,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("label", { className: "block text-[10px] text-sky-300 mb-1", children: "継承先（上書きされます）:" }, void 0, false, {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 1994,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            "select",
            {
              value: transferTargetUid,
              onChange: (e) => setTransferTargetUid(e.target.value),
              disabled: !transferSourceUid,
              className: "pixel-input text-xs w-full p-2 bg-slate-950 border border-slate-700 text-slate-200 disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsxDEV("option", { value: "", children: "継承先の装備を選択..." }, void 0, false, {
                  fileName: "/app/applet/src/components/Inventory.tsx",
                  lineNumber: 2001,
                  columnNumber: 19
                }, this),
                (() => {
                  const sourceItem = ownedItems.find((i) => i.id === transferSourceUid);
                  if (!sourceItem) return null;
                  return ownedItems.filter((i) => i.type === sourceItem.type && i.id !== transferSourceUid && !inventory.find((inv) => inv.uid === i.id)?.isLocked).map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: [
                    item.type === "weapon" ? "⚔️" : "🛡️",
                    " ",
                    item.name
                  ] }, item.id, true, {
                    fileName: "/app/applet/src/components/Inventory.tsx",
                    lineNumber: 2008,
                    columnNumber: 25
                  }, this));
                })()
              ]
            },
            void 0,
            true,
            {
              fileName: "/app/applet/src/components/Inventory.tsx",
              lineNumber: 1995,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 1993,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 1971,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              if (onTransferEnhancements && transferSourceUid && transferTargetUid) {
                onTransferEnhancements(transferSourceUid, transferTargetUid, transferScrollUid);
              }
              setTransferScrollUid(null);
              setTransferSourceUid("");
              setTransferTargetUid("");
            },
            disabled: !transferSourceUid || !transferTargetUid,
            className: "pixel-btn text-xs flex-1 !bg-purple-900 !text-purple-100 !border-purple-500 active disabled:opacity-40",
            children: "継承を実行する"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 2018,
            columnNumber: 15
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              setTransferScrollUid(null);
              setTransferSourceUid("");
              setTransferTargetUid("");
            },
            className: "pixel-btn text-xs flex-1 !bg-slate-800 !text-slate-300 !border-slate-600 active",
            children: "キャンセル"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 2032,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2017,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1961,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 1960,
      columnNumber: 9
    }, this),
    dismantleConfirmItem && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "pixel-panel max-w-sm w-full bg-slate-900 border-2 border-rose-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(244,63,94,0.3)]", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-rose-400 font-bold", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-xl", children: "🔨" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2051,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold", children: "装備の分解確認" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2052,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2050,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-200 mb-3 leading-relaxed", children: [
        "「",
        /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-amber-300", children: dismantleConfirmItem.gameItem.name }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2055,
          columnNumber: 16
        }, this),
        "」を分解して素材にしますか？"
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2054,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-400 mb-4 space-y-1", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-amber-400 font-bold", children: "⚠️ 注意事項:" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2058,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: "・この装備品は失われます。" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2059,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: "・強化値や上限突破数に応じたランダム素材を獲得できます。" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2060,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2057,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              if (onDismantleItem) {
                onDismantleItem(dismantleConfirmItem.item.uid);
              }
              setDismantleConfirmItem(null);
              setDetailPlayerItem(null);
            },
            className: "pixel-btn text-xs py-2 flex-1 !border-rose-500 !bg-rose-950 hover:!bg-rose-900 !text-rose-200 active font-bold",
            children: "🔨 分解を実行する"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 2063,
            columnNumber: 15
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setDismantleConfirmItem(null),
            className: "pixel-btn text-xs py-2 px-3 !bg-slate-800 !text-slate-300 !border-slate-600",
            children: "キャンセル"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 2075,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2062,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 2049,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 2048,
      columnNumber: 9
    }, this),
    uncurseConfirmItem && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4", children: /* @__PURE__ */ jsxDEV("div", { className: "pixel-panel max-w-sm w-full bg-slate-900 border-2 border-purple-500 p-5 relative text-slate-100 shadow-[0_0_25px_rgba(168,85,247,0.4)]", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-purple-400 font-bold", children: [
        /* @__PURE__ */ jsxDEV("span", { className: "text-xl", children: "✝️" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2089,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-sm font-bold", children: "装備の解呪（呪い解除）確認" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2090,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2088,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-200 mb-3 leading-relaxed", children: [
        "「",
        /* @__PURE__ */ jsxDEV("span", { className: "font-bold text-amber-300", children: uncurseConfirmItem.gameItem.name }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2093,
          columnNumber: 16
        }, this),
        "」の呪いを解除（解呪）しますか？"
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2092,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 mb-4 space-y-1", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "text-purple-300 font-bold", children: "✨ 解呪の効果:" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2096,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: "・毎秒HPドレインや獲得量低下などの呪いが全て消滅します。" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2097,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: "・安全に装備でき、基本強化・限界突破・特殊強化が自由に可能になります！" }, void 0, false, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2098,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "pt-1 text-amber-300 font-bold", children: [
          "必要費用: 🪙 ",
          uncurseConfirmItem.cost.toLocaleString(),
          " G"
        ] }, void 0, true, {
          fileName: "/app/applet/src/components/Inventory.tsx",
          lineNumber: 2099,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2095,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => {
              if (onUncurseItem) {
                onUncurseItem(uncurseConfirmItem.item.uid, uncurseConfirmItem.cost);
              }
              setUncurseConfirmItem(null);
              setDetailPlayerItem(null);
            },
            disabled: gold < uncurseConfirmItem.cost,
            className: "pixel-btn text-xs py-2 flex-1 !border-purple-400 !bg-purple-900 hover:!bg-purple-800 !text-purple-100 active font-bold disabled:opacity-40",
            children: "✝️ 解呪を実行する"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 2102,
            columnNumber: 15
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => setUncurseConfirmItem(null),
            className: "pixel-btn text-xs py-2 px-3 !bg-slate-800 !text-slate-300 !border-slate-600",
            children: "キャンセル"
          },
          void 0,
          false,
          {
            fileName: "/app/applet/src/components/Inventory.tsx",
            lineNumber: 2115,
            columnNumber: 15
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/app/applet/src/components/Inventory.tsx",
        lineNumber: 2101,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 2087,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "/app/applet/src/components/Inventory.tsx",
      lineNumber: 2086,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/app/applet/src/components/Inventory.tsx",
    lineNumber: 1580,
    columnNumber: 5
  }, this);
};

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkludmVudG9yeS50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlTWVtbyB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IEVxdWlwbWVudFN0YXRlLCBHYW1lSXRlbSwgUGxheWVySXRlbSwgSXRlbUVmZmVjdCwgSm9iVHlwZSB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IElURU1TLCBpc0NyYWZ0RXhjbHVzaXZlSXRlbSB9IGZyb20gJy4uL2dhbWVEYXRhJztcbmltcG9ydCB7IFdFQVBPTl9TUFJJVEVTLCBBUk1PUl9TUFJJVEVTLCBkcmF3SWNvblNwcml0ZSB9IGZyb20gJy4uL3Nwcml0ZXMnO1xuaW1wb3J0IHsgXG4gIGdldENvbXBpbGVkSXRlbSwgXG4gIGNhbGN1bGF0ZVNlbGxQcmljZSwgXG4gIGNhbGN1bGF0ZVVuY3Vyc2VDb3N0LFxuICBjYWxjdWxhdGVCYXRjaEVuY2hhbnRDb3N0LFxuICBjYWxjdWxhdGVNYXhFbmNoYW50TGV2ZWxzLFxuICBwZXJmb3JtQmF0Y2hFbmNoYW50LFxuICBwZXJmb3JtQmF0Y2hTcGVjaWFsRW5jaGFudFxufSBmcm9tICcuLi9pdGVtVXRpbHMnO1xuaW1wb3J0IHsgZ2VuZXJhdGVEYWlseVNob3BJdGVtcywgZ2V0VG9kYXlEYXRlU3RyaW5nLCBEYWlseVNob3BJdGVtIH0gZnJvbSAnLi4vZGFpbHlTaG9wVXRpbHMnO1xuaW1wb3J0IHsgZ2V0U2hvcERpc2NvdW50TXVsdGlwbGllciB9IGZyb20gJy4uL2pvYlV0aWxzJztcblxuaW50ZXJmYWNlIEl0ZW1JY29uUHJvcHMge1xuICBpdGVtOiBHYW1lSXRlbSAmIHsgYmFzZUlkPzogc3RyaW5nIH07XG4gIHNpemU/OiBudW1iZXI7XG59XG5cbmNvbnN0IGljb25DYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbmNvbnN0IGdldEljb25DYWNoZUtleSA9IChpdGVtOiBHYW1lSXRlbSAmIHsgYmFzZUlkPzogc3RyaW5nIH0pOiBzdHJpbmcgPT4ge1xuICByZXR1cm4gYCR7aXRlbS50eXBlfV8ke2l0ZW0uYmFzZUlkIHx8IGl0ZW0uaWR9XyR7aXRlbS5jb2xvciB8fCAnJ31fJHtpdGVtLm5hbWUgfHwgJyd9YDtcbn07XG5cbmV4cG9ydCBjb25zdCBJdGVtSWNvbjogUmVhY3QuRkM8SXRlbUljb25Qcm9wcz4gPSBSZWFjdC5tZW1vKCh7IGl0ZW0sIHNpemUgPSAzMiB9KSA9PiB7XG4gIGNvbnN0IGNhbnZhc1JlZiA9IHVzZVJlZjxIVE1MQ2FudmFzRWxlbWVudD4obnVsbCk7XG4gIGNvbnN0IGNhY2hlS2V5ID0gZ2V0SWNvbkNhY2hlS2V5KGl0ZW0pO1xuICBjb25zdCBjYWNoZWRVcmwgPSBpY29uQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChjYWNoZWRVcmwpIHJldHVybjtcblxuICAgIGNvbnN0IGNhbnZhcyA9IGNhbnZhc1JlZi5jdXJyZW50O1xuICAgIGlmICghY2FudmFzKSByZXR1cm47XG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJywgeyBhbHBoYTogdHJ1ZSB9KTtcbiAgICBpZiAoIWN0eCkgcmV0dXJuO1xuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgIFxuICAgIC8vIERyYXcgZ2VuZXJpYyBzcXVhcmUgZm9yIG1hdGVyaWFscyBvciBnZW1zXG4gICAgaWYgKGl0ZW0udHlwZSA9PT0gJ21hdGVyaWFsJyB8fCBpdGVtLnR5cGUgPT09ICdnZW0nKSB7XG4gICAgICBjdHguZmlsbFN0eWxlID0gaXRlbS5jb2xvciB8fCAnIzk0YTNiOCc7XG4gICAgICBjdHguZmlsbFJlY3QoOCwgOCwgMTYsIDE2KTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAnI2ZmZmZmZic7XG4gICAgICBjdHguZmlsbFJlY3QoMTAsIDEwLCA0LCA0KTtcbiAgICAgIGljb25DYWNoZS5zZXQoY2FjaGVLZXksIGNhbnZhcy50b0RhdGFVUkwoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRHJhdyBjaGVzdCBpY29uXG4gICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2NoZXN0Jykge1xuICAgICAgY29uc3QgaXNHb2xkID0gaXRlbS5uYW1lPy5pbmNsdWRlcygn6YeRJykgfHwgaXRlbS5jb2xvciA9PT0gJyNmNTllMGInO1xuICAgICAgY29uc3QgaXNTaWx2ZXIgPSBpdGVtLm5hbWU/LmluY2x1ZGVzKCfpioAnKSB8fCBpdGVtLmNvbG9yID09PSAnIzk0YTNiOCc7XG4gICAgICBjb25zdCBpc0xlZ2VuZCA9IGl0ZW0ubmFtZT8uaW5jbHVkZXMoJ+S8neiqrCcpIHx8IGl0ZW0uY29sb3IgPT09ICcjYTg1NWY3JztcbiAgICAgIFxuICAgICAgY29uc3QgYm9keUNvbG9yID0gaXNMZWdlbmQgPyAnIzU4MWM4NycgOiBpc0dvbGQgPyAnI2I0NTMwOScgOiBpc1NpbHZlciA/ICcjNDc1NTY5JyA6ICcjNzgzNTBmJztcbiAgICAgIGNvbnN0IGxpZENvbG9yID0gaXNMZWdlbmQgPyAnIzkzMzNlYScgOiBpc0dvbGQgPyAnI2Y1OWUwYicgOiBpc1NpbHZlciA/ICcjOTRhM2I4JyA6ICcjYjQ1MzA5JztcbiAgICAgIGNvbnN0IGxvY2tDb2xvciA9IGlzTGVnZW5kID8gJyNmYWNjMTUnIDogaXNHb2xkID8gJyNmZGUwNDcnIDogJyNlMmU4ZjAnO1xuXG4gICAgICBjdHguZmlsbFN0eWxlID0gYm9keUNvbG9yO1xuICAgICAgY3R4LmZpbGxSZWN0KDYsIDEyLCAyMCwgMTQpO1xuICAgICAgY3R4LmZpbGxTdHlsZSA9IGxpZENvbG9yO1xuICAgICAgY3R4LmZpbGxSZWN0KDUsIDcsIDIyLCA2KTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBsb2NrQ29sb3I7XG4gICAgICBjdHguZmlsbFJlY3QoMTQsIDExLCA0LCA1KTtcbiAgICAgIGljb25DYWNoZS5zZXQoY2FjaGVLZXksIGNhbnZhcy50b0RhdGFVUkwoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRHJhdyBzY3JvbGwgLyBjb25zdW1hYmxlIGljb25cbiAgICBpZiAoaXRlbS50eXBlID09PSAnY29uc3VtYWJsZScpIHtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAnI2ZlZjNjNyc7XG4gICAgICBjdHguZmlsbFJlY3QoOCwgNiwgMTYsIDIwKTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAnI2Q5NzcwNic7XG4gICAgICBjdHguZmlsbFJlY3QoMTAsIDksIDEyLCAyKTtcbiAgICAgIGN0eC5maWxsUmVjdCgxMCwgMTMsIDEyLCAyKTtcbiAgICAgIGN0eC5maWxsUmVjdCgxMCwgMTcsIDEyLCAyKTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSAnI2I0NTMwOSc7XG4gICAgICBjdHguZmlsbFJlY3QoNiwgNSwgMjAsIDIpO1xuICAgICAgY3R4LmZpbGxSZWN0KDYsIDI1LCAyMCwgMik7XG4gICAgICBpY29uQ2FjaGUuc2V0KGNhY2hlS2V5LCBjYW52YXMudG9EYXRhVVJMKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNwcml0ZUtleSA9IChpdGVtIGFzIGFueSkuYmFzZUlkIHx8IGl0ZW0uaWQ7XG4gICAgY29uc3Qgc3ByaXRlRGF0YSA9IGl0ZW0udHlwZSA9PT0gJ3dlYXBvbicgXG4gICAgICA/IFdFQVBPTl9TUFJJVEVTW3Nwcml0ZUtleV0gfHwgV0VBUE9OX1NQUklURVNbaXRlbS5pZF0gfHwgV0VBUE9OX1NQUklURVNbJ3dfd29vZF9zd29yZCddIFxuICAgICAgOiBBUk1PUl9TUFJJVEVTW3Nwcml0ZUtleV0gfHwgQVJNT1JfU1BSSVRFU1tpdGVtLmlkXSB8fCBBUk1PUl9TUFJJVEVTWydhX2Nsb3RoJ107XG4gICAgXG4gICAgaWYgKHNwcml0ZURhdGEpIHtcbiAgICAgIGlmIChpdGVtLnR5cGUgPT09ICd3ZWFwb24nKSB7XG4gICAgICAgIGN0eC5zYXZlKCk7XG4gICAgICAgIGN0eC50cmFuc2xhdGUoY2FudmFzLndpZHRoIC8gMiwgY2FudmFzLmhlaWdodCAvIDIpO1xuICAgICAgICBjdHgucm90YXRlKE1hdGguUEkgLyA0KTtcbiAgICAgICAgZHJhd0ljb25TcHJpdGUoY3R4LCBzcHJpdGVEYXRhLCAtMTYsIC0xNiwgMik7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkcmF3SWNvblNwcml0ZShjdHgsIHNwcml0ZURhdGEsIDAsIDAsIDIpO1xuICAgICAgfVxuICAgIH1cbiAgICBpY29uQ2FjaGUuc2V0KGNhY2hlS2V5LCBjYW52YXMudG9EYXRhVVJMKCkpO1xuICB9LCBbY2FjaGVLZXksIGNhY2hlZFVybCwgaXRlbV0pO1xuXG4gIGlmIChjYWNoZWRVcmwpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGltZ1xuICAgICAgICBzcmM9e2NhY2hlZFVybH1cbiAgICAgICAgYWx0PXtpdGVtLm5hbWV9XG4gICAgICAgIHN0eWxlPXt7IHdpZHRoOiBzaXplLCBoZWlnaHQ6IHNpemUsIGltYWdlUmVuZGVyaW5nOiAncGl4ZWxhdGVkJyB9fVxuICAgICAgICBjbGFzc05hbWU9XCJyb3VuZGVkLXNtIHBpeGVsLXBhbmVsIHAtMCBiZy1zbGF0ZS04MDAgZmxleC1zaHJpbmstMFwiXG4gICAgICAgIGxvYWRpbmc9XCJsYXp5XCJcbiAgICAgIC8+XG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiAoXG4gICAgPGNhbnZhcyBcbiAgICAgIHJlZj17Y2FudmFzUmVmfSBcbiAgICAgIHdpZHRoPXszMn0gXG4gICAgICBoZWlnaHQ9ezMyfSBcbiAgICAgIHN0eWxlPXt7IHdpZHRoOiBzaXplLCBoZWlnaHQ6IHNpemUsIGltYWdlUmVuZGVyaW5nOiAncGl4ZWxhdGVkJyB9fSBcbiAgICAgIGNsYXNzTmFtZT1cInJvdW5kZWQtc20gcGl4ZWwtcGFuZWwgcC0wIGJnLXNsYXRlLTgwMCBmbGV4LXNocmluay0wXCIgXG4gICAgLz5cbiAgKTtcbn0pO1xuXG5pbnRlcmZhY2UgSW52ZW50b3J5UHJvcHMge1xuICBpbnZlbnRvcnk6IFBsYXllckl0ZW1bXTtcbiAgZXF1aXBtZW50OiBFcXVpcG1lbnRTdGF0ZTtcbiAgZ29sZDogbnVtYmVyO1xuICBqb2I/OiBKb2JUeXBlO1xuICBtYXhTdGFnZT86IG51bWJlcjtcbiAgcGxheWVyTmFtZT86IHN0cmluZztcbiAgb25FcXVpcDogKHNsb3Q6IGtleW9mIEVxdWlwbWVudFN0YXRlLCBpdGVtSWQ6IHN0cmluZykgPT4gdm9pZDtcbiAgb25CdXlJdGVtOiAoaXRlbUlkOiBzdHJpbmcsIHByaWNlOiBudW1iZXIpID0+IHZvaWQ7XG4gIG9uQnV5RGFpbHlJdGVtPzogKGl0ZW06IERhaWx5U2hvcEl0ZW0pID0+IHZvaWQ7XG4gIG9uQmF0Y2hCdXlJdGVtPzogKGl0ZW1JZDogc3RyaW5nLCBxdWFudGl0eTogbnVtYmVyLCB1bml0UHJpY2U6IG51bWJlcikgPT4gdm9pZDtcbiAgb25CYXRjaEJ1eURhaWx5SXRlbXM/OiAoZGFpbHlJdGVtc1RvQnV5OiBEYWlseVNob3BJdGVtW10pID0+IHZvaWQ7XG4gIHNvbGRPdXREYWlseUl0ZW1JZHM/OiBzdHJpbmdbXTtcbiAgb25FbmNoYW50SXRlbTogKHVpZDogc3RyaW5nLCBjb3N0OiBudW1iZXIsIG5ld0VmZmVjdDogUGxheWVySXRlbSkgPT4gdm9pZDtcbiAgb25MaW1pdEJyZWFrPzogKHVpZDE6IHN0cmluZywgdWlkMjogc3RyaW5nKSA9PiB2b2lkO1xuICBvbkJhdGNoTGltaXRCcmVhaz86ICh0YXJnZXRVaWQ6IHN0cmluZywgY29uc3VtZWRVaWRzOiBzdHJpbmdbXSkgPT4gdm9pZDtcbiAgb25TcGVjaWFsRW5jaGFudD86ICh1aWQ6IHN0cmluZywgbWF0ZXJpYWxVaWQ6IHN0cmluZywgY29zdDogbnVtYmVyLCBuZXdFZmZlY3Q6IFBsYXllckl0ZW0pID0+IHZvaWQ7XG4gIG9uQmF0Y2hTcGVjaWFsRW5jaGFudD86ICh1aWQ6IHN0cmluZywgY29uc3VtZWRNYXRlcmlhbFVpZHM6IHN0cmluZ1tdLCBjb3N0OiBudW1iZXIsIG5ld0VmZmVjdDogUGxheWVySXRlbSkgPT4gdm9pZDtcbiAgb25TZWxsSXRlbT86ICh1aWQ6IHN0cmluZywgc2VsbFByaWNlOiBudW1iZXIpID0+IHZvaWQ7XG4gIG9uQmF0Y2hTZWxsSXRlbXM/OiAodWlkczogc3RyaW5nW10sIHRvdGFsU2VsbFByaWNlOiBudW1iZXIpID0+IHZvaWQ7XG4gIG9uRGlzbWFudGxlSXRlbT86ICh1aWQ6IHN0cmluZykgPT4gdm9pZDtcbiAgb25Ub2dnbGVMb2NrPzogKHVpZDogc3RyaW5nKSA9PiB2b2lkO1xuICBvblVuY3Vyc2VJdGVtPzogKHVpZDogc3RyaW5nLCBjb3N0OiBudW1iZXIpID0+IHZvaWQ7XG4gIG9uT3BlbkNoZXN0PzogKGl0ZW06IFBsYXllckl0ZW0pID0+IHZvaWQ7XG4gIG9uQ3JhZnRJdGVtPzogKHJlY2lwZUlkOiBzdHJpbmcpID0+IHZvaWQ7XG4gIG9uVXNlQ29uc3VtYWJsZT86ICh1aWQ6IHN0cmluZykgPT4gdm9pZDtcbiAgb25PcGVuU29ja2V0PzogKHVpZDogc3RyaW5nKSA9PiB2b2lkO1xuICBvbkluc2VydEdlbT86ICh3ZWFwb25VaWQ6IHN0cmluZywgZ2VtVWlkOiBzdHJpbmcpID0+IHZvaWQ7XG4gIGd1aWxkTmFtZT86IHN0cmluZztcbiAgb25FbmdyYXZlSXRlbT86ICh1aWQ6IHN0cmluZywgZ3VpbGROYW1lOiBzdHJpbmcpID0+IHZvaWQ7XG4gIG9uVHJhbnNmZXJFbmhhbmNlbWVudHM/OiAoc291cmNlVWlkOiBzdHJpbmcsIHRhcmdldFVpZDogc3RyaW5nLCBzY3JvbGxVaWQ6IHN0cmluZykgPT4gdm9pZDtcbiAgaXNRdWVzdEFjdGl2ZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBJbnZlbnRvcnk6IFJlYWN0LkZDPEludmVudG9yeVByb3BzPiA9ICh7XG4gIGludmVudG9yeSxcbiAgZXF1aXBtZW50LFxuICBnb2xkLFxuICBqb2IgPSAnYmFsYW5jZWQnIGFzIEpvYlR5cGUsXG4gIG1heFN0YWdlID0gMSxcbiAgcGxheWVyTmFtZSA9ICflkI3nhKHjgZfli4fogIUnLFxuICBvbkVxdWlwLFxuICBvbkJ1eUl0ZW0sXG4gIG9uQnV5RGFpbHlJdGVtLFxuICBvbkJhdGNoQnV5SXRlbSxcbiAgb25CYXRjaEJ1eURhaWx5SXRlbXMsXG4gIHNvbGRPdXREYWlseUl0ZW1JZHMgPSBbXSxcbiAgb25FbmNoYW50SXRlbSxcbiAgb25MaW1pdEJyZWFrLFxuICBvbkJhdGNoTGltaXRCcmVhayxcbiAgb25TcGVjaWFsRW5jaGFudCxcbiAgb25CYXRjaFNwZWNpYWxFbmNoYW50LFxuICBvblNlbGxJdGVtLFxuICBvbkJhdGNoU2VsbEl0ZW1zLFxuICBvbkRpc21hbnRsZUl0ZW0sXG4gIG9uVG9nZ2xlTG9jayxcbiAgb25VbmN1cnNlSXRlbSxcbiAgb25PcGVuQ2hlc3QsXG4gIG9uQ3JhZnRJdGVtLFxuICBvblVzZUNvbnN1bWFibGUsXG4gIG9uT3BlblNvY2tldCxcbiAgb25JbnNlcnRHZW0sXG4gIG9uVHJhbnNmZXJFbmhhbmNlbWVudHMsXG4gIGlzUXVlc3RBY3RpdmUgPSBmYWxzZSxcbiAgZ3VpbGROYW1lLFxuICBvbkVuZ3JhdmVJdGVtLFxufSkgPT4ge1xuICBjb25zdCBbdGFiLCBzZXRUYWJdID0gdXNlU3RhdGU8J2ludmVudG9yeScgfCAnc2hvcCcgfCAnZGFpbHlTaG9wJyB8ICdmb3JnZScgfCAnY3JhZnQnIHwgJ21hdGVyaWFscyc+KCdpbnZlbnRvcnknKTtcbiAgY29uc3QgW3NlbGVjdGVkTWF0ZXJpYWxVaWQsIHNldFNlbGVjdGVkTWF0ZXJpYWxVaWRdID0gdXNlU3RhdGU8c3RyaW5nPignJyk7XG4gIGNvbnN0IFtkZXRhaWxQbGF5ZXJJdGVtLCBzZXREZXRhaWxQbGF5ZXJJdGVtXSA9IHVzZVN0YXRlPFBsYXllckl0ZW0gfCBudWxsPihudWxsKTtcbiAgY29uc3QgW2Rpc21hbnRsZUNvbmZpcm1JdGVtLCBzZXREaXNtYW50bGVDb25maXJtSXRlbV0gPSB1c2VTdGF0ZTx7IGl0ZW06IFBsYXllckl0ZW07IGdhbWVJdGVtOiBHYW1lSXRlbSB9IHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFt1bmN1cnNlQ29uZmlybUl0ZW0sIHNldFVuY3Vyc2VDb25maXJtSXRlbV0gPSB1c2VTdGF0ZTx7IGl0ZW06IFBsYXllckl0ZW07IGdhbWVJdGVtOiBHYW1lSXRlbTsgY29zdDogbnVtYmVyIH0gfCBudWxsPihudWxsKTtcbiAgY29uc3QgW3RyYW5zZmVyU2Nyb2xsVWlkLCBzZXRUcmFuc2ZlclNjcm9sbFVpZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW3RyYW5zZmVyU291cmNlVWlkLCBzZXRUcmFuc2ZlclNvdXJjZVVpZF0gPSB1c2VTdGF0ZTxzdHJpbmc+KCcnKTtcbiAgY29uc3QgW3RyYW5zZmVyVGFyZ2V0VWlkLCBzZXRUcmFuc2ZlclRhcmdldFVpZF0gPSB1c2VTdGF0ZTxzdHJpbmc+KCcnKTtcblxuICAvLyBCdWxrIEFjdGlvbnMgU3RhdGVcbiAgY29uc3QgW2JhdGNoU2VsbE1vZGUsIHNldEJhdGNoU2VsbE1vZGVdID0gdXNlU3RhdGU8Ym9vbGVhbj4oZmFsc2UpO1xuICBjb25zdCBbc2VsZWN0ZWRTZWxsVWlkcywgc2V0U2VsZWN0ZWRTZWxsVWlkc10gPSB1c2VTdGF0ZTxzdHJpbmdbXT4oW10pO1xuICBjb25zdCBbc2hvcFF1YW50aXRpZXMsIHNldFNob3BRdWFudGl0aWVzXSA9IHVzZVN0YXRlPFJlY29yZDxzdHJpbmcsIG51bWJlcj4+KHt9KTtcbiAgY29uc3QgW3NwZWNpYWxFbmNoYW50UXR5LCBzZXRTcGVjaWFsRW5jaGFudFF0eV0gPSB1c2VTdGF0ZTxudW1iZXI+KDEpO1xuICBcbiAgY29uc3QgdG9kYXlTdHIgPSBnZXRUb2RheURhdGVTdHJpbmcoKTtcbiAgY29uc3QgZGFpbHlJdGVtcyA9IHVzZU1lbW8oKCkgPT4gZ2VuZXJhdGVEYWlseVNob3BJdGVtcyh0b2RheVN0ciksIFt0b2RheVN0cl0pO1xuXG4gIGNvbnN0IHsgb3duZWRJdGVtcywgd2VhcG9ucywgYXJtb3JzLCBtYXRlcmlhbHMsIGNoZXN0cywgbm9uRXF1aXBJdGVtcyB9ID0gdXNlTWVtbygoKSA9PiB7XG4gICAgY29uc3Qgb3duZWQgPSBpbnZlbnRvcnkubWFwKHBJdGVtID0+IGdldENvbXBpbGVkSXRlbShwSXRlbSkpLmZpbHRlcihCb29sZWFuKSBhcyBHYW1lSXRlbVtdO1xuICAgIGNvbnN0IHdlcHMgPSBvd25lZC5maWx0ZXIoaXRlbSA9PiBpdGVtLnR5cGUgPT09ICd3ZWFwb24nKTtcbiAgICBjb25zdCBhcm1zID0gb3duZWQuZmlsdGVyKGl0ZW0gPT4gaXRlbS50eXBlID09PSAnYXJtb3InKTtcbiAgICBjb25zdCBtYXRzID0gaW52ZW50b3J5LmZpbHRlcihpID0+IElURU1TW2kuYmFzZUlkXT8udHlwZSA9PT0gJ21hdGVyaWFsJyk7XG4gICAgY29uc3QgY2hzID0gaW52ZW50b3J5LmZpbHRlcihpID0+IElURU1TW2kuYmFzZUlkXT8udHlwZSA9PT0gJ2NoZXN0Jyk7XG4gICAgY29uc3Qgbm9uRXEgPSBpbnZlbnRvcnkuZmlsdGVyKGkgPT4ge1xuICAgICAgY29uc3QgdHlwZSA9IElURU1TW2kuYmFzZUlkXT8udHlwZTtcbiAgICAgIHJldHVybiB0eXBlID09PSAnbWF0ZXJpYWwnIHx8IHR5cGUgPT09ICdjaGVzdCcgfHwgdHlwZSA9PT0gJ2dlbScgfHwgdHlwZSA9PT0gJ2NvbnN1bWFibGUnO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG93bmVkSXRlbXM6IG93bmVkLFxuICAgICAgd2VhcG9uczogd2VwcyxcbiAgICAgIGFybW9yczogYXJtcyxcbiAgICAgIG1hdGVyaWFsczogbWF0cyxcbiAgICAgIGNoZXN0czogY2hzLFxuICAgICAgbm9uRXF1aXBJdGVtczogbm9uRXEsXG4gICAgfTtcbiAgfSwgW2ludmVudG9yeV0pO1xuXG4gIC8vIOOCt+ODp+ODg+ODl+OBq+OBr+ODmeODvOOCueOCouOCpOODhuODoOOBjOS4puOBtiAo57Sg5p2Q44O75a6d566x44O75ZGq44GE6KOF5YKZ44O744Kv44Op44OV44OI6ZmQ5a6a5ZOB44Gv6Zmk5aSWKVxuICBjb25zdCBzaG9wSXRlbXMgPSB1c2VNZW1vKCgpID0+IHtcbiAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhJVEVNUykuZmlsdGVyKGl0ZW0gPT4gXG4gICAgICBpdGVtLnR5cGUgPT09ICd3ZWFwb24nIHx8IGl0ZW0udHlwZSA9PT0gJ2FybW9yJyB8fCBpdGVtLmlkID09PSAnY190cmFuc2Zlcl9zY3JvbGwnXG4gICAgKS5maWx0ZXIoaXRlbSA9PiBcbiAgICAgIGl0ZW0ucHJpY2UgPiAwICYmIFxuICAgICAgIWl0ZW0uaXNDdXJzZWQgJiYgXG4gICAgICAhaXRlbS5lZmZlY3Q/LmlzQ3Vyc2VkICYmXG4gICAgICAhaXNDcmFmdEV4Y2x1c2l2ZUl0ZW0oaXRlbSlcbiAgICApO1xuICB9LCBbXSk7XG5cbiAgLy8gSW5pdGlhbGl6ZSBzZWxlY3RlZCBtYXRlcmlhbCBpZiBub25lIGlzIHNlbGVjdGVkXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKG1hdGVyaWFscy5sZW5ndGggPiAwICYmICFtYXRlcmlhbHMuZmluZChtID0+IG0udWlkID09PSBzZWxlY3RlZE1hdGVyaWFsVWlkKSkge1xuICAgICAgc2V0U2VsZWN0ZWRNYXRlcmlhbFVpZChtYXRlcmlhbHNbMF0udWlkKTtcbiAgICB9XG4gIH0sIFttYXRlcmlhbHMsIHNlbGVjdGVkTWF0ZXJpYWxVaWRdKTtcblxuICAvLyAtLS0g5LiA5ous5aOy5Y206Zai6YCj44OY44Or44OR44O8IC0tLVxuICBjb25zdCBzZWxlY3RlZFNlbGxUb3RhbFByaWNlID0gdXNlTWVtbygoKSA9PiB7XG4gICAgcmV0dXJuIHNlbGVjdGVkU2VsbFVpZHMucmVkdWNlKChzdW0sIHVpZCkgPT4ge1xuICAgICAgY29uc3QgaXRlbSA9IGludmVudG9yeS5maW5kKGkgPT4gaS51aWQgPT09IHVpZCk7XG4gICAgICBpZiAoIWl0ZW0pIHJldHVybiBzdW07XG4gICAgICByZXR1cm4gc3VtICsgY2FsY3VsYXRlU2VsbFByaWNlKGl0ZW0sIGpvYik7XG4gICAgfSwgMCk7XG4gIH0sIFtzZWxlY3RlZFNlbGxVaWRzLCBpbnZlbnRvcnksIGpvYl0pO1xuXG4gIGNvbnN0IHRvZ2dsZVNlbGVjdFNlbGwgPSAodWlkOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBpdGVtID0gaW52ZW50b3J5LmZpbmQoaSA9PiBpLnVpZCA9PT0gdWlkKTtcbiAgICBpZiAoIWl0ZW0gfHwgaXRlbS5pc0xvY2tlZCB8fCBlcXVpcG1lbnQuc3RhdFdlYXBvbklkID09PSB1aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSB1aWQpIHJldHVybjtcblxuICAgIHNldFNlbGVjdGVkU2VsbFVpZHMocHJldiA9PiBcbiAgICAgIHByZXYuaW5jbHVkZXModWlkKSA/IHByZXYuZmlsdGVyKGlkID0+IGlkICE9PSB1aWQpIDogWy4uLnByZXYsIHVpZF1cbiAgICApO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVNlbGVjdEFsbFVudXNlZEVxdWlwID0gKCkgPT4ge1xuICAgIGNvbnN0IHZhbGlkID0gaW52ZW50b3J5LmZpbHRlcihpID0+IHtcbiAgICAgIGNvbnN0IHR5cGUgPSBJVEVNU1tpLmJhc2VJZF0/LnR5cGU7XG4gICAgICBjb25zdCBpc0VxdWlwID0gdHlwZSA9PT0gJ3dlYXBvbicgfHwgdHlwZSA9PT0gJ2FybW9yJztcbiAgICAgIGNvbnN0IGlzRXF1aXBwZWQgPSBlcXVpcG1lbnQuc3RhdFdlYXBvbklkID09PSBpLnVpZCB8fCBlcXVpcG1lbnQuc3RhdEFybW9ySWQgPT09IGkudWlkO1xuICAgICAgcmV0dXJuIGlzRXF1aXAgJiYgIWkuaXNMb2NrZWQgJiYgIWlzRXF1aXBwZWQ7XG4gICAgfSkubWFwKGkgPT4gaS51aWQpO1xuICAgIHNldFNlbGVjdGVkU2VsbFVpZHModmFsaWQpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVNlbGVjdEFsbFVuZW5oYW5jZWQgPSAoKSA9PiB7XG4gICAgY29uc3QgdmFsaWQgPSBpbnZlbnRvcnkuZmlsdGVyKGkgPT4ge1xuICAgICAgY29uc3QgdHlwZSA9IElURU1TW2kuYmFzZUlkXT8udHlwZTtcbiAgICAgIGNvbnN0IGlzRXF1aXAgPSB0eXBlID09PSAnd2VhcG9uJyB8fCB0eXBlID09PSAnYXJtb3InO1xuICAgICAgY29uc3QgaXNFcXVpcHBlZCA9IGVxdWlwbWVudC5zdGF0V2VhcG9uSWQgPT09IGkudWlkIHx8IGVxdWlwbWVudC5zdGF0QXJtb3JJZCA9PT0gaS51aWQ7XG4gICAgICBjb25zdCBpc0NsZWFuID0gaS51cGdyYWRlTGV2ZWwgPT09IDAgJiYgKCFpLmxpbWl0QnJlYWsgfHwgaS5saW1pdEJyZWFrID09PSAwKSAmJiAoIWkuc3BlY2lhbEVuY2hhbnRDb3VudCB8fCBpLnNwZWNpYWxFbmNoYW50Q291bnQgPT09IDApICYmIChpLmFkZGVkUG93ZXIgPT09IDApO1xuICAgICAgcmV0dXJuIGlzRXF1aXAgJiYgIWkuaXNMb2NrZWQgJiYgIWlzRXF1aXBwZWQgJiYgaXNDbGVhbjtcbiAgICB9KS5tYXAoaSA9PiBpLnVpZCk7XG4gICAgc2V0U2VsZWN0ZWRTZWxsVWlkcyh2YWxpZCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlU2VsZWN0QWxsRHVwbGljYXRlcyA9ICgpID0+IHtcbiAgICBjb25zdCBncm91cHM6IFJlY29yZDxzdHJpbmcsIFBsYXllckl0ZW1bXT4gPSB7fTtcbiAgICBpbnZlbnRvcnkuZm9yRWFjaChpID0+IHtcbiAgICAgIGNvbnN0IHR5cGUgPSBJVEVNU1tpLmJhc2VJZF0/LnR5cGU7XG4gICAgICBpZiAodHlwZSA9PT0gJ3dlYXBvbicgfHwgdHlwZSA9PT0gJ2FybW9yJykge1xuICAgICAgICBpZiAoIWdyb3Vwc1tpLmJhc2VJZF0pIGdyb3Vwc1tpLmJhc2VJZF0gPSBbXTtcbiAgICAgICAgZ3JvdXBzW2kuYmFzZUlkXS5wdXNoKGkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgc2VsZWN0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgT2JqZWN0LnZhbHVlcyhncm91cHMpLmZvckVhY2goaXRlbXMgPT4ge1xuICAgICAgaWYgKGl0ZW1zLmxlbmd0aCA8PSAxKSByZXR1cm47XG4gICAgICBjb25zdCBzb3J0ZWQgPSBbLi4uaXRlbXNdLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgY29uc3QgYUVxID0gZXF1aXBtZW50LnN0YXRXZWFwb25JZCA9PT0gYS51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBhLnVpZDtcbiAgICAgICAgY29uc3QgYkVxID0gZXF1aXBtZW50LnN0YXRXZWFwb25JZCA9PT0gYi51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBiLnVpZDtcbiAgICAgICAgaWYgKGFFcSAmJiAhYkVxKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICghYUVxICYmIGJFcSkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhLmlzTG9ja2VkICYmICFiLmlzTG9ja2VkKSByZXR1cm4gLTE7XG4gICAgICAgIGlmICghYS5pc0xvY2tlZCAmJiBiLmlzTG9ja2VkKSByZXR1cm4gMTtcbiAgICAgICAgY29uc3QgYVBvd2VyID0gYS51cGdyYWRlTGV2ZWwgKiAzICsgKGEubGltaXRCcmVhayB8fCAwKSAqIDUgKyBhLmFkZGVkUG93ZXI7XG4gICAgICAgIGNvbnN0IGJQb3dlciA9IGIudXBncmFkZUxldmVsICogMyArIChiLmxpbWl0QnJlYWsgfHwgMCkgKiA1ICsgYi5hZGRlZFBvd2VyO1xuICAgICAgICByZXR1cm4gYlBvd2VyIC0gYVBvd2VyO1xuICAgICAgfSk7XG5cbiAgICAgIGZvciAobGV0IGlkeCA9IDE7IGlkeCA8IHNvcnRlZC5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgIGNvbnN0IGl0ID0gc29ydGVkW2lkeF07XG4gICAgICAgIGNvbnN0IGlzRXEgPSBlcXVpcG1lbnQuc3RhdFdlYXBvbklkID09PSBpdC51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBpdC51aWQ7XG4gICAgICAgIGlmICghaXQuaXNMb2NrZWQgJiYgIWlzRXEpIHtcbiAgICAgICAgICBzZWxlY3RlZC5wdXNoKGl0LnVpZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHNldFNlbGVjdGVkU2VsbFVpZHMoc2VsZWN0ZWQpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVNlbGVjdEFsbE1hdGVyaWFscyA9ICgpID0+IHtcbiAgICBjb25zdCB2YWxpZCA9IGludmVudG9yeS5maWx0ZXIoaSA9PiB7XG4gICAgICBjb25zdCB0eXBlID0gSVRFTVNbaS5iYXNlSWRdPy50eXBlO1xuICAgICAgcmV0dXJuICh0eXBlID09PSAnbWF0ZXJpYWwnIHx8IHR5cGUgPT09ICdnZW0nKSAmJiAhaS5pc0xvY2tlZDtcbiAgICB9KS5tYXAoaSA9PiBpLnVpZCk7XG4gICAgc2V0U2VsZWN0ZWRTZWxsVWlkcyh2YWxpZCk7XG4gIH07XG5cbiAgY29uc3QgdG90YWxCYXRjaFNlbGxQcmljZSA9IHVzZU1lbW8oKCkgPT4ge1xuICAgIHJldHVybiBzZWxlY3RlZFNlbGxVaWRzLnJlZHVjZSgoc3VtLCB1aWQpID0+IHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBpbnZlbnRvcnkuZmluZChpID0+IGkudWlkID09PSB1aWQpO1xuICAgICAgcmV0dXJuIHN1bSArIChpdGVtID8gY2FsY3VsYXRlU2VsbFByaWNlKGl0ZW0sIGpvYikgOiAwKTtcbiAgICB9LCAwKTtcbiAgfSwgW3NlbGVjdGVkU2VsbFVpZHMsIGludmVudG9yeSwgam9iXSk7XG5cbiAgY29uc3QgaGFuZGxlRXhlY3V0ZUJhdGNoU2VsbCA9ICgpID0+IHtcbiAgICBpZiAoIXNlbGVjdGVkU2VsbFVpZHMubGVuZ3RoKSByZXR1cm47XG4gICAgaWYgKG9uQmF0Y2hTZWxsSXRlbXMpIHtcbiAgICAgIG9uQmF0Y2hTZWxsSXRlbXMoc2VsZWN0ZWRTZWxsVWlkcywgdG90YWxCYXRjaFNlbGxQcmljZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGVjdGVkU2VsbFVpZHMuZm9yRWFjaCh1aWQgPT4ge1xuICAgICAgICBjb25zdCBpdCA9IGludmVudG9yeS5maW5kKGkgPT4gaS51aWQgPT09IHVpZCk7XG4gICAgICAgIGlmIChpdCAmJiBvblNlbGxJdGVtKSBvblNlbGxJdGVtKHVpZCwgY2FsY3VsYXRlU2VsbFByaWNlKGl0LCBqb2IpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBzZXRTZWxlY3RlZFNlbGxVaWRzKFtdKTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVFbmNoYW50ID0gKHBJdGVtOiBQbGF5ZXJJdGVtKSA9PiB7XG4gICAgY29uc3QgY29zdCA9IDIwMCArIHBJdGVtLnVwZ3JhZGVMZXZlbCAqIDEwMDtcbiAgICBpZiAoZ29sZCA8IGNvc3QpIHJldHVybjtcblxuICAgIGNvbnN0IGFkZGVkUG93ZXIgPSBwSXRlbS5hZGRlZFBvd2VyICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMykgKyAxO1xuICAgIGNvbnN0IG5ld0xldmVsID0gcEl0ZW0udXBncmFkZUxldmVsICsgMTtcbiAgICBcbiAgICBjb25zdCBwcmVmaXhlcyA9IFsn6Yut5Yip44GqJywgJ+eCjuOBricsICfkvJ3oqqzjga4nLCAn56Wd56aP44GV44KM44GfJywgJ+WRquOCj+OCjOOBnycsICflkI3lt6Xjga4nLCAn56We6IGW44Gq44KLJ107XG4gICAgY29uc3QgY3VzdG9tUHJlZml4ID0gbmV3TGV2ZWwgJSAzID09PSAwID8gcHJlZml4ZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcHJlZml4ZXMubGVuZ3RoKV0gOiBwSXRlbS5jdXN0b21QcmVmaXg7XG5cbiAgICBvbkVuY2hhbnRJdGVtKHBJdGVtLnVpZCwgY29zdCwge1xuICAgICAgLi4ucEl0ZW0sXG4gICAgICB1cGdyYWRlTGV2ZWw6IG5ld0xldmVsLFxuICAgICAgYWRkZWRQb3dlcixcbiAgICAgIGN1c3RvbVByZWZpeCxcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVMaW1pdEJyZWFrQ2xpY2sgPSAocEl0ZW06IFBsYXllckl0ZW0pID0+IHtcbiAgICBpZiAoIW9uTGltaXRCcmVhaykgcmV0dXJuO1xuICAgIGNvbnN0IGR1cGxpY2F0ZSA9IGludmVudG9yeS5maW5kKGkgPT4gaS51aWQgIT09IHBJdGVtLnVpZCAmJiBpLmJhc2VJZCA9PT0gcEl0ZW0uYmFzZUlkKTtcbiAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICBvbkxpbWl0QnJlYWsocEl0ZW0udWlkLCBkdXBsaWNhdGUudWlkKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlU3BlY2lhbEVuY2hhbnRDbGljayA9IChwSXRlbTogUGxheWVySXRlbSkgPT4ge1xuICAgIGlmICghb25TcGVjaWFsRW5jaGFudCB8fCAhc2VsZWN0ZWRNYXRlcmlhbFVpZCkgcmV0dXJuO1xuICAgIFxuICAgIGNvbnN0IG1hdCA9IG1hdGVyaWFscy5maW5kKG0gPT4gbS51aWQgPT09IHNlbGVjdGVkTWF0ZXJpYWxVaWQpO1xuICAgIGlmICghbWF0KSByZXR1cm47XG4gICAgXG4gICAgY29uc3QgYmFzZU1hdEl0ZW0gPSBJVEVNU1ttYXQuYmFzZUlkXTtcbiAgICBpZiAoIWJhc2VNYXRJdGVtKSByZXR1cm47XG5cbiAgICBjb25zdCBjb3N0ID0gMDsgLy8g44K044O844Or44OJ6LK755So54Sh5paZXG4gICAgY29uc3QgYWRkZWRQb3dlciA9IHBJdGVtLmFkZGVkUG93ZXIgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1KSArIDM7IC8vICszfjcgcG93ZXJcbiAgICBcbiAgICBjb25zdCBwcmV2RWZmZWN0OiBJdGVtRWZmZWN0ID0gcEl0ZW0uYWRkZWRFZmZlY3QgfHwgeyBkZXNjcmlwdGlvbjogJycgfTtcbiAgICBsZXQgbWF0RWZmZWN0OiBJdGVtRWZmZWN0ID0geyAuLi5wcmV2RWZmZWN0IH07XG4gICAgbGV0IHByZWZpeCA9IHByZXZFZmZlY3QuZGVzY3JpcHRpb24gPyAn44Kt44Oh44Op44GuJyA6ICfnpZ7np5jjga4nO1xuXG4gICAgaWYgKG1hdC5iYXNlSWQgPT09ICdtX3NsaW1lX2plbGx5Jykge1xuICAgICAgcHJlZml4ID0gcHJldkVmZmVjdC5kZXNjcmlwdGlvbiA/ICfjgq3jg6Hjg6njga4nIDogJ+eymOaAp+OBric7XG4gICAgICBtYXRFZmZlY3QuZW5lbXlTbG93UmF0ZSA9IE1hdGgubWluKDAuOTAsIChtYXRFZmZlY3QuZW5lbXlTbG93UmF0ZSB8fCAwKSArIDAuMTUpO1xuICAgIH0gZWxzZSBpZiAobWF0LmJhc2VJZCA9PT0gJ21fZ29ibGluX2VhcicpIHtcbiAgICAgIHByZWZpeCA9IHByZXZFZmZlY3QuZGVzY3JpcHRpb24gPyAn44Kt44Oh44Op44GuJyA6ICfph47om67jgaonO1xuICAgICAgbWF0RWZmZWN0LmNyaXRDaGFuY2UgPSBNYXRoLm1pbigxLjAsIChtYXRFZmZlY3QuY3JpdENoYW5jZSB8fCAwKSArIDAuMDUpO1xuICAgIH0gZWxzZSBpZiAobWF0LmJhc2VJZCA9PT0gJ21fb3JjX2ZhbmcnKSB7XG4gICAgICBwcmVmaXggPSBwcmV2RWZmZWN0LmRlc2NyaXB0aW9uID8gJ+OCreODoeODqeOBricgOiAn6LGq5YKR44GuJztcbiAgICAgIG1hdEVmZmVjdC5saWZlc3RlYWwgPSBNYXRoLm1pbigxLjAsIChtYXRFZmZlY3QubGlmZXN0ZWFsIHx8IDApICsgMC4wMyk7XG4gICAgfSBlbHNlIGlmIChtYXQuYmFzZUlkID09PSAnbV9kZW1vbl9ob3JuJykge1xuICAgICAgcHJlZml4ID0gcHJldkVmZmVjdC5kZXNjcmlwdGlvbiA/ICfjgq3jg6Hjg6njga4nIDogJ+mtlOaAp+OBric7XG4gICAgICBtYXRFZmZlY3QuaHBSZWdlbiA9IChtYXRFZmZlY3QuaHBSZWdlbiB8fCAwKSArIDI7XG4gICAgICBtYXRFZmZlY3QuZGFtYWdlTXVsdGlwbGllciA9IChtYXRFZmZlY3QuZGFtYWdlTXVsdGlwbGllciB8fCAwKSArIDAuMDU7XG4gICAgfSBlbHNlIGlmIChtYXQuYmFzZUlkID09PSAnbV9kcmFnb25fc2NhbGUnKSB7XG4gICAgICBwcmVmaXggPSBwcmV2RWZmZWN0LmRlc2NyaXB0aW9uID8gJ+OCreODoeODqeOBricgOiAn6KaH56uc44GuJztcbiAgICAgIG1hdEVmZmVjdC5tYXhIcEJvbnVzID0gKG1hdEVmZmVjdC5tYXhIcEJvbnVzIHx8IDApICsgMzA7XG4gICAgICBtYXRFZmZlY3QuZ29sZEJvbnVzID0gKG1hdEVmZmVjdC5nb2xkQm9udXMgfHwgMCkgKyAwLjEwO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIG5ldyBkZXNjcmlwdGlvbiBkeW5hbWljYWxseVxuICAgIGNvbnN0IGRlc2NQYXJ0cyA9IFtdO1xuICAgIGlmIChtYXRFZmZlY3QuZW5lbXlTbG93UmF0ZSkgZGVzY1BhcnRzLnB1c2goYOmBheW7tiR7TWF0aC5yb3VuZChtYXRFZmZlY3QuZW5lbXlTbG93UmF0ZSAqIDEwMCl9JWApO1xuICAgIGlmIChtYXRFZmZlY3QuY3JpdENoYW5jZSkgZGVzY1BhcnRzLnB1c2goYOS8muW/gyske01hdGgucm91bmQobWF0RWZmZWN0LmNyaXRDaGFuY2UgKiAxMDApfSVgKTtcbiAgICBpZiAobWF0RWZmZWN0LmxpZmVzdGVhbCkgZGVzY1BhcnRzLnB1c2goYOWQuOihgCske01hdGgucm91bmQobWF0RWZmZWN0LmxpZmVzdGVhbCAqIDEwMCl9JWApO1xuICAgIGlmIChtYXRFZmZlY3QuaHBSZWdlbiB8fCBtYXRFZmZlY3QuZGFtYWdlTXVsdGlwbGllcikge1xuICAgICAgZGVzY1BhcnRzLnB1c2goYOavjuenkkhQKyR7bWF0RWZmZWN0LmhwUmVnZW4gfHwgMH0v44OA44OhKyR7TWF0aC5yb3VuZCgobWF0RWZmZWN0LmRhbWFnZU11bHRpcGxpZXIgfHwgMCkgKiAxMDApfSVgKTtcbiAgICB9XG4gICAgaWYgKG1hdEVmZmVjdC5tYXhIcEJvbnVzIHx8IG1hdEVmZmVjdC5nb2xkQm9udXMpIHtcbiAgICAgIGRlc2NQYXJ0cy5wdXNoKGBIUCske21hdEVmZmVjdC5tYXhIcEJvbnVzIHx8IDB9L+mHkSske01hdGgucm91bmQoKG1hdEVmZmVjdC5nb2xkQm9udXMgfHwgMCkgKiAxMDApfSVgKTtcbiAgICB9XG4gICAgbWF0RWZmZWN0LmRlc2NyaXB0aW9uID0gZGVzY1BhcnRzLmpvaW4oJyB8ICcpIHx8ICfnibnmrorlvLfljJbmuIgnO1xuXG4gICAgY29uc3QgbmV3RWZmZWN0OiBQbGF5ZXJJdGVtID0ge1xuICAgICAgLi4ucEl0ZW0sXG4gICAgICBhZGRlZFBvd2VyLFxuICAgICAgc3BlY2lhbEVuY2hhbnRDb3VudDogKHBJdGVtLnNwZWNpYWxFbmNoYW50Q291bnQgfHwgMCkgKyAxLFxuICAgICAgY3VzdG9tUHJlZml4OiBwcmVmaXgsXG4gICAgICBhZGRlZEVmZmVjdDogbWF0RWZmZWN0LFxuICAgIH07XG5cbiAgICBvblNwZWNpYWxFbmNoYW50KHBJdGVtLnVpZCwgc2VsZWN0ZWRNYXRlcmlhbFVpZCwgY29zdCwgbmV3RWZmZWN0KTtcbiAgfTtcblxuICBjb25zdCByZW5kZXJJbnZlbnRvcnlDYXJkID0gKGl0ZW06IEdhbWVJdGVtKSA9PiB7XG4gICAgY29uc3QgcEl0ZW0gPSBpbnZlbnRvcnkuZmluZChpID0+IGkudWlkID09PSBpdGVtLmlkKSE7XG4gICAgY29uc3QgaXNTdGF0RXEgPSBlcXVpcG1lbnQuc3RhdFdlYXBvbklkID09PSBpdGVtLmlkIHx8IGVxdWlwbWVudC5zdGF0QXJtb3JJZCA9PT0gaXRlbS5pZDtcbiAgICBjb25zdCBpc0FwcEVxID0gZXF1aXBtZW50LmFwcGVhcmFuY2VXZWFwb25JZCA9PT0gcEl0ZW0uYmFzZUlkIHx8IGVxdWlwbWVudC5hcHBlYXJhbmNlQXJtb3JJZCA9PT0gcEl0ZW0uYmFzZUlkO1xuXG4gICAgY29uc3Qgc3RhdFNsb3Q6IGtleW9mIEVxdWlwbWVudFN0YXRlID0gaXRlbS50eXBlID09PSAnd2VhcG9uJyA/ICdzdGF0V2VhcG9uSWQnIDogJ3N0YXRBcm1vcklkJztcbiAgICBjb25zdCBhcHBTbG90OiBrZXlvZiBFcXVpcG1lbnRTdGF0ZSA9IGl0ZW0udHlwZSA9PT0gJ3dlYXBvbicgPyAnYXBwZWFyYW5jZVdlYXBvbklkJyA6ICdhcHBlYXJhbmNlQXJtb3JJZCc7XG5cbiAgICAvLyBGaW5kIGR1cGxpY2F0ZXMgZm9yIExpbWl0IEJyZWFrXG4gICAgY29uc3QgZHVwbGljYXRlID0gaW52ZW50b3J5LmZpbmQoaSA9PiBpLnVpZCAhPT0gcEl0ZW0udWlkICYmIGkuYmFzZUlkID09PSBwSXRlbS5iYXNlSWQpO1xuICAgIGNvbnN0IHNlbGxQcmljZSA9IGNhbGN1bGF0ZVNlbGxQcmljZShwSXRlbSwgam9iKTtcbiAgICBjb25zdCBpc0VuY2hhbnRlZCA9IHBJdGVtLnVwZ3JhZGVMZXZlbCA+IDAgfHwgKHBJdGVtLmxpbWl0QnJlYWsgJiYgcEl0ZW0ubGltaXRCcmVhayA+IDApIHx8IHBJdGVtLmFkZGVkUG93ZXIgPiAwO1xuICAgIGNvbnN0IHNwZWNpYWxDb3VudCA9IHBJdGVtLnNwZWNpYWxFbmNoYW50Q291bnQgfHwgMDtcbiAgICBjb25zdCBiYXNlSXRlbURlZiA9IElURU1TW3BJdGVtLmJhc2VJZF07XG4gICAgY29uc3QgaXNDdXJzZWRJdGVtID0gKGl0ZW0uaXNDdXJzZWQgfHwgYmFzZUl0ZW1EZWY/LmlzQ3Vyc2VkKSAmJiAhcEl0ZW0uaXNVbmN1cnNlZDtcbiAgICBjb25zdCB1bmN1cnNlQ29zdCA9IGNhbGN1bGF0ZVVuY3Vyc2VDb3N0KHBJdGVtLCBqb2IpO1xuXG4gICAgbGV0IGNhcmRCb3JkZXJDb2xvciA9IFwiYm9yZGVyLXNsYXRlLTcwMFwiO1xuICAgIGxldCBjYXJkU2hhZG93ID0gXCJcIjtcbiAgICBsZXQgY2FyZEJnID0gXCJiZy1zbGF0ZS05MDAvOTBcIjtcbiAgICBcbiAgICBpZiAoKHBJdGVtLmxpbWl0QnJlYWsgfHwgMCkgPj0gMSkge1xuICAgICAgY2FyZEJvcmRlckNvbG9yID0gXCJib3JkZXItcm9zZS01MDBcIjtcbiAgICAgIGNhcmRCZyA9IFwiYmctc2xhdGUtOTUwXCI7XG4gICAgICBjYXJkU2hhZG93ID0gXCJzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMjQ0LDYzLDk0LDAuNCldXCI7XG4gICAgfSBlbHNlIGlmIChwSXRlbS51cGdyYWRlTGV2ZWwgPj0gMTUpIHtcbiAgICAgIGNhcmRCb3JkZXJDb2xvciA9IFwiYm9yZGVyLWZ1Y2hzaWEtNTAwXCI7XG4gICAgICBjYXJkQmcgPSBcImJnLXNsYXRlLTk1MFwiO1xuICAgICAgY2FyZFNoYWRvdyA9IFwic2hhZG93LVswXzBfMTJweF9yZ2JhKDIxNyw3MCwyMzksMC40KV1cIjtcbiAgICB9IGVsc2UgaWYgKHBJdGVtLnVwZ3JhZGVMZXZlbCA+PSAxMCkge1xuICAgICAgY2FyZEJvcmRlckNvbG9yID0gXCJib3JkZXItYW1iZXItNDAwXCI7XG4gICAgICBjYXJkU2hhZG93ID0gXCJzaGFkb3ctWzBfMF8xMHB4X3JnYmEoMjUxLDE5MSwzNiwwLjMpXVwiO1xuICAgIH0gZWxzZSBpZiAocEl0ZW0udXBncmFkZUxldmVsID49IDUpIHtcbiAgICAgIGNhcmRCb3JkZXJDb2xvciA9IFwiYm9yZGVyLXNreS00MDBcIjtcbiAgICAgIGNhcmRTaGFkb3cgPSBcInNoYWRvdy1bMF8wXzhweF9yZ2JhKDU2LDE4OSwyNDgsMC4yKV1cIjtcbiAgICB9IGVsc2UgaWYgKHBJdGVtLnVwZ3JhZGVMZXZlbCA+PSAxIHx8IChwSXRlbS5hZGRlZFBvd2VyIHx8IDApID4gMCkge1xuICAgICAgY2FyZEJvcmRlckNvbG9yID0gXCJib3JkZXItZW1lcmFsZC01MDBcIjtcbiAgICAgIGNhcmRTaGFkb3cgPSBcInNoYWRvdy1bMF8wXzVweF9yZ2JhKDE2LDE4NSwxMjksMC4xNSldXCI7XG4gICAgfSBlbHNlIGlmIChwSXRlbS5iYXNlSWQuaW5jbHVkZXMoJ2NyYWZ0JykpIHtcbiAgICAgIGNhcmRCb3JkZXJDb2xvciA9IFwiYm9yZGVyLWFtYmVyLTYwMFwiO1xuICAgICAgY2FyZFNoYWRvdyA9IFwic2hhZG93LVswXzBfOHB4X3JnYmEoMjE3LDExOSw2LDAuMyldXCI7XG4gICAgfVxuXG4gICAgY29uc3QgaXNTZWxlY3RlZEZvclNlbGwgPSBzZWxlY3RlZFNlbGxVaWRzLmluY2x1ZGVzKHBJdGVtLnVpZCk7XG4gICAgY29uc3QgY2FuU2VsZWN0Rm9yU2VsbCA9ICFpc1N0YXRFcSAmJiAhcEl0ZW0uaXNMb2NrZWQgJiYgIWlzUXVlc3RBY3RpdmU7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBcbiAgICAgICAga2V5PXtpdGVtLmlkfSBcbiAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgIGlmIChiYXRjaFNlbGxNb2RlICYmIGNhblNlbGVjdEZvclNlbGwpIHtcbiAgICAgICAgICAgIHRvZ2dsZVNlbGVjdFNlbGwocEl0ZW0udWlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH19XG4gICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLXBhbmVsIGZsZXggZmxleC1jb2wgZ2FwLTIgYm9yZGVyLTIgJHtjYXJkQmd9ICR7Y2FyZEJvcmRlckNvbG9yfSAke2NhcmRTaGFkb3d9IHJlbGF0aXZlIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTMwMCBob3ZlcjpzY2FsZS1bMS4wMV0gJHtcbiAgICAgICAgICBiYXRjaFNlbGxNb2RlID8gKGNhblNlbGVjdEZvclNlbGwgPyAnY3Vyc29yLXBvaW50ZXIgaG92ZXI6Ym9yZGVyLWFtYmVyLTQwMCcgOiAnb3BhY2l0eS02MCBjdXJzb3Itbm90LWFsbG93ZWQnKSA6ICcnXG4gICAgICAgIH0gJHtpc1NlbGVjdGVkRm9yU2VsbCA/ICchYm9yZGVyLWFtYmVyLTQwMCAhYmctYW1iZXItOTUwLzYwIHJpbmctMiByaW5nLWFtYmVyLTQwMCBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMjQ1LDE1OCwxMSwwLjQpXScgOiAnJ31gfVxuICAgICAgPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgIHtiYXRjaFNlbGxNb2RlICYmIChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2lzU2VsZWN0ZWRGb3JTZWxsfVxuICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eygpID0+IHRvZ2dsZVNlbGVjdFNlbGwocEl0ZW0udWlkKX1cbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshY2FuU2VsZWN0Rm9yU2VsbH1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctNCBoLTQgYWNjZW50LWFtYmVyLTQwMCBjdXJzb3ItcG9pbnRlciByb3VuZGVkXCJcbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8SXRlbUljb24gaXRlbT17eyAuLi5pdGVtLCBpZDogcEl0ZW0uYmFzZUlkIH19IC8+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgZmxleC13cmFwXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1zbGF0ZS0xMDBcIj57aXRlbS5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICB7c3BlY2lhbENvdW50ID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGJnLXB1cnBsZS05MDAvOTAgdGV4dC1wdXJwbGUtMjAwIGJvcmRlciBib3JkZXItcHVycGxlLTYwMCBweC0xIHB5LTAuMiByb3VuZGVkIGZvbnQtZXh0cmFib2xkXCI+XG4gICAgICAgICAgICAgICAgICAgIOKYheeJueauiuW8t+WMliB7c3BlY2lhbENvdW50feWbnlxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAge2l0ZW0udHlwZSA9PT0gJ3dlYXBvbicgPyAn5pS75pKD5YqbJyA6ICfpmLLlvqHlipsnfTogPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1hbWJlci00MDAgZm9udC1ib2xkXCI+K3tpdGVtLnBvd2VyfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNVwiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uVG9nZ2xlTG9jayAmJiBvblRvZ2dsZUxvY2socEl0ZW0udWlkKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0yLjUgYWN0aXZlIGhvdmVyOiFiZy1zbGF0ZS03MDBcIlxuICAgICAgICAgICAgICB0aXRsZT1cIuODreODg+OCr+OBl+OBpuWjsuWNtOODu+WIhuino+OCkumYsuatolwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIHtwSXRlbS5pc0xvY2tlZCA/ICfwn5SSJyA6ICfwn5STJ31cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXREZXRhaWxQbGF5ZXJJdGVtKHBJdGVtKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0yLjUgYWN0aXZlICFib3JkZXItc2t5LTQwMCAhdGV4dC1za3ktMzAwIGhvdmVyOiFiZy1za3ktOTUwXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAg8J+UjSDoqbPntLBcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICB7aXRlbS5lZmZlY3QgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1za3ktMzAwIGJnLXNsYXRlLTk1MCBwLTIgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZFwiPlxuICAgICAgICAgICAg4pyoIHtpdGVtLmVmZmVjdC5kZXNjcmlwdGlvbn1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cblxuICAgICAgICB7dGFiID09PSAnaW52ZW50b3J5JyA/IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTIgbXQtMVwiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uRXF1aXAoc3RhdFNsb3QsIGl0ZW0uaWQpfVxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc1N0YXRFcSB8fCBpc1F1ZXN0QWN0aXZlfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LXhzIGZsZXgtMSAke2lzU3RhdEVxID8gJ2FjdGl2ZSAhYm9yZGVyLWVtZXJhbGQtNDAwICF0ZXh0LWVtZXJhbGQtMzAwJyA6ICcnfSAke2lzUXVlc3RBY3RpdmUgPyAnb3BhY2l0eS01MCBjdXJzb3Itbm90LWFsbG93ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIHtpc1N0YXRFcSA/ICfog73lips6IOijheWCmeS4rScgOiAn6IO95Yqb44KS6KOF5YKZJ31cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvbkVxdWlwKGFwcFNsb3QsIHBJdGVtLmJhc2VJZCl9XG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzQXBwRXEgfHwgaXNRdWVzdEFjdGl2ZX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC14cyBmbGV4LTEgJHtpc0FwcEVxID8gJ2FjdGl2ZSAhYm9yZGVyLXB1cnBsZS00MDAgIXRleHQtcHVycGxlLTMwMCcgOiAnJ30gJHtpc1F1ZXN0QWN0aXZlID8gJ29wYWNpdHktNTAgY3Vyc29yLW5vdC1hbGxvd2VkJyA6ICcnfWB9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7aXNBcHBFcSA/ICfopovjgZ/nm646IOijheWCmeS4rScgOiAn6KaL44Gf55uu44KS6KOF5YKZJ31cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMC84MCBwdC0yIHRleHQteHNcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDBcIj7lo7LljbTkvqHmoLw6IDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFwiPvCfqpkge3NlbGxQcmljZX0gRzwvc3Bhbj48L3NwYW4+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvblNlbGxJdGVtICYmIG9uU2VsbEl0ZW0ocEl0ZW0udWlkLCBzZWxsUHJpY2UpfVxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc1N0YXRFcSB8fCBpc1F1ZXN0QWN0aXZlIHx8IHBJdGVtLmlzTG9ja2VkfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSAhcHgtMyBhY3RpdmUgIWJvcmRlci1hbWJlci00MDAgZGlzYWJsZWQ6b3BhY2l0eS00MFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7aXNTdGF0RXEgPyAn6KOF5YKZ5Lit5LiN5Y+vJyA6IHBJdGVtLmlzTG9ja2VkID8gJ+ODreODg+OCr+S4rScgOiAn8J+SsCDlo7LljbTjgZnjgosnfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApIDogKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMiBtdC0xIHB0LTIgYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMFwiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+XG4gICAgICAgICAgICB7LyogVW5jdXJzZSBTZWN0aW9uIGlmIEN1cnNlZCAqL31cbiAgICAgICAgICAgIHtpc0N1cnNlZEl0ZW0gJiYgKFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBiZy1wdXJwbGUtOTUwLzgwIHAtMiBib3JkZXIgYm9yZGVyLXB1cnBsZS03MDAgcm91bmRlZFwiPlxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzExcHhdIHRleHQtcHVycGxlLTMwMCBmb250LWJvbGQgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+4pyd77iPIOWRquOBhOOCkuino+mZpCAo6Kej5ZGqKTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXB1cnBsZS0yMDAvODBcIj5cbiAgICAgICAgICAgICAgICAgICAg6LK755SoOiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTMwMCBmb250LWJvbGRcIj7wn6qZIHt1bmN1cnNlQ29zdC50b0xvY2FsZVN0cmluZygpfSBHPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtcHVycGxlLTMwMC84MCBtbC0xXCI+KOavjuenkkhQ44OJ44Os44Kk44Oz44KS5rWE5YyWKTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFVuY3Vyc2VDb25maXJtSXRlbSh7IGl0ZW06IHBJdGVtLCBnYW1lSXRlbTogaXRlbSwgY29zdDogdW5jdXJzZUNvc3QgfSl9XG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17Z29sZCA8IHVuY3Vyc2VDb3N0IHx8IGlzUXVlc3RBY3RpdmV9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgIXB4LTMgYWN0aXZlICFiZy1wdXJwbGUtODAwICF0ZXh0LXB1cnBsZS0xMDAgIWJvcmRlci1wdXJwbGUtNDAwIGhvdmVyOiFiZy1wdXJwbGUtNzAwIGRpc2FibGVkOm9wYWNpdHktNDAgZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICDinJ3vuI8g6Kej5ZGq44GZ44KLXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgey8qIEJhc2ljIEVuY2hhbnQgd2l0aCBCYXRjaCBFbmhhbmNlbWVudHMgKCsxLCArNSwgKzEwLCBNQVgpICovfVxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjUgYmctc2xhdGUtOTUwIHAtMiBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkXCI+5Z+65pys5by35YyWICjnj77lnKggTHYue3BJdGVtLnVwZ3JhZGVMZXZlbH0pPC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFwiPuasoTog8J+qmSB7KDIwMCArIHBJdGVtLnVwZ3JhZGVMZXZlbCAqIDEwMCkudG9Mb2NhbGVTdHJpbmcoKX0gRzwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtNCBnYXAtMVwiPlxuICAgICAgICAgICAgICAgIHsoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgY29zdDEgPSAyMDAgKyBwSXRlbS51cGdyYWRlTGV2ZWwgKiAxMDA7XG4gICAgICAgICAgICAgICAgICBjb25zdCBjb3N0NSA9IGNhbGN1bGF0ZUJhdGNoRW5jaGFudENvc3QocEl0ZW0udXBncmFkZUxldmVsLCA1KTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNvc3QxMCA9IGNhbGN1bGF0ZUJhdGNoRW5jaGFudENvc3QocEl0ZW0udXBncmFkZUxldmVsLCAxMCk7XG4gICAgICAgICAgICAgICAgICBjb25zdCB7IG1heExldmVscywgdG90YWxDb3N0OiBtYXhDb3N0IH0gPSBjYWxjdWxhdGVNYXhFbmNoYW50TGV2ZWxzKHBJdGVtLnVwZ3JhZGVMZXZlbCwgZ29sZCk7XG5cbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdENvc3QgPSAoYzogbnVtYmVyKSA9PiBjID49IDEwMDAwID8gYCR7KGMvMTAwMCkudG9GaXhlZCgwKX1rYCA6IGMgPj0gMTAwMCA/IGAkeyhjLzEwMDApLnRvRml4ZWQoMSl9a2AgOiBgJHtjfWA7XG5cbiAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHVwZGF0ZWRJdGVtLCB0b3RhbENvc3QgfSA9IHBlcmZvcm1CYXRjaEVuY2hhbnQocEl0ZW0sIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVuY2hhbnRJdGVtKHBJdGVtLnVpZCwgdG90YWxDb3N0LCB1cGRhdGVkSXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2dvbGQgPCBjb3N0MSB8fCBpc1F1ZXN0QWN0aXZlfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xIGFjdGl2ZSAhYm9yZGVyLXJvc2UtNDAwIGRpc2FibGVkOm9wYWNpdHktNDBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ax5Zue5by35YyWICjosrvnlKg6IPCfqpkke2Nvc3QxLnRvTG9jYWxlU3RyaW5nKCl9RylgfVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICsxICh7Zm9ybWF0Q29zdChjb3N0MSl9KVxuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB1cGRhdGVkSXRlbSwgdG90YWxDb3N0IH0gPSBwZXJmb3JtQmF0Y2hFbmNoYW50KHBJdGVtLCA1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25FbmNoYW50SXRlbShwSXRlbS51aWQsIHRvdGFsQ29zdCwgdXBkYXRlZEl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtnb2xkIDwgY29zdDUgfHwgaXNRdWVzdEFjdGl2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSBhY3RpdmUgIWJvcmRlci1yb3NlLTQwMCAhYmctcm9zZS05NTAvNDAgaG92ZXI6IWJnLXJvc2UtOTAwIGRpc2FibGVkOm9wYWNpdHktNDAgZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgNeWbnuOBvuOBqOOCgeW8t+WMliAo6LK755SoOiDwn6qZJHtjb3N0NS50b0xvY2FsZVN0cmluZygpfUcpYH1cbiAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICArNSAoe2Zvcm1hdENvc3QoY29zdDUpfSlcbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdXBkYXRlZEl0ZW0sIHRvdGFsQ29zdCB9ID0gcGVyZm9ybUJhdGNoRW5jaGFudChwSXRlbSwgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVuY2hhbnRJdGVtKHBJdGVtLnVpZCwgdG90YWxDb3N0LCB1cGRhdGVkSXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2dvbGQgPCBjb3N0MTAgfHwgaXNRdWVzdEFjdGl2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSBhY3RpdmUgIWJvcmRlci1hbWJlci00MDAgIWJnLWFtYmVyLTk1MC80MCBob3ZlcjohYmctYW1iZXItOTAwIGRpc2FibGVkOm9wYWNpdHktNDAgZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgMTDlm57jgb7jgajjgoHlvLfljJYgKOiyu+eUqDog8J+qmSR7Y29zdDEwLnRvTG9jYWxlU3RyaW5nKCl9RylgfVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICsxMCAoe2Zvcm1hdENvc3QoY29zdDEwKX0pXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF4TGV2ZWxzIDw9IDApIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB1cGRhdGVkSXRlbSwgdG90YWxDb3N0IH0gPSBwZXJmb3JtQmF0Y2hFbmNoYW50KHBJdGVtLCBtYXhMZXZlbHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVuY2hhbnRJdGVtKHBJdGVtLnVpZCwgdG90YWxDb3N0LCB1cGRhdGVkSXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e21heExldmVscyA8PSAwIHx8IGlzUXVlc3RBY3RpdmV9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgYWN0aXZlICFib3JkZXItZW1lcmFsZC00MDAgIWJnLWVtZXJhbGQtOTUwLzYwIGhvdmVyOiFiZy1lbWVyYWxkLTkwMCB0ZXh0LWVtZXJhbGQtMjAwIGRpc2FibGVkOm9wYWNpdHktNDAgZm9udC1ibGFja1wiXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YOaJgOaMgemHkeOBp+acgOWkp+W8t+WMliAoKyR7bWF4TGV2ZWxzfeWbniAvIOiyu+eUqDog8J+qmSR7bWF4Q29zdC50b0xvY2FsZVN0cmluZygpfUcpYH1cbiAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICBNQVh7bWF4TGV2ZWxzID4gMCA/IGAoKyR7bWF4TGV2ZWxzfSlgIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvPlxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KSgpfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICB7LyogTGltaXQgQnJlYWsgLyBNZXJnZSAoMeWHuCBvciDkuIDmi6zlkIjkvZMpICovfVxuICAgICAgICAgICAgeygoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGR1cGxpY2F0ZXMgPSBpbnZlbnRvcnkuZmlsdGVyKGkgPT4gXG4gICAgICAgICAgICAgICAgaS51aWQgIT09IHBJdGVtLnVpZCAmJiBcbiAgICAgICAgICAgICAgICBpLmJhc2VJZCA9PT0gcEl0ZW0uYmFzZUlkICYmIFxuICAgICAgICAgICAgICAgICFpLmlzTG9ja2VkICYmIFxuICAgICAgICAgICAgICAgIGVxdWlwbWVudC5zdGF0V2VhcG9uSWQgIT09IGkudWlkICYmIFxuICAgICAgICAgICAgICAgIGVxdWlwbWVudC5zdGF0QXJtb3JJZCAhPT0gaS51aWRcbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGJvcmRlci10IGJvcmRlci1zbGF0ZS04MDAvNTAgcHQtMiBmbGV4LXdyYXAgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAg5ZCM5ZCN6KOF5YKZ5ZCI5L2TICh7ZHVwbGljYXRlcy5sZW5ndGh95YCLIOaJgOaMgSlcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgICAgICAgICB7ZHVwbGljYXRlcy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbkxpbWl0QnJlYWspIG9uTGltaXRCcmVhayhwSXRlbS51aWQsIGR1cGxpY2F0ZXNbMF0udWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNRdWVzdEFjdGl2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSBhY3RpdmUgZGlzYWJsZWQ6b3BhY2l0eS00MFwiXG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgKzHlh7hcbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAge2R1cGxpY2F0ZXMubGVuZ3RoID4gMSAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob25CYXRjaExpbWl0QnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkJhdGNoTGltaXRCcmVhayhwSXRlbS51aWQsIGR1cGxpY2F0ZXMubWFwKGQgPT4gZC51aWQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbkxpbWl0QnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdXBsaWNhdGVzLmZvckVhY2goZCA9PiBvbkxpbWl0QnJlYWsocEl0ZW0udWlkLCBkLnVpZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2lzUXVlc3RBY3RpdmV9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgYWN0aXZlICFiZy1yb3NlLTkwMCAhdGV4dC1yb3NlLTEwMCAhYm9yZGVyLXJvc2UtNDAwIGhvdmVyOiFiZy1yb3NlLTgwMCBkaXNhYmxlZDpvcGFjaXR5LTQwIGZvbnQtYm9sZFwiXG4gICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAg8J+UqCDlhah7ZHVwbGljYXRlcy5sZW5ndGh95YCL5LiA5ous5ZCI5L2TICgre2R1cGxpY2F0ZXMubGVuZ3RofeWHuClcbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAge2R1cGxpY2F0ZXMubGVuZ3RoID09PSAwICYmIChcbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTYwMFwiPuWQiOS9k+WPr+iDveWTgeOBquOBlzwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSkoKX1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgey8qIFNwZWNpYWwgRW5jaGFudCB3aXRoIE1hdGVyaWFsIEJhdGNoICovfVxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjUgYmctc2xhdGUtOTUwIHAtMiBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCByb3VuZGVkIG10LTFcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gbWItMC41XCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDBcIj7ntKDmnZDjgafnibnmrorlvLfljJYgKOOCtOODvOODq+ODieS4jeimgSk8L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1wdXJwbGUtMzAwIGZvbnQtYm9sZCBiZy1wdXJwbGUtOTUwIHB4LTEuNSBweS0wLjUgcm91bmRlZCBib3JkZXIgYm9yZGVyLXB1cnBsZS04MDBcIj5cbiAgICAgICAgICAgICAgICAgIOe0r+ioiCB7c3BlY2lhbENvdW50feWbniDlvLfljJbmuIhcbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgPHNlbGVjdCBcbiAgICAgICAgICAgICAgICAgIHZhbHVlPXtzZWxlY3RlZE1hdGVyaWFsVWlkfSBcbiAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtlID0+IHNldFNlbGVjdGVkTWF0ZXJpYWxVaWQoZS50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTAwIHRleHQtWzEwcHhdIHRleHQtc2xhdGUtMjAwIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHJvdW5kZWQgcC0xIGZsZXgtMVwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIlwiIGRpc2FibGVkPue0oOadkOOCkumBuOaKnjwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAge21hdGVyaWFscy5tYXAobSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VNYXQgPSBJVEVNU1ttLmJhc2VJZF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gbWF0ZXJpYWxzLmZpbHRlcihtYXQgPT4gbWF0LmJhc2VJZCA9PT0gbS5iYXNlSWQpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICA8b3B0aW9uIGtleT17bS51aWR9IHZhbHVlPXttLnVpZH0+e2Jhc2VNYXQ/Lm5hbWV9ICjmiYDmjIE6IHtjb3VudH3lgIspPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAge3NlbGVjdGVkTWF0ZXJpYWxVaWQgJiYgKCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxNYXQgPSBtYXRlcmlhbHMuZmluZChtID0+IG0udWlkID09PSBzZWxlY3RlZE1hdGVyaWFsVWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIXNlbE1hdCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlTWF0cyA9IG1hdGVyaWFscy5maWx0ZXIobSA9PiBtLmJhc2VJZCA9PT0gc2VsTWF0LmJhc2VJZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Q291bnQgPSBhdmFpbGFibGVNYXRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJRdHkgPSBNYXRoLm1pbihzcGVjaWFsRW5jaGFudFF0eSB8fCAxLCBtYXRDb3VudCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtYXRJbmZvOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgICAgICAgICAgJ21fc2xpbWVfamVsbHknOiBg8J+foiDnspjjgorlsZ7mgKc6IOaVteOBruaUu+aSg+mAn+W6piAtJHtNYXRoLm1pbig5MCwgMTUgKiBjdXJRdHkpfSUgKOeymOa2suOCueODreODvClgLFxuICAgICAgICAgICAgICAgICAgJ21fZ29ibGluX2Vhcic6IGDwn5S0IOS8muW/g+WxnuaApzog44Kv44Oq44OG44Kj44Kr44Or546HICske01hdGgubWluKDEwMCwgNSAqIGN1clF0eSl9JWAsXG4gICAgICAgICAgICAgICAgICAnbV9vcmNfZmFuZyc6IGDwn5+jIOWQuOihgOWxnuaApzog5pS75pKD5pmCSFDlkLjlj44gKyR7TWF0aC5taW4oMTAwLCAzICogY3VyUXR5KX0lYCxcbiAgICAgICAgICAgICAgICAgICdtX2RlbW9uX2hvcm4nOiBg8J+foSDprZTmgKflsZ7mgKc6IOavjuenkkhQ5Zue5b6pKyR7MiAqIGN1clF0eX0gJiDkuI7jg4Djg6ErJHs1ICogY3VyUXR5fSVgLFxuICAgICAgICAgICAgICAgICAgJ21fZHJhZ29uX3NjYWxlJzogYPCfkLIg6KaH56uc5bGe5oCnOiDmnIDlpKdIUCskezMwICogY3VyUXR5fSAmIOeNsuW+l0crJHsxMCAqIGN1clF0eX0lYCxcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMS41IG10LTFcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIHRleHQtcHVycGxlLTIwMCBiZy1wdXJwbGUtOTUwLzkwIHAtMS41IHJvdW5kZWQgYm9yZGVyIGJvcmRlci1wdXJwbGUtODAwLzkwXCI+XG4gICAgICAgICAgICAgICAgICAgICAg44CQe2N1clF0eX3lgIvmtojosrvmmYLjga7ku5jkuI7kuojlrprjgJF7bWF0SW5mb1tzZWxNYXQuYmFzZUlkXSB8fCAn4pyoIOeJueauiuWKueaenOS7mOS4jid9ICjog73lipsreygzICogY3VyUXR5KX3jgJx7KDcgKiBjdXJRdHkpfSlcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBnYXAtMSBmbGV4LXdyYXBcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMFwiPua2iOiyu+aVsDo8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0xXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7WzEsIDUsIDEwXS5tYXAocSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxID4gbWF0Q291bnQgJiYgcSAhPT0gMSkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtxfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTcGVjaWFsRW5jaGFudFF0eShxKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LVs5cHhdICFweS0wLjUgIXB4LTEuNSAke2N1clF0eSA9PT0gcSA/ICdhY3RpdmUgIWJvcmRlci1wdXJwbGUtNDAwICF0ZXh0LXB1cnBsZS0zMDAnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICDDl3txfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICB7bWF0Q291bnQgPiAxICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNwZWNpYWxFbmNoYW50UXR5KG1hdENvdW50KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC1bOXB4XSAhcHktMC41ICFweC0xLjUgJHtjdXJRdHkgPT09IG1hdENvdW50ID8gJ2FjdGl2ZSAhYm9yZGVyLXB1cnBsZS00MDAgIXRleHQtcHVycGxlLTMwMCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAg5YWo5pWwKMOXe21hdENvdW50fSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9Db25zdW1lID0gYXZhaWxhYmxlTWF0cy5zbGljZSgwLCBjdXJRdHkpLm1hcChtID0+IG0udWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRJdGVtID0gcGVyZm9ybUJhdGNoU3BlY2lhbEVuY2hhbnQocEl0ZW0sIHNlbE1hdC5iYXNlSWQsIGN1clF0eSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob25CYXRjaFNwZWNpYWxFbmNoYW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQmF0Y2hTcGVjaWFsRW5jaGFudChwSXRlbS51aWQsIHRvQ29uc3VtZSwgMCwgdXBkYXRlZEl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvblNwZWNpYWxFbmNoYW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uU3BlY2lhbEVuY2hhbnQocEl0ZW0udWlkLCB0b0NvbnN1bWVbMF0sIDAsIHVwZGF0ZWRJdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshc2VsZWN0ZWRNYXRlcmlhbFVpZCB8fCBtYXRDb3VudCA9PT0gMCB8fCBpc1F1ZXN0QWN0aXZlfVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSBhY3RpdmUgIWJvcmRlci1wdXJwbGUtNDAwICFiZy1wdXJwbGUtOTAwIGhvdmVyOiFiZy1wdXJwbGUtODAwICF0ZXh0LXB1cnBsZS0xMDAgZGlzYWJsZWQ6b3BhY2l0eS00MCBmb250LWJvbGQgbXQtMC41XCJcbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgIOKcqCDnibnmrorlvLfljJbjgpLlrp/ooYwgKOe0oOadkCDDl3tjdXJRdHl95YCLIOa2iOiyuylcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9KSgpfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHsvKiBGb3JnZSBSZXNhbGUgLyBTZWxsIFNlY3Rpb24gKi99XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBiZy1hbWJlci05NTAvMzAgcC0yIGJvcmRlciBib3JkZXItYW1iZXItODAwLzYwIHJvdW5kZWQgbXQtMVwiPlxuICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIHRleHQtYW1iZXItMjAwIGZvbnQtYm9sZFwiPvCfkrAg6Y2b5Ya25bGL44Gn5aOy5Y2044O75YiG6KejPC9zcGFuPlxuICAgICAgICAgICAgICAgICAge2lzRW5jaGFudGVkICYmIChcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBiZy1hbWJlci04MDAgdGV4dC1hbWJlci0xMDAgcHgtMSBweS0wLjIgcm91bmRlZCBmb250LWJvbGRcIj7pq5jkvqHosrflj5bkuK0hPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtYW1iZXItMzAwLzgwXCI+XG4gICAgICAgICAgICAgICAgICDmn7vlrprpoY06IDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZCB0ZXh0LXhzXCI+8J+qmSB7c2VsbFByaWNlfSBHPC9zcGFuPlxuICAgICAgICAgICAgICAgICAge2lzRW5jaGFudGVkICYmIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gdGV4dC1hbWJlci00MDAvOTAgbWwtMVwiPijlvLfljJbjg7vlh7jjg5zjg7zjg4rjgrnlj43mmKDmuIgpPC9zcGFuPn1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMS41XCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25TZWxsSXRlbSAmJiBvblNlbGxJdGVtKHBJdGVtLnVpZCwgc2VsbFByaWNlKX1cbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc1N0YXRFcSB8fCBpc1F1ZXN0QWN0aXZlIHx8IHBJdGVtLmlzTG9ja2VkfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0zIGFjdGl2ZSAhYm9yZGVyLWFtYmVyLTQwMCBkaXNhYmxlZDpvcGFjaXR5LTQwXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7aXNTdGF0RXEgPyAn6KOF5YKZ5Lit5LiN5Y+vJyA6IHBJdGVtLmlzTG9ja2VkID8gJ+ODreODg+OCr+S4rScgOiAn5aOy5Y2044GZ44KLJ31cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXREaXNtYW50bGVDb25maXJtSXRlbSh7IGl0ZW06IHBJdGVtLCBnYW1lSXRlbTogaXRlbSB9KX1cbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc1N0YXRFcSB8fCBpc1F1ZXN0QWN0aXZlIHx8IHBJdGVtLmlzTG9ja2VkfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0zIGFjdGl2ZSAhYmctc2xhdGUtODAwICF0ZXh0LXNsYXRlLTMwMCBob3ZlcjohYmctc2xhdGUtNzAwIGRpc2FibGVkOm9wYWNpdHktNDBcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtpc1N0YXRFcSA/ICfoo4XlgpnkuK3kuI3lj68nIDogcEl0ZW0uaXNMb2NrZWQgPyAn44Ot44OD44Kv5LitJyA6ICfliIbop6PjgZnjgosnfVxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfTtcblxuICBjb25zdCByZW5kZXJTaG9wQ2FyZCA9IChpdGVtOiBHYW1lSXRlbSkgPT4ge1xuICAgIGNvbnN0IHNob3BEaXNjb3VudE11bHQgPSBnZXRTaG9wRGlzY291bnRNdWx0aXBsaWVyKGpvYik7XG4gICAgY29uc3QgZmluYWxQcmljZSA9IE1hdGguZmxvb3IoaXRlbS5wcmljZSAqIHNob3BEaXNjb3VudE11bHQpO1xuICAgIGNvbnN0IGhhc0pvYkRpc2NvdW50ID0gc2hvcERpc2NvdW50TXVsdCA8IDEuMDtcbiAgICBjb25zdCBxdHkgPSBzaG9wUXVhbnRpdGllc1tpdGVtLmlkXSB8fCAxO1xuICAgIGNvbnN0IHRvdGFsQ29zdCA9IGZpbmFsUHJpY2UgKiBxdHk7XG4gICAgY29uc3QgbWF4QWZmb3JkYWJsZSA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3IoZ29sZCAvIGZpbmFsUHJpY2UpKTtcblxuICAgIGNvbnN0IHNldFF0eSA9ICh2YWw6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3Qgc2FuaXRpemVkID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oOTk5LCBNYXRoLmZsb29yKHZhbCkpKTtcbiAgICAgIHNldFNob3BRdWFudGl0aWVzKHByZXYgPT4gKHsgLi4ucHJldiwgW2l0ZW0uaWRdOiBzYW5pdGl6ZWQgfSkpO1xuICAgIH07XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBrZXk9e2l0ZW0uaWR9IGNsYXNzTmFtZT1cInBpeGVsLXBhbmVsIGZsZXggZmxleC1jb2wgZ2FwLTIgYmctc2xhdGUtOTAwLzkwIGJvcmRlci0yIGJvcmRlci1zbGF0ZS03MDBcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8SXRlbUljb24gaXRlbT17aXRlbX0gLz5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtc2xhdGUtMTAwXCI+e2l0ZW0ubmFtZX08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWFtYmVyLTQwMCBmb250LWJvbGRcIj5cbiAgICAgICAgICAgIHtpdGVtLnR5cGUgPT09ICd3ZWFwb24nID8gYOaUu+aSg+WKmyAke2l0ZW0ucG93ZXJ9YCA6IGl0ZW0udHlwZSA9PT0gJ2FybW9yJyA/IGDpmLLlvqHlipsgJHtpdGVtLnBvd2VyfWAgOiAnJ31cbiAgICAgICAgICA8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICB7aXRlbS5lZmZlY3QgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1za3ktMzAwIGJnLXNsYXRlLTk1MCBwLTIgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZFwiPlxuICAgICAgICAgICAg4pyoIHtpdGVtLmVmZmVjdC5kZXNjcmlwdGlvbn1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cblxuICAgICAgICB7LyogUXVhbnRpdHkgQ29udHJvbHMgJiBCdWxrIEJ1eSAqL31cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIGdhcC0xLjUgbXQtMSBwdC0yIGJvcmRlci10IGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMS41XCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1hbWJlci0zMDAgZm9udC1ib2xkXCI+8J+qmSB7ZmluYWxQcmljZX0gRzwvc3Bhbj5cbiAgICAgICAgICAgICAge2hhc0pvYkRpc2NvdW50ICYmIChcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTUwMCBsaW5lLXRocm91Z2hcIj7wn6qZIHtpdGVtLnByaWNlfSBHPC9zcGFuPlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICB7aGFzSm9iRGlzY291bnQgJiYgKFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzlweF0gYmctZW1lcmFsZC05MDAgdGV4dC1lbWVyYWxkLTMwMCBweC0xIHB5LTAuMiByb3VuZGVkIGZvbnQtYm9sZCBib3JkZXIgYm9yZGVyLWVtZXJhbGQtNjAwXCI+XG4gICAgICAgICAgICAgICAgICDnibnljJblibLlvJVcbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgey8qIFN0ZXBwZXIgKi99XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xIGJnLXNsYXRlLTk1MCBweC0xIHB5LTAuNSByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRRdHkocXR5IC0gMSl9XG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3F0eSA8PSAxfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMC41ICFweC0xLjUgZGlzYWJsZWQ6b3BhY2l0eS0zMFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAtXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICB0eXBlPVwibnVtYmVyXCJcbiAgICAgICAgICAgICAgICBtaW49ezF9XG4gICAgICAgICAgICAgICAgbWF4PXs5OTl9XG4gICAgICAgICAgICAgICAgdmFsdWU9e3F0eX1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17ZSA9PiBzZXRRdHkocGFyc2VJbnQoZS50YXJnZXQudmFsdWUpIHx8IDEpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInctMTAgdGV4dC1jZW50ZXIgYmctc2xhdGUtOTAwIHRleHQtc2xhdGUtMjAwIHRleHQteHMgZm9udC1ib2xkIGJvcmRlciBib3JkZXItc2xhdGUtNzAwIHJvdW5kZWQgcHktMC41XCJcbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFF0eShxdHkgKyAxKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTAuNSAhcHgtMS41XCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICtcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIHsvKiBRdWljayBwcmVzZXRzICovfVxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0xIGZsZXgtd3JhcFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0xXCI+XG4gICAgICAgICAgICAgIHtbMSwgNSwgMTBdLm1hcChwcmVzZXQgPT4gKFxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGtleT17cHJlc2V0fVxuICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRRdHkocHJlc2V0KX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LVs5cHhdICFweS0wLjUgIXB4LTEuNSAke3F0eSA9PT0gcHJlc2V0ID8gJ2FjdGl2ZSAhYm9yZGVyLWFtYmVyLTQwMCAhdGV4dC1hbWJlci0zMDAnIDogJyd9YH1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7cHJlc2V0feWAi1xuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFF0eShtYXhBZmZvcmRhYmxlKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC1bOXB4XSAhcHktMC41ICFweC0xLjUgJHtxdHkgPT09IG1heEFmZm9yZGFibGUgPyAnYWN0aXZlICFib3JkZXItYW1iZXItNDAwICF0ZXh0LWFtYmVyLTMwMCcgOiAnJ31gfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgTUFYKHttYXhBZmZvcmRhYmxlfeWAiylcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHF0eSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgb25CdXlJdGVtKGl0ZW0uaWQsIGZpbmFsUHJpY2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob25CYXRjaEJ1eUl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgIG9uQmF0Y2hCdXlJdGVtKGl0ZW0uaWQsIHF0eSwgZmluYWxQcmljZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcXR5OyBpKyspIG9uQnV5SXRlbShpdGVtLmlkLCBmaW5hbFByaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgIGRpc2FibGVkPXtnb2xkIDwgdG90YWxDb3N0IHx8IGlzUXVlc3RBY3RpdmV9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LXhzIGFjdGl2ZSAhYm9yZGVyLWFtYmVyLTQwMCAhYmctYW1iZXItOTUwLzYwIGhvdmVyOiFiZy1hbWJlci05MDAgZm9udC1ib2xkIGRpc2FibGVkOm9wYWNpdHktNDAgIXB5LTEgIXB4LTNcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7cXR5ID4gMSA/IGDwn5uSICR7cXR5feWAi+izvOWFpSAo8J+qmSR7dG90YWxDb3N0LnRvTG9jYWxlU3RyaW5nKCl9RylgIDogJ+izvOWFpeOBmeOCiyd9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9O1xuXG4gIGNvbnN0IHJlbmRlckRhaWx5U2hvcENhcmQgPSAoaXRlbTogRGFpbHlTaG9wSXRlbSkgPT4ge1xuICAgIGNvbnN0IGJhc2VJdGVtID0gSVRFTVNbaXRlbS5iYXNlSWRdO1xuICAgIGlmICghYmFzZUl0ZW0pIHJldHVybiBudWxsO1xuXG4gICAgY29uc3Qgc2hvcERpc2NvdW50TXVsdCA9IGdldFNob3BEaXNjb3VudE11bHRpcGxpZXIoam9iKTtcbiAgICBjb25zdCBmaW5hbFByaWNlID0gTWF0aC5mbG9vcihpdGVtLnByaWNlICogc2hvcERpc2NvdW50TXVsdCk7XG4gICAgY29uc3QgaGFzSm9iRGlzY291bnQgPSBzaG9wRGlzY291bnRNdWx0IDwgMS4wO1xuXG4gICAgY29uc3QgaXNTb2xkT3V0ID0gc29sZE91dERhaWx5SXRlbUlkcy5pbmNsdWRlcyhpdGVtLnNob3BJdGVtSWQpIHx8IGl0ZW0uaXNTb2xkT3V0O1xuICAgIGNvbnN0IGlzQ3Vyc2VkID0gaXRlbS5pc0N1cnNlZCB8fCBiYXNlSXRlbS5pc0N1cnNlZDtcblxuICAgIGxldCBkaXNwbGF5TmFtZSA9IGJhc2VJdGVtLm5hbWU7XG4gICAgaWYgKGl0ZW0uY3VzdG9tUHJlZml4KSBkaXNwbGF5TmFtZSA9IGAke2l0ZW0uY3VzdG9tUHJlZml4fSR7ZGlzcGxheU5hbWV9YDtcbiAgICBpZiAoaXNDdXJzZWQgJiYgIWRpc3BsYXlOYW1lLnN0YXJ0c1dpdGgoJ/CfkoAnKSkgZGlzcGxheU5hbWUgPSBg8J+SgCR7ZGlzcGxheU5hbWV9YDtcbiAgICBpZiAoaXRlbS51cGdyYWRlTGV2ZWwgPiAwKSBkaXNwbGF5TmFtZSA9IGAke2Rpc3BsYXlOYW1lfSBMdi4ke2l0ZW0udXBncmFkZUxldmVsfWA7XG5cbiAgICBjb25zdCB0b3RhbFBvd2VyID0gYmFzZUl0ZW0ucG93ZXIgKyBpdGVtLmFkZGVkUG93ZXIgKyBpdGVtLnVwZ3JhZGVMZXZlbCAqIDM7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdlxuICAgICAgICBrZXk9e2l0ZW0uc2hvcEl0ZW1JZH1cbiAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtcGFuZWwgZmxleCBmbGV4LWNvbCBnYXAtMiByZWxhdGl2ZSB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgIGlzQ3Vyc2VkXG4gICAgICAgICAgICA/ICdiZy1wdXJwbGUtOTUwLzQwIGJvcmRlci0yIGJvcmRlci1wdXJwbGUtNjAwLzgwIHNoYWRvdy1bMF8wXzE1cHhfcmdiYSgxNDcsNTEsMjM0LDAuMjUpXSdcbiAgICAgICAgICAgIDogJ2JnLXNsYXRlLTkwMC85MCBib3JkZXItMiBib3JkZXItc2xhdGUtNzAwJ1xuICAgICAgICB9ICR7aXNTb2xkT3V0ID8gJ29wYWNpdHktNTAgZ3JheXNjYWxlJyA6ICcnfWB9XG4gICAgICA+XG4gICAgICAgIHtpdGVtLmRpc2NvdW50UGVyY2VudCA+IDAgJiYgIWlzU29sZE91dCAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtdG9wLTIuNSAtcmlnaHQtMiBiZy1yb3NlLTYwMCB0ZXh0LXdoaXRlIGZvbnQtYmxhY2sgdGV4dC1bMTBweF0gcHgtMiBweS0wLjUgcm91bmRlZCBzaGFkb3ctbWQgei0xMCBib3JkZXIgYm9yZGVyLXJvc2UtNDAwIGFuaW1hdGUtcHVsc2VcIj5cbiAgICAgICAgICAgIHtpdGVtLmRpc2NvdW50UGVyY2VudH0lIE9GRlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgPEl0ZW1JY29uIGl0ZW09e3sgLi4uYmFzZUl0ZW0sIGlkOiBpdGVtLmJhc2VJZCB9fSAvPlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgICAgIHtpc0N1cnNlZCAmJiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtcHVycGxlLTQwMCBmb250LWV4dHJhYm9sZFwiPuOAkOWRquOBhOOAkTwvc3Bhbj59XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPXtgdGV4dC1zbSBmb250LWJvbGQgJHtpc0N1cnNlZCA/ICd0ZXh0LXB1cnBsZS0zMDAnIDogJ3RleHQtc2xhdGUtMTAwJ31gfT5cbiAgICAgICAgICAgICAgICAgIHtkaXNwbGF5TmFtZX1cbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtc2xhdGUtNDAwXCI+XG4gICAgICAgICAgICAgICAge2Jhc2VJdGVtLnR5cGUgPT09ICd3ZWFwb24nID8gJ+aUu+aSg+WKmycgOiBiYXNlSXRlbS50eXBlID09PSAnYXJtb3InID8gJ+mYsuW+oeWKmycgOiAn44Ki44Kk44OG44OgJ306IDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFwiPit7dG90YWxQb3dlcn08L3NwYW4+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHtiYXNlSXRlbS5lZmZlY3QgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgdGV4dC1bMTFweF0gcC0yIGJvcmRlciByb3VuZGVkICR7aXNDdXJzZWQgPyAndGV4dC1wdXJwbGUtMjAwIGJnLXB1cnBsZS05NTAvODAgYm9yZGVyLXB1cnBsZS04MDAnIDogJ3RleHQtc2t5LTMwMCBiZy1zbGF0ZS05NTAgYm9yZGVyLXNsYXRlLTgwMCd9YH0+XG4gICAgICAgICAgICB7aXNDdXJzZWQgPyAn8J+SgCAnIDogJ+KcqCAnfXtiYXNlSXRlbS5lZmZlY3QuZGVzY3JpcHRpb259XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICl9XG5cbiAgICAgICAge2lzQ3Vyc2VkICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIHRleHQtcm9zZS00MDAgZm9udC1ib2xkIGJnLXJvc2UtOTUwLzYwIHAtMS41IGJvcmRlciBib3JkZXItcm9zZS04MDAvODAgcm91bmRlZCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgPHNwYW4+4pqg77iPIOWcp+WAkueahOWogeWKm+OBqOW8leOBjeaPm+OBiOOBq+avjuenkkhQ44OJ44Os44Kk44Oz44O744OH44OQ44OV44Gu5ZGq44GE44GM55m65YuV77yBPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIG10LTEgcHQtMiBib3JkZXItdCBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LWFtYmVyLTMwMCBmb250LWJvbGRcIj7wn6qZIHtmaW5hbFByaWNlfSBHPC9zcGFuPlxuICAgICAgICAgICAge2l0ZW0ucHJpY2UgPiBmaW5hbFByaWNlICYmIChcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDAgbGluZS10aHJvdWdoXCI+8J+qmSB7aXRlbS5wcmljZX0gRzwvc3Bhbj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICB7aGFzSm9iRGlzY291bnQgJiYgKFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGJnLWVtZXJhbGQtOTAwIHRleHQtZW1lcmFsZC0zMDAgcHgtMSBweS0wLjIgcm91bmRlZCBmb250LWJvbGQgYm9yZGVyIGJvcmRlci1lbWVyYWxkLTYwMFwiPlxuICAgICAgICAgICAgICAgIOeJueWMluWJsuW8lVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICApfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uQnV5RGFpbHlJdGVtICYmIG9uQnV5RGFpbHlJdGVtKHsgLi4uaXRlbSwgcHJpY2U6IGZpbmFsUHJpY2UgfSl9XG4gICAgICAgICAgICBkaXNhYmxlZD17Z29sZCA8IGZpbmFsUHJpY2UgfHwgaXNTb2xkT3V0IHx8IGlzUXVlc3RBY3RpdmV9XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC14cyBhY3RpdmUgZGlzYWJsZWQ6b3BhY2l0eS00MCAke1xuICAgICAgICAgICAgICBpc0N1cnNlZFxuICAgICAgICAgICAgICAgID8gJyFiZy1wdXJwbGUtNzAwICF0ZXh0LXB1cnBsZS0xMDAgIWJvcmRlci1wdXJwbGUtNDAwIGhvdmVyOiFiZy1wdXJwbGUtNjAwJ1xuICAgICAgICAgICAgICAgIDogJyFib3JkZXItYW1iZXItNDAwJ1xuICAgICAgICAgICAgfWB9XG4gICAgICAgICAgPlxuICAgICAgICAgICAge2lzU29sZE91dCA/ICflo7LliIfjgownIDogJ+izvOWFpeOBmeOCiyd9XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfTtcblxuICBjb25zdCByZW5kZXJEZXRhaWxNb2RhbCA9ICgpID0+IHtcbiAgICBpZiAoIWRldGFpbFBsYXllckl0ZW0pIHJldHVybiBudWxsO1xuICAgIGNvbnN0IGNvbXBpbGVkID0gZ2V0Q29tcGlsZWRJdGVtKGRldGFpbFBsYXllckl0ZW0pO1xuICAgIGNvbnN0IGJhc2VJdGVtID0gSVRFTVNbZGV0YWlsUGxheWVySXRlbS5iYXNlSWRdO1xuICAgIGlmICghYmFzZUl0ZW0gfHwgIWNvbXBpbGVkKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGlzU3RhdEVxID0gZXF1aXBtZW50LnN0YXRXZWFwb25JZCA9PT0gZGV0YWlsUGxheWVySXRlbS51aWQgfHwgZXF1aXBtZW50LnN0YXRBcm1vcklkID09PSBkZXRhaWxQbGF5ZXJJdGVtLnVpZDtcbiAgICBjb25zdCBpc0FwcEVxID0gZXF1aXBtZW50LmFwcGVhcmFuY2VXZWFwb25JZCA9PT0gZGV0YWlsUGxheWVySXRlbS5iYXNlSWQgfHwgZXF1aXBtZW50LmFwcGVhcmFuY2VBcm1vcklkID09PSBkZXRhaWxQbGF5ZXJJdGVtLmJhc2VJZDtcblxuICAgIGNvbnN0IHN0YXRTbG90OiBrZXlvZiBFcXVpcG1lbnRTdGF0ZSA9IGNvbXBpbGVkLnR5cGUgPT09ICd3ZWFwb24nID8gJ3N0YXRXZWFwb25JZCcgOiAnc3RhdEFybW9ySWQnO1xuICAgIGNvbnN0IGFwcFNsb3Q6IGtleW9mIEVxdWlwbWVudFN0YXRlID0gY29tcGlsZWQudHlwZSA9PT0gJ3dlYXBvbicgPyAnYXBwZWFyYW5jZVdlYXBvbklkJyA6ICdhcHBlYXJhbmNlQXJtb3JJZCc7XG4gICAgY29uc3Qgc2VsbFByaWNlID0gY2FsY3VsYXRlU2VsbFByaWNlKGRldGFpbFBsYXllckl0ZW0sIGpvYik7XG5cbiAgICBjb25zdCBiYXNlUHJpY2UgPSBiYXNlSXRlbS5wcmljZSB8fCAxMDA7XG4gICAgY29uc3QgaGFsZkJhc2UgPSBNYXRoLmZsb29yKGJhc2VQcmljZSAqIDAuNSk7XG4gICAgY29uc3QgZW5jaGFudEJvbnVzID0gZGV0YWlsUGxheWVySXRlbS51cGdyYWRlTGV2ZWwgPiAwID8gTWF0aC5mbG9vcihiYXNlUHJpY2UgKiAwLjIwICogZGV0YWlsUGxheWVySXRlbS51cGdyYWRlTGV2ZWwpIDogMDtcbiAgICBjb25zdCBsaW1pdEJyZWFrQm9udXMgPSAoZGV0YWlsUGxheWVySXRlbS5saW1pdEJyZWFrIHx8IDApID4gMCA/IE1hdGguZmxvb3IoYmFzZVByaWNlICogMC41MCAqIGRldGFpbFBsYXllckl0ZW0ubGltaXRCcmVhayEpIDogMDtcbiAgICBjb25zdCBzcGVjaWFsRW5jaGFudEJvbnVzID0gKGRldGFpbFBsYXllckl0ZW0uc3BlY2lhbEVuY2hhbnRDb3VudCB8fCAwKSA+IDAgPyBNYXRoLmZsb29yKGJhc2VQcmljZSAqIDAuMzAgKiBkZXRhaWxQbGF5ZXJJdGVtLnNwZWNpYWxFbmNoYW50Q291bnQhKSA6IDA7XG4gICAgY29uc3QgYWRkZWRQb3dlckJvbnVzID0gZGV0YWlsUGxheWVySXRlbS5hZGRlZFBvd2VyID4gMCA/IGRldGFpbFBsYXllckl0ZW0uYWRkZWRQb3dlciAqIDEyIDogMDtcbiAgICBjb25zdCBzcGVjaWFsQ291bnQgPSBkZXRhaWxQbGF5ZXJJdGVtLnNwZWNpYWxFbmNoYW50Q291bnQgfHwgMDtcbiAgICBjb25zdCBpc0N1cnNlZERldGFpbCA9IChjb21waWxlZC5pc0N1cnNlZCB8fCBiYXNlSXRlbS5pc0N1cnNlZCkgJiYgIWRldGFpbFBsYXllckl0ZW0uaXNVbmN1cnNlZDtcbiAgICBjb25zdCB1bmN1cnNlRGV0YWlsQ29zdCA9IGNhbGN1bGF0ZVVuY3Vyc2VDb3N0KGRldGFpbFBsYXllckl0ZW0sIGpvYik7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotNTAgYmctc2xhdGUtOTUwLzgwIGJhY2tkcm9wLWJsdXItc20gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGl4ZWwtcGFuZWwgbWF4LXctbWQgdy1mdWxsIGJnLXNsYXRlLTkwMCBib3JkZXItMiBib3JkZXItYW1iZXItNDAwIHAtNCByZWxhdGl2ZSBzaGFkb3ctWzBfMF8zMHB4X3JnYmEoMjQ1LDE1OCwxMSwwLjMpXSBtYXgtaC1bOTB2aF0gb3ZlcmZsb3cteS1hdXRvXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0RGV0YWlsUGxheWVySXRlbShudWxsKX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0yIHJpZ2h0LTIgdGV4dC1zbGF0ZS00MDAgaG92ZXI6dGV4dC13aGl0ZSB0ZXh0LWxnIGZvbnQtYm9sZCBweC0yIHB5LTAuNSByb3VuZGVkXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICDinJVcbiAgICAgICAgICA8L2J1dHRvbj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0zIG1iLTNcIj5cbiAgICAgICAgICAgIDxJdGVtSWNvbiBpdGVtPXt7IC4uLmNvbXBpbGVkLCBpZDogZGV0YWlsUGxheWVySXRlbS5iYXNlSWQgfX0gc2l6ZT17NDh9IC8+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgZmxleC13cmFwXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1iYXNlIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTEwMFwiPntjb21waWxlZC5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICB7ZGV0YWlsUGxheWVySXRlbS5lbmdyYXZpbmcgJiYgKFxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gYmctc2xhdGUtODAwIHRleHQtaW5kaWdvLTMwMCBib3JkZXIgYm9yZGVyLXNsYXRlLTYwMCBweC0xLjUgcHktMC41IHJvdW5kZWQgZm9udC1ib2xkIHdoaXRlc3BhY2Utbm93cmFwXCI+XG4gICAgICAgICAgICAgICAgICAgIPCfm6HvuI8ge2RldGFpbFBsYXllckl0ZW0uZW5ncmF2aW5nfVxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAge2NvbXBpbGVkLmlzQ3Vyc2VkICYmIChcbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgYmctcHVycGxlLTk1MCB0ZXh0LXB1cnBsZS0zMDAgcHgtMS41IHB5LTAuNSByb3VuZGVkIGJvcmRlciBib3JkZXItcHVycGxlLTcwMCBmb250LWV4dHJhYm9sZFwiPlxuICAgICAgICAgICAgICAgICAgICDwn5KAIOWRquOBhOijheWCmVxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAge3NwZWNpYWxDb3VudCA+IDAgJiYgKFxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gYmctcHVycGxlLTkwMCB0ZXh0LXB1cnBsZS0yMDAgYm9yZGVyIGJvcmRlci1wdXJwbGUtNjAwIHB4LTEuNSBweS0wLjUgcm91bmRlZCBmb250LWJvbGRcIj5cbiAgICAgICAgICAgICAgICAgICAg4piFIOeJueauiuW8t+WMliB7c3BlY2lhbENvdW50feWbnlxuICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS00MDAgZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgbXQtMVwiPlxuICAgICAgICAgICAgICAgIDxzcGFuPueoruWIpToge2NvbXBpbGVkLnR5cGUgPT09ICd3ZWFwb24nID8gJ+KalO+4jyDmrablmagnIDogJ/Cfm6HvuI8g6Ziy5YW3J308L3NwYW4+XG4gICAgICAgICAgICAgICAgPHNwYW4+KOODmeODvOOCuToge2Jhc2VJdGVtLm5hbWV9KTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIHsvKiDjgrnjg4bjg7zjgr/jgrnlhoXoqLMgKi99XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgbWItM1wiPlxuICAgICAgICAgICAgPGg0IGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIHRleHQtYW1iZXItMzAwIG1iLTIgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0xXCI+8J+TiiDog73lipvlgKTjg7vlvLfljJbjgrnjg4bjg7zjgr/jgrnoqbPntLA8L2g0PlxuICAgICAgICAgICAgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTIgdGV4dC14cyBtYi0zXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTAwLzkwIHAtMiByb3VuZGVkIGJvcmRlciBib3JkZXItc2xhdGUtODAwXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMFwiPuWfuuacrHtjb21waWxlZC50eXBlID09PSAnd2VhcG9uJyA/ICfmlLvmkoPlipsnIDogJ+mYsuW+oeWKmyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTIwMFwiPit7YmFzZUl0ZW0ucG93ZXJ9PC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTkwMC85MCBwLTIgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDBcIj7ln7rmnKzlvLfljJYgKEx2LntkZXRhaWxQbGF5ZXJJdGVtLnVwZ3JhZGVMZXZlbH0pPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXJvc2UtMzAwXCI+K3tkZXRhaWxQbGF5ZXJJdGVtLnVwZ3JhZGVMZXZlbCAqIDN9PC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTkwMC85MCBwLTIgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1wdXJwbGUtMzAwIGZvbnQtYm9sZFwiPuKYhSDnibnmrorlvLfljJYgKHtzcGVjaWFsQ291bnR95Zue5a6f5pa9KTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1wdXJwbGUtMzAwXCI+K3tkZXRhaWxQbGF5ZXJJdGVtLmFkZGVkUG93ZXJ9PC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTkwMC85MCBwLTIgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS00MDBcIj7pmZDnlYznqoHnoLQ8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtc2t5LTMwMFwiPnsoZGV0YWlsUGxheWVySXRlbS5saW1pdEJyZWFrIHx8IDApID4gMCA/IGArJHtkZXRhaWxQbGF5ZXJJdGVtLmxpbWl0QnJlYWt95Ye4YCA6ICfmnKrlrp/mlr0nfTwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBiZy1hbWJlci05NTAvNDAgcC0yLjUgcm91bmRlZCBib3JkZXIgYm9yZGVyLWFtYmVyLTgwMC84MFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTIwMFwiPvCflKUg57eP5ZCIIHtjb21waWxlZC50eXBlID09PSAnd2VhcG9uJyA/ICfmlLvmkoPlipsnIDogJ+mYsuW+oeWKmyd9Ojwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1sZyBmb250LWJsYWNrIHRleHQtYW1iZXItMzAwXCI+K3tjb21waWxlZC5wb3dlcn08L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIHsvKiDnibnmrorlirnmnpwgLyDlkarjgYQgKi99XG4gICAgICAgICAge2NvbXBpbGVkLmVmZmVjdCAmJiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMCBtYi0zXCI+XG4gICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXNreS0zMDAgbWItMVwiPuKcqCDku5jkuI7lirnmnpzjg7vjgrnjgq3jg6s8L2g0PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1za3ktMjAwIGxlYWRpbmctcmVsYXhlZFwiPlxuICAgICAgICAgICAgICAgIHtjb21waWxlZC5lZmZlY3QuZGVzY3JpcHRpb259XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKX1cblxuICAgICAgICAgIHsvKiDmn7vlrprkvqHlgKQgLyDlo7LljbTlhoXoqLMgKi99XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgbWItM1wiPlxuICAgICAgICAgICAgPGg0IGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ib2xkIHRleHQtYW1iZXItMzAwIG1iLTIgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0xXCI+8J+SsCDpjZvlhrblsYvlo7LljbTmn7vlrprkvqHmoLzjga7lhoXoqLM8L2g0PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTEgdGV4dC1bMTFweF0gdGV4dC1zbGF0ZS0zMDAgbWItMlwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDBcIj7ln7rmnKzkvqHmoLwgKOWumuS+oeOBrjUwJSk6PC9zcGFuPlxuICAgICAgICAgICAgICAgIDxzcGFuPvCfqpkge2hhbGZCYXNlfSBHPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAge2VuY2hhbnRCb251cyA+IDAgJiYgKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gdGV4dC1yb3NlLTMwMFwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+5Z+65pys5by35YyW44Oc44O844OK44K5IChMdi57ZGV0YWlsUGxheWVySXRlbS51cGdyYWRlTGV2ZWx9KTo8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj4r8J+qmSB7ZW5jaGFudEJvbnVzfSBHPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICB7bGltaXRCcmVha0JvbnVzID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LXNreS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPumZkOeVjOeqgeegtOODnOODvOODiuOCuSAoe2RldGFpbFBsYXllckl0ZW0ubGltaXRCcmVha33lh7gpOjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPivwn6qZIHtsaW1pdEJyZWFrQm9udXN9IEc8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIHtzcGVjaWFsRW5jaGFudEJvbnVzID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LXB1cnBsZS0zMDBcIj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPueJueauiuW8t+WMluODnOODvOODiuOCuSAoe3NwZWNpYWxDb3VudH3lm54pOjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPivwn6qZIHtzcGVjaWFsRW5jaGFudEJvbnVzfSBHPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICB7YWRkZWRQb3dlckJvbnVzID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGp1c3RpZnktYmV0d2VlbiB0ZXh0LWFtYmVyLTMwMFwiPlxuICAgICAgICAgICAgICAgICAgPHNwYW4+6L+95Yqg6IO95Yqb44Oc44O844OK44K5Ojwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPivwn6qZIHthZGRlZFBvd2VyQm9udXN9IEc8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIHB0LTEgYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMCB0ZXh0LXhzIGZvbnQtYm9sZFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTIwMFwiPuWQiOioiOWjsuWNtOafu+WumumhjTo8L3NwYW4+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwIHRleHQtc20gZm9udC1ibGFja1wiPvCfqpkge3NlbGxQcmljZX0gRzwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgey8qIOWuneefs+OCueODreODg+ODiCAo5q2m5Zmo44Gu44G/KSAqL31cbiAgICAgICAgICB7Y29tcGlsZWQudHlwZSA9PT0gJ3dlYXBvbicgJiYgKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAgcC0zIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgbWItM1wiPlxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC14cyBmb250LWJvbGQgdGV4dC1lbWVyYWxkLTMwMCBtYi0yIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW5cIj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7wn5KOIOWuneefs+OCueODreODg+ODiCAoe2RldGFpbFBsYXllckl0ZW0uc2xvdHRlZEdlbXM/Lmxlbmd0aCB8fCAwfS97ZGV0YWlsUGxheWVySXRlbS51bmxvY2tlZFNvY2tldHMgfHwgMH0pPC9zcGFuPlxuICAgICAgICAgICAgICA8L2g0PlxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTIgbWItM1wiPlxuICAgICAgICAgICAgICAgIHtBcnJheS5mcm9tKHsgbGVuZ3RoOiBNYXRoLm1heChkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwLCAxKSB9KS5tYXAoKF8sIGlkeCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGlkeCA+PSAoZGV0YWlsUGxheWVySXRlbS51bmxvY2tlZFNvY2tldHMgfHwgMCkpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgY29uc3QgZ2VtSWQgPSBkZXRhaWxQbGF5ZXJJdGVtLnNsb3R0ZWRHZW1zPy5baWR4XTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGdlbSA9IGdlbUlkID8gSVRFTVNbZ2VtSWRdIDogbnVsbDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHAtMiBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgcm91bmRlZFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy02IGgtNiByb3VuZGVkIGJnLXNsYXRlLTk1MCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7Z2VtID8gJ/Cfko4nIDogPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS02MDBcIj7nqbo8L3NwYW4+fVxuICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleC0xIHRleHQtWzEwcHhdXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7Z2VtID8gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtc2xhdGUtMjAwXCI+e2dlbS5uYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1za3ktMzAwXCI+e2dlbS5lZmZlY3Q/LmRlc2NyaXB0aW9ufTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS01MDBcIj7nqbrjgY3jgrnjg63jg4Pjg4g8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICB7KGRldGFpbFBsYXllckl0ZW0udW5sb2NrZWRTb2NrZXRzIHx8IDApID09PSAwICYmIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1zbGF0ZS01MDAgdGV4dC1jZW50ZXIgcHktMlwiPlxuICAgICAgICAgICAgICAgICAgICDjgrnjg63jg4Pjg4jjgYznqbrjgYTjgabjgYTjgb7jgZvjgpPjgILnqbTplovjgZHjgpLooYzjgaPjgabjgY/jgaDjgZXjgYTjgIJcbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIHsvKiDnqbTplovjgZHjg5zjgr/jg7MgKi99XG4gICAgICAgICAgICAgICAgeyhkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwKSA8IDMgJiYgKFxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKG9uT3BlblNvY2tldCkgb25PcGVuU29ja2V0KGRldGFpbFBsYXllckl0ZW0udWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICBzZXREZXRhaWxQbGF5ZXJJdGVtKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17ZGV0YWlsUGxheWVySXRlbS5pc0xvY2tlZCB8fCBpc1F1ZXN0QWN0aXZlIHx8IGdvbGQgPCA1MDAwICogKChkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwKSArIDEpfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC1bMTBweF0gdy1mdWxsICFiZy1zbGF0ZS04MDAgYWN0aXZlIGRpc2FibGVkOm9wYWNpdHktNDBcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICDim4/vuI8g56m044KS6ZaL44GR44KLICjwn6qZIHs1MDAwICogKChkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwKSArIDEpfSBHIC8g5oiQ5Yqf546HIHtNYXRoLmZsb29yKCgwLjUgLSAoKGRldGFpbFBsYXllckl0ZW0udW5sb2NrZWRTb2NrZXRzIHx8IDApICogMC4xNSkgKyAoam9iID09PSAnYXJ0aXNhbicgPyAwLjMgOiAwKSkgKiAxMDApfSUpXG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHsvKiDlrp3nn7PjgpLjga/jgoHjgovjgrvjg6zjgq/jg4ggKOepuuOBjeOCueODreODg+ODiOOBjOOBguOCi+WgtOWQiOOBruOBv+ihqOekuikgKi99XG4gICAgICAgICAgICAgICAgeyhkZXRhaWxQbGF5ZXJJdGVtLnVubG9ja2VkU29ja2V0cyB8fCAwKSA+IChkZXRhaWxQbGF5ZXJJdGVtLnNsb3R0ZWRHZW1zPy5sZW5ndGggfHwgMCkgJiYgKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC0yXCI+XG4gICAgICAgICAgICAgICAgICAgIDxzZWxlY3QgXG4gICAgICAgICAgICAgICAgICAgICAgaWQ9XCJnZW0tc2VsZWN0XCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1pbnB1dCB0ZXh0LVsxMHB4XSBmbGV4LTEgIXAtMSBiZy1zbGF0ZS05MDAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgdGV4dC1zbGF0ZS0zMDBcIlxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIlwiPuWuneefs+OCkumBuOaKni4uLjwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICAgIHtpbnZlbnRvcnkuZmlsdGVyKGkgPT4gSVRFTVNbaS5iYXNlSWRdPy50eXBlID09PSAnZ2VtJyAmJiAhaS5pc0xvY2tlZCkubWFwKGkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiBrZXk9e2kudWlkfSB2YWx1ZT17aS51aWR9PntJVEVNU1tpLmJhc2VJZF0ubmFtZX08L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VtLXNlbGVjdCcpIGFzIEhUTUxTZWxlY3RFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdCAmJiBzZWxlY3QudmFsdWUgJiYgb25JbnNlcnRHZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25JbnNlcnRHZW0oZGV0YWlsUGxheWVySXRlbS51aWQsIHNlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNldERldGFpbFBsYXllckl0ZW0obnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17ZGV0YWlsUGxheWVySXRlbS5pc0xvY2tlZCB8fCBpc1F1ZXN0QWN0aXZlfVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMSAhYmctZW1lcmFsZC05MDAgIXRleHQtZW1lcmFsZC0xMDAgIWJvcmRlci1lbWVyYWxkLTYwMCBhY3RpdmUgZGlzYWJsZWQ6b3BhY2l0eS00MFwiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICDjga/jgoHovrzjgoBcbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG5cbiAgICAgICAgICB7Lyog44Ki44Kv44K344On44Oz44Oc44K/44OzICovfVxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBnYXAtMlwiPlxuICAgICAgICAgICAge2lzQ3Vyc2VkRGV0YWlsICYmIChcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgIHNldFVuY3Vyc2VDb25maXJtSXRlbSh7IGl0ZW06IGRldGFpbFBsYXllckl0ZW0sIGdhbWVJdGVtOiBjb21waWxlZCwgY29zdDogdW5jdXJzZURldGFpbENvc3QgfSk7XG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17Z29sZCA8IHVuY3Vyc2VEZXRhaWxDb3N0IHx8IGlzUXVlc3RBY3RpdmV9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQteHMgdy1mdWxsICFiZy1wdXJwbGUtOTAwICF0ZXh0LXB1cnBsZS0xMDAgIWJvcmRlci1wdXJwbGUtNDAwIGZvbnQtYm9sZCBweS0yIGFjdGl2ZSBkaXNhYmxlZDpvcGFjaXR5LTQwXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIOKcne+4jyDlkarjgYTjgpLop6PpmaTvvIjop6PlkarvvInjgZnjgosgKOiyu+eUqDog8J+qmSB7dW5jdXJzZURldGFpbENvc3QudG9Mb2NhbGVTdHJpbmcoKX0gRylcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICApfVxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgIG9uRXF1aXAoc3RhdFNsb3QsIGNvbXBpbGVkLmlkKTtcbiAgICAgICAgICAgICAgICAgIHNldERldGFpbFBsYXllckl0ZW0obnVsbCk7XG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNTdGF0RXEgfHwgaXNRdWVzdEFjdGl2ZX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC14cyBmbGV4LTEgJHtpc1N0YXRFcSA/ICdhY3RpdmUgIWJvcmRlci1lbWVyYWxkLTQwMCAhdGV4dC1lbWVyYWxkLTMwMCcgOiAnJ31gfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAge2lzU3RhdEVxID8gJ+iDveWKmzog6KOF5YKZ5LitJyA6ICfog73lipvjgpLoo4XlgpknfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgIG9uRXF1aXAoYXBwU2xvdCwgZGV0YWlsUGxheWVySXRlbS5iYXNlSWQpO1xuICAgICAgICAgICAgICAgICAgc2V0RGV0YWlsUGxheWVySXRlbShudWxsKTtcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc0FwcEVxIHx8IGlzUXVlc3RBY3RpdmV9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICR7aXNBcHBFcSA/ICdhY3RpdmUgIWJvcmRlci1wdXJwbGUtNDAwICF0ZXh0LXB1cnBsZS0zMDAnIDogJyd9YH1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIHtpc0FwcEVxID8gJ+imi+OBn+ebrjog6KOF5YKZ5LitJyA6ICfopovjgZ/nm67jgpLoo4XlgpknfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChvblNlbGxJdGVtKSBvblNlbGxJdGVtKGRldGFpbFBsYXllckl0ZW0udWlkLCBzZWxsUHJpY2UpO1xuICAgICAgICAgICAgICAgICAgc2V0RGV0YWlsUGxheWVySXRlbShudWxsKTtcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtpc1N0YXRFcSB8fCBpc1F1ZXN0QWN0aXZlIHx8IGRldGFpbFBsYXllckl0ZW0uaXNMb2NrZWR9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICFib3JkZXItYW1iZXItNDAwIGRpc2FibGVkOm9wYWNpdHktNDBcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAge2lzU3RhdEVxID8gJ+ijheWCmeS4reS4jeWPrycgOiBkZXRhaWxQbGF5ZXJJdGVtLmlzTG9ja2VkID8gJ/CflJIg44Ot44OD44Kv5LitJyA6IGDwn5KwIPCfqpkke3NlbGxQcmljZX1HIOOBp+WjsuWNtGB9XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgc2V0RGlzbWFudGxlQ29uZmlybUl0ZW0oeyBpdGVtOiBkZXRhaWxQbGF5ZXJJdGVtLCBnYW1lSXRlbTogYmFzZUl0ZW0gfSk7XG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNTdGF0RXEgfHwgaXNRdWVzdEFjdGl2ZSB8fCBkZXRhaWxQbGF5ZXJJdGVtLmlzTG9ja2VkfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LXhzIGZsZXgtMSAhYmctc2xhdGUtODAwICF0ZXh0LXNsYXRlLTMwMCBob3ZlcjohYmctc2xhdGUtNzAwIGRpc2FibGVkOm9wYWNpdHktNDBcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAge2lzU3RhdEVxID8gJ+ijheWCmeS4reS4jeWPrycgOiBkZXRhaWxQbGF5ZXJJdGVtLmlzTG9ja2VkID8gJ/CflJIg44Ot44OD44Kv5LitJyA6ICfwn5SoIOWIhuino+OBmeOCiyd9XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMiBmbGV4LXdyYXBcIj5cbiAgICAgICAgICAgICAge2d1aWxkTmFtZSAmJiAhZGV0YWlsUGxheWVySXRlbS5lbmdyYXZpbmcgJiYgb25FbmdyYXZlSXRlbSAmJiAoXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpcm0oYOOAjCR7Y29tcGlsZWQubmFtZX3jgI3jgavjgq7jg6vjg4nlkI3jgIwke2d1aWxkTmFtZX3jgI3jgpLliLvljbDjgZfjgb7jgZnjgYvvvJ9gKSkge1xuICAgICAgICAgICAgICAgICAgICAgIG9uRW5ncmF2ZUl0ZW0oZGV0YWlsUGxheWVySXRlbS51aWQsIGd1aWxkTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgc2V0RGV0YWlsUGxheWVySXRlbShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LXhzIGZsZXgtMSBtaW4tdy1bNDAlXSAhYmctaW5kaWdvLTcwMCAhYm9yZGVyLWluZGlnby01MDAgaG92ZXI6IWJnLWluZGlnby02MDBcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIPCfm6HvuI8g44Ku44Or44OJ5Yi75Y2wXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvblRvZ2dsZUxvY2sgJiYgb25Ub2dnbGVMb2NrKGRldGFpbFBsYXllckl0ZW0udWlkKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC14cyBmbGV4LTEgIWJnLXNsYXRlLTgwMCAhYm9yZGVyLXNsYXRlLTYwMFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICB7ZGV0YWlsUGxheWVySXRlbS5pc0xvY2tlZCA/ICfwn5SSIOODreODg+OCr+ino+mZpCcgOiAn8J+UkyDjg63jg4Pjgq/jgZnjgosnfVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldERldGFpbFBsYXllckl0ZW0obnVsbCl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICFiZy1zbGF0ZS04MDAgIXRleHQtc2xhdGUtMzAwICFib3JkZXItc2xhdGUtNjAwXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIOmWieOBmOOCi1xuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH07XG5cbiAgY29uc3QgcmVuZGVyTWF0ZXJpYWxDYXJkID0gKHBJdGVtOiBQbGF5ZXJJdGVtKSA9PiB7XG4gICAgY29uc3QgYmFzZU1hdCA9IElURU1TW3BJdGVtLmJhc2VJZF07XG4gICAgaWYgKCFiYXNlTWF0KSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBpc0NoZXN0ID0gYmFzZU1hdC50eXBlID09PSAnY2hlc3QnO1xuICAgIGNvbnN0IGlzQ29uc3VtYWJsZSA9IGJhc2VNYXQudHlwZSA9PT0gJ2NvbnN1bWFibGUnO1xuICAgIGNvbnN0IHNlbGxQcmljZSA9IGNhbGN1bGF0ZVNlbGxQcmljZShwSXRlbSwgam9iKTtcbiAgICBjb25zdCBpc1NlbGVjdGVkID0gc2VsZWN0ZWRTZWxsVWlkcy5pbmNsdWRlcyhwSXRlbS51aWQpO1xuICAgIGNvbnN0IGNhblNlbGVjdEZvclNlbGwgPSAhcEl0ZW0uaXNMb2NrZWQgJiYgIWlzUXVlc3RBY3RpdmU7XG5cbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBcbiAgICAgICAga2V5PXtwSXRlbS51aWR9IFxuICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgaWYgKGJhdGNoU2VsbE1vZGUgJiYgY2FuU2VsZWN0Rm9yU2VsbCkge1xuICAgICAgICAgICAgdG9nZ2xlU2VsZWN0U2VsbChwSXRlbS51aWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfX1cbiAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtcGFuZWwgZmxleCBmbGV4LWNvbCBnYXAtMiBiZy1zbGF0ZS05MDAvOTAgYm9yZGVyLTIgJHtcbiAgICAgICAgICBpc0NoZXN0ID8gJ2JvcmRlci1hbWJlci01MDAvNzAgYmctc2xhdGUtOTAwLzk1JyA6ICdib3JkZXItc2xhdGUtNzAwJ1xuICAgICAgICB9ICR7YmF0Y2hTZWxsTW9kZSA/IChjYW5TZWxlY3RGb3JTZWxsID8gJ2N1cnNvci1wb2ludGVyIGhvdmVyOmJvcmRlci1hbWJlci00MDAnIDogJ29wYWNpdHktNjAgY3Vyc29yLW5vdC1hbGxvd2VkJykgOiAnJ30gJHtcbiAgICAgICAgICBpc1NlbGVjdGVkID8gJyFib3JkZXItYW1iZXItNDAwICFiZy1hbWJlci05NTAvNjAgcmluZy0yIHJpbmctYW1iZXItNDAwIHNoYWRvdy1bMF8wXzE1cHhfcmdiYSgyNDUsMTU4LDExLDAuNCldJyA6ICcnXG4gICAgICAgIH1gfVxuICAgICAgPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgIHtiYXRjaFNlbGxNb2RlICYmIChcbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgIGNoZWNrZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICBvbkNoYW5nZT17KCkgPT4gdG9nZ2xlU2VsZWN0U2VsbChwSXRlbS51aWQpfVxuICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9eyFjYW5TZWxlY3RGb3JTZWxsfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwidy00IGgtNCBhY2NlbnQtYW1iZXItNDAwIGN1cnNvci1wb2ludGVyIHJvdW5kZWRcIlxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIHtpc0NoZXN0ID8gKFxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhsIHNlbGVjdC1ub25lXCI+XG4gICAgICAgICAgICAgICAge2Jhc2VNYXQubmFtZS5pbmNsdWRlcygn5Lyd6KqsJykgPyAn8J+RkScgOiBiYXNlTWF0Lm5hbWUuaW5jbHVkZXMoJ+mHkScpID8gJ/Cfp7AnIDogYmFzZU1hdC5uYW1lLmluY2x1ZGVzKCfpioAnKSA/ICfwn46BJyA6ICfwn5OmJ31cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgKSA6IGlzQ29uc3VtYWJsZSA/IChcbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14bCBzZWxlY3Qtbm9uZVwiPvCfk5w8L3NwYW4+XG4gICAgICAgICAgICApIDogKFxuICAgICAgICAgICAgICA8SXRlbUljb24gaXRlbT17eyAuLi5iYXNlTWF0LCBpZDogcEl0ZW0uYmFzZUlkIH19IC8+XG4gICAgICAgICAgICApfVxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGRcIiBzdHlsZT17eyBjb2xvcjogYmFzZU1hdC5jb2xvciB9fT57YmFzZU1hdC5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgIOWjsuWNtOS+oeagvDogPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1hbWJlci0zMDAgZm9udC1ib2xkXCI+8J+qmSB7c2VsbFByaWNlfSBHPC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiIG9uQ2xpY2s9e2UgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX0+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uVG9nZ2xlTG9jayAmJiBvblRvZ2dsZUxvY2socEl0ZW0udWlkKX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0xICFweC0yIGFjdGl2ZSBob3ZlcjohYmctc2xhdGUtNzAwXCJcbiAgICAgICAgICAgICAgdGl0bGU9XCLjg63jg4Pjgq/jgZfjgablo7LljbTjg7vmtojosrvjgpLpmLLmraJcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7cEl0ZW0uaXNMb2NrZWQgPyAn8J+UkicgOiAn8J+Ukyd9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIHtpc0NoZXN0ICYmIG9uT3BlbkNoZXN0ICYmIChcbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uT3BlbkNoZXN0KHBJdGVtKX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNRdWVzdEFjdGl2ZSB8fCBwSXRlbS5pc0xvY2tlZH1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC14cyAhcHktMSAhcHgtMiBmb250LWJvbGQgIWJnLWFtYmVyLTUwMCAhdGV4dC1zbGF0ZS05NTAgIWJvcmRlci1hbWJlci0zMDAgaG92ZXI6IWJnLWFtYmVyLTQwMCBhY3RpdmU6c2NhbGUtOTUgZGlzYWJsZWQ6b3BhY2l0eS00MFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDwn5STIOmWi+WwgVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICl9XG4gICAgICAgICAgICB7aXNDb25zdW1hYmxlICYmIG9uVXNlQ29uc3VtYWJsZSAmJiAoXG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoYmFzZU1hdC5pZCA9PT0gJ2NfdHJhbnNmZXJfc2Nyb2xsJykge1xuICAgICAgICAgICAgICAgICAgICBzZXRUcmFuc2ZlclNjcm9sbFVpZChwSXRlbS51aWQpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb25Vc2VDb25zdW1hYmxlKHBJdGVtLnVpZCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNRdWVzdEFjdGl2ZSB8fCBwSXRlbS5pc0xvY2tlZH1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC14cyAhcHktMSAhcHgtMiBmb250LWJvbGQgIWJnLWVtZXJhbGQtNzAwICF0ZXh0LWVtZXJhbGQtMTAwIGhvdmVyOiFiZy1lbWVyYWxkLTYwMCBhY3RpdmU6c2NhbGUtOTUgZGlzYWJsZWQ6b3BhY2l0eS00MFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDkvb/nlKjjgZnjgotcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICApfVxuICAgICAgICAgICAgeyFpc0NoZXN0ICYmICFpc0NvbnN1bWFibGUgJiYgb25TZWxsSXRlbSAmJiAoXG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvblNlbGxJdGVtKHBJdGVtLnVpZCwgc2VsbFByaWNlKX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17aXNRdWVzdEFjdGl2ZSB8fCBwSXRlbS5pc0xvY2tlZH1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTEgIXB4LTIgYWN0aXZlICFib3JkZXItYW1iZXItNDAwIGRpc2FibGVkOm9wYWNpdHktNDBcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAg5aOy5Y20XG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIHtiYXNlTWF0LmVmZmVjdCAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LXNsYXRlLTMwMCBiZy1zbGF0ZS05NTAgcC0yIGJvcmRlciBib3JkZXItc2xhdGUtODAwIHJvdW5kZWRcIj5cbiAgICAgICAgICAgIHtiYXNlTWF0LmVmZmVjdC5kZXNjcmlwdGlvbn1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH07XG5cbiAgY29uc3QgcmVuZGVyQmF0Y2hTZWxsVG9vbGJhciA9ICgpID0+IHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IGJnLXNsYXRlLTk1MCBwLTMgcm91bmRlZCBib3JkZXItMiBib3JkZXItYW1iZXItNTAwLzgwIHNoYWRvdy1tZFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBmbGV4LXdyYXAgZ2FwLTIgbWItMiBwYi0yIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDBcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTMwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMVwiPlxuICAgICAgICAgICAgICA8c3Bhbj7wn5KwIOOBvuOBqOOCgeWjsuOCiuODu+S4gOaLrOWjsuWNtOODouODvOODiTwvc3Bhbj5cbiAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgIHNldEJhdGNoU2VsbE1vZGUoIWJhdGNoU2VsbE1vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChiYXRjaFNlbGxNb2RlKSBzZXRTZWxlY3RlZFNlbGxVaWRzKFtdKTtcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQteHMgIXB5LTEgIXB4LTMgZm9udC1ib2xkICR7XG4gICAgICAgICAgICAgICAgYmF0Y2hTZWxsTW9kZSA/ICdhY3RpdmUgIWJvcmRlci1yb3NlLTQwMCAhYmctcm9zZS05NTAgIXRleHQtcm9zZS0yMDAnIDogJyFib3JkZXItYW1iZXItNDAwICFiZy1hbWJlci05NTAvNjAgIXRleHQtYW1iZXItMjAwJ1xuICAgICAgICAgICAgICB9YH1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge2JhdGNoU2VsbE1vZGUgPyAn4pyVIOS4gOaLrOWjsuWNtOODouODvOODieOCkue1guS6hicgOiAn4pqhIOS4gOaLrOWjsuWNtOODouODvOODieOCkumWi+Wniyd9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIHtiYXRjaFNlbGxNb2RlICYmIChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTMwMCBmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICA8c3Bhbj7pgbjmip7kuK06IDxzdHJvbmcgY2xhc3NOYW1lPVwidGV4dC1hbWJlci0zMDBcIj57c2VsZWN0ZWRTZWxsVWlkcy5sZW5ndGh9PC9zdHJvbmc+IOWAizwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4+5ZCI6KiIOiA8c3Ryb25nIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFwiPvCfqpkge3NlbGVjdGVkU2VsbFRvdGFsUHJpY2UudG9Mb2NhbGVTdHJpbmcoKX0gRzwvc3Ryb25nPjwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICl9XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHtiYXRjaFNlbGxNb2RlICYmIChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgZ2FwLTJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSBmbGV4LXdyYXBcIj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTFweF0gdGV4dC1zbGF0ZS00MDAgZm9udC1ib2xkXCI+5LiA5ous6YG45oqeOjwvc3Bhbj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNlbGVjdEFsbFVudXNlZEVxdWlwfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LVsxMHB4XSAhcHktMC41ICFweC0yIGFjdGl2ZSBob3ZlcjohYmctc2xhdGUtODAwXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIOacquijheWCmeatpuWFt+OCkuWFqOmBuOaKnlxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNlbGVjdEFsbFVuZW5oYW5jZWR9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0wLjUgIXB4LTIgYWN0aXZlIGhvdmVyOiFiZy1zbGF0ZS04MDBcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAg5pyq5by35YyW5q2m5YW344KS5YWo6YG45oqeXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlU2VsZWN0QWxsRHVwbGljYXRlc31cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC1bMTBweF0gIXB5LTAuNSAhcHgtMiBhY3RpdmUgaG92ZXI6IWJnLXNsYXRlLTgwMFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDph43opIfmiYDmjIHlk4HjgpLlhajpgbjmip5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVTZWxlY3RBbGxNYXRlcmlhbHN9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0wLjUgIXB4LTIgYWN0aXZlIGhvdmVyOiFiZy1zbGF0ZS04MDBcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAg57Sg5p2Q44O75a6d55+z44KS5YWo6YG45oqeXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICB7c2VsZWN0ZWRTZWxsVWlkcy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjdGVkU2VsbFVpZHMoW10pfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQtWzEwcHhdICFweS0wLjUgIXB4LTIgIWJvcmRlci1zbGF0ZS02MDAgIXRleHQtc2xhdGUtNDAwIGhvdmVyOiFiZy1zbGF0ZS04MDBcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIOmBuOaKnuWFqOino+mZpFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHB0LTIgYm9yZGVyLXQgYm9yZGVyLXNsYXRlLTgwMC84MFwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSB0ZXh0LXNsYXRlLTQwMFwiPlxuICAgICAgICAgICAgICAgIOKAuyDjg63jg4Pjgq/kuK3jga7jgqLjgqTjg4bjg6DjgYrjgojjgbPoo4XlgpnkuK3jga7mrablhbfjga/lo7LljbTlr77osaHlpJbjgafjgZnjgIJcbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkU2VsbFVpZHMubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICBpZiAob25CYXRjaFNlbGxJdGVtcykge1xuICAgICAgICAgICAgICAgICAgICBvbkJhdGNoU2VsbEl0ZW1zKHNlbGVjdGVkU2VsbFVpZHMsIHNlbGVjdGVkU2VsbFRvdGFsUHJpY2UpO1xuICAgICAgICAgICAgICAgICAgICBzZXRTZWxlY3RlZFNlbGxVaWRzKFtdKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtzZWxlY3RlZFNlbGxVaWRzLmxlbmd0aCA9PT0gMCB8fCBpc1F1ZXN0QWN0aXZlfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LXhzICFweS0xLjUgIXB4LTQgYWN0aXZlICFib3JkZXItYW1iZXItNDAwICFiZy1hbWJlci05MDAgaG92ZXI6IWJnLWFtYmVyLTgwMCAhdGV4dC1hbWJlci0xMDAgZm9udC1ibGFjayBkaXNhYmxlZDpvcGFjaXR5LTMwIHNoYWRvdy1bMF8wXzEwcHhfcmdiYSgyNDUsMTU4LDExLDAuMyldXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIPCfkrAg6YG45oqe44GX44GfIHtzZWxlY3RlZFNlbGxVaWRzLmxlbmd0aH0g5YCL44KS5LiA5ous5aOy5Y20ICgr8J+qmSB7c2VsZWN0ZWRTZWxsVG90YWxQcmljZS50b0xvY2FsZVN0cmluZygpfSBHKVxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICApfVxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwicGl4ZWwtcGFuZWwgbWF4LWgtWzQ4MHB4XSBvdmVyZmxvdy15LWF1dG9cIj5cbiAgICAgIHtpc1F1ZXN0QWN0aXZlICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYi00IHRleHQteHMgZm9udC1ib2xkIHRleHQtcm9zZS0zMDAgYmctcm9zZS05NTAvODAgcC0zIGJvcmRlci0yIGJvcmRlci1yb3NlLTYwMCByb3VuZGVkIGZsZXggaXRlbXMtY2VudGVyIGdhcC0yXCI+XG4gICAgICAgICAgPHNwYW4+4pqg77iPPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPumbhuS4reOCr+OCqOOCueODiOS4reOBr+ijheWCmeOBruWkieabtOODu+izvOWFpeODu+W8t+WMluOBjOOBp+OBjeOBvuOBm+OCk+OAgjwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTEgbWItNCBib3JkZXItYi0yIGJvcmRlci1zbGF0ZS03MDAgcGItMyBmbGV4LXdyYXBcIj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRhYignaW52ZW50b3J5Jyl9XG4gICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQtWzExcHhdIGZsZXgtMSBtaW4tdy1bNzBweF0gJHt0YWIgPT09ICdpbnZlbnRvcnknID8gJ2FjdGl2ZScgOiAnJ31gfVxuICAgICAgICA+XG4gICAgICAgICAg8J+OkiDoo4XlgplcbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUYWIoJ2ZvcmdlJyl9XG4gICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQtWzExcHhdIGZsZXgtMSBtaW4tdy1bNzBweF0gJHt0YWIgPT09ICdmb3JnZScgPyAnYWN0aXZlJyA6ICcnfWB9XG4gICAgICAgID5cbiAgICAgICAgICDwn5SoIOmNm+WGtuWxi1xuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRhYignY3JhZnQnKX1cbiAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC1bMTFweF0gZmxleC0xIG1pbi13LVs3MHB4XSAke3RhYiA9PT0gJ2NyYWZ0JyA/ICdhY3RpdmUgIWJvcmRlci1hbWJlci00MDAgIXRleHQtYW1iZXItMzAwJyA6ICcnfWB9XG4gICAgICAgID5cbiAgICAgICAgICDwn5ug77iPIOOCr+ODqeODleODiFxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRhYignbWF0ZXJpYWxzJyl9XG4gICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtYnRuIHRleHQtWzExcHhdIGZsZXgtMSBtaW4tdy1bNzBweF0gJHt0YWIgPT09ICdtYXRlcmlhbHMnID8gJ2FjdGl2ZScgOiAnJ31gfVxuICAgICAgICA+XG4gICAgICAgICAg8J+SjiDntKDmnZAge2NoZXN0cy5sZW5ndGggPiAwID8gYCjwn46BJHtjaGVzdHMubGVuZ3RofSlgIDogJyd9XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VGFiKCdkYWlseVNob3AnKX1cbiAgICAgICAgICBjbGFzc05hbWU9e2BwaXhlbC1idG4gdGV4dC1bMTFweF0gZmxleC0xIG1pbi13LVs5NXB4XSAke3RhYiA9PT0gJ2RhaWx5U2hvcCcgPyAnYWN0aXZlICFib3JkZXItcHVycGxlLTQwMCAhdGV4dC1wdXJwbGUtMzAwJyA6ICcnfWB9XG4gICAgICAgID5cbiAgICAgICAgICDwn5OFIOaXpeabv+OCj+OCiuW6l1xuICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRhYignc2hvcCcpfVxuICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LVsxMXB4XSBmbGV4LTEgbWluLXctWzcwcHhdICR7dGFiID09PSAnc2hvcCcgPyAnYWN0aXZlJyA6ICcnfWB9XG4gICAgICAgID5cbiAgICAgICAgICDwn4+qIOmAmuW4uOW6l1xuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICB7dGFiID09PSAnaW52ZW50b3J5JyB8fCB0YWIgPT09ICdmb3JnZScgPyAoXG4gICAgICAgIDxkaXY+XG4gICAgICAgICAge3JlbmRlckJhdGNoU2VsbFRvb2xiYXIoKX1cblxuICAgICAgICAgIHt0YWIgPT09ICdmb3JnZScgPyAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWQgdGV4dC1zbGF0ZS0zMDAgYmctc2xhdGUtOTUwIHAtMyBib3JkZXItMiBib3JkZXItc2xhdGUtODAwIHJvdW5kZWRcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1yb3NlLTQwMCBmb250LWJvbGQgbWItMVwiPvCflKgg6Y2b5Ya25bGL5bel5oi/PC9wPlxuICAgICAgICAgICAgICA8cD7jgJDop6PlkaogKOWRquOBhOino+mZpCnjgJE6IOOCtOODvOODq+ODieOCkua2iOiyu+OBl+OAgeWRquOBhOijheWCmeOBrkhQ44OJ44Os44Kk44Oz44KE44OH44OQ44OV44KS6IGW44Gq44KL5Yqb44Gn5rWE5YyW77yBPC9wPlxuICAgICAgICAgICAgICA8cD7jgJDln7rmnKzlvLfljJbjgJE6ICsxIC8gKzUgLyArMTAgLyBNQVjjgb7jgajjgoHlvLfljJbjgavlr77lv5zvvIE8L3A+XG4gICAgICAgICAgICAgIDxwPuOAkOmZkOeVjOeqgeegtOOAkTog6YeN6KSH6KOF5YKZ44Gu5LiA5ous5ZCI5L2T44Gr5a++5b+c77yBPC9wPlxuICAgICAgICAgICAgICA8cD7jgJDnibnmrorlvLfljJbjgJE6IOe0oOadkOOCkuikh+aVsOWAi+OBvuOBqOOCgeOBpuS4gOaLrOa2iOiyu+W8t+WMluOBq+WvvuW/nO+8gTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWQgdGV4dC1zbGF0ZS0zMDAgYmctc2xhdGUtOTUwIHAtMyBib3JkZXItMiBib3JkZXItc2xhdGUtODAwIHJvdW5kZWRcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1hbWJlci00MDAgZm9udC1ib2xkIG1iLTFcIj7wn5KhIOijheWCmeOCt+OCueODhuODoOOBruODkuODs+ODiDwvcD5cbiAgICAgICAgICAgICAgPHA+44O744CQ6IO95Yqb44KS6KOF5YKZ44CR77ya5pS75pKD5Yqb44O76Ziy5b6h5Yqb44KE6Ieq5YuVSFDlm57lvqnjg7vnjbLlvpfph49VUOWKueaenOOBjOWPjeaYoOOBleOCjOOBvuOBmeOAgjwvcD5cbiAgICAgICAgICAgICAgPHA+44O744CQ6KaL44Gf55uu44KS6KOF5YKZ44CR77ya44K544OG44O844K/44K544Gv44Gd44Gu44G+44G+44Gn44CB44Kt44Oj44Op44Kv44K/44O844Gu6KaL44Gf55uu44Gg44GR44KS5aSJ5pu044Gn44GN44G+44GZ77yBPC9wPlxuICAgICAgICAgICAgICA8cD7jg7vjgJDjgb7jgajjgoHlo7LjgorjgJHvvJrkuI3opoHjgaroo4XlgpnjgoTph43opIfoo4XlgpnjgpLkuIDmi6zpgbjmip7jgZfjgabjg6/jg7Pjgr/jg4Pjg5fjgafmj5vph5HjgafjgY3jgb7jgZnvvIE8L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApfVxuICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LWFtYmVyLTMwMCBtYi0yIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAgcGItMVwiPvCfl6HvuI8g5q2m5ZmoPC9oMz5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgbWQ6Z3JpZC1jb2xzLTIgZ2FwLTMgbWItNlwiPlxuICAgICAgICAgICAge3dlYXBvbnMubGVuZ3RoID4gMCA/IHdlYXBvbnMubWFwKGl0ZW0gPT4gcmVuZGVySW52ZW50b3J5Q2FyZChpdGVtKSkgOiA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj7miYDmjIHjgZfjgabjgYTjgb7jgZvjgpM8L2Rpdj59XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGQgdGV4dC1hbWJlci0zMDAgbWItMiBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHBiLTFcIj7wn5uh77iPIOmYsuWFtzwvaDM+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICAgICAgICB7YXJtb3JzLmxlbmd0aCA+IDAgPyBhcm1vcnMubWFwKGl0ZW0gPT4gcmVuZGVySW52ZW50b3J5Q2FyZChpdGVtKSkgOiA8ZGl2IGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS01MDBcIj7miYDmjIHjgZfjgabjgYTjgb7jgZvjgpM8L2Rpdj59XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IHRhYiA9PT0gJ2NyYWZ0JyA/IChcbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgYmctc2xhdGUtOTUwIHAtMy41IHJvdW5kZWQgYm9yZGVyLTIgYm9yZGVyLWFtYmVyLTUwMC83MCBzaGFkb3ctbWRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIG1iLTEuNSBmbGV4LXdyYXAgZ2FwLTFcIj5cbiAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtYW1iZXItMzAwIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjVcIj5cbiAgICAgICAgICAgICAgICA8c3Bhbj7wn5ug77iPIOenmOihk+ODu+a3seWxpOOCr+ODqeODleODiOW3peaIvzwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9oMz5cbiAgICAgICAgICAgICAge2pvYiA9PT0gJ2FydGlzYW4nICYmIChcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxMHB4XSBiZy1hbWJlci05NTAgdGV4dC1hbWJlci0zMDAgYm9yZGVyIGJvcmRlci1hbWJlci01MDAgcHgtMiBweS0wLjUgcm91bmRlZCBmb250LWJvbGRcIj5cbiAgICAgICAgICAgICAgICAgIPCfj5vvuI8g44Ki44Or44OG44Kj44K244Oz54m55qipOiDntKDmnZAyMCXou73muJvpgannlKjkuK3vvIFcbiAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS0zMDAgbGVhZGluZy1yZWxheGVkIG1iLTJcIj5cbiAgICAgICAgICAgICAg44Oi44Oz44K544K/44O844Gu44OJ44Ot44OD44OX57Sg5p2Q44O75bGe5oCn5a6d55+z44O75rex5bGk57Sg5p2Q44KS57WE44G/5ZCI44KP44Gb44Gm44CB54m55Yil44Gq5q2m5YW344KE6K2356ym44KS6Y2b6YCg44GX44G+44GZ44CCXG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtWzExcHhdIHRleHQtc2t5LTMwMCBiZy1za3ktOTUwLzYwIHAtMiBib3JkZXIgYm9yZGVyLXNreS04MDAvODAgcm91bmRlZCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZmxleC13cmFwIGdhcC0yXCI+XG4gICAgICAgICAgICAgIDxzcGFuPvCfjIwgPHN0cm9uZz7mt7HlsaTmrablhbfjg5zjg7zjg4rjgrk8L3N0cm9uZz46IOOCr+ODqeODleODiOaZguOBruacgOmrmOWIsOmBlOmajuWxpO+8iOWcsOS4iyA8c3Ryb25nPnttYXhTdGFnZX08L3N0cm9uZz4g6ZqO77yJ44Gr5b+c44GY44Gm44Oc44O844OK44K55LuY5LiO77yBPC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTMwMCBmb250LWJvbGRcIj7ku5jkuI7lqIHlips6ICt7TWF0aC5mbG9vcihtYXhTdGFnZSAqIDEuNSl9PC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMy41XCI+XG4gICAgICAgICAgICB7KCgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgaXNBcnRpc2FuID0gam9iID09PSAnYXJ0aXNhbic7XG4gICAgICAgICAgICAgIGNvbnN0IG1hdE5vcm1hbCA9IGlzQXJ0aXNhbiA/IDQwIDogNTA7XG4gICAgICAgICAgICAgIGNvbnN0IGdlbU5vcm1hbCA9IGlzQXJ0aXNhbiA/IDQgOiA1O1xuICAgICAgICAgICAgICBjb25zdCBjdXJzZU1hdCA9IGlzQXJ0aXNhbiA/IDggOiAxMDtcbiAgICAgICAgICAgICAgY29uc3QgZGVlcENyeXN0YWwgPSBpc0FydGlzYW4gPyA4IDogMTA7XG4gICAgICAgICAgICAgIGNvbnN0IGFieXNzQ29yZSA9IGlzQXJ0aXNhbiA/IDEgOiAyO1xuICAgICAgICAgICAgICBjb25zdCBkZWVwQm9udXMgPSBNYXRoLmZsb29yKG1heFN0YWdlICogMS41KTtcblxuICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgbWF0ZXJpYWwgY291bnRzXG4gICAgICAgICAgICAgIGNvbnN0IG1hdENvdW50czogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICAgICAgICAgICAgICBpbnZlbnRvcnkuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBtYXRDb3VudHNbaXRlbS5iYXNlSWRdID0gKG1hdENvdW50c1tpdGVtLmJhc2VJZF0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICBjb25zdCByZWNpcGVzID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGlkOiAnY19jdXJzZV9icmVha2VyJyxcbiAgICAgICAgICAgICAgICAgIG5hbWU6ICfwn5OcIOWRquOBhOWwgeOBmOOBruitt+espicsXG4gICAgICAgICAgICAgICAgICBjYXRlZ29yeTogJ+a2iOiAl+WTgSAvIOitt+espicsXG4gICAgICAgICAgICAgICAgICBjb2xvcjogJyNmNTllMGInLFxuICAgICAgICAgICAgICAgICAgZGVzYzogJ+S9v+eUqOOBmeOCi+OBqOino+WRquOCkuihjOOBhuOBvuOBp+WRquOBhOijheWCmeOBruODnuOCpOODiuOCueWKueaenOOCkuWujOWFqOOBq+eEoeWKueWMluOBmeOCi+OAgicsXG4gICAgICAgICAgICAgICAgICBzdGF0c1ByZXZpZXc6ICfjg57jgqTjg4rjgrnlirnmnpznhKHlirnljJYnLFxuICAgICAgICAgICAgICAgICAgaXNEZWVwOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIG1hdGVyaWFsczogW1xuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9zbGltZV9qZWxseScsIG5hbWU6ICfjgrnjg6njgqTjg6Djgrzjg6rjg7wnLCBjb3VudDogY3Vyc2VNYXQgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ21fZ29ibGluX2VhcicsIG5hbWU6ICfjgrTjg5bjg6rjg7Pjga7ogLMnLCBjb3VudDogY3Vyc2VNYXQgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ21fb3JjX2ZhbmcnLCBuYW1lOiAn44Kq44O844Kv44Gu54mZJywgY291bnQ6IGN1cnNlTWF0IH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdtX2RlbW9uX2hvcm4nLCBuYW1lOiAn5oKq6a2U44Gu6KeSJywgY291bnQ6IGN1cnNlTWF0IH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdtX2RyYWdvbl9zY2FsZScsIG5hbWU6ICfnq5zjga7psZcnLCBjb3VudDogY3Vyc2VNYXQgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBpZDogJ3dfY3JhZnRfcmFnbmFyb2snLFxuICAgICAgICAgICAgICAgICAgbmFtZTogJ+KalO+4jyDntYLnhInliaPjg6njgrDjg4rjg63jgq8nLFxuICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICfnpZ7oqbHmrablmagnLFxuICAgICAgICAgICAgICAgICAgY29sb3I6ICcjZjQzZjVlJyxcbiAgICAgICAgICAgICAgICAgIGRlc2M6ICfnpZ7oqbHjga7ntYLnhInjgpLlkYrjgZLjgovnqbbmpbXjga7lpKfliaPjgILlnKflgJLnmoTjgarmlLvmkoPlipvjgajjgrnjg4bjg7zjgr/jgrnjgpLlrr/jgZnjgIInLFxuICAgICAgICAgICAgICAgICAgc3RhdHNQcmV2aWV3OiAn5Z+65pys5pS75pKD5YqbICsyNTAnLFxuICAgICAgICAgICAgICAgICAgaXNEZWVwOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIG1hdGVyaWFsczogW1xuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9zbGltZV9qZWxseScsIG5hbWU6ICfjgrnjg6njgqTjg6Djgrzjg6rjg7wnLCBjb3VudDogbWF0Tm9ybWFsIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdtX2dvYmxpbl9lYXInLCBuYW1lOiAn44K044OW44Oq44Oz44Gu6ICzJywgY291bnQ6IG1hdE5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9vcmNfZmFuZycsIG5hbWU6ICfjgqrjg7zjgq/jga7niZknLCBjb3VudDogbWF0Tm9ybWFsIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdtX2RlbW9uX2hvcm4nLCBuYW1lOiAn5oKq6a2U44Gu6KeSJywgY291bnQ6IG1hdE5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9kcmFnb25fc2NhbGUnLCBuYW1lOiAn56uc44Gu6bGXJywgY291bnQ6IG1hdE5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnZ19maXJlX3J1YnknLCBuYW1lOiAn54Gr44Gu44Or44OT44O8JywgY291bnQ6IGdlbU5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnZ193YXRlcl9zYXBwaGlyZScsIG5hbWU6ICfmsLTjga7jgrXjg5XjgqHjgqTjgqInLCBjb3VudDogZ2VtTm9ybWFsIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdnX3RodW5kZXJfdG9wYXonLCBuYW1lOiAn6Zu344Gu44OI44OR44O844K6JywgY291bnQ6IGdlbU5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnZ19saWdodF9kaWFtb25kJywgbmFtZTogJ+WFieOBruODgOOCpOODpOODouODs+ODiScsIGNvdW50OiBnZW1Ob3JtYWwgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ2dfZGFya19vbnl4JywgbmFtZTogJ+mXh+OBruOCquODi+OCreOCuScsIGNvdW50OiBnZW1Ob3JtYWwgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBpZDogJ2FfY3JhZnRfYWVnaXMnLFxuICAgICAgICAgICAgICAgICAgbmFtZTogJ/Cfm6HvuI8g5Ym15pif55u+44Kk44O844K444K5JyxcbiAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAn56We6Kmx6Ziy5YW3JyxcbiAgICAgICAgICAgICAgICAgIGNvbG9yOiAnIzM4YmRmOCcsXG4gICAgICAgICAgICAgICAgICBkZXNjOiAn44GC44KJ44KG44KL5Y6E54G944KS6Lez44Gt6L+U44GZ56m25qW144Gu6IGW55u+44CC57W25aSn44Gq6Ziy5b6h5Yqb44Go5Yqg6K2344KS5b6X44KL44CCJyxcbiAgICAgICAgICAgICAgICAgIHN0YXRzUHJldmlldzogJ+WfuuacrOmYsuW+oeWKmyArMjUwJyxcbiAgICAgICAgICAgICAgICAgIGlzRGVlcDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBtYXRlcmlhbHM6IFtcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ21fc2xpbWVfamVsbHknLCBuYW1lOiAn44K544Op44Kk44Og44K844Oq44O8JywgY291bnQ6IG1hdE5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9nb2JsaW5fZWFyJywgbmFtZTogJ+OCtOODluODquODs+OBruiAsycsIGNvdW50OiBtYXROb3JtYWwgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ21fb3JjX2ZhbmcnLCBuYW1lOiAn44Kq44O844Kv44Gu54mZJywgY291bnQ6IG1hdE5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9kZW1vbl9ob3JuJywgbmFtZTogJ+aCqumtlOOBruinkicsIGNvdW50OiBtYXROb3JtYWwgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ21fZHJhZ29uX3NjYWxlJywgbmFtZTogJ+ernOOBrumxlycsIGNvdW50OiBtYXROb3JtYWwgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ2dfZmlyZV9ydWJ5JywgbmFtZTogJ+eBq+OBruODq+ODk+ODvCcsIGNvdW50OiBnZW1Ob3JtYWwgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ2dfd2F0ZXJfc2FwcGhpcmUnLCBuYW1lOiAn5rC044Gu44K144OV44Kh44Kk44KiJywgY291bnQ6IGdlbU5vcm1hbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnZ190aHVuZGVyX3RvcGF6JywgbmFtZTogJ+mbt+OBruODiOODkeODvOOCuicsIGNvdW50OiBnZW1Ob3JtYWwgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBpZDogJ2dfbGlnaHRfZGlhbW9uZCcsIG5hbWU6ICflhYnjga7jg4DjgqTjg6Tjg6Ljg7Pjg4knLCBjb3VudDogZ2VtTm9ybWFsIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdnX2Rhcmtfb255eCcsIG5hbWU6ICfpl4fjga7jgqrjg4vjgq3jgrknLCBjb3VudDogZ2VtTm9ybWFsIH0sXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgaWQ6ICd3X2RlZXBfc3dvcmQnLFxuICAgICAgICAgICAgICAgICAgbmFtZTogJ+KalO+4jyDmt7Hmt7Xjga7prZTliaMnLFxuICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICfmt7HlsaTjgrnjgrHjg7zjg6rjg7PjgrDmrablmagnLFxuICAgICAgICAgICAgICAgICAgY29sb3I6ICcjMzhiZGY4JyxcbiAgICAgICAgICAgICAgICAgIGRlc2M6ICc1MDBGLzEwMDBG5rex5bGk57Sg5p2Q44GL44KJ6Y2b6YCg44GV44KM44KL6a2U5Ymj44CC5pyA6auY5Yiw6YGU6ZqO5bGk44Gr5b+c44GY44Gf44Oc44O844OK44K55aiB5Yqb44GM5rC45LmF5LuY5LiO44GV44KM44CB5L2c5oiQ6ICF5ZCN44GM5rC46YGg44Gr5Yi75Y2w44GV44KM44KL44CCJyxcbiAgICAgICAgICAgICAgICAgIHN0YXRzUHJldmlldzogYOWfuuacrOaUu+aSg+WKmyArMTgwIO+8iyDpmo7lsaTjg5zjg7zjg4rjgrkgKyR7ZGVlcEJvbnVzfSDvvJ0g5ZCI6KiIICskezE4MCArIGRlZXBCb251c31gLFxuICAgICAgICAgICAgICAgICAgaXNEZWVwOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgbWF0ZXJpYWxzOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdtX2RlZXBfY3J5c3RhbCcsIG5hbWU6ICfmt7HlsaTjga7ntZDmmbYgKDUwMEZ+KScsIGNvdW50OiBkZWVwQ3J5c3RhbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9hYnlzc19jb3JlJywgbmFtZTogJ+WliOiQveOBruOCs+OCoiAoMTAwMEZ+KScsIGNvdW50OiBhYnlzc0NvcmUgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBpZDogJ2FfZGVlcF9hcm1vcicsXG4gICAgICAgICAgICAgICAgICBuYW1lOiAn8J+boe+4jyDlpYjokL3jga7pjqcnLFxuICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICfmt7HlsaTjgrnjgrHjg7zjg6rjg7PjgrDpmLLlhbcnLFxuICAgICAgICAgICAgICAgICAgY29sb3I6ICcjYTg1NWY3JyxcbiAgICAgICAgICAgICAgICAgIGRlc2M6ICc1MDBGLzEwMDBG5rex5bGk57Sg5p2Q44GL44KJ6Y2b6YCg44GV44KM44KL6YeN6Y6n44CC5pyA6auY5Yiw6YGU6ZqO5bGk44Gr5b+c44GY44Gf44Oc44O844OK44K55aiB5Yqb44GM5rC45LmF5LuY5LiO44GV44KM44CB5L2c5oiQ6ICF5ZCN44GM5rC46YGg44Gr5Yi75Y2w44GV44KM44KL44CCJyxcbiAgICAgICAgICAgICAgICAgIHN0YXRzUHJldmlldzogYOWfuuacrOmYsuW+oeWKmyArMTgwIO+8iyDpmo7lsaTjg5zjg7zjg4rjgrkgKyR7ZGVlcEJvbnVzfSDvvJ0g5ZCI6KiIICskezE4MCArIGRlZXBCb251c31gLFxuICAgICAgICAgICAgICAgICAgaXNEZWVwOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgbWF0ZXJpYWxzOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgaWQ6ICdtX2RlZXBfY3J5c3RhbCcsIG5hbWU6ICfmt7HlsaTjga7ntZDmmbYgKDUwMEZ+KScsIGNvdW50OiBkZWVwQ3J5c3RhbCB9LFxuICAgICAgICAgICAgICAgICAgICB7IGlkOiAnbV9hYnlzc19jb3JlJywgbmFtZTogJ+WliOiQveOBruOCs+OCoiAoMTAwMEZ+KScsIGNvdW50OiBhYnlzc0NvcmUgfSxcbiAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgICByZXR1cm4gcmVjaXBlcy5tYXAocmVjaXBlID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW5DcmFmdCA9IHJlY2lwZS5tYXRlcmlhbHMuZXZlcnkobSA9PiAobWF0Q291bnRzW20uaWRdIHx8IDApID49IG0uY291bnQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vY2tHYW1lSXRlbSA9IElURU1TW3JlY2lwZS5pZF0gfHwgeyBpZDogcmVjaXBlLmlkLCBuYW1lOiByZWNpcGUubmFtZSwgdHlwZTogJ3dlYXBvbicsIGNvbG9yOiByZWNpcGUuY29sb3IsIHByaWNlOiAwLCBwb3dlcjogMCB9O1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgXG4gICAgICAgICAgICAgICAgICAgIGtleT17cmVjaXBlLmlkfSBcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcGl4ZWwtcGFuZWwgYmctc2xhdGUtOTAwIGJvcmRlci0yIHAtMyBzbTpwLTMuNSB0cmFuc2l0aW9uLWFsbCAke1xuICAgICAgICAgICAgICAgICAgICAgIGNhbkNyYWZ0IFxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnYm9yZGVyLWFtYmVyLTQwMC85MCBzaGFkb3ctWzBfMF8xNXB4X3JnYmEoMjQ1LDE1OCwxMSwwLjIpXSBiZy1ncmFkaWVudC10by1iciBmcm9tLXNsYXRlLTkwMCB2aWEtc2xhdGUtOTAwIHRvLWFtYmVyLTk1MC8yMCcgXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICdib3JkZXItc2xhdGUtODAwIG9wYWNpdHktOTAnXG4gICAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtc3RhcnQganVzdGlmeS1iZXR3ZWVuIGdhcC0yIGJvcmRlci1iIGJvcmRlci1zbGF0ZS04MDAvODAgcGItMiBtYi0yLjUgZmxleC13cmFwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMi41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8SXRlbUljb24gaXRlbT17eyAuLi5tb2NrR2FtZUl0ZW0sIGlkOiByZWNpcGUuaWQgfX0gc2l6ZT17MzZ9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIGZsZXgtd3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkXCIgc3R5bGU9e3sgY29sb3I6IHJlY2lwZS5jb2xvciB9fT57cmVjaXBlLm5hbWV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGJnLXNsYXRlLTgwMCB0ZXh0LXNsYXRlLTMwMCBweC0xLjUgcHktMC41IHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtyZWNpcGUuY2F0ZWdvcnl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtyZWNpcGUuaXNEZWVwICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGJnLWluZGlnby05NTAgdGV4dC1pbmRpZ28tMzAwIGJvcmRlciBib3JkZXItaW5kaWdvLTcwMCBweC0xLjUgcHktMC41IHJvdW5kZWQgZm9udC1ib2xkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIPCfm6HvuI8g5Yi75Y2wOiB7cGxheWVyTmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LWFtYmVyLTMwMC85MCBmb250LWJvbGQgbXQtMC41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAg8J+TiiB7cmVjaXBlLnN0YXRzUHJldmlld31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9uQ3JhZnRJdGVtKSBvbkNyYWZ0SXRlbShyZWNpcGUuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshY2FuQ3JhZnQgfHwgaXNRdWVzdEFjdGl2ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBpeGVsLWJ0biB0ZXh0LXhzICFweS0xLjUgIXB4LTMuNSBmb250LWJvbGQgd2hpdGVzcGFjZS1ub3dyYXAgc2VsZi1jZW50ZXIgc206c2VsZi1zdGFydCAke1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5DcmFmdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gJyFiZy1hbWJlci02MDAgIXRleHQtd2hpdGUgIWJvcmRlci1hbWJlci0zMDAgaG92ZXI6IWJnLWFtYmVyLTUwMCBhY3RpdmU6c2NhbGUtOTUgYW5pbWF0ZS1wdWxzZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICdvcGFjaXR5LTQwICFiZy1zbGF0ZS04MDAgIXRleHQtc2xhdGUtNDAwICFib3JkZXItc2xhdGUtNzAwIGN1cnNvci1ub3QtYWxsb3dlZCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHtpc1F1ZXN0QWN0aXZlID8gJ/CflJIg44Kv44Ko44K544OI5LitJyA6IGNhbkNyYWZ0ID8gJ+KcqCDpjZvpgKDjgZnjgosnIDogJ+e0oOadkOS4jei2syd9XG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIHRleHQtc2xhdGUtNDAwIG1iLTIgbGVhZGluZy1yZWxheGVkXCI+XG4gICAgICAgICAgICAgICAgICAgICAge3JlY2lwZS5kZXNjfVxuICAgICAgICAgICAgICAgICAgICA8L3A+XG5cbiAgICAgICAgICAgICAgICAgICAgey8qIOW/heimgee0oOadkOODquOCueODiCAqL31cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS05NTAvODAgcC0yLjUgcm91bmRlZCBib3JkZXIgYm9yZGVyLXNsYXRlLTgwMC84MFwiPlxuICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1ib2xkIHRleHQtc2xhdGUtNDAwIG1iLTEuNSBmbGV4IGp1c3RpZnktYmV0d2VlbiBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPvCfk4sg5b+F6KaB57Sg5p2QPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAge2NhbkNyYWZ0ICYmIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtZW1lcmFsZC00MDAgZm9udC1ib2xkXCI+4pyFIOOCr+ODqeODleODiOWPr+iDveOBp+OBmTwvc3Bhbj59XG4gICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtd3JhcCBnYXAtMS41XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7cmVjaXBlLm1hdGVyaWFscy5tYXAobWF0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudCA9IG1hdENvdW50c1ttYXQuaWRdIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhdGlzZmllZCA9IGN1cnJlbnQgPj0gbWF0LmNvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e21hdC5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHRleHQtWzEwcHhdIHNtOnRleHQtWzExcHhdIHB4LTIgcHktMC41IHJvdW5kZWQgYm9yZGVyIGZsZXggaXRlbXMtY2VudGVyIGdhcC0xICR7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhdGlzZmllZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JnLWVtZXJhbGQtOTUwLzgwIHRleHQtZW1lcmFsZC0zMDAgYm9yZGVyLWVtZXJhbGQtNzAwIGZvbnQtYm9sZCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICdiZy1yb3NlLTk1MC80MCB0ZXh0LXJvc2UtMzAwIGJvcmRlci1yb3NlLTgwMC82MCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPntJVEVNU1ttYXQuaWRdPy5uYW1lIHx8IG1hdC5uYW1lfTo8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e3NhdGlzZmllZCA/ICd0ZXh0LWVtZXJhbGQtMjAwIGZvbnQtYmxhY2snIDogJ3RleHQtcm9zZS00MDAgZm9udC1ibGFjayd9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y3VycmVudH0ve21hdC5jb3VudH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pKCl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IHRhYiA9PT0gJ21hdGVyaWFscycgPyAoXG4gICAgICAgIDxkaXY+XG4gICAgICAgICAge3JlbmRlckJhdGNoU2VsbFRvb2xiYXIoKX1cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTMgYmctc2xhdGUtOTUwIHAtMi41IHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgZmxleCBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIHRleHQteHNcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFwiPvCfko4g57Sg5p2Q44O75a6d566x44O75raI6LK744Ki44Kk44OG44Og5LiA6KanPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbGF0ZS00MDBcIj7miYDmjIHmlbA6IHtub25FcXVpcEl0ZW1zLmxlbmd0aH0g5YCLPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMiBnYXAtM1wiPlxuICAgICAgICAgICAge25vbkVxdWlwSXRlbXMubGVuZ3RoID4gMCA/IG5vbkVxdWlwSXRlbXMubWFwKGl0ZW0gPT4gcmVuZGVyTWF0ZXJpYWxDYXJkKGl0ZW0pKSA6IDxkaXYgY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTUwMCBwLTQgdGV4dC1jZW50ZXIgY29sLXNwYW4tMlwiPue0oOadkOOChOWuneeuseOCkuaMgeOBo+OBpuOBhOOBvuOBm+OCk+OAgumbhuS4reOCr+OCqOOCueODiOOCkuWujOmBguOBl+OBpuODouODs+OCueOCv+ODvOOCkuiojuS8kOOBl+OAgeWuneeuseOChOe0oOadkOOCkueNsuW+l+OBl+OBvuOBl+OCh+OBhu+8gTwvZGl2Pn1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogdGFiID09PSAnZGFpbHlTaG9wJyA/IChcbiAgICAgICAgPGRpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1iLTQgdGV4dC14cyBsZWFkaW5nLXJlbGF4ZWQgdGV4dC1wdXJwbGUtMjAwIGJnLXB1cnBsZS05NTAvODAgcC0zIGJvcmRlci0yIGJvcmRlci1wdXJwbGUtNzAwLzgwIHJvdW5kZWQgc2hhZG93LW1kXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlbiBtYi0xIGZsZXgtd3JhcCBnYXAtMVwiPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXB1cnBsZS0zMDAgZm9udC1ib2xkIHRleHQtc21cIj7wn5OFIOacrOaXpeOBrumXh+W4guODu+mZkOWumuaXpeabv+OCj+OCiuOCt+ODp+ODg+ODlzwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gdGV4dC1wdXJwbGUtNDAwIGZvbnQtbW9ubyBiZy1wdXJwbGUtOTAwLzYwIHB4LTIgcHktMC41IHJvdW5kZWQgYm9yZGVyIGJvcmRlci1wdXJwbGUtNzAwXCI+44CQ5pel5LuY6YCj5YuV5pu05paw44CRPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVsxMXB4XSB0ZXh0LXB1cnBsZS0zMDAvOTAgbWItMlwiPlxuICAgICAgICAgICAgICDmr47ml6XmlrDjgZfjgYTllYblk4HjgYzlhaXojbfvvIHpqZrnlbDnmoTjgarog73lipvjgajlh7bmgqrjgarjg4fjg5Djg5XjgpLkvbXjgZvmjIHjgaQ8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXB1cnBsZS0zMDAgZm9udC1ib2xkXCI+44CQ8J+SgCDlkarjgo/jgozjgZ/oo4XlgpnjgJE8L3NwYW4+44KE44CB5Ymy5byV6ZmQ5a6a5ZOB44GM5Lim44Gz44G+44GZ44CCXG4gICAgICAgICAgICA8L3A+XG5cbiAgICAgICAgICAgIHsvKiBCdWxrIEJ1eSBEYWlseSBTaG9wIEJhbm5lciAqL31cbiAgICAgICAgICAgIHsoKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVJdGVtcyA9IGRhaWx5SXRlbXMuZmlsdGVyKGl0ZW0gPT4gIXNvbGRPdXREYWlseUl0ZW1JZHMuaW5jbHVkZXMoaXRlbS5zaG9wSXRlbUlkKSk7XG4gICAgICAgICAgICAgIGNvbnN0IHNob3BEaXNjb3VudE11bHQgPSBnZXRTaG9wRGlzY291bnRNdWx0aXBsaWVyKGpvYik7XG4gICAgICAgICAgICAgIGNvbnN0IHRvdGFsQnVsa0Nvc3QgPSBhdmFpbGFibGVJdGVtcy5yZWR1Y2UoKHN1bSwgaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbmFsUHJpY2UgPSBNYXRoLmZsb29yKGl0ZW0ucHJpY2UgKiBzaG9wRGlzY291bnRNdWx0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VtICsgZmluYWxQcmljZTtcbiAgICAgICAgICAgICAgfSwgMCk7XG5cbiAgICAgICAgICAgICAgaWYgKGF2YWlsYWJsZUl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXB1cnBsZS05MDAvNDAgcC0yIHJvdW5kZWQgYm9yZGVyIGJvcmRlci1wdXJwbGUtODAwIHRleHQtWzExcHhdIHRleHQtcHVycGxlLTMwMCB0ZXh0LWNlbnRlciBmb250LWJvbGRcIj5cbiAgICAgICAgICAgICAgICAgICAg4pyFIOacrOaXpeOBruaXpeabv+OCj+OCiuWVhuWTgeOBr+OBmeOBueOBpuWujOWjsuOBl+OBvuOBl+OBn++8geOBvuOBn+aYjuaXpeOBiui2iuOBl+OBj+OBoOOBleOBhOOAglxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYmctcHVycGxlLTkwMC82MCBwLTIuNSByb3VuZGVkIGJvcmRlciBib3JkZXItcHVycGxlLTUwMC84MCBmbGV4LXdyYXAgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidGV4dC1bMTFweF1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXB1cnBsZS0yMDAgZm9udC1ib2xkXCI+8J+bkiDmnKzml6Xjga7lhaXojbflk4Hjgb7jgajjgoHosrfjgYQ8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXNsYXRlLTMwMCB0ZXh0LVsxMHB4XVwiPlxuICAgICAgICAgICAgICAgICAgICAgIOacquizvOWFpSB7YXZhaWxhYmxlSXRlbXMubGVuZ3RofSDlk4HjgpLkuIDmi6zos7zlhaU6IDxzcGFuIGNsYXNzTmFtZT1cInRleHQtYW1iZXItMzAwIGZvbnQtYm9sZFwiPvCfqpkge3RvdGFsQnVsa0Nvc3QudG9Mb2NhbGVTdHJpbmcoKX0gRzwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAob25CYXRjaEJ1eURhaWx5SXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zV2l0aERpc2NvdW50ID0gYXZhaWxhYmxlSXRlbXMubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uaXRlbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpY2U6IE1hdGguZmxvb3IoaXRlbS5wcmljZSAqIHNob3BEaXNjb3VudE11bHQpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkJhdGNoQnV5RGFpbHlJdGVtcyhpdGVtc1dpdGhEaXNjb3VudCwgdG90YWxCdWxrQ29zdCk7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvbkJ1eURhaWx5SXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlSXRlbXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25CdXlEYWlseUl0ZW0oeyAuLi5pdGVtLCBwcmljZTogTWF0aC5mbG9vcihpdGVtLnByaWNlICogc2hvcERpc2NvdW50TXVsdCkgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtnb2xkIDwgdG90YWxCdWxrQ29zdCB8fCBpc1F1ZXN0QWN0aXZlfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwaXhlbC1idG4gdGV4dC14cyAhcHktMS41ICFweC0zLjUgIWJnLXB1cnBsZS04MDAgaG92ZXI6IWJnLXB1cnBsZS03MDAgIXRleHQtcHVycGxlLTEwMCAhYm9yZGVyLXB1cnBsZS0zMDAgZm9udC1ib2xkIGFjdGl2ZSBkaXNhYmxlZDpvcGFjaXR5LTQwIHNoYWRvdy1zbVwiXG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIOKaoSDmrovjgorlhah7YXZhaWxhYmxlSXRlbXMubGVuZ3RofeWTgeOCkuS4gOaLrOizvOWFpVxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KSgpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZCB0ZXh0LXB1cnBsZS0zMDAgbWItMyBib3JkZXItYiBib3JkZXItcHVycGxlLTkwMCBwYi0xIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktYmV0d2VlblwiPlxuICAgICAgICAgICAgPHNwYW4+8J+SgCDml6Xmm7/jgo/jgorpmZDlrprjgqLjgqTjg4bjg6AgKHt0b2RheVN0cn0pPC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC14cyB0ZXh0LXNsYXRlLTQwMCBmb250LW5vcm1hbFwiPuWFqDXlk4E8L3NwYW4+XG4gICAgICAgICAgPC9oMz5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgbWQ6Z3JpZC1jb2xzLTIgZ2FwLTNcIj5cbiAgICAgICAgICAgIHtkYWlseUl0ZW1zLm1hcChpdGVtID0+IHJlbmRlckRhaWx5U2hvcENhcmQoaXRlbSkpfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiAoXG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtc20gZm9udC1ib2xkIHRleHQtYW1iZXItMzAwIG1iLTMgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCBwYi0xXCI+4pyoIOaWsOOBl+OBhOODmeODvOOCueijheWCmeWTgTwvaDM+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIG1kOmdyaWQtY29scy0yIGdhcC0zXCI+XG4gICAgICAgICAgICB7c2hvcEl0ZW1zLm1hcChpdGVtID0+IHJlbmRlclNob3BDYXJkKGl0ZW0pKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICB7cmVuZGVyRGV0YWlsTW9kYWwoKX1cblxuICAgICAge3RyYW5zZmVyU2Nyb2xsVWlkICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotNTAgYmctc2xhdGUtOTUwLzgwIGJhY2tkcm9wLWJsdXItc20gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwaXhlbC1wYW5lbCBtYXgtdy1tZCB3LWZ1bGwgYmctc2xhdGUtOTAwIGJvcmRlci0yIGJvcmRlci1wdXJwbGUtNTAwIHAtNSByZWxhdGl2ZSB0ZXh0LXNsYXRlLTEwMCBzaGFkb3ctWzBfMF8yNXB4X3JnYmEoMTY4LDg1LDI0NywwLjMpXVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0zIHBiLTIgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCB0ZXh0LXB1cnBsZS00MDAgZm9udC1ib2xkXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteGxcIj7wn5OcPC9zcGFuPlxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGRcIj7lvLfljJbjga7ntpnmib88L2gzPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtMjAwIG1iLTMgbGVhZGluZy1yZWxheGVkXCI+XG4gICAgICAgICAgICAgIOaKveWHuuWFg++8iOWkseOCj+OCjOOCi++8ieOBqOe2meaJv+WFiO+8iOW8t+WMluOBleOCjOOCi++8ieOBruijheWCmeOCkumBuOaKnuOBl+OBpuOBj+OBoOOBleOBhOOAgjxici8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcm9zZS00MDBcIj7igLvlkIzjgZjnqK7poZ7vvIjmrablmajlkIzlo6vjgIHpmLLlhbflkIzlo6vvvInjga7jgb/ntpnmib/lj6/og73jgafjgZnjgII8L3NwYW4+XG4gICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0zIG1iLTRcIj5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC1bMTBweF0gdGV4dC1wdXJwbGUtMzAwIG1iLTFcIj7mir3lh7rlhYPvvIjmtojmu4XjgZfjgb7jgZnvvIk6PC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8c2VsZWN0IFxuICAgICAgICAgICAgICAgICAgdmFsdWU9e3RyYW5zZmVyU291cmNlVWlkfVxuICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRyYW5zZmVyU291cmNlVWlkKGUudGFyZ2V0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VHJhbnNmZXJUYXJnZXRVaWQoJycpO1xuICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWlucHV0IHRleHQteHMgdy1mdWxsIHAtMiBiZy1zbGF0ZS05NTAgYm9yZGVyIGJvcmRlci1zbGF0ZS03MDAgdGV4dC1zbGF0ZS0yMDBcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJcIj7mir3lh7rlhYPjga7oo4XlgpnjgpLpgbjmip4uLi48L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgIHtvd25lZEl0ZW1zXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaSA9PiAoaS50eXBlID09PSAnd2VhcG9uJyB8fCBpLnR5cGUgPT09ICdhcm1vcicpICYmICFpbnZlbnRvcnkuZmluZChpbnYgPT4gaW52LnVpZCA9PT0gaS5pZCk/LmlzTG9ja2VkKVxuICAgICAgICAgICAgICAgICAgICAubWFwKGl0ZW0gPT4gKFxuICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24ga2V5PXtpdGVtLmlkfSB2YWx1ZT17aXRlbS5pZH0+XG4gICAgICAgICAgICAgICAgICAgICAgICB7aXRlbS50eXBlID09PSAnd2VhcG9uJyA/ICfimpTvuI8nIDogJ/Cfm6HvuI8nfSB7aXRlbS5uYW1lfVxuICAgICAgICAgICAgICAgICAgICAgIDwvb3B0aW9uPlxuICAgICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3NOYW1lPVwiYmxvY2sgdGV4dC1bMTBweF0gdGV4dC1za3ktMzAwIG1iLTFcIj7ntpnmib/lhYjvvIjkuIrmm7jjgY3jgZXjgozjgb7jgZnvvIk6PC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8c2VsZWN0IFxuICAgICAgICAgICAgICAgICAgdmFsdWU9e3RyYW5zZmVyVGFyZ2V0VWlkfVxuICAgICAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRUcmFuc2ZlclRhcmdldFVpZChlLnRhcmdldC52YWx1ZSl9XG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17IXRyYW5zZmVyU291cmNlVWlkfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtaW5wdXQgdGV4dC14cyB3LWZ1bGwgcC0yIGJnLXNsYXRlLTk1MCBib3JkZXIgYm9yZGVyLXNsYXRlLTcwMCB0ZXh0LXNsYXRlLTIwMCBkaXNhYmxlZDpvcGFjaXR5LTUwXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+57aZ5om/5YWI44Gu6KOF5YKZ44KS6YG45oqeLi4uPC9vcHRpb24+XG4gICAgICAgICAgICAgICAgICB7KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc291cmNlSXRlbSA9IG93bmVkSXRlbXMuZmluZChpID0+IGkuaWQgPT09IHRyYW5zZmVyU291cmNlVWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzb3VyY2VJdGVtKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG93bmVkSXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGkgPT4gaS50eXBlID09PSBzb3VyY2VJdGVtLnR5cGUgJiYgaS5pZCAhPT0gdHJhbnNmZXJTb3VyY2VVaWQgJiYgIWludmVudG9yeS5maW5kKGludiA9PiBpbnYudWlkID09PSBpLmlkKT8uaXNMb2NrZWQpXG4gICAgICAgICAgICAgICAgICAgICAgLm1hcChpdGVtID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24ga2V5PXtpdGVtLmlkfSB2YWx1ZT17aXRlbS5pZH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLnR5cGUgPT09ICd3ZWFwb24nID8gJ+KalO+4jycgOiAn8J+boe+4jyd9IHtpdGVtLm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cbiAgICAgICAgICAgICAgICAgICAgICApKTtcbiAgICAgICAgICAgICAgICAgIH0pKCl9XG4gICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKG9uVHJhbnNmZXJFbmhhbmNlbWVudHMgJiYgdHJhbnNmZXJTb3VyY2VVaWQgJiYgdHJhbnNmZXJUYXJnZXRVaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgb25UcmFuc2ZlckVuaGFuY2VtZW50cyh0cmFuc2ZlclNvdXJjZVVpZCwgdHJhbnNmZXJUYXJnZXRVaWQsIHRyYW5zZmVyU2Nyb2xsVWlkKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHNldFRyYW5zZmVyU2Nyb2xsVWlkKG51bGwpO1xuICAgICAgICAgICAgICAgICAgc2V0VHJhbnNmZXJTb3VyY2VVaWQoJycpO1xuICAgICAgICAgICAgICAgICAgc2V0VHJhbnNmZXJUYXJnZXRVaWQoJycpO1xuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9eyF0cmFuc2ZlclNvdXJjZVVpZCB8fCAhdHJhbnNmZXJUYXJnZXRVaWR9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICFiZy1wdXJwbGUtOTAwICF0ZXh0LXB1cnBsZS0xMDAgIWJvcmRlci1wdXJwbGUtNTAwIGFjdGl2ZSBkaXNhYmxlZDpvcGFjaXR5LTQwXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIOe2meaJv+OCkuWun+ihjOOBmeOCi1xuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgIHNldFRyYW5zZmVyU2Nyb2xsVWlkKG51bGwpO1xuICAgICAgICAgICAgICAgICAgc2V0VHJhbnNmZXJTb3VyY2VVaWQoJycpO1xuICAgICAgICAgICAgICAgICAgc2V0VHJhbnNmZXJUYXJnZXRVaWQoJycpO1xuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQteHMgZmxleC0xICFiZy1zbGF0ZS04MDAgIXRleHQtc2xhdGUtMzAwICFib3JkZXItc2xhdGUtNjAwIGFjdGl2ZVwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDjgq3jg6Pjg7Pjgrvjg6tcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuXG4gICAgICB7ZGlzbWFudGxlQ29uZmlybUl0ZW0gJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZpeGVkIGluc2V0LTAgei01MCBiZy1zbGF0ZS05NTAvODAgYmFja2Ryb3AtYmx1ci1zbSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBwLTRcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBpeGVsLXBhbmVsIG1heC13LXNtIHctZnVsbCBiZy1zbGF0ZS05MDAgYm9yZGVyLTIgYm9yZGVyLXJvc2UtNTAwIHAtNSByZWxhdGl2ZSB0ZXh0LXNsYXRlLTEwMCBzaGFkb3ctWzBfMF8yNXB4X3JnYmEoMjQ0LDYzLDk0LDAuMyldXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTMgcGItMiBib3JkZXItYiBib3JkZXItc2xhdGUtODAwIHRleHQtcm9zZS00MDAgZm9udC1ib2xkXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteGxcIj7wn5SoPC9zcGFuPlxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwidGV4dC1zbSBmb250LWJvbGRcIj7oo4Xlgpnjga7liIbop6Pnorroqo08L2gzPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtMjAwIG1iLTMgbGVhZGluZy1yZWxheGVkXCI+XG4gICAgICAgICAgICAgIOOAjDxzcGFuIGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LWFtYmVyLTMwMFwiPntkaXNtYW50bGVDb25maXJtSXRlbS5nYW1lSXRlbS5uYW1lfTwvc3Bhbj7jgI3jgpLliIbop6PjgZfjgabntKDmnZDjgavjgZfjgb7jgZnjgYvvvJ9cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtMi41IHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgdGV4dC1bMTFweF0gdGV4dC1zbGF0ZS00MDAgbWItNCBzcGFjZS15LTFcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LWFtYmVyLTQwMCBmb250LWJvbGRcIj7imqDvuI8g5rOo5oSP5LqL6aCFOjwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2PuODu+OBk+OBruijheWCmeWTgeOBr+WkseOCj+OCjOOBvuOBmeOAgjwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2PuODu+W8t+WMluWApOOChOS4iumZkOeqgeegtOaVsOOBq+W/nOOBmOOBn+ODqeODs+ODgOODoOe0oOadkOOCkueNsuW+l+OBp+OBjeOBvuOBmeOAgjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTJcIj5cbiAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChvbkRpc21hbnRsZUl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgb25EaXNtYW50bGVJdGVtKGRpc21hbnRsZUNvbmZpcm1JdGVtLml0ZW0udWlkKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHNldERpc21hbnRsZUNvbmZpcm1JdGVtKG51bGwpO1xuICAgICAgICAgICAgICAgICAgc2V0RGV0YWlsUGxheWVySXRlbShudWxsKTtcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LXhzIHB5LTIgZmxleC0xICFib3JkZXItcm9zZS01MDAgIWJnLXJvc2UtOTUwIGhvdmVyOiFiZy1yb3NlLTkwMCAhdGV4dC1yb3NlLTIwMCBhY3RpdmUgZm9udC1ib2xkXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIPCflKgg5YiG6Kej44KS5a6f6KGM44GZ44KLXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0RGlzbWFudGxlQ29uZmlybUl0ZW0obnVsbCl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicGl4ZWwtYnRuIHRleHQteHMgcHktMiBweC0zICFiZy1zbGF0ZS04MDAgIXRleHQtc2xhdGUtMzAwICFib3JkZXItc2xhdGUtNjAwXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIOOCreODo+ODs+OCu+ODq1xuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgICB7dW5jdXJzZUNvbmZpcm1JdGVtICYmIChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotNTAgYmctc2xhdGUtOTUwLzgwIGJhY2tkcm9wLWJsdXItc20gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwaXhlbC1wYW5lbCBtYXgtdy1zbSB3LWZ1bGwgYmctc2xhdGUtOTAwIGJvcmRlci0yIGJvcmRlci1wdXJwbGUtNTAwIHAtNSByZWxhdGl2ZSB0ZXh0LXNsYXRlLTEwMCBzaGFkb3ctWzBfMF8yNXB4X3JnYmEoMTY4LDg1LDI0NywwLjQpXVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBtYi0zIHBiLTIgYm9yZGVyLWIgYm9yZGVyLXNsYXRlLTgwMCB0ZXh0LXB1cnBsZS00MDAgZm9udC1ib2xkXCI+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteGxcIj7inJ3vuI88L3NwYW4+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtYm9sZFwiPuijheWCmeOBruino+WRqu+8iOWRquOBhOino+mZpO+8ieeiuuiqjTwvaDM+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQteHMgdGV4dC1zbGF0ZS0yMDAgbWItMyBsZWFkaW5nLXJlbGF4ZWRcIj5cbiAgICAgICAgICAgICAg44CMPHNwYW4gY2xhc3NOYW1lPVwiZm9udC1ib2xkIHRleHQtYW1iZXItMzAwXCI+e3VuY3Vyc2VDb25maXJtSXRlbS5nYW1lSXRlbS5uYW1lfTwvc3Bhbj7jgI3jga7lkarjgYTjgpLop6PpmaTvvIjop6PlkarvvInjgZfjgb7jgZnjgYvvvJ9cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctc2xhdGUtOTUwIHAtMi41IHJvdW5kZWQgYm9yZGVyIGJvcmRlci1zbGF0ZS04MDAgdGV4dC1bMTFweF0gdGV4dC1zbGF0ZS0zMDAgbWItNCBzcGFjZS15LTFcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ0ZXh0LXB1cnBsZS0zMDAgZm9udC1ib2xkXCI+4pyoIOino+WRquOBruWKueaenDo8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdj7jg7vmr47np5JIUOODieODrOOCpOODs+OChOeNsuW+l+mHj+S9juS4i+OBquOBqeOBruWRquOBhOOBjOWFqOOBpua2iOa7heOBl+OBvuOBmeOAgjwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2PuODu+WuieWFqOOBq+ijheWCmeOBp+OBjeOAgeWfuuacrOW8t+WMluODu+mZkOeVjOeqgeegtOODu+eJueauiuW8t+WMluOBjOiHqueUseOBq+WPr+iDveOBq+OBquOCiuOBvuOBme+8gTwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB0LTEgdGV4dC1hbWJlci0zMDAgZm9udC1ib2xkXCI+5b+F6KaB6LK755SoOiDwn6qZIHt1bmN1cnNlQ29uZmlybUl0ZW0uY29zdC50b0xvY2FsZVN0cmluZygpfSBHPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMlwiPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKG9uVW5jdXJzZUl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgb25VbmN1cnNlSXRlbSh1bmN1cnNlQ29uZmlybUl0ZW0uaXRlbS51aWQsIHVuY3Vyc2VDb25maXJtSXRlbS5jb3N0KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHNldFVuY3Vyc2VDb25maXJtSXRlbShudWxsKTtcbiAgICAgICAgICAgICAgICAgIHNldERldGFpbFBsYXllckl0ZW0obnVsbCk7XG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17Z29sZCA8IHVuY3Vyc2VDb25maXJtSXRlbS5jb3N0fVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LXhzIHB5LTIgZmxleC0xICFib3JkZXItcHVycGxlLTQwMCAhYmctcHVycGxlLTkwMCBob3ZlcjohYmctcHVycGxlLTgwMCAhdGV4dC1wdXJwbGUtMTAwIGFjdGl2ZSBmb250LWJvbGQgZGlzYWJsZWQ6b3BhY2l0eS00MFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDinJ3vuI8g6Kej5ZGq44KS5a6f6KGM44GZ44KLXG4gICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VW5jdXJzZUNvbmZpcm1JdGVtKG51bGwpfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBpeGVsLWJ0biB0ZXh0LXhzIHB5LTIgcHgtMyAhYmctc2xhdGUtODAwICF0ZXh0LXNsYXRlLTMwMCAhYm9yZGVyLXNsYXRlLTYwMFwiXG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICDjgq3jg6Pjg7Pjgrvjg6tcbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApfVxuICAgIDwvZGl2PlxuICApO1xufVxuIl0sIm1hcHBpbmdzIjoiQUE0R00sU0FtZ0JjLFVBbmdCZDtBQTVHTixPQUFPLFNBQVMsVUFBVSxXQUFXLFFBQVEsZUFBZTtBQUU1RCxTQUFTLE9BQU8sNEJBQTRCO0FBQzVDLFNBQVMsZ0JBQWdCLGVBQWUsc0JBQXNCO0FBQzlEO0FBQUEsRUFDRTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLE9BQ0s7QUFDUCxTQUFTLHdCQUF3QiwwQkFBeUM7QUFDMUUsU0FBUyxpQ0FBaUM7QUFPMUMsTUFBTSxZQUFZLG9CQUFJLElBQW9CO0FBRTFDLE1BQU0sa0JBQWtCLENBQUMsU0FBaUQ7QUFDeEUsU0FBTyxHQUFHLEtBQUssSUFBSSxJQUFJLEtBQUssVUFBVSxLQUFLLEVBQUUsSUFBSSxLQUFLLFNBQVMsRUFBRSxJQUFJLEtBQUssUUFBUSxFQUFFO0FBQ3RGO0FBRU8sYUFBTSxXQUFvQyxNQUFNLEtBQUssQ0FBQyxFQUFFLE1BQU0sT0FBTyxHQUFHLE1BQU07QUFDbkYsUUFBTSxZQUFZLE9BQTBCLElBQUk7QUFDaEQsUUFBTSxXQUFXLGdCQUFnQixJQUFJO0FBQ3JDLFFBQU0sWUFBWSxVQUFVLElBQUksUUFBUTtBQUV4QyxZQUFVLE1BQU07QUFDZCxRQUFJLFVBQVc7QUFFZixVQUFNLFNBQVMsVUFBVTtBQUN6QixRQUFJLENBQUMsT0FBUTtBQUNiLFVBQU0sTUFBTSxPQUFPLFdBQVcsTUFBTSxFQUFFLE9BQU8sS0FBSyxDQUFDO0FBQ25ELFFBQUksQ0FBQyxJQUFLO0FB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
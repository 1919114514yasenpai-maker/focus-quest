import React, { useState, useEffect, useRef } from 'react';
import { HeroCanvas } from './components/HeroCanvas';
import { Inventory } from './components/Inventory';
import { Settings } from './components/Settings';
import { ChestModal } from './components/ChestModal';
import { StageSelectModal } from './components/StageSelectModal';
import { JobSelectModal } from './components/JobSelectModal';
import { GuildRanking } from './components/GuildRanking';
import { AuctionHouse } from './components/AuctionHouse';
import { PlayerStats, EquipmentState, SaveData, Monster, PlayerItem, ChestReward, JobType } from './types';
import { INITIAL_INVENTORY, ITEMS, getNextLevelXp, getMonsterForStage, generateUid } from './gameData';
import { getCompiledItem } from './itemUtils';
import { generateChestReward, getChestForFocusMinutes } from './chestUtils';
import { loadSaveDataFromLocalStorage, sanitizeSaveData, CURRENT_SAVE_KEY } from './saveManager';
import { JOBS } from './jobData';
import { 
  getMaterialBonusCount, 
  getXpBonusMultiplier, 
  getGoldBonusMultiplier, 
  getAppraiserPowerBonus,
  isJobUnlocked,
  canChangeJobNow,
  getNextJobChangeLevel
} from './jobUtils';
import { useCloudSave } from './useCloudSave';
import { db, auth, getAccessToken } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { getTaskLists, getTasks, createTask, completeTask, GoogleTask, TaskList } from './tasksApi';
import { CustomGem } from './components/CustomGem';
import { FlashcardsModal } from './components/FlashcardsModal';

import { DailyShopItem } from './dailyShopUtils';

export default function App() {
  const [focusMinutes, setFocusMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('focus_quest_focus_mins');
    return saved ? Math.max(1, parseInt(saved, 10) || 25) : 25;
  });
  const [breakMinutes, setBreakMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('focus_quest_break_mins');
    return saved ? Math.max(1, parseInt(saved, 10) || 5) : 5;
  });

  const [timerMode, setTimerMode] = useState<'idle' | 'focus' | 'break'>('idle');
  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60);
  const [isAsleep, setIsAsleep] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showGuildRanking, setShowGuildRanking] = useState(false);
  const [showAuctionHouse, setShowAuctionHouse] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [authPromptFeature, setAuthPromptFeature] = useState<'guild' | 'auction' | null>(null);
  const [myGuildName, setMyGuildName] = useState<string | undefined>();
  const [isJobMilestoneTrigger, setIsJobMilestoneTrigger] = useState(false);

  const [focusAnimationsEnabled, setFocusAnimationsEnabled] = useState<boolean>(() => localStorage.getItem('focus_quest_anim') !== 'false');
  const [keepScreenAwake, setKeepScreenAwake] = useState<boolean>(() => localStorage.getItem('focus_quest_awake') !== 'false');
  const [currentTaskText, setCurrentTaskText] = useState<string>('');
  
  // Google Tasks State
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');
  const [googleTasks, setGoogleTasks] = useState<GoogleTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  
  const [pendingChestReward, setPendingChestReward] = useState<ChestReward | null>(null);
  const [pendingChestFocusMins, setPendingChestFocusMins] = useState<number | undefined>(undefined);
  const [deathNotice, setDeathNotice] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (deathNotice) {
      const timer = setTimeout(() => {
        setDeathNotice(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [deathNotice]);

  const [soldOutDailyItems, setSoldOutDailyItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('focus_quest_daily_soldout');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('focus_quest_daily_soldout', JSON.stringify(soldOutDailyItems));
    } catch (e) {}
  }, [soldOutDailyItems]);

  const [stats, setStats] = useState<PlayerStats>({
    level: 1,
    xp: 0,
    gold: 50,
    hp: 100,
    maxHp: 100,
    stage: 1,
    maxStageReached: 1,
  });

  const [equipment, setEquipment] = useState<EquipmentState>({
    statWeaponId: 'initial_w',
    appearanceWeaponId: 'w_wood_sword',
    statArmorId: 'initial_a',
    appearanceArmorId: 'a_cloth',
  });

  const [inventory, setInventory] = useState<PlayerItem[]>(INITIAL_INVENTORY);
  const [currentMonster, setCurrentMonster] = useState<Monster>(() => getMonsterForStage(1));

  useEffect(() => {
    const loadedData = loadSaveDataFromLocalStorage();
    if (loadedData) {
      setStats(loadedData.stats);
      setEquipment(loadedData.equipment);
      setInventory(loadedData.inventory);
      setCurrentMonster(getMonsterForStage(loadedData.stats.stage));
    }
  }, []);

  const handleCloudDataLoaded = (cloudData: SaveData) => {
    setStats(cloudData.stats);
    setEquipment(cloudData.equipment);
    setInventory(cloudData.inventory);
    setCurrentMonster(getMonsterForStage(cloudData.stats.stage));
    showToast('☁️ クラウドセーブデータを同期しました！');
  };

  const {
    user,
    isLoggingIn,
    syncing,
    lastSyncedAt,
    syncError,
    clearSyncError,
    saveToCloud,
    loadFromCloud,
    handleLogin,
    handleLogout,
  } = useCloudSave({ stats, equipment, inventory }, handleCloudDataLoaded);

  const latestSaveDataRef = useRef<SaveData>({ stats, equipment, inventory });
  useEffect(() => {
    latestSaveDataRef.current = { stats, equipment, inventory };
  }, [stats, equipment, inventory]);

  // ローカル保存は状態変化ごとに即時実行（データ消失防止）
  useEffect(() => {
    const data: SaveData = { stats, equipment, inventory };
    localStorage.setItem(CURRENT_SAVE_KEY, JSON.stringify(data));
  }, [stats, equipment, inventory]);

  // クラウド同期はチカチカ防止のため「5分おき」に定期実行
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      saveToCloud(latestSaveDataRef.current);
    }, 5 * 60 * 1000); // 5分ごと

    return () => clearInterval(interval);
  }, [user, saveToCloud]);

  // Load Google Tasks lists on auth
  useEffect(() => {
    if (user && getAccessToken()) {
      setIsTasksLoading(true);
      getTaskLists().then(lists => {
        setTaskLists(lists);
        if (lists.length > 0) {
          setSelectedTaskListId(lists[0].id);
        }
        setIsTasksLoading(false);
      });
    } else {
      setTaskLists([]);
      setGoogleTasks([]);
      setSelectedTaskListId('');
      setSelectedTaskId('');
    }
  }, [user]);

  // Load Google Tasks when a list is selected
  useEffect(() => {
    if (selectedTaskListId && getAccessToken()) {
      setIsTasksLoading(true);
      getTasks(selectedTaskListId).then(tasks => {
        setGoogleTasks(tasks);
        setIsTasksLoading(false);
      });
    } else {
      setGoogleTasks([]);
    }
  }, [selectedTaskListId]);

  // WakeLock & BeforeUnload (集中中の機能)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (timerMode === 'focus') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      const requestWakeLock = async () => {
        if (keepScreenAwake && 'wakeLock' in navigator) {
          try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
          } catch (err) {
            console.warn('Wake Lock request failed:', err);
          }
        }
      };
      requestWakeLock();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && keepScreenAwake) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (wakeLockRef.current) {
          wakeLockRef.current.release().catch(console.warn);
          wakeLockRef.current = null;
        }
      };
    }
  }, [timerMode, keepScreenAwake]);

  const statArmorItem = getCompiledItem(inventory.find(i => i.uid === equipment.statArmorId), stats.hasCurseImmunity);
  const statWeaponItem = getCompiledItem(inventory.find(i => i.uid === equipment.statWeaponId), stats.hasCurseImmunity);

  const maxHpBonus = statArmorItem?.effect?.maxHpBonus || 0;
  const calculatedMaxHp = 100 + (stats.level - 1) * 25 + maxHpBonus;

  useEffect(() => {
    // インベントリが存在し、装備防具アイテムがまだ検索できていない初期化タイミングではステータス削りを防ぐ
    if (inventory.length > 0 && !statArmorItem) return;

    setStats(prev => {
      const newMaxHp = calculatedMaxHp;
      if (prev.maxHp === newMaxHp && prev.hp <= newMaxHp) return prev;
      return {
        ...prev,
        maxHp: newMaxHp,
        hp: Math.min(prev.hp, newMaxHp),
      };
    });
  }, [calculatedMaxHp, statArmorItem, inventory.length]);

  useEffect(() => {
    // 待機中 (idle) や 休憩中 (break) はキャンプ休息のため急速自然回復 (最大HPの10%/秒 または 30/秒)
    // クエスト中 (focus) は 基礎回復 (5 + Lv依存) + 装備回復 - 呪い自傷
    const isResting = timerMode === 'idle' || timerMode === 'break';
    const baseRegen = isResting 
      ? Math.max(30, Math.floor(stats.maxHp * 0.1)) 
      : 5 + Math.floor(stats.level / 5) + (statArmorItem?.effect?.hpRegen || 1) + (statWeaponItem?.effect?.hpRegen || 0);

    // 呪い自傷ダメージはクエスト中のみ発生 (拠点待機中は安全)
    const totalCurseHpDrain = isResting 
      ? 0 
      : (statWeaponItem?.effect?.curseHpDrain || 0) + (statArmorItem?.effect?.curseHpDrain || 0);

    const netHpChange = baseRegen - totalCurseHpDrain;

    const interval = setInterval(() => {
      setStats(prev => {
        const nextHp = Math.min(prev.maxHp, prev.hp + netHpChange);
        if (nextHp <= 0) {
          const prevStage = Math.max(1, prev.stage - 1);
          setCurrentMonster(getMonsterForStage(prevStage));
          setDeathNotice(`💀 呪いのダメージで力尽きました！HPが全回復し、1階層前の Stage ${prevStage} に戻りました。`);
          return {
            ...prev,
            hp: prev.maxHp,
            stage: prevStage,
          };
        }
        if (nextHp === prev.hp) return prev;
        return {
          ...prev,
          hp: nextHp,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    timerMode, 
    stats.maxHp, 
    stats.level, 
    statArmorItem?.effect?.hpRegen, 
    statWeaponItem?.effect?.hpRegen, 
    statArmorItem?.effect?.curseHpDrain, 
    statWeaponItem?.effect?.curseHpDrain
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timerMode !== 'idle' && !isAsleep) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerMode, isAsleep]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsAsleep(true);
      } else {
        setIsAsleep(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const updateWeeklyFocusTime = async (minutes: number) => {
    if (!auth.currentUser) return;
    const currentWeekId = `2026-W${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.weekId !== currentWeekId) {
          await updateDoc(userRef, {
            weekId: currentWeekId,
            weeklyFocusTime: minutes,
            totalFocusTime: increment(minutes)
          });
          if (data.guildId) {
            const guildRef = doc(db, "guilds", data.guildId);
            const guildSnap = await getDoc(guildRef);
            if (guildSnap.exists()) {
              if (guildSnap.data().weekId !== currentWeekId) {
                await updateDoc(guildRef, { weekId: currentWeekId, weeklyFocusTime: minutes });
              } else {
                await updateDoc(guildRef, { weeklyFocusTime: increment(minutes) });
              }
            }
          }
        } else {
          await updateDoc(userRef, { 
            weeklyFocusTime: increment(minutes),
            totalFocusTime: increment(minutes)
          });
          if (data.guildId) {
            const guildRef = doc(db, "guilds", data.guildId);
            const guildSnap = await getDoc(guildRef);
            if (guildSnap.exists()) {
              if (guildSnap.data().weekId !== currentWeekId) {
                await updateDoc(guildRef, { weekId: currentWeekId, weeklyFocusTime: minutes });
              } else {
                await updateDoc(guildRef, { weeklyFocusTime: increment(minutes) });
              }
            }
          }
        }
      } else {
        await setDoc(userRef, {
          displayName: auth.currentUser.displayName || "名無し勇者",
          weeklyFocusTime: minutes,
          totalFocusTime: minutes,
          weekId: currentWeekId,
          guildId: ""
        });
      }
    } catch (e) {
      console.error("Failed to update weekly focus time", e);
    }
  };

  const handleTimerComplete = () => {
    if (timerMode === 'focus') {
      const chestId = getChestForFocusMinutes(focusMinutes);
      const chestItem = ITEMS[chestId];
      const newChestItem: PlayerItem = {
        uid: generateUid(),
        baseId: chestId,
        upgradeLevel: 0,
        addedPower: 0,
      };

      setInventory(prev => [...prev, newChestItem]);
      updateWeeklyFocusTime(focusMinutes);
      const taskMsg = currentTaskText ? `タスク「${currentTaskText}」完了！` : '集中達成！';
      showToast(`🎁 ${taskMsg}「${chestItem?.name || '宝箱'}」を素材欄に獲得しました！（素材欄からいつでも開封できます）`);
      
      // Update Google Tasks
      if (user && getAccessToken() && currentTaskText && selectedTaskListId) {
        if (selectedTaskId) {
          completeTask(selectedTaskListId, selectedTaskId).then(() => {
            setGoogleTasks(prev => prev.filter(t => t.id !== selectedTaskId));
          });
        } else {
          createTask(selectedTaskListId, currentTaskText).then(newTask => {
            if (newTask) {
              completeTask(selectedTaskListId, newTask.id);
            }
          });
        }
      }

      setCurrentTaskText('');
      setSelectedTaskId('');

      setStats(prev => ({ ...prev, hp: prev.maxHp }));
      setTimerMode('break');
      setTimeLeft(breakMinutes * 60);
    } else if (timerMode === 'break') {
      showToast('☕ 休憩時間が終了しました！次のクエストを開始しましょう。');
      setTimerMode('idle');
      setTimeLeft(focusMinutes * 60);
    }
  };

  const handleClaimChestReward = (reward: ChestReward) => {
    addXpAndGold(reward.xp, reward.gold);
    if (reward.items.length > 0) {
      setInventory(prev => [...prev, ...reward.items]);
    }
    setPendingChestReward(null);
    setPendingChestFocusMins(undefined);
  };

  const handleOpenChestItem = (itemOrUid: PlayerItem | string) => {
    const pItem = typeof itemOrUid === 'string' 
      ? inventory.find(i => i.uid === itemOrUid)
      : itemOrUid;
    if (!pItem) return;
    setInventory(prev => prev.filter(i => i.uid !== pItem.uid));
    const boxName = ITEMS[pItem.baseId]?.name || '宝箱';
    if (pItem.packedItems && pItem.packedItems.length > 0) {
      setPendingChestReward({
        chestName: boxName,
        gold: 0,
        xp: 0,
        items: pItem.packedItems,
      });
      setPendingChestFocusMins(undefined);
      showToast(`🎁 箱を開封し、中に入っていた ${pItem.packedItems.length} 個のアイテムを獲得しました！`);
      return;
    }
    const reward = generateChestReward(pItem.baseId, stats.stage, 25, stats.job || 'balanced');
    setPendingChestReward(reward);
    setPendingChestFocusMins(undefined);
  };

  const addXpAndGold = React.useCallback((gainedXp: number, gainedGold: number) => {
    const currentWeapon = getCompiledItem(
      inventory.find(i => i.uid === equipment.statWeaponId),
      stats.hasCurseImmunity
    );
    const currentArmor = getCompiledItem(
      inventory.find(i => i.uid === equipment.statArmorId),
      stats.hasCurseImmunity
    );

    const currentJob = stats.job || 'balanced';
    const creditScore = stats.creditScore || 100;
    const creditScoreBonus = creditScore >= 120 ? 0.1 : creditScore < 80 ? -0.1 : 0;
    
    const xpMult = Math.max(0.1, 1 + (currentWeapon?.effect?.xpBonus || 0) + (currentArmor?.effect?.xpBonus || 0) + getXpBonusMultiplier(currentJob) + creditScoreBonus);
    const goldMult = Math.max(0.1, 1 + (currentWeapon?.effect?.goldBonus || 0) + (currentArmor?.effect?.goldBonus || 0) + getGoldBonusMultiplier(currentJob) + creditScoreBonus);

    const finalXp = Math.max(1, Math.floor(gainedXp * xpMult));
    const finalGold = Math.max(1, Math.floor(gainedGold * goldMult));

    let reachedMilestoneLevel = 0;

    setStats(prev => {
      let newXp = prev.xp + finalXp;
      let newLevel = prev.level;
      let nextLevelXp = getNextLevelXp(newLevel);

      while (newXp >= nextLevelXp) {
        newXp -= nextLevelXp;
        newLevel += 1;
        if (newLevel === 100 || (newLevel > 100 && newLevel % 500 === 0)) {
          reachedMilestoneLevel = newLevel;
        }
        nextLevelXp = getNextLevelXp(newLevel);
      }

      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        gold: prev.gold + finalGold,
      };
    });

    if (reachedMilestoneLevel > 0) {
      setIsJobMilestoneTrigger(true);
      setShowJobModal(true);
      if (reachedMilestoneLevel === 100) {
        showToast('🎉 祝・Lv.100到達！ 特化職の儀式が解禁されました！');
      } else {
        showToast(`⚡ 祝・Lv.${reachedMilestoneLevel}到達！ 転職の儀式が発動しました！`);
      }
    }
  }, [inventory, equipment.statWeaponId, equipment.statArmorId, stats.job, stats.creditScore, stats.hasCurseImmunity]);

  const handleAttackMonster = React.useCallback((damage: number, isCrit: boolean, lifestealHeal: number) => {
    if (lifestealHeal > 0) {
      setStats(prev => ({
        ...prev,
        hp: Math.min(prev.maxHp, prev.hp + lifestealHeal),
      }));
    }
  }, []);

  const handleMonsterDefeated = React.useCallback((defeatedMonster: Monster) => {
    addXpAndGold(defeatedMonster.xpReward, defeatedMonster.goldReward);
    
    // Process drops
    if (defeatedMonster.drops) {
      defeatedMonster.drops.forEach(drop => {
        if (Math.random() < drop.chance) {
          const newItem: PlayerItem = {
            uid: generateUid(),
            baseId: drop.itemId,
            upgradeLevel: 0,
            limitBreak: 0,
            addedPower: 0,
          };
          setInventory(prev => [...prev, newItem]);
        }
      });
    }

    setStats(prev => {
      const nextStage = prev.stage + 1;
      const nextMaxStage = Math.max(prev.maxStageReached, nextStage);
      setCurrentMonster(getMonsterForStage(nextStage));
      return {
        ...prev,
        stage: nextStage,
        maxStageReached: nextMaxStage,
      };
    });
  }, [addXpAndGold]);

  const handlePlayerTakeDamage = React.useCallback((damage: number) => {
    setStats(prev => {
      const nextHp = prev.hp - damage;
      if (nextHp <= 0) {
        const prevStage = Math.max(1, prev.stage - 1);
        setCurrentMonster(getMonsterForStage(prevStage));
        setDeathNotice(`💀 敗北しました！HPが全回復し、1階層前の Stage ${prevStage} に戻り戦闘を続行します。`);
        return {
          ...prev,
          hp: prev.maxHp,
          stage: prevStage,
        };
      }
      return { ...prev, hp: nextHp };
    });
  }, []);

  const handleBuyItem = (baseId: string, price: number) => {
    if (stats.gold < price) return;
    setStats(prev => ({ ...prev, gold: prev.gold - price }));
    const newItem: PlayerItem = {
      uid: generateUid(),
      baseId,
      upgradeLevel: 0,
      limitBreak: 0,
      addedPower: 0,
    };
    setInventory(prev => [...prev, newItem]);
  };

  const handleBuyDailyItem = (dailyItem: DailyShopItem) => {
    if (stats.gold < dailyItem.price || soldOutDailyItems.includes(dailyItem.shopItemId)) return;

    setStats(prev => ({ ...prev, gold: prev.gold - dailyItem.price }));
    const newItem: PlayerItem = {
      uid: generateUid(),
      baseId: dailyItem.baseId,
      upgradeLevel: dailyItem.upgradeLevel,
      limitBreak: 0,
      addedPower: dailyItem.addedPower,
      customPrefix: dailyItem.customPrefix,
    };
    setInventory(prev => [...prev, newItem]);
    setSoldOutDailyItems(prev => [...prev, dailyItem.shopItemId]);
  };

  const handleToggleLock = (uid: string) => {
    setInventory(prev => prev.map(item => item.uid === uid ? { ...item, isLocked: !item.isLocked } : item));
  };

  const handleDismantleItem = (uid: string) => {
    const item = inventory.find(i => i.uid === uid);
    if (!item) return;
    if (item.isLocked) {
      showToast('🔒 ロック中のアイテムは分解できません。');
      return;
    }
    if (equipment.statWeaponId === uid || equipment.statArmorId === uid) {
      showToast('⚠️ 能力装備中のアイテムは分解できません。');
      return;
    }

    const currentJob = stats.job || 'balanced';
    const materialIds = ['m_slime_jelly', 'm_goblin_ear', 'm_orc_fang', 'm_demon_horn', 'm_dragon_scale'];
    const bonusCount = getMaterialBonusCount(currentJob);
    const count = 1 + Math.floor((item.upgradeLevel || 0) / 2) + (item.limitBreak || 0) + bonusCount;
    const maxMatIndex = Math.min(materialIds.length - 1, Math.floor(stats.maxStageReached / 100));
    
    const generatedMaterials: PlayerItem[] = [];
    for (let i = 0; i < count; i++) {
       const mId = materialIds[Math.floor(Math.random() * (maxMatIndex + 1))];
       generatedMaterials.push({
         uid: generateUid(),
         baseId: mId,
         upgradeLevel: 0,
         addedPower: 0
       });
    }

    setInventory(prev => {
      const filtered = prev.filter(i => i.uid !== uid);
      return [...filtered, ...generatedMaterials];
    });

    const baseItem = ITEMS[item.baseId];
    showToast(`🔨 「${baseItem?.name || '装備'}」を分解し、素材 ${count} 個を獲得しました！${bonusCount > 0 ? ` (特化ボーナス +${bonusCount})` : ''}`);
  };

  const handleSelectJob = (newJob: JobType) => {
    setStats(prev => ({ ...prev, job: newJob, lastJobChangeLevel: prev.level }));
    setIsJobMilestoneTrigger(false);
    const jobDef = JOBS[newJob];
    showToast(`🏛️ 転職成功！「${jobDef.icon} ${jobDef.name}」になりました。`);
  };

  const handleDismissMilestoneJob = () => {
    setStats(prev => ({ ...prev, lastJobChangeLevel: prev.level }));
    setIsJobMilestoneTrigger(false);
    showToast(`🏛️ 特化職を維持しました。（次回変更チャンス: Lv.${getNextJobChangeLevel(stats.level)}）`);
  };

  const handleSellItem = (uid: string, sellPrice: number) => {
    const item = inventory.find(i => i.uid === uid);
    if (!item) return;
    if (item.isLocked) {
      showToast('🔒 ロック中のアイテムは売却できません。');
      return;
    }
    if (equipment.statWeaponId === uid || equipment.statArmorId === uid) {
      showToast('⚠️ 能力装備中のアイテムは売却できません。');
      return;
    }
    setStats(prev => ({ ...prev, gold: prev.gold + sellPrice }));
    setInventory(prev => prev.filter(i => i.uid !== uid));
    const baseItem = ITEMS[item.baseId];
    showToast(`💰 「${baseItem?.name || '装備'}」を売却し、🪙 ${sellPrice} G を獲得しました。`);
  };

  const handleBatchSellItems = (uids: string[], totalSellPrice: number) => {
    if (!uids.length) return;
    const validItems = inventory.filter(i => 
      uids.includes(i.uid) && 
      !i.isLocked && 
      equipment.statWeaponId !== i.uid && 
      equipment.statArmorId !== i.uid
    );
    if (!validItems.length) {
      showToast('⚠️ 売却可能なアイテムが選択されていません。');
      return;
    }
    const validUids = new Set(validItems.map(i => i.uid));
    setStats(prev => ({ ...prev, gold: prev.gold + totalSellPrice }));
    setInventory(prev => prev.filter(i => !validUids.has(i.uid)));
    showToast(`💰 アイテム ${validItems.length} 個を一括売却し、🪙 ${totalSellPrice.toLocaleString()} G を獲得しました！`);
  };

  const handleBatchBuyItem = (baseId: string, quantity: number, unitPrice: number) => {
    if (quantity <= 0) return;
    const totalCost = quantity * unitPrice;
    if (stats.gold < totalCost) {
      showToast(`⚠️ ゴールドが足りません。(必要: 🪙 ${totalCost.toLocaleString()} G)`);
      return;
    }
    setStats(prev => ({ ...prev, gold: prev.gold - totalCost }));
    const newItems: PlayerItem[] = Array.from({ length: quantity }, () => ({
      uid: generateUid(),
      baseId,
      upgradeLevel: 0,
      limitBreak: 0,
      addedPower: 0,
    }));
    setInventory(prev => [...prev, ...newItems]);
    showToast(`🏪 「${ITEMS[baseId]?.name || 'アイテム'}」を ${quantity} 個まとめ買いしました！(消費: 🪙 ${totalCost.toLocaleString()} G)`);
  };

  const handleBatchBuyDailyItems = (dailyItemsToBuy: DailyShopItem[]) => {
    const availableItems = dailyItemsToBuy.filter(d => !soldOutDailyItems.includes(d.shopItemId));
    if (!availableItems.length) return;

    const totalCost = availableItems.reduce((sum, item) => sum + item.price, 0);
    if (stats.gold < totalCost) {
      showToast(`⚠️ ゴールドが足りません。(必要: 🪙 ${totalCost.toLocaleString()} G)`);
      return;
    }

    setStats(prev => ({ ...prev, gold: prev.gold - totalCost }));
    const newItems: PlayerItem[] = availableItems.map(dailyItem => ({
      uid: generateUid(),
      baseId: dailyItem.baseId,
      upgradeLevel: dailyItem.upgradeLevel,
      limitBreak: 0,
      addedPower: dailyItem.addedPower,
      customPrefix: dailyItem.customPrefix,
    }));
    setInventory(prev => [...prev, ...newItems]);
    setSoldOutDailyItems(prev => [...prev, ...availableItems.map(i => i.shopItemId)]);
    showToast(`📅 日替わりアイテム ${availableItems.length} 品をまとめて全品購入しました！`);
  };

  const handleUncurseItem = (uid: string, cost: number) => {
    const item = inventory.find(i => i.uid === uid);
    if (!item) return;
    if (stats.gold < cost) {
      showToast(`⚠️ ゴールドが足りません。(必要: 🪙 ${cost} G)`);
      return;
    }
    const baseItem = ITEMS[item.baseId];
    setStats(prev => ({ ...prev, gold: prev.gold - cost, hasCurseImmunity: false }));
    setInventory(prev => prev.map(i => i.uid === uid ? { ...i, isUncursed: true } : i));
    showToast(`✨ 「${baseItem?.name || '装備'}」の呪いを解呪しました！マイナス効果が浄化され安全に強化できます。`);
  };

  const handleCraftItem = (targetBaseId: string) => {
    let requiredMaterials: { id: string, count: number }[] = [];
    let extraProps: Partial<PlayerItem> = {};
    let targetBaseIdToCraft = targetBaseId;

    if (targetBaseId === 'c_curse_breaker') {
      const requiredCount = stats.job === 'artisan' ? 8 : 10;
      requiredMaterials = ['m_slime_jelly', 'm_goblin_ear', 'm_orc_fang', 'm_demon_horn', 'm_dragon_scale'].map(id => ({ id, count: requiredCount }));
    } else if (targetBaseId === 'w_craft_ragnarok' || targetBaseId === 'a_craft_aegis') {
      const matCount = stats.job === 'artisan' ? 40 : 50;
      const gemCount = stats.job === 'artisan' ? 4 : 5;
      requiredMaterials = [
        ...['m_slime_jelly', 'm_goblin_ear', 'm_orc_fang', 'm_demon_horn', 'm_dragon_scale'].map(id => ({ id, count: matCount })),
        ...['g_fire_ruby', 'g_water_sapphire', 'g_thunder_topaz', 'g_light_diamond', 'g_dark_onyx'].map(id => ({ id, count: gemCount }))
      ];
    } else if (targetBaseId === 'w_deep_sword' || targetBaseId === 'a_deep_armor') {
      const crystalCount = stats.job === 'artisan' ? 8 : 10;
      const coreCount = stats.job === 'artisan' ? 1 : 2;
      requiredMaterials = [
        { id: 'm_deep_crystal', count: crystalCount },
        { id: 'm_abyss_core', count: coreCount }
      ];
      const deepBonus = Math.floor(stats.maxStageReached * 1.5);
      extraProps.addedPower = deepBonus;
      extraProps.engraving = auth.currentUser?.displayName || '名無し勇者';
    } else {
      return; // Unknown recipe
    }

    const materialCounts: Record<string, number> = {};
    inventory.forEach(item => {
      materialCounts[item.baseId] = (materialCounts[item.baseId] || 0) + 1;
    });

    for (const req of requiredMaterials) {
      if ((materialCounts[req.id] || 0) < req.count) {
        showToast(`⚠️ 素材が足りません。(${ITEMS[req.id].name}があと${req.count - (materialCounts[req.id] || 0)}個必要)`);
        return;
      }
    }

    setInventory(prev => {
      let nextInv = [...prev];
      requiredMaterials.forEach(req => {
        let count = req.count;
        nextInv = nextInv.filter(item => {
          if (item.baseId === req.id && count > 0 && !item.isLocked) {
            count--;
            return false;
          }
          return true;
        });
      });
      return [
        ...nextInv,
        { uid: generateUid(), baseId: targetBaseIdToCraft, upgradeLevel: 0, addedPower: 0, ...extraProps }
      ];
    });
    showToast(`✨ 「${ITEMS[targetBaseIdToCraft].name}」をクラフトしました！`);
  };

  const handleUseConsumable = (uid: string) => {
    const item = inventory.find(i => i.uid === uid);
    if (!item) return;
    if (item.baseId === 'c_curse_breaker') {
      setStats(prev => ({ ...prev, hasCurseImmunity: true }));
      setInventory(prev => prev.filter(i => i.uid !== uid));
      showToast(`✨ 呪い封じの護符を使用しました。解呪を行うまで呪い効果が無効化されます！`);
    } else if (item.baseId === 'c_transfer_scroll') {
      // Inventory UI側でモーダルを開く処理をトリガーするため、ここでは何もせず、Inventory側のステートで管理させるか、
      // あるいは、ここはUIに関わらないロジックだけ。Inventory.tsx で onUseConsumable(uid) されたら Modalを開くようにする。
      // なので、この処理は空でよい。Inventory.tsx側で捕まえる。
    }
  };

  const handleTransferEnhancements = (sourceUid: string, targetUid: string, scrollUid: string) => {
    const source = inventory.find(i => i.uid === sourceUid);
    const target = inventory.find(i => i.uid === targetUid);
    if (!source || !target) return;
    if (ITEMS[source.baseId].type !== ITEMS[target.baseId].type) {
      showToast('⚠️ 同じ種類（武器同士、または防具同士）にしか継承できません。');
      return;
    }

    setInventory(prev => prev.map(i => {
      if (i.uid === targetUid) {
        return {
          ...i,
          upgradeLevel: source.upgradeLevel || 0,
          limitBreak: source.limitBreak || 0,
          addedPower: source.addedPower || 0,
          addedEffect: source.addedEffect,
          specialEnchantCount: source.specialEnchantCount || 0,
          unlockedSockets: source.unlockedSockets || 0,
          slottedGems: source.slottedGems || []
        };
      }
      return i;
    }).filter(i => i.uid !== sourceUid && i.uid !== scrollUid));
    
    showToast(`✨ 「${ITEMS[source.baseId].name}」から「${ITEMS[target.baseId].name}」へ強化状態を継承しました！`);
  };

  
  const handlePackBox = (boxUid: string, itemUids: string[]) => {
    let packedCount = 0;
    let boxName = '箱';
    setInventory(prev => {
      const box = prev.find(i => i.uid === boxUid);
      if (!box) return prev;
      boxName = ITEMS[box.baseId]?.name || '箱';
      
      const itemsToPack = prev.filter(i => itemUids.includes(i.uid));
      packedCount = itemsToPack.length;
      const remainingItems = prev.filter(i => !itemUids.includes(i.uid) && i.uid !== boxUid);
      
      return [
        ...remainingItems,
        { ...box, packedItems: itemsToPack }
      ];
    });
    showToast(`📦 「${boxName}」に ${itemUids.length} 個のアイテムを梱包しました！`);
  };

  const handleOpenSocket = (uid: string) => {
    const item = inventory.find(i => i.uid === uid);
    if (!item || item.isLocked) return;
    const baseItem = ITEMS[item.baseId];
    if (baseItem.type !== 'weapon') return;

    const currentSockets = item.unlockedSockets || 0;
    if (currentSockets >= 3) {
      showToast('⚠️ これ以上穴を開けることはできません。');
      return;
    }

    // Cost logic - let's say it costs gold
    const cost = 5000 * (currentSockets + 1);
    if (stats.gold < cost) {
      showToast(`⚠️ ゴールドが足りません。(必要: 🪙 ${cost} G)`);
      return;
    }

    setStats(prev => ({ ...prev, gold: prev.gold - cost }));

    // Success chance logic
    let successRate = 0.5 - (currentSockets * 0.15); // 50%, 35%, 20%
    if (stats.job === 'artisan') successRate += 0.3; // +30%

    if (Math.random() < successRate) {
      setInventory(prev => prev.map(i => i.uid === uid ? { ...i, unlockedSockets: currentSockets + 1 } : i));
      showToast(`💎 武器に新しく宝石をはめる穴を開けました！`);
    } else {
      showToast(`💥 穴開けに失敗しました... (ゴールドを消費しました)`);
      // If we wanted to destroy the weapon on fail, we could here, but let's just lose gold for now or maybe "robbing materials".
    }
  };

  const handleEngraveItem = (uid: string, guildName: string) => {
    setInventory(prev => prev.map(item => item.uid === uid ? { ...item, engraving: guildName } : item));
    showToast('✨ ギルド名を刻印しました！');
  };

  const handleInsertGem = (weaponUid: string, gemUid: string) => {
    const weapon = inventory.find(i => i.uid === weaponUid);
    const gem = inventory.find(i => i.uid === gemUid);
    if (!weapon || !gem || ITEMS[gem.baseId].type !== 'gem' || weapon.isLocked) return;

    const currentSockets = weapon.unlockedSockets || 0;
    const currentGems = weapon.slottedGems || [];
    if (currentGems.length >= currentSockets) {
      showToast('⚠️ 空きスロットがありません。');
      return;
    }

    setInventory(prev => prev.map(i => {
      if (i.uid === weaponUid) {
        return { ...i, slottedGems: [...currentGems, gem.baseId] };
      }
      return i;
    }).filter(i => i.uid !== gemUid)); // consume gem

    showToast(`✨ 武器に「${ITEMS[gem.baseId].name}」をはめ込みました！`);
  };
  
  const handleLimitBreak = (uid1: string, uid2: string) => {
    const currentJob = stats.job || 'balanced';
    const appraiserBonus = getAppraiserPowerBonus(currentJob);

    setInventory(prev => {
      const item1 = prev.find(i => i.uid === uid1);
      const item2 = prev.find(i => i.uid === uid2);
      if (!item1 || !item2 || item1.baseId !== item2.baseId) {
        return prev;
      }
      
      setEquipment(eq => {
        const nextEq = { ...eq };
        if (nextEq.statWeaponId === uid2) nextEq.statWeaponId = uid1;
        if (nextEq.statArmorId === uid2) nextEq.statArmorId = uid1;
        return nextEq;
      });

      // Merge: upgrade item1's limitBreak, remove item2
      const newInventory = prev.filter(i => i.uid !== uid2);
      return newInventory.map(i => i.uid === uid1 ? {
        ...i,
        limitBreak: (i.limitBreak || 0) + 1,
        addedPower: (i.addedPower || 0) + appraiserBonus,
      } : i);
    });
    if (appraiserBonus > 0) {
      showToast(`🔍 鑑定士の秘術により、限界突破で攻撃力/防御力 +${appraiserBonus} の特化ボーナスが付与されました！`);
    }
  };

  const handleBatchLimitBreak = (targetUid: string, consumedUids: string[]) => {
    if (!consumedUids.length) return;
    const currentJob = stats.job || 'balanced';
    const bonusPerCopy = getAppraiserPowerBonus(currentJob);
    const totalBonus = bonusPerCopy * consumedUids.length;

    setInventory(prev => {
      const targetItem = prev.find(i => i.uid === targetUid);
      if (!targetItem) return prev;

      setEquipment(eq => {
        const nextEq = { ...eq };
        consumedUids.forEach(uid => {
          if (nextEq.statWeaponId === uid) nextEq.statWeaponId = targetUid;
          if (nextEq.statArmorId === uid) nextEq.statArmorId = targetUid;
        });
        return nextEq;
      });

      const consumedSet = new Set(consumedUids);
      const newInventory = prev.filter(i => !consumedSet.has(i.uid));
      return newInventory.map(i => i.uid === targetUid ? {
        ...i,
        limitBreak: (i.limitBreak || 0) + consumedUids.length,
        addedPower: (i.addedPower || 0) + totalBonus,
      } : i);
    });

    showToast(`🔨 同名装備 ${consumedUids.length} 個を一括合体し、限界突破 +${consumedUids.length} 凸に強化しました！${totalBonus > 0 ? ` (鑑定士特化ボーナス +${totalBonus})` : ''}`);
  };

  const handleSpecialEnchant = (uid: string, materialUid: string, cost: number, newEffect: PlayerItem) => {
    if (stats.gold < cost) return;
    setStats(prev => ({ ...prev, gold: prev.gold - cost }));
    
    setInventory(prev => {
      // Remove material
      const filtered = prev.filter(i => i.uid !== materialUid);
      // Update item
      return filtered.map(i => i.uid === uid ? { ...i, ...newEffect } : i);
    });
  };

  const handleBatchSpecialEnchant = (uid: string, consumedMaterialUids: string[], cost: number, newEffect: PlayerItem) => {
    if (stats.gold < cost) return;
    setStats(prev => ({ ...prev, gold: prev.gold - cost }));

    const consumedSet = new Set(consumedMaterialUids);
    setInventory(prev => {
      const filtered = prev.filter(i => !consumedSet.has(i.uid));
      return filtered.map(i => i.uid === uid ? { ...i, ...newEffect } : i);
    });
    showToast(`✨ 特殊強化を素材 ${consumedMaterialUids.length} 個分まとめて実行しました！`);
  };

  const handleEnchantItem = (uid: string, cost: number, newEffect: PlayerItem) => {
    if (stats.gold < cost) return;
    setStats(prev => ({ ...prev, gold: prev.gold - cost }));
    setInventory(prev => prev.map(item => item.uid === uid ? { ...item, ...newEffect } : item));
  };

  const handleImportSaveData = (data: SaveData) => {
    const sanitized = sanitizeSaveData(data);
    setInventory(sanitized.inventory);
    setEquipment(sanitized.equipment);
    setStats(sanitized.stats);
    setCurrentMonster(getMonsterForStage(sanitized.stats.stage));
    try {
      localStorage.setItem(CURRENT_SAVE_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to save imported data to localStorage:', e);
    }
  };

  const handleSelectStage = (targetStage: number) => {
    const maxAllowed = Math.max(stats.maxStageReached, stats.stage);
    const validStage = Math.max(1, Math.min(maxAllowed, targetStage));
    setStats(prev => ({
      ...prev,
      stage: validStage,
      maxStageReached: Math.max(prev.maxStageReached, validStage),
    }));
    setCurrentMonster(getMonsterForStage(validStage));
    setShowStageSelect(false);
  };

  const updateFocusMinutes = (mins: number) => {
    const val = Math.max(1, Math.min(180, mins));
    setFocusMinutes(val);
    localStorage.setItem('focus_quest_focus_mins', val.toString());
    if (timerMode === 'idle') {
      setTimeLeft(val * 60);
    }
  };

  const updateBreakMinutes = (mins: number) => {
    const val = Math.max(1, Math.min(60, mins));
    setBreakMinutes(val);
    localStorage.setItem('focus_quest_break_mins', val.toString());
    if (timerMode === 'break') {
      setTimeLeft(val * 60);
    }
  };

  const handleStartFocus = () => {
    setTimerMode('focus');
    setTimeLeft(focusMinutes * 60);
    setStats(prev => ({ ...prev, hp: prev.maxHp }));
  };

  const handleStop = () => {
    setTimerMode('idle');
    setTimeLeft(focusMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const nextLevelXp = getNextLevelXp(stats.level);
  const xpPercent = Math.min(100, Math.max(0, (stats.xp / nextLevelXp) * 100));
  const hpPercent = Math.min(100, Math.max(0, (stats.hp / stats.maxHp) * 100));

  const activeEffects: string[] = [];
  const jobGoldBonus = getGoldBonusMultiplier(stats.job || 'balanced');
  const jobXpBonus = getXpBonusMultiplier(stats.job || 'balanced');
  const creditScore = stats.creditScore || 100;
  const creditScoreBonus = creditScore >= 120 ? 0.1 : creditScore < 80 ? -0.1 : 0;

  const totalGoldBonus = (statWeaponItem?.effect?.goldBonus || 0) + (statArmorItem?.effect?.goldBonus || 0) + jobGoldBonus + creditScoreBonus;
  const totalXpBonus = (statWeaponItem?.effect?.xpBonus || 0) + (statArmorItem?.effect?.xpBonus || 0) + jobXpBonus + creditScoreBonus;

  if (stats.hasCurseImmunity) activeEffects.push(`📜 呪い無効化 (次回の解呪まで)`);
  if (statWeaponItem?.effect?.critChance) activeEffects.push(`会心率 +${Math.floor(statWeaponItem.effect.critChance * 100)}%`);
  if (totalGoldBonus !== 0) activeEffects.push(`獲得G ${totalGoldBonus > 0 ? '+' : ''}${Math.round(totalGoldBonus * 100)}%`);
  if (totalXpBonus !== 0) activeEffects.push(`獲得EXP ${totalXpBonus > 0 ? '+' : ''}${Math.round(totalXpBonus * 100)}%`);
  if (statWeaponItem?.effect?.lifesteal) activeEffects.push(`攻撃吸血 +${Math.floor(statWeaponItem.effect.lifesteal * 100)}%`);
  const currentHpRegen = statArmorItem?.effect?.hpRegen || 1;
  activeEffects.push(`毎秒HP回復 +${currentHpRegen}`);
  if (statArmorItem?.effect?.maxHpBonus) activeEffects.push(`最大HP +${statArmorItem.effect.maxHpBonus}`);

  const currentJobDef = JOBS[stats.job || 'balanced'];

  return (
    <div className="relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] bg-slate-950 overflow-hidden flex flex-col font-['DotGothic16'] select-none">
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-md w-[92%] bg-slate-900/95 border-2 border-amber-400 text-amber-200 px-3 py-2 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 animate-bounce">
          <span className="text-lg">✨</span>
          <span className="text-xs font-bold leading-tight flex-1">{toastMessage}</span>
        </div>
      )}

      {deathNotice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-[92%] bg-purple-950/95 border-2 border-purple-500 text-purple-100 p-3 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-xl">💀</span>
            <span className="text-xs font-bold leading-tight">{deathNotice}</span>
          </div>
          <button
            onClick={() => setDeathNotice(null)}
            className="pixel-btn text-[10px] !py-1 !px-2 !bg-purple-800 hover:!bg-purple-700 active text-white"
          >
            OK
          </button>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <HeroCanvas 
          isFocusing={timerMode === 'focus'} 
          isAsleep={isAsleep}
          appearanceArmorId={equipment.appearanceArmorId}
          appearanceWeaponId={equipment.appearanceWeaponId}
          statWeaponId={equipment.statWeaponId}
          statArmorId={equipment.statArmorId}
          monster={currentMonster}
          onAttackMonster={handleAttackMonster}
          onMonsterDefeated={handleMonsterDefeated}
          onPlayerTakeDamage={handlePlayerTakeDamage}
          inventory={inventory}
          job={stats.job || 'balanced'}
          hasCurseImmunity={stats.hasCurseImmunity}
        />
      </div>

      <div className="relative z-10 w-full p-2 sm:p-4 flex flex-wrap justify-between items-start pointer-events-none gap-2">
        <div className="pixel-panel w-full sm:w-72 max-w-full pointer-events-auto bg-slate-900/90 border-slate-700 p-2 sm:p-3">
          <div className="flex justify-between items-center mb-1.5 gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm text-amber-300 font-bold">勇者 Lv.{stats.level}</span>
              <span className="text-[10px] sm:text-xs text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-700/60 font-medium">
                {currentJobDef.icon} {currentJobDef.name}
              </span>
            </div>
            <button
              onClick={() => setShowStageSelect(true)}
              className="pixel-btn text-[10px] !py-0.5 !px-2 active !border-sky-400 !text-sky-300 hover:!bg-sky-950 flex items-center gap-1"
              title="一度到達した階層に移動"
            >
              <span>地下 {stats.stage} 階</span>
              <span className="text-[9px] bg-sky-950 px-1 rounded border border-sky-700">移動 🗺️</span>
            </button>
          </div>

          <div className="text-[10px] sm:text-[11px] text-rose-400 font-bold flex justify-between mb-0.5">
            <span>HP (自動回復中)</span>
            <span>{stats.hp} / {stats.maxHp}</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 sm:h-3 border border-slate-700 rounded-sm mb-1.5">
            <div 
              className="bg-rose-500 h-full shadow-[0_0_8px_#f43f5e] transition-all duration-300" 
              style={{ width: `${hpPercent}%` }} 
            />
          </div>

          <div className="text-[10px] sm:text-[11px] text-amber-300 font-bold flex justify-between mb-0.5">
            <span>EXP</span>
            <span>{stats.xp} / {nextLevelXp}</span>
          </div>
          <div className="w-full bg-slate-950 h-2 border border-slate-700 rounded-sm mb-1.5">
            <div 
              className="bg-amber-400 h-full shadow-[0_0_8px_#fbbf24] transition-all duration-300" 
              style={{ width: `${xpPercent}%` }} 
            />
          </div>

          <div className="flex justify-between items-center text-[11px] sm:text-xs text-amber-200 pt-1 border-t border-slate-800">
            <span>🪙 所持金: {stats.gold} G</span>
          </div>

          {activeEffects.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex flex-wrap gap-1">
              {activeEffects.map((eff, i) => (
                <span key={i} className="text-[9px] sm:text-[10px] bg-slate-950 text-sky-300 px-1 py-0.5 border border-slate-800 rounded">
                  ✨ {eff}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pixel-panel text-center pointer-events-auto min-w-[160px] sm:min-w-[180px] bg-slate-900/90 border-slate-700 flex flex-col items-center p-2 sm:p-3 mx-auto sm:mx-0">
          <div className="text-[11px] sm:text-xs text-slate-400 mb-0.5">
            {timerMode === 'idle' ? '待機中' : timerMode === 'focus' ? '⚔️ 集中クエスト中' : '☕ 休憩中'}
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${timerMode === 'focus' ? 'text-rose-400' : timerMode === 'break' ? 'text-emerald-400' : 'text-slate-200'}`}>
            {formatTime(timeLeft)}
          </div>

          {/* クエスト時間の変更コントロール */}
          {timerMode === 'idle' && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 w-full flex flex-col items-center gap-1">
              <div className="text-[10px] text-slate-400 font-bold">⏱️ 集中時間</div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[15, 25, 30, 45, 60].map(m => (
                  <button
                    key={m}
                    onClick={() => updateFocusMinutes(m)}
                    className={`px-1 py-0.5 text-[9px] sm:text-[10px] border rounded transition-colors ${
                      focusMinutes === m 
                        ? 'border-amber-400 bg-amber-950/60 text-amber-300 font-bold' 
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}分
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={focusMinutes}
                  onChange={(e) => updateFocusMinutes(parseInt(e.target.value, 10) || 1)}
                  className="w-10 sm:w-12 bg-slate-950 border border-slate-700 text-amber-300 text-[10px] sm:text-[11px] text-center rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"
                />
                <span className="text-[9px] sm:text-[10px] text-slate-400">分に設定</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto relative z-10 p-2 sm:p-3 pb-3 flex flex-col items-center gap-2 pointer-events-auto w-full max-w-md mx-auto">
        {/* Main Quest Action */}
        <div className="w-full flex flex-col gap-2">
          {timerMode === 'idle' ? (
            <>
              {user && getAccessToken() && taskLists.length > 0 ? (
                <div className="flex flex-col gap-1 w-full bg-slate-900 border border-slate-700 p-2 rounded">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs text-indigo-300 font-bold">✅ ToDo</span>
                    <select
                      value={selectedTaskListId}
                      onChange={(e) => {
                        setSelectedTaskListId(e.target.value);
                        setSelectedTaskId('');
                        setCurrentTaskText('');
                      }}
                      className="pixel-input flex-1 min-w-0 text-[10px] sm:text-xs bg-slate-950 border border-slate-700 text-amber-200 rounded p-1 truncate"
                    >
                      {taskLists.map(list => (
                        <option key={list.id} value={list.id}>{list.title}</option>
                      ))}
                    </select>
                    {isTasksLoading && <span className="text-xs text-amber-400 animate-pulse">⏳</span>}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <select
                      value={selectedTaskId}
                      onChange={(e) => {
                        setSelectedTaskId(e.target.value);
                        if (e.target.value) {
                          const task = googleTasks.find(t => t.id === e.target.value);
                          if (task) setCurrentTaskText(task.title);
                        } else {
                          setCurrentTaskText('');
                        }
                      }}
                      className="pixel-input flex-1 min-w-0 text-[10px] sm:text-xs bg-slate-950 border border-slate-700 text-slate-200 rounded p-1 truncate"
                    >
                      <option value="">新規タスク作成（自由入力）</option>
                      {googleTasks.map(task => (
                        <option key={task.id} value={task.id}>{task.title}</option>
                      ))}
                    </select>
                  </div>
                  {!selectedTaskId && (
                    <input
                      type="text"
                      placeholder="これからやるタスクを入力（完了時にGoogle ToDoへ保存）"
                      value={currentTaskText}
                      onChange={(e) => setCurrentTaskText(e.target.value)}
                      className="pixel-input text-[10px] sm:text-xs w-full p-1.5 bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 rounded mt-1"
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1 w-full">
                  {user && !getAccessToken() && (
                    <div className="text-[9px] text-amber-300/80 mb-1 px-1 flex items-center justify-between">
                      <span>※設定からGoogleに再ログインするとToDoと連携できます</span>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="これからやるタスクを入力（任意）"
                    value={currentTaskText}
                    onChange={(e) => setCurrentTaskText(e.target.value)}
                    className="pixel-input text-xs w-full p-2 bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded"
                  />
                </div>
              )}
              <button
                onClick={handleStartFocus}
                className="pixel-btn active text-xs sm:text-sm w-full py-2.5 sm:py-3 shadow-lg flex items-center justify-center gap-2 font-bold mt-1"
              >
                <span>⚔️</span> 集中クエスト開始 ({focusMinutes}分)
              </button>
            </>
          ) : timerMode === 'focus' ? (
            <div className="flex flex-col gap-1 w-full">
              {currentTaskText && (
                <div className="text-[10px] sm:text-xs text-amber-200 bg-amber-950/40 p-2 rounded border border-amber-800 text-center truncate">
                  🎯 目標: {currentTaskText}
                </div>
              )}
              {(() => {
                const timePassed = focusMinutes * 60 - timeLeft;
                const canCancel = timePassed < 10;
                return (
                  <button
                    onClick={handleStop}
                    disabled={!canCancel}
                    className={`pixel-btn text-xs sm:text-sm w-full py-2.5 sm:py-3 font-bold ${
                      canCancel 
                        ? '!border-rose-600 !text-rose-300 hover:!bg-rose-950/60' 
                        : '!border-slate-700 !text-slate-500 bg-slate-900 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {canCancel ? '🏃 撤退する (10秒以内のみ可能)' : '🔒 撤退不可（戦闘中！）'}
                  </button>
                );
              })()}
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleStartFocus}
                className="pixel-btn active text-xs sm:text-sm flex-1 py-2.5 font-bold"
              >
                ⚔️ 次の集中へ進む
              </button>
              <button
                onClick={handleStop}
                className="pixel-btn opacity-80 text-xs sm:text-sm px-4 py-2.5"
              >
                終了する
              </button>
            </div>
          )}
        </div>

        {/* Feature Row 1: Inventory & Specialization */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            onClick={() => setShowInventory(!showInventory)}
            className="pixel-btn text-xs sm:text-sm py-2 sm:py-2.5 flex items-center justify-center gap-1.5"
          >
            <span>🎒</span> 装備と工房 {timerMode === 'focus' && '🔒'}
          </button>

          {(() => {
            const unlocked = isJobUnlocked(stats.level);
            const canChange = canChangeJobNow(stats.level, stats.lastJobChangeLevel);
            return (
              <button
                onClick={() => {
                  setIsJobMilestoneTrigger(canChange);
                  setShowJobModal(true);
                }}
                className={`pixel-btn text-xs sm:text-sm py-2 sm:py-2.5 flex items-center justify-center gap-1.5 ${
                  canChange
                    ? '!bg-amber-600 !border-amber-400 !text-white hover:!bg-amber-500 animate-pulse'
                    : '!bg-indigo-950/90 !border-indigo-500 !text-indigo-200 hover:!bg-indigo-900'
                }`}
              >
                <span>🏛️ 特化職</span>
                {canChange && <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1 rounded">転職可!</span>}
                {!unlocked && <span className="text-[9px] bg-slate-900 text-slate-400 px-1 rounded border border-slate-700">Lv.100解禁</span>}
              </button>
            );
          })()}
        </div>

        {/* Feature Row 2: Guild & Auction */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            onClick={() => {
              if (!user) {
                setAuthPromptFeature('guild');
              } else {
                setShowGuildRanking(true);
              }
            }}
            className={`pixel-btn text-xs sm:text-sm py-1.5 sm:py-2 flex items-center justify-center gap-1 ${
              !user ? 'opacity-80 border-slate-700' : ''
            }`}
            title={!user ? 'ギルド（Googleログインが必要）' : 'ギルドランキング'}
          >
            <span>🛡️</span> ギルド {!user && <span className="text-[10px]">🔒</span>}
          </button>

          <button
            onClick={() => {
              if (!user) {
                setAuthPromptFeature('auction');
              } else {
                setShowAuctionHouse(true);
              }
            }}
            className={`pixel-btn text-xs sm:text-sm py-1.5 sm:py-2 flex items-center justify-center gap-1 ${
              !user ? 'opacity-80 border-slate-700' : ''
            }`}
            title={!user ? '取引所（Googleログインが必要）' : 'グローバルオークション'}
          >
            <span>⚖️</span> 取引所 {!user && <span className="text-[10px]">🔒</span>}
          </button>
        </div>

        {/* Feature Row 3: Flashcards & Settings */}
        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          <button
            onClick={() => setShowFlashcards(true)}
            className="pixel-btn text-xs sm:text-sm py-1.5 sm:py-2 flex items-center justify-center gap-1"
            title="単語帳・魔導書"
          >
            <span>📖</span> 魔導書（単語帳）
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="pixel-btn text-xs sm:text-sm py-1.5 sm:py-2 relative flex items-center justify-center gap-1"
            title="設定・クラウド同期"
          >
            <span>⚙️</span> 設定
            {user && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] text-white shadow-sm border border-slate-900">
                ☁
              </span>
            )}
          </button>
        </div>
      </div>

      {showJobModal && (
        <JobSelectModal
          currentJob={stats.job || 'balanced'}
          level={stats.level}
          lastJobChangeLevel={stats.lastJobChangeLevel}
          isMilestoneTrigger={isJobMilestoneTrigger}
          onSelectJob={handleSelectJob}
          onClose={() => setShowJobModal(false)}
          onDismissMilestone={handleDismissMilestoneJob}
        />
      )}

      {showInventory && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="pixel-panel max-w-4xl w-full bg-slate-900 border-2 border-slate-700 p-3 sm:p-5 relative text-slate-100 shadow-[0_0_30px_rgba(0,0,0,0.6)] h-[94vh] flex flex-col">
            <Inventory 
              inventory={inventory}
              equipment={equipment} 
              gold={stats.gold}
              job={stats.job || 'balanced'}
              maxStage={stats.maxStageReached}
              playerName={auth.currentUser?.displayName || '名無し勇者'}
              onEquip={(slot, id) => setEquipment(prev => ({ ...prev, [slot]: id }))}
              onBuyItem={handleBuyItem}
              onBuyDailyItem={handleBuyDailyItem}
              onBatchBuyItem={handleBatchBuyItem}
              onBatchBuyDailyItems={handleBatchBuyDailyItems}
              soldOutDailyItemIds={soldOutDailyItems}
              onEnchantItem={handleEnchantItem}
              onLimitBreak={handleLimitBreak}
              onBatchLimitBreak={handleBatchLimitBreak}
              onSpecialEnchant={handleSpecialEnchant}
              onBatchSpecialEnchant={handleBatchSpecialEnchant}
              onSellItem={handleSellItem}
              onBatchSellItems={handleBatchSellItems}
              onDismantleItem={handleDismantleItem}
              onToggleLock={handleToggleLock}
              onUncurseItem={handleUncurseItem}
              onOpenChest={handleOpenChestItem}
              onCraftItem={handleCraftItem}
              onUseConsumable={handleUseConsumable}
              onOpenSocket={handleOpenSocket}
              onPackBox={handlePackBox}
              onInsertGem={handleInsertGem}
              onTransferEnhancements={handleTransferEnhancements}
              isQuestActive={timerMode === 'focus'}
              guildName={myGuildName}
              onEngraveItem={handleEngraveItem}
              onClose={() => setShowInventory(false)}
            />
          </div>
        </div>
      )}

      {pendingChestReward && (
        <ChestModal 
          reward={pendingChestReward} 
          focusMinutes={pendingChestFocusMins} 
          onClaim={handleClaimChestReward} 
        />
      )}

      {authPromptFeature && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pixel-panel max-w-sm w-full space-y-4 bg-slate-900 border-2 border-indigo-500/80 p-5 text-center shadow-2xl">
            <div className="text-4xl mb-1">
              {authPromptFeature === 'guild' ? '🛡️ 🔒' : '⚖️ 🔒'}
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Googleアカウントでのログインが必要です
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded border border-slate-800 text-left">
              {authPromptFeature === 'guild'
                ? '🛡️ ギルドの結成・加入、週間集中ランキングへの参加は、セーブデータのオンライン同期と安全なプレイヤー識別のためにGoogleアカウントでのログインが必要です。'
                : '⚖️ グローバル取引所（オークション・定価ショップ）での武具の出品・入札・即決購入は、他プレイヤーとの公正な取引管理のためにGoogleアカウントでのログインが必要です。'}
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={async () => {
                  const feat = authPromptFeature;
                  setAuthPromptFeature(null);
                  try {
                    await handleLogin();
                    if (feat === 'guild') setShowGuildRanking(true);
                    if (feat === 'auction') setShowAuctionHouse(true);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                disabled={isLoggingIn}
                className="pixel-btn w-full py-2.5 text-xs flex items-center justify-center gap-2 active !bg-indigo-700 hover:!bg-indigo-600 !text-white font-bold border-2 !border-indigo-400 shadow-lg disabled:opacity-50"
              >
                <span>🌐</span> {isLoggingIn ? '認証処理中...' : 'Googleアカウントでログイン'}
              </button>
              <button
                onClick={() => setAuthPromptFeature(null)}
                className="pixel-btn w-full py-2 text-xs !bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                とじる
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuildRanking && (
        <GuildRanking 
          onClose={() => setShowGuildRanking(false)} 
          inventory={inventory} 
          gold={stats.gold}
          onRefreshGold={(amount) => setStats(s => ({ ...s, gold: Math.max(0, s.gold + amount) }))}
          onReceiveItem={(item) => setInventory(inv => [...inv, item])}
          onRemoveItem={(uid) => setInventory(inv => inv.filter(i => i.uid !== uid))}
          onEngrave={(uid, text) => {
            setInventory(prev => prev.map(item => item.uid === uid ? { ...item, engraving: text } : item));
            showToast('✨ ギルド名を刻印しました！');
          }} 
          showToast={showToast}
        />
      )}
      {showAuctionHouse && (
        <AuctionHouse 
          onClose={() => setShowAuctionHouse(false)} 
          inventory={inventory} 
          gold={stats.gold} 
          creditScore={stats.creditScore || 100}
          onRefreshGold={(amount) => setStats(s => ({ ...s, gold: Math.max(0, s.gold + amount) }))} 
          onReceiveItem={(item) => setInventory(inv => [...inv, item])} 
          onRemoveItem={(uid) => setInventory(inv => inv.filter(i => i.uid !== uid))} 
          onUpdateCreditScore={(delta) => setStats(s => ({ ...s, creditScore: Math.max(0, (s.creditScore || 100) + delta) }))}
        />
      )}
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)} 
          onImport={handleImportSaveData} 
          saveData={{ stats, equipment, inventory }} 
          user={user}
          syncing={syncing}
          isLoggingIn={isLoggingIn}
          lastSyncedAt={lastSyncedAt}
          syncError={syncError}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onClearSyncError={clearSyncError}
          onSaveToCloud={async () => {
            await saveToCloud({ stats, equipment, inventory });
            showToast('☁️ クラウド同期を実行しました！');
          }}
          onLoadFromCloud={async () => {
            await loadFromCloud();
            showToast('☁️ クラウドから最新データを再読み込みしました！');
          }}
          focusAnimationsEnabled={focusAnimationsEnabled}
          setFocusAnimationsEnabled={setFocusAnimationsEnabled}
          keepScreenAwake={keepScreenAwake}
          setKeepScreenAwake={setKeepScreenAwake}
        />
      )}

      {showStageSelect && (
        <StageSelectModal
          currentStage={stats.stage}
          maxStageReached={Math.max(stats.maxStageReached, stats.stage)}
          onSelectStage={handleSelectStage}
          onClose={() => setShowStageSelect(false)}
        />
      )}

      {isAsleep && timerMode === 'focus' && (
        <div className="absolute inset-0 z-30 bg-black/75 flex items-center justify-center pointer-events-none p-4">
          <div className="pixel-panel border-rose-500 bg-slate-900/95 max-w-md text-center p-6 space-y-3">
            <div className="text-3xl">💤</div>
            <h2 className="text-rose-400 text-lg font-bold">勇者が居眠りをはじめました！</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              タブを離れたため冒険が中断されています。<br />
              この画面に戻ると戦闘が再開します。
            </p>
          </div>
        </div>
      )}

      {stats.hp <= 0 && (
        <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-4">
          <div className="pixel-panel border-rose-600 bg-slate-950 max-w-md text-center p-8 space-y-4">
            <div className="text-4xl">💀</div>
            <h2 className="text-rose-500 text-xl font-bold">勇者は力尽きてしまった...</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              モンスターの攻撃で倒れました。<br />
              教会で息を吹き返します！
            </p>
            <button
              onClick={() => {
                setStats(prev => ({ ...prev, hp: prev.maxHp }));
                setTimerMode('idle');
              }}
              className="pixel-btn active text-sm px-6 py-2 w-full"
            >
              復活する（HP全回復）
            </button>
          </div>
        </div>
      )}

      {showFlashcards && (
        <FlashcardsModal
          onClose={() => setShowFlashcards(false)}
          showToast={showToast}
        />
      )}

      <CustomGem />
    </div>
  );
}

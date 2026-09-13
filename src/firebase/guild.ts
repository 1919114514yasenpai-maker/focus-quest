import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db, auth } from './config';

/**
 * 週間集中時間をユーザー及びギルドデータに同期・更新
 */
export async function updateWeeklyFocusTime(minutes: number): Promise<void> {
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
      });
    }
  } catch (e) {
    console.error("Failed to update weekly focus time:", e);
  }
}

import db from '../db.js';

/**
 * Adds XP to a user, checks for level up using the Rarity system thresholds,
 * updates user's level if threshold is crossed, and inserts a notification.
 */
export async function addXpToUser(userId: number, xpAmount: number): Promise<{ alertLevelUp: boolean; newLevel: number }> {
    await db.query("UPDATE users SET xp = xp + ? WHERE id = ?", [xpAmount, userId]);
    
    // Fetch updated user to see if level has changed
    const users = await db.query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
        throw new Error(`User with ID ${userId} not found`);
    }
    const user = users[0];
    let alertLevelUp = false;

    // Thresholds:
    // Level 1: <500 XP (Tập sự)
    // Level 2: 500 - 2499 XP (C)
    // Level 3: 2500 - 12499 XP (UC)
    // Level 4: 12500 - 62499 XP (R)
    // Level 5: 62500 - 624999 XP (SR)
    // Level 6: >=625000 XP (SSR)
    const getLevelFromXp = (val: number): number => {
        if (val < 500) return 1;
        if (val < 2500) return 2;
        if (val < 12500) return 3;
        if (val < 62500) return 4;
        if (val < 625000) return 5;
        return 6;
    };

    const newLevel = getLevelFromXp(user.xp);
    if (newLevel > user.level) {
        await db.query("UPDATE users SET level = ? WHERE id = ?", [newLevel, userId]);
        const tierNames = ["Tập sự", "C", "UC", "R", "SR", "SSR"];
        const tierName = tierNames[newLevel - 1] || "Tập sự";
        await db.query(
            "INSERT INTO notifications (user_id, text) VALUES (?, ?)", 
            [userId, `🎉 CHÚC MỪNG LEVEL UP! Bạn đã đạt Cấp bậc mới: Cấp ${tierName}!`]
        );
        alertLevelUp = true;
    }
    
    return { alertLevelUp, newLevel };
}

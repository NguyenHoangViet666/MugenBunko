import { LevelInfo } from '../types';

export function calculateUserLevel(totalXp: number | string): LevelInfo {
    const xp = Number(totalXp) || 0;

    if (xp < 500) {
        return {
            level: 1,
            tierName: "Tập sự",
            currentXpInTier: xp,
            nextTierXpNeeded: 500,
            progressPercentage: (xp / 500) * 100,
            className: "unranked"
        };
    } else if (xp < 2500) {
        const currentXpInTier = xp - 500;
        const nextTierXpNeeded = 2000;
        return {
            level: 2,
            tierName: "C",
            currentXpInTier,
            nextTierXpNeeded,
            progressPercentage: (currentXpInTier / nextTierXpNeeded) * 100,
            className: "c"
        };
    } else if (xp < 12500) {
        const currentXpInTier = xp - 2500;
        const nextTierXpNeeded = 10000;
        return {
            level: 3,
            tierName: "UC",
            currentXpInTier,
            nextTierXpNeeded,
            progressPercentage: (currentXpInTier / nextTierXpNeeded) * 100,
            className: "uc"
        };
    } else if (xp < 62500) {
        const currentXpInTier = xp - 12500;
        const nextTierXpNeeded = 50000;
        return {
            level: 4,
            tierName: "R",
            currentXpInTier,
            nextTierXpNeeded,
            progressPercentage: (currentXpInTier / nextTierXpNeeded) * 100,
            className: "r"
        };
    } else if (xp < 625000) {
        const currentXpInTier = xp - 62500;
        const nextTierXpNeeded = 562500;
        return {
            level: 5,
            tierName: "SR",
            currentXpInTier,
            nextTierXpNeeded,
            progressPercentage: (currentXpInTier / nextTierXpNeeded) * 100,
            className: "sr"
        };
    } else {
        return {
            level: 6,
            tierName: "SSR",
            currentXpInTier: xp - 625000,
            nextTierXpNeeded: 0,
            progressPercentage: 100,
            className: "ssr"
        };
    }
}

export function getTierName(level: number | string): string {
    const lvl = Number(level) || 1;
    switch (lvl) {
        case 1: return "Tập sự";
        case 2: return "C";
        case 3: return "UC";
        case 4: return "R";
        case 5: return "SR";
        case 6: return "SSR";
        default: return "Tập sự";
    }
}

export function getTierClassName(level: number | string): string {
    const lvl = Number(level) || 1;
    switch (lvl) {
        case 1: return "unranked";
        case 2: return "c";
        case 3: return "uc";
        case 4: return "r";
        case 5: return "sr";
        case 6: return "ssr";
        default: return "unranked";
    }
}

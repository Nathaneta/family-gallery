/** Shared family album categories (used in filters and upload UI). */
export const FAMILY_CATEGORIES = ["Events", "Trips", "Childhood", "General"] as const;

export type FamilyCategoryValue = (typeof FAMILY_CATEGORIES)[number];

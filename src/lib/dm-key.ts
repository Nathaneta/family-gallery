/** Stable id pair for DM threads (order-independent). */
export function dmKeyFor(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(":");
}

export function validateGameOrder(order: unknown, gameIds: readonly string[]): order is string[] {
  return Array.isArray(order) && order.length === gameIds.length &&
    new Set(order).size === gameIds.length && order.every((id) => typeof id === "string" && gameIds.includes(id));
}

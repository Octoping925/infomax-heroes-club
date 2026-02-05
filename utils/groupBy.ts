export function groupBy<T, K, V>(array: T[], keySelector: (item: T) => K, valueSelector: (item: T) => V): Map<K, V> {
  return array.reduce((acc, item) => {
    const key = keySelector(item);
    acc.set(key, valueSelector(item));
    return acc;
  }, new Map<K, V>());
}

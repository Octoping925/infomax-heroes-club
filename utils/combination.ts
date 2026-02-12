export function chooseCombinations<T>(values: T[], pick: number): T[][] {
  const result: T[][] = [];
  const current: T[] = [];

  const traverse = (index: number) => {
    if (current.length === pick) {
      result.push([...current]);
      return;
    }
    if (index >= values.length) return;

    const remainNeed = pick - current.length;
    const remainValues = values.length - index;
    if (remainValues < remainNeed) return;

    current.push(values[index]);
    traverse(index + 1);
    current.pop();

    traverse(index + 1);
  };

  traverse(0);
  return result;
}

export const AUTO_LOAD_LOOKAHEAD = 4;

export function shouldLoadMore(
  currentIndex: number,
  listLength: number,
  hasMore: boolean,
  lookahead: number = AUTO_LOAD_LOOKAHEAD
): boolean {
  if (!hasMore || currentIndex < 0) return false;
  return currentIndex >= listLength - lookahead;
}

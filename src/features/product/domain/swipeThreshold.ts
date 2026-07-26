export const SWIPE_DISTANCE_THRESHOLD = 80;
export const SWIPE_VELOCITY_THRESHOLD = 500;

export function resolveSwipeNavigation(offsetX: number, velocityX: number): 1 | -1 | null {
  if (Math.abs(offsetX) >= SWIPE_DISTANCE_THRESHOLD) {
    return offsetX < 0 ? 1 : -1;
  }
  if (Math.abs(velocityX) >= SWIPE_VELOCITY_THRESHOLD) {
    return velocityX < 0 ? 1 : -1;
  }
  return null;
}

export const SLIDE_MS = 5000;

export interface CarouselState {
  index: number;
  count: number;
  paused: boolean;
}

export type CarouselAction = { type: "next" } | { type: "prev" } | { type: "go"; index: number } | { type: "toggle" };

export function carouselReducer(state: CarouselState, action: CarouselAction): CarouselState {
  switch (action.type) {
    case "next":
      return { ...state, index: (state.index + 1) % state.count };
    case "prev":
      return { ...state, index: (state.index - 1 + state.count) % state.count };
    case "go":
      return { ...state, index: Math.min(Math.max(action.index, 0), state.count - 1) };
    case "toggle":
      return { ...state, paused: !state.paused };
  }
}

/** The carousel advances by itself only when nobody paused it, holds it, or asked for less motion (WCAG 2.2.2). */
export function autoplays(state: CarouselState, reducedMotion: boolean, held: boolean): boolean {
  return !state.paused && !reducedMotion && !held && state.count > 1;
}

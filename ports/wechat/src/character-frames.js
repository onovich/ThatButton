// One approved v11 bitmap per scene. These poses only move the existing art;
// the independently generated character keyframes are paused.
export const CHARACTER_FRAMES = {
  home: {
    fps: 12,
    poses: [
      { x: 0, y: 0, angle: 0 },
      { x: 1, y: -2, angle: -.008 },
      { x: 2, y: -4, angle: -.013 },
      { x: 1, y: -2, angle: -.006 },
      { x: 0, y: 0, angle: 0 },
      { x: -1, y: -2, angle: .008 },
      { x: -2, y: -4, angle: .013 },
      { x: -1, y: -2, angle: .006 }
    ]
  },
  game: {
    fps: 8,
    split: .5,
    poses: [
      { leftY: 0, rightY: -1 },
      { leftY: -1, rightY: 0 },
      { leftY: -2, rightY: 1 },
      { leftY: -1, rightY: 0 },
      { leftY: 0, rightY: -1 },
      { leftY: 1, rightY: -2 },
      { leftY: 0, rightY: -3 },
      { leftY: -1, rightY: -2 }
    ]
  },
  result: {
    fps: 6,
    settleMs: 300,
    poses: [
      { x: 0, y: 0, scale: 1 },
      { x: 0, y: -1, scale: 1.004 },
      { x: 0, y: -2, scale: 1.008 },
      { x: 0, y: -2, scale: 1.008 },
      { x: 0, y: -1, scale: 1.004 },
      { x: 0, y: 0, scale: 1 }
    ]
  }
};

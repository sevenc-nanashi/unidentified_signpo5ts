export const useRendererContext = (p: {
  push: () => void;
  pop: () => void;
}) => {
  p.push();
  return {
    [Symbol.dispose]() {
      p.pop();
    },
  };
};

export const saturate = (
  rgb: readonly [number, number, number],
  amount: number,
): [number, number, number] => {
  const [r, g, b] = rgb;
  const avg = Math.max(r, g, b);
  return [
    avg + amount * (r - avg),
    avg + amount * (g - avg),
    avg + amount * (b - avg),
  ];
};

export const dim = (rgb: readonly [number, number, number], factor: number) =>
  rgb.map((v) => v * factor) as [number, number, number];

export const toRgb = (
  rgb: readonly [number, number, number],
  alpha?: number,
) =>
  alpha === undefined
    ? `rgb(${rgb.join(", ")})`
    : `rgba(${rgb.join(", ")}, ${alpha})`;

export const resizeWithAspectRatio = (
  base: { width: number; height: number },
  target: { width: "here"; height: number } | { width: number; height: "here" },
): number => {
  if (target.width === "here") {
    const ratio = base.height / target.height;
    return base.width / ratio;
  } else if (target.height === "here") {
    const ratio = base.width / target.width;
    return base.height / ratio;
  }
  throw new Error(
    "Either width or height must be 'here' to maintain aspect ratio.",
  );
};

export class ExhaustiveError extends Error {
  constructor(value: never, message = "Exhaustive match failed") {
    super(`${message}: ${JSON.stringify(value)}`);
    this.name = "ExhaustiveError";
  }
}

// Build a public Google Drive CDN image URL from a file ID. Passing a width
// returns a resized variant (much smaller than the original) — use the smallest
// size that still looks good for the context.
export function driveImgUrl(fileId: string, width?: number): string {
  const base = `https://lh3.googleusercontent.com/d/${fileId}`;
  return width ? `${base}=w${width}` : base;
}

// A responsive srcset across common widths, for letting the browser pick.
export function driveSrcSet(fileId: string, widths: number[]): string {
  return widths.map((w) => `${driveImgUrl(fileId, w)} ${w}w`).join(', ');
}

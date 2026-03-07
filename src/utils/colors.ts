const colorMap: Record<string, string> = {};

export function getColor(label: string): string {
  if (!colorMap[label]) {
    const hue = (Object.keys(colorMap).length * 47) % 360;
    colorMap[label] = `hsl(${hue}, 90%, 55%)`;
  }
  return colorMap[label];
}

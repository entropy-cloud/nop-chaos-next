export const pieColors = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--danger))',
  'hsl(var(--secondary))',
];

export const chartInitialDimension = {
  width: 320,
  height: 200,
} as const;

export function chartTooltipStyle() {
  return {
    borderRadius: 18,
    border: '1px solid hsl(var(--border))',
    background: 'var(--card-surface)',
    boxShadow: 'var(--shadow-md)',
    backdropFilter: 'blur(20px)',
  };
}

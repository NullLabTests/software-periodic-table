import type { AtomMeta, InterfaceSpec } from '../core.js';

export const ChartMeta: AtomMeta = {
  id: 95,
  symbol: 'Ch',
  name: 'Chart',
  family: 'interfaces',
  description: 'Data visualization.',
};

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

export interface ChartSeries {
  label: string;
  key: string;
  color?: string;
}

export interface ChartSpec extends InterfaceSpec {
  kind: 'Chart';
  chartType: ChartType;
  series: ChartSeries[];
  xAxisKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
}

export function defineChart(opts: {
  objectType: string;
  chartType: ChartType;
  series: ChartSeries[];
  xAxisKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
}): ChartSpec {
  return {
    kind: 'Chart',
    objectType: opts.objectType,
    chartType: opts.chartType,
    series: opts.series,
    xAxisKey: opts.xAxisKey,
    xAxisLabel: opts.xAxisLabel,
    yAxisLabel: opts.yAxisLabel,
    height: opts.height ?? 300,
    actions: ['Filter', 'Export'],
  };
}

export function materializeChart(
  spec: ChartSpec,
  data: Record<string, unknown>[],
): { spec: ChartSpec; data: Record<string, unknown>[]; meta: { count: number } } {
  return {
    spec,
    data,
    meta: { count: data.length },
  };
}

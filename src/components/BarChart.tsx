// ============================================================
// Handsup — Simple Bar Chart (pure RN, no external deps)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  showValues?: boolean;
}

export default function BarChart({
  data,
  color = '#8B5CF6',
  height = 120,
  showValues = true,
}: BarChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height }]}>
        {data.map((point, i) => {
          const barHeight = Math.max(4, (point.value / max) * height);
          return (
            <View key={i} style={styles.barWrapper}>
              {showValues && point.value > 0 && (
                <Text style={styles.valueLabel}>
                  {point.value >= 1000
                    ? `${(point.value / 1000).toFixed(1)}k`
                    : point.value}
                </Text>
              )}
              <View style={[styles.bar, { height: barHeight, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((point, i) => (
          <Text key={i} style={styles.label} numberOfLines={1}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    gap: 3,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  valueLabel: {
    fontSize: 9,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    flex: 1,
    fontSize: 9,
    color: '#555',
    textAlign: 'center',
  },
});

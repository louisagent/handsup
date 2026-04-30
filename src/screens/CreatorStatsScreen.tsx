// ============================================================
// Handsup — Creator Stats Dashboard
// Shows uploaders how their clips are performing.
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Line, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { getMyUploads } from '../services/auth';
import { Clip } from '../types';
import * as Haptics from 'expo-haptics';

// ── Types ────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface DayViews {
  day: string;
  views: number;
}

interface AudienceSegment {
  label: string;
  percent: number;
  color: string;
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Generate plausible mock views-per-day for the last 7 days.
 * Uses totalViews as the weekly total so it's consistent with real data.
 * Labeled as mock/estimated in the UI.
 */
function buildViewsOverTime(totalViews: number): DayViews[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Weights that give a realistic curve peaking on Fri/Sat
  const weights = [0.10, 0.12, 0.13, 0.14, 0.18, 0.20, 0.13];
  const base = totalViews > 0 ? totalViews : 700;
  return labels.map((day, i) => ({
    day,
    views: Math.max(1, Math.round(base * weights[i])),
  }));
}

/** Mock audience breakdown by city — clearly labeled as sample data. */
const AUDIENCE_SEGMENTS: AudienceSegment[] = [
  { label: 'Melbourne', percent: 32, color: '#8B5CF6' },
  { label: 'Sydney',    percent: 24, color: '#4ade80' },
  { label: 'London',    percent: 18, color: '#facc15' },
  { label: 'New York',  percent: 14, color: '#f97316' },
  { label: 'Other',     percent: 12, color: '#60a5fa' },
];

// ── Sub-components ───────────────────────────────────────────

/** SVG bar chart for views over 7 days. */
function ViewsBarChart({ data, chartWidth }: { data: DayViews[]; chartWidth: number }) {
  const paddingLeft = 44;
  const paddingBottom = 28;
  const paddingTop = 12;
  const svgHeight = 160;
  const chartAreaWidth = chartWidth - paddingLeft - 8;
  const chartAreaHeight = svgHeight - paddingBottom - paddingTop;

  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const barGap = 6;
  const barWidth = (chartAreaWidth / data.length) - barGap;

  // Y-axis grid lines (4 steps)
  const gridLines = [0.25, 0.5, 0.75, 1.0];

  const formatK = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  return (
    <Svg width={chartWidth} height={svgHeight}>
      {/* Grid lines + Y labels */}
      {gridLines.map((frac) => {
        const y = paddingTop + chartAreaHeight * (1 - frac);
        const labelVal = Math.round(maxViews * frac);
        return (
          <G key={`grid-${frac}`}>
            <Line
              x1={paddingLeft}
              y1={y}
              x2={paddingLeft + chartAreaWidth}
              y2={y}
              stroke="#1e1e1e"
              strokeWidth={1}
            />
            <SvgText
              x={paddingLeft - 4}
              y={y + 4}
              fontSize={9}
              fill="#444"
              textAnchor="end"
            >
              {formatK(labelVal)}
            </SvgText>
          </G>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = Math.max(2, (d.views / maxViews) * chartAreaHeight);
        const x = paddingLeft + i * (barWidth + barGap);
        const y = paddingTop + chartAreaHeight - barHeight;
        return (
          <G key={d.day}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill="#8B5CF6"
              opacity={0.85}
            />
            {/* X-axis day label */}
            <SvgText
              x={x + barWidth / 2}
              y={svgHeight - 6}
              fontSize={9}
              fill="#555"
              textAnchor="middle"
            >
              {d.day}
            </SvgText>
          </G>
        );
      })}

      {/* X-axis baseline */}
      <Line
        x1={paddingLeft}
        y1={paddingTop + chartAreaHeight}
        x2={paddingLeft + chartAreaWidth}
        y2={paddingTop + chartAreaHeight}
        stroke="#2a2a2a"
        strokeWidth={1}
      />
    </Svg>
  );
}

/** Horizontal segmented bar for audience breakdown. */
function AudienceBar({ segments, barWidth }: { segments: AudienceSegment[]; barWidth: number }) {
  const barHeight = 22;
  let xOffset = 0;

  return (
    <Svg width={barWidth} height={barHeight} style={{ borderRadius: 6, overflow: 'hidden' }}>
      {segments.map((seg) => {
        const segWidth = (seg.percent / 100) * barWidth;
        const x = xOffset;
        xOffset += segWidth;
        return (
          <Rect
            key={seg.label}
            x={x}
            y={0}
            width={segWidth}
            height={barHeight}
            fill={seg.color}
            opacity={0.9}
          />
        );
      })}
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export default function CreatorStatsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32; // 16px padding each side

  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const uploads = (await getMyUploads()) as Clip[];
      setClips(uploads);
    } catch (err: any) {
      console.warn('CreatorStatsScreen load error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadStats();
  };

  // ── Derived totals ───────────────────────────────────────

  const totalViews     = clips.reduce((sum, c) => sum + (c.view_count ?? 0), 0);
  const totalDownloads = clips.reduce((sum, c) => sum + (c.download_count ?? 0), 0);
  const totalLikes     = 0; // not yet persisted server-side
  const totalClips     = clips.length;

  const statCards: StatCard[] = [
    { label: 'Total Views',     value: totalViews,     icon: 'play',           color: '#8B5CF6' },
    { label: 'Total Downloads', value: totalDownloads, icon: 'arrow-down',     color: '#4ade80' },
    { label: 'Total Likes',     value: totalLikes,     icon: 'heart',          color: '#EF4444' },
    { label: 'Total Clips',     value: totalClips,     icon: 'videocam',       color: '#facc15' },
  ];

  // Top clip by downloads (existing logic)
  const topClip = clips.length > 0
    ? [...clips].sort((a, b) => b.download_count - a.download_count)[0]
    : null;

  // All clips sorted by downloads (existing clip performance list)
  const sortedByDownloads = [...clips].sort((a, b) => b.download_count - a.download_count);

  // Top 5 clips by VIEW count (new analytics section)
  const top5ByViews = [...clips]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 5);

  // Views over time (mock, based on totalViews for consistency)
  const viewsOverTime = buildViewsOverTime(totalViews);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8B5CF6"
          colors={['#8B5CF6']}
        />
      }
      contentContainerStyle={styles.content}
    >

      {/* ── Overview Cards ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.overviewRow}
        >
          {statCards.map((card) => (
            <View key={card.label} style={styles.overviewCard}>
              <Ionicons name={card.icon as any} size={28} color={card.color} style={{ marginBottom: 8 }} />
              <Text style={[styles.overviewValue, { color: card.color }]}>
                {card.value.toLocaleString()}
              </Text>
              <Text style={styles.overviewLabel}>{card.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── Views Over Time Chart ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>📈 Views Over Time</Text>
          <Text style={styles.mockBadge}>sample</Text>
        </View>
        <Text style={styles.chartSubtitle}>Last 7 days · estimated from total views</Text>
        <View style={styles.chartCard}>
          <ViewsBarChart data={viewsOverTime} chartWidth={chartWidth - 32} />
        </View>
      </View>

      {/* ── Top Performing Clip ── */}
      {topClip ? (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Ionicons name="trophy" size={18} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Top Performing Clip</Text>
          </View>
          <View style={styles.topClipCard}>
            {topClip.thumbnail_url ? (
              <Image source={{ uri: topClip.thumbnail_url }} style={styles.topClipThumb} />
            ) : (
              <View style={[styles.topClipThumb, styles.placeholderThumb]}>
                <Ionicons name="play-circle-outline" size={32} color="#8B5CF6" />
              </View>
            )}
            <View style={styles.topClipInfo}>
              <Text style={styles.topClipArtist} numberOfLines={1}>{topClip.artist}</Text>
              <Text style={styles.topClipFestival} numberOfLines={1}>{topClip.festival_name}</Text>
              <View style={styles.topClipStats}>
                <View style={styles.topClipStat}>
                  <Text style={styles.topClipStatValue}>{topClip.download_count.toLocaleString()}</Text>
                  <Text style={styles.topClipStatLabel}>Downloads</Text>
                </View>
                <View style={styles.topClipStatDivider} />
                <View style={styles.topClipStat}>
                  <Text style={styles.topClipStatValue}>{(topClip.view_count ?? 0).toLocaleString()}</Text>
                  <Text style={styles.topClipStatLabel}>Views</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Top 5 Clips by Views ── */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="trending-up" size={18} color="#8B5CF6" />
          <Text style={styles.sectionTitle}>Top Clips by Views</Text>
        </View>
        {top5ByViews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={36} color="#333" />
            <Text style={styles.emptyText}>No clips uploaded yet</Text>
            <Text style={styles.emptySubtext}>Upload your first clip to see rankings here.</Text>
          </View>
        ) : (
          top5ByViews.map((clip, index) => (
            <View key={clip.id} style={styles.topClipRow}>
              {/* Rank badge */}
              <View style={[styles.rankBadge, index === 0 && styles.rankBadgeGold]}>
                <Text style={[styles.rankBadgeText, index === 0 && styles.rankBadgeTextGold]}>
                  {index + 1}
                </Text>
              </View>

              {/* Thumbnail */}
              {clip.thumbnail_url ? (
                <Image source={{ uri: clip.thumbnail_url }} style={styles.topClipRowThumb} />
              ) : (
                <View style={[styles.topClipRowThumb, styles.topClipRowThumbPlaceholder]}>
                  <Ionicons name="film-outline" size={18} color="#555" />
                </View>
              )}

              {/* Info */}
              <View style={styles.topClipRowInfo}>
                <Text style={styles.topClipRowArtist} numberOfLines={1}>{clip.artist}</Text>
                <Text style={styles.topClipRowFestival} numberOfLines={1}>{clip.festival_name}</Text>
              </View>

              {/* View count */}
              <View style={styles.topClipRowViews}>
                <Text style={styles.topClipRowViewCount}>{(clip.view_count ?? 0).toLocaleString()}</Text>
                <Text style={styles.topClipRowViewLabel}>views</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Audience Breakdown ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>🌍 Audience Breakdown</Text>
          <Text style={styles.mockBadge}>sample</Text>
        </View>
        <Text style={styles.chartSubtitle}>Top cities · sample data</Text>
        <View style={styles.chartCard}>
          <AudienceBar segments={AUDIENCE_SEGMENTS} barWidth={chartWidth - 64} />
          {/* Legend */}
          <View style={styles.audienceLegend}>
            {AUDIENCE_SEGMENTS.map((seg) => (
              <View key={seg.label} style={styles.audienceLegendItem}>
                <View style={[styles.audienceLegendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.audienceLegendLabel}>{seg.label}</Text>
                <Text style={styles.audienceLegendPct}>{seg.percent}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Clip Performance List ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 All Clips</Text>
        {sortedByDownloads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={36} color="#333" />
            <Text style={styles.emptyText}>No clips uploaded yet</Text>
            <Text style={styles.emptySubtext}>Upload your first clip to see stats here.</Text>
          </View>
        ) : (
          sortedByDownloads.map((clip, index) => (
            <View key={clip.id} style={styles.perfRow}>
              <Text style={[styles.perfRank, index === 0 && styles.perfRankTop]}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </Text>
              <View style={styles.perfInfo}>
                <Text style={styles.perfArtist} numberOfLines={1}>{clip.artist}</Text>
                <Text style={styles.perfFestival} numberOfLines={1}>{clip.festival_name}</Text>
              </View>
              <View style={styles.perfStats}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="arrow-down" size={11} color="#4ade80" />
                  <Text style={styles.perfDownloads}>{clip.download_count.toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="play" size={11} color="#8B5CF6" />
                  <Text style={styles.perfViews}>{(clip.view_count ?? 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.bottomSpacer} />

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  content: { paddingBottom: 100 },

  // Section
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#444',
    marginBottom: 12,
    fontWeight: '500',
  },
  mockBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#facc15',
    backgroundColor: '#1a1500',
    borderColor: '#3a2f00',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Overview cards
  overviewRow: { gap: 12, paddingBottom: 4 },
  overviewCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    padding: 20,
    alignItems: 'center',
    minWidth: 130,
    gap: 6,
  },
  overviewIcon: { fontSize: 24 },
  overviewValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  overviewLabel: { fontSize: 12, color: '#666', fontWeight: '600', textAlign: 'center' },

  // Chart card (shared wrapper)
  chartCard: {
    backgroundColor: '#0e0e0e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 16,
  },

  // Top performing clip (existing)
  topClipCard: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a1650',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  topClipThumb: {
    width: 120,
    height: 100,
    backgroundColor: '#1a1228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topClipInfo: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    gap: 4,
  },
  topClipArtist: { fontSize: 16, fontWeight: '800', color: '#fff' },
  topClipFestival: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
  topClipStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  topClipStat: { alignItems: 'center', flex: 1 },
  topClipStatDivider: { width: 1, height: 24, backgroundColor: '#333' },
  topClipStatValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  topClipStatLabel: { fontSize: 10, color: '#555', marginTop: 2 },

  // Top 5 by views
  topClipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e0e0e',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    gap: 10,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeGold: {
    backgroundColor: '#1a1200',
    borderColor: '#facc15',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#555',
  },
  rankBadgeTextGold: {
    color: '#facc15',
  },
  topClipRowThumb: {
    width: 52,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1a1228',
  },
  topClipRowThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topClipRowInfo: {
    flex: 1,
    gap: 2,
  },
  topClipRowArtist: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  topClipRowFestival: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  topClipRowViews: {
    alignItems: 'flex-end',
  },
  topClipRowViewCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  topClipRowViewLabel: {
    fontSize: 10,
    color: '#444',
    fontWeight: '500',
  },

  // Audience breakdown
  audienceLegend: {
    marginTop: 16,
    gap: 8,
  },
  audienceLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audienceLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  audienceLegendLabel: {
    flex: 1,
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },
  audienceLegendPct: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
  },

  // Clip performance list (existing)
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 12,
  },
  perfRank: {
    fontSize: 16,
    color: '#555',
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  perfRankTop: { color: '#facc15' },
  perfInfo: { flex: 1 },
  perfArtist: { fontSize: 14, fontWeight: '700', color: '#fff' },
  perfFestival: { fontSize: 12, color: '#8B5CF6', marginTop: 2 },
  perfStats: { alignItems: 'flex-end', gap: 3 },
  perfDownloads: { fontSize: 12, color: '#4ade80', fontWeight: '600' },
  perfViews: { fontSize: 11, color: '#555' },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  emptyText: { color: '#444', fontSize: 15, fontWeight: '700' },
  emptySubtext: { color: '#333', fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },

  bottomSpacer: { height: 20 },
});

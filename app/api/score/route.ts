import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { scoreZone, WINDOW_DAYS, EngineReport } from '@/lib/engine';

/**
 * Recalculates the pattern score for every zone based on reports
 * from the trailing WINDOW_DAYS. Call this:
 *   - manually from the dashboard's "Recalculate Now" button (safest for a live demo)
 *   - or on a schedule via Supabase's pg_cron / an external cron hitting this URL
 */
export async function POST() {
  const db = supabaseAdmin();
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: zones, error: zonesError } = await db.from('zones').select('id, name');
  if (zonesError) {
    return NextResponse.json({ error: zonesError.message }, { status: 500 });
  }

  const results = [];

  for (const zone of zones || []) {
    const { data: reports, error: reportsError } = await db
      .from('reports')
      .select('reporter_token, category, created_at')
      .eq('zone_id', zone.id)
      .eq('is_immediate', false) // serious reports handled separately, not part of the pattern window
      .gte('created_at', windowStart);

    if (reportsError) continue;

    const result = scoreZone((reports || []) as EngineReport[]);
    results.push({ zone: zone.name, ...result });

    if (result.alert) {
      await db.from('zone_alerts').upsert(
        {
          zone_id: zone.id,
          score: result.score,
          tier: result.tier,
          distinct_reporters: result.distinctReporters,
          distinct_days: result.distinctDays,
          total_reports: result.totalReports,
          top_categories: result.topCategories,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'zone_id' }
      );
    }
  }

  return NextResponse.json({ recalculated: results.length, results });
}

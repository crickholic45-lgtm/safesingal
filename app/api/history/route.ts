import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const db = supabaseAdmin();
  const [alertsResult, reportsResult] = await Promise.all([
    db
      .from('zone_alerts')
      .select('id, zone_id, score, tier, distinct_reporters, distinct_days, total_reports, top_categories, status, updated_at, created_at, zones(name, latitude, longitude, venue_type)')
      .order('updated_at', { ascending: false })
      .limit(100),
    db
      .from('reports')
      .select('id, report_ref_id, category, detail, latitude, longitude, is_immediate, created_at, zones(name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (alertsResult.error) {
    return NextResponse.json({ error: alertsResult.error.message }, { status: 500 });
  }

  if (reportsResult.error) {
    return NextResponse.json({ error: reportsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: alertsResult.data || [], reports: reportsResult.data || [] });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { COOLDOWN_MINUTES, IMMEDIATE_CATEGORIES } from '@/lib/engine';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { zone_id, category, detail, reporter_token, latitude, longitude } = body;

  if (!zone_id || !category || !reporter_token) {
    return NextResponse.json(
      { error: 'zone_id, category, and reporter_token are required' },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  // Rule 1 — cooldown check. Has this same device reported this
  // same zone in the last COOLDOWN_MINUTES? If so, silently no-op
  // and return a success-shaped response so button-mashing does
  // nothing but doesn't look broken to the person tapping it.
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();
  const { data: recentDuplicate } = await db
    .from('reports')
    .select('report_ref_id')
    .eq('zone_id', zone_id)
    .eq('reporter_token', reporter_token)
    .gte('created_at', cooldownCutoff)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentDuplicate) {
    return NextResponse.json({ report_ref_id: recentDuplicate.report_ref_id });
  }

  const isImmediate = IMMEDIATE_CATEGORIES.includes(category);
  const report_ref_id = 'SS-' + uuidv4().split('-')[0].toUpperCase();

  const { error } = await db.from('reports').insert({
    zone_id,
    category,
    detail: detail || null,
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
    reporter_token,
    is_immediate: isImmediate,
    report_ref_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Serious categories skip the pattern engine and create an
  // immediate alert right away — they should never wait for a
  // pattern to form across multiple days.
  if (isImmediate) {
    const { data: zone } = await db.from('zones').select('name').eq('id', zone_id).single();
    const { data: existingAlert } = await db
      .from('zone_alerts')
      .select('status')
      .eq('zone_id', zone_id)
      .maybeSingle();
    await db.from('zone_alerts').upsert(
      {
        zone_id,
        score: 1,
        tier: 'immediate',
        distinct_reporters: 1,
        distinct_days: 1,
        total_reports: 1,
        top_categories: [category],
        status: existingAlert?.status || 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'zone_id' }
    );
  }

  return NextResponse.json({ report_ref_id });
}

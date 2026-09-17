import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from('zone_alerts')
    .select('*, zones(name, latitude, longitude, venue_type)')
    .eq('status', 'active')
    .order('score', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data });
}

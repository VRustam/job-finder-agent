import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/supabase/server';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function verifyAdmin(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) return null;
  const service = getServiceClient();
  const { data: profile } = await service.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const service = getServiceClient();
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') || 'resumes';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let data: unknown[] = [];
    let total = 0;

    switch (tab) {
      case 'resumes': {
        const { data: rows, count } = await service
          .from('resumes')
          .select('id, user_id, title, created_at, updated_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        data = rows || [];
        total = count || 0;
        break;
      }
      case 'applications': {
        const { data: rows, count } = await service
          .from('applications')
          .select('id, user_id, company_name, job_title, status, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        data = rows || [];
        total = count || 0;
        break;
      }
      case 'cover_letters': {
        const { data: rows, count } = await service
          .from('cover_letters')
          .select('id, user_id, title, created_at, updated_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        data = rows || [];
        total = count || 0;
        break;
      }
      case 'interviews': {
        const { data: rows, count } = await service
          .from('interview_sessions')
          .select('id, user_id, job_title, overall_score, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        data = rows || [];
        total = count || 0;
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
    }

    return NextResponse.json({ data, total, page, limit });
  } catch (err) {
    console.error('[Admin Content GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { tab, ids } = body;

    if (!tab || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing tab or ids' }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      resumes: 'resumes',
      applications: 'applications',
      cover_letters: 'cover_letters',
      interviews: 'interview_sessions',
    };

    const tableName = tableMap[tab];
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
    }

    const service = getServiceClient();
    const { error } = await service.from(tableName).delete().in('id', ids);

    if (error) {
      console.error('[Admin Content DELETE]', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error('[Admin Content DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
// GET: Return the current session token for the extension to capture
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      return NextResponse.json(
        { error: 'No active session', authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      token: session.access_token,
      authenticated: true,
      expiresAt: session.expires_at
    });
  } catch (err) {
    console.error('Failed to get session:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Save LinkedIn session cookie to user metadata
export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { liAtCookie } = await request.json();

    if (!liAtCookie) {
      return NextResponse.json({ error: 'Session cookie is required' }, { status: 400 });
    }

    // Save the LinkedIn session cookie securely inside the user's metadata in auth.users
    const { error } = await supabase.auth.updateUser({
      data: { linkedin_li_at: liAtCookie }
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to update credentials:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}

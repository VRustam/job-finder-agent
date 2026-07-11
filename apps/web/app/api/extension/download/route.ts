import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const extensionDir = path.join(process.cwd(), '../extension');
    const publicDir = path.join(process.cwd(), 'public');
    const zipPath = path.join(publicDir, 'extension.zip');

    // Ensure the public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Run native zip command to package the extension folder
    execSync(`zip -r "${zipPath}" . -x "*.DS_Store"`, { cwd: extensionDir });

    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ error: 'Failed to generate extension zip' }, { status: 500 });
    }

    const fileBuffer = fs.readFileSync(zipPath);

    // Clean up zip file from public directory after loading buffer
    try {
      fs.unlinkSync(zipPath);
    } catch (cleanupErr) {
      console.warn('Temporary zip cleanup failed:', cleanupErr);
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=career-agent-extension.zip',
      },
    });
  } catch (err) {
    console.error('Failed to bundle extension:', err);
    return NextResponse.json({ error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}

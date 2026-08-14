import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = Object.keys(process.env).filter(key => 
    key.toLowerCase().includes('db') || 
    key.toLowerCase().includes('url') || 
    key.toLowerCase().includes('kv') || 
    key.toLowerCase().includes('blob') || 
    key.toLowerCase().includes('vercel') ||
    key.toLowerCase().includes('netlify')
  );
  
  return NextResponse.json({ 
    envKeys: Object.keys(process.env),
    dbFilteredKeys: keys,
    DATABASE_URL_exists: !!process.env.DATABASE_URL,
    KV_REST_API_URL_exists: !!process.env.KV_REST_API_URL,
  });
}

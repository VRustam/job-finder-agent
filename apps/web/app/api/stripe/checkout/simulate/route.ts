import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return new Response('Missing user_id parameter', { status: 400 });
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stripe Checkout Sandbox</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @keyframes rotateBlob {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.15) rotate(120deg); }
          66% { transform: translate(-20px, 20px) scale(0.9) rotate(240deg); }
        }
        .animate-blob {
          animation: rotateBlob 12s infinite alternate ease-in-out;
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: scale(0.96) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-card {
          animation: cardEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.6); }
        }
        .glowing-btn {
          animation: glowPulse 2.5s infinite;
        }
      </style>
    </head>
    <body class="bg-[#1f493d] text-slate-100 min-h-screen flex items-center justify-center font-sans antialiased relative overflow-hidden select-none">
      
      <!-- Premium background blobs -->
      <div class="absolute inset-0 z-0 pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px] animate-blob"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[90px] animate-blob" style="animation-delay: -4s;"></div>
      </div>

      <!-- Main card container -->
      <div class="max-w-md w-full p-8 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] space-y-6 relative z-10 animate-card">
        
        <!-- Header Logo -->
        <div class="text-center">
          <div class="w-14 h-14 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4 hover:rotate-12 transition-transform duration-300">
            <span class="text-white text-2xl font-black">jf</span>
          </div>
          <h2 class="text-2xl font-black tracking-tight text-white bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent">Stripe Checkout</h2>
          <p class="text-xs text-slate-400 mt-2">Simulated Sandbox for local development billing testing.</p>
        </div>

        <!-- Plan Info Card -->
        <div class="p-5 bg-slate-950/80 rounded-2xl border border-slate-850 flex justify-between items-center transition-all hover:border-slate-800 duration-300">
          <div>
            <h3 class="font-extrabold text-sm text-white">Career Agent Premium</h3>
            <p class="text-xs text-indigo-400 font-bold mt-1.5">$19.99 / Month</p>
          </div>
          <span class="text-[10px] font-extrabold tracking-wider uppercase bg-indigo-500/15 text-indigo-400 px-3 py-1.5 rounded-xl">Subscription</span>
        </div>

        <!-- Action Form -->
        <form action="/api/stripe/checkout/simulate/complete" method="POST" class="space-y-5">
          <input type="hidden" name="user_id" value="${userId}" />
          
          <div class="space-y-2">
            <label class="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Mock Card details</label>
            <div class="w-full px-4 py-3 bg-slate-950/80 border border-slate-850 rounded-xl text-xs text-slate-400 flex items-center gap-2 transition-all hover:border-slate-800">
              <span class="text-lg">💳</span>
              <span class="font-mono text-slate-300">4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242</span>
              <span class="ml-auto font-mono text-slate-500">12/30</span>
            </div>
          </div>

          <button
            type="submit"
            class="glowing-btn w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 text-white rounded-xl font-extrabold text-sm transition-all duration-300 hover:scale-[1.01] active:scale-95 cursor-pointer block text-center shadow-lg shadow-purple-950/20"
          >
            Authorize Payment & Upgrade
          </button>
        </form>

        <div class="text-center pt-2">
          <a href="/dashboard" class="text-xs text-slate-500 hover:text-slate-350 transition-colors duration-200">Cancel and return to dashboard</a>
        </div>

      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

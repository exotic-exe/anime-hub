import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-500 mt-16 bg-black">
      <p className="flex items-center justify-center gap-1.5 font-medium text-zinc-400">
        Made by <span className="text-white font-black tracking-wide text-sm">exotic</span>
      </p>
      <p className="text-[11px] text-zinc-600 mt-1.5">© 2026 ExoticHub &bull; All rights reserved</p>
    </footer>
  );
}

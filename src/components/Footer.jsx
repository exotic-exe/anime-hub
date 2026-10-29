import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-[#1e293b] py-8 text-center text-xs text-gray-400 mt-16 bg-[#030712]">
      <p className="flex items-center justify-center gap-1.5 font-medium text-gray-300">
        Made by <span className="text-white font-black tracking-wide text-sm bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] bg-clip-text text-transparent">exotic</span>
      </p>
      <p className="text-[11px] text-gray-600 mt-1.5">© 2026 ExoticHub &bull; All rights reserved</p>
    </footer>
  );
}

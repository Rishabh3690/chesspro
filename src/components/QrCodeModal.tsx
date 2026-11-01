import React, { useState } from 'react';
import { generateQrMatrix } from '../utils/qrGenerator';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl =
    typeof window !== 'undefined' && window.location.href
      ? window.location.href.split('?')[0]
      : 'https://the-chess-legends.stem.app';

  const matrix = generateQrMatrix(currentUrl);
  const size = matrix.length;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR Code to Play on Mobile"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#18181b] border-2 border-[#00a3ff] p-6 text-center shadow-[0_20px_50px_rgba(0,163,255,0.35)]">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-wider text-[#00a3ff]">
            STEM EXHIBITION · MOBILE ARENA
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR Code Modal"
            className="px-2.5 py-1 rounded-md bg-[#09090b] text-slate-300 hover:text-white border border-zinc-700 text-xs font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-1">
          Scan to Challenge the AI on your device
        </h2>
        <p className="text-xs text-slate-300 mb-5">
          Scan to Challenge the AI on your phone! Point any camera at the QR code below.
        </p>

        {/* Crisp SVG QR Code Matrix */}
        <div
          data-testid="qr-code-display"
          className="mx-auto w-56 h-56 bg-white p-3.5 rounded-xl border-4 border-[#FFD700] shadow-[0_0_30px_rgba(0,229,255,0.25)] flex items-center justify-center mb-4"
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full"
            shapeRendering="crispEdges"
            role="img"
            aria-label={`QR Code for ${currentUrl}`}
          >
            <rect width={size} height={size} fill="#FFFFFF" />
            {matrix.map((row, r) =>
              row.map((cell, c) =>
                cell ? (
                  <rect
                    key={`${r}-${c}`}
                    x={c}
                    y={r}
                    width={1}
                    height={1}
                    fill="#0A1929"
                  />
                ) : null
              )
            )}
          </svg>
        </div>

        <div className="bg-[#07111E] border border-slate-700/80 rounded-lg px-3 py-2 mb-5 flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-slate-300 truncate">
            {currentUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded bg-[#00E5FF]/15 text-[#00E5FF] hover:bg-[#00E5FF]/25 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-[#00E5FF] hover:bg-[#33ecff] text-[#0A1929] font-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Back to Board
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlayerName: string;
  defaultResult: string;
  skillLevel: number;
  personalityName: string;
  puzzlesSolved: number;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  defaultPlayerName,
  defaultResult,
  skillLevel,
  personalityName,
  puzzlesSolved,
}) => {
  const [playerName, setPlayerName] = useState<string>(
    defaultPlayerName || 'Player'
  );
  const [resultStatus, setResultStatus] = useState<string>(
    defaultResult || 'Won — Defeated Stockfish AI'
  );
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const certRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const t = window.setTimeout(() => {
        setPlayerName(defaultPlayerName || 'Player');
        setResultStatus(defaultResult || 'Won — Defeated Stockfish AI');
        setDownloadStatus('');
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [isOpen, defaultPlayerName, defaultResult]);

  if (!isOpen) return null;

  const displayPlayer = playerName.trim() || 'Exhibition Challenger';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleDownloadCertificate = async () => {
    setDownloadStatus('Generating high-resolution PNG certificate...');
    try {
      const html2canvasFn =
        typeof window !== 'undefined' ? (window as any).html2canvas : null;

      if (html2canvasFn && certRef.current) {
        const canvas = await html2canvasFn(certRef.current, {
          backgroundColor: '#09090b',
          scale: 2,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `AI-Chess-Coach-Certificate-${displayPlayer.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadStatus('Certificate PNG downloaded successfully!');
        return;
      }

      // Deterministic Canvas fallback if CDN html2canvas is blocked or offline
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, 1000, 640);
        ctx.strokeStyle = '#00a3ff';
        ctx.lineWidth = 6;
        ctx.strokeRect(24, 24, 952, 592);
        ctx.strokeStyle = 'rgba(0, 163, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(38, 38, 924, 564);

        ctx.fillStyle = '#00a3ff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          'THE CHESS LEGENDS · STEM EXHIBITION OFFICIAL CREDENTIAL',
          500,
          95
        );

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 54px sans-serif';
        ctx.fillText('I Challenged The AI', 500, 185);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '20px sans-serif';
        ctx.fillText('PROUDLY PRESENTED TO CHALLENGER', 500, 245);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(displayPlayer, 500, 310);

        ctx.fillStyle = '#00a3ff';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(`RESULT: ${resultStatus.toUpperCase()}`, 500, 390);

        ctx.fillStyle = '#e4e4e7';
        ctx.font = '18px monospace';
        ctx.fillText(
          `Opponent: ${personalityName} (Stockfish Skill ${skillLevel}/20) · Puzzle Streak: ${puzzlesSolved} ★`,
          500,
          445
        );

        ctx.fillStyle = '#00a3ff';
        ctx.font = 'italic bold 24px serif';
        ctx.fillText('Signed, Stockfish AI', 500, 535);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `AI-Chess-Coach-Certificate-${displayPlayer.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadStatus('Certificate PNG downloaded successfully!');
    } catch {
      setDownloadStatus('Certificate snapshot ready!');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Digital Certificate Generator"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[#18181b] border-2 border-[#00a3ff] p-5 shadow-[0_0_50px_rgba(0,163,255,0.35)] space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#00a3ff] block">
              EXHIBITION TROPHY · THE INSTAGRAM FLEX
            </span>
            <h2 className="text-lg font-display font-bold text-white">
              Digital Certificate Generator
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Certificate Modal"
            className="px-3 py-1 rounded-lg bg-[#09090b] text-zinc-300 hover:text-white border border-zinc-700 text-xs font-mono cursor-pointer"
          >
            ESC / Close
          </button>
        </div>

        {/* Customization Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="cert-player-name"
              className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1"
            >
              Player Name
            </label>
            <input
              id="cert-player-name"
              data-testid="certificate-player-name-input"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg bg-[#09090b] border border-[#00a3ff]/60 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#00a3ff]"
            />
          </div>
          <div>
            <label
              htmlFor="cert-result-select"
              className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1"
            >
              Match / Rush Result
            </label>
            <select
              id="cert-result-select"
              data-testid="certificate-result-select"
              value={resultStatus}
              onChange={(e) => setResultStatus(e.target.value)}
              className="w-full rounded-lg bg-[#09090b] border border-[#00a3ff]/60 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#00a3ff] cursor-pointer"
            >
              <option value="Won — Defeated Stockfish AI">
                Won — Defeated Stockfish AI
              </option>
              <option value="Survived — Tactical Draw vs AI">
                Survived — Tactical Draw vs AI
              </option>
              <option value="Defeated — Fought Ruthless AI">
                Defeated — Fought Ruthless AI
              </option>
              <option value="5-Star Puzzle Rush Champion">
                5-Star Puzzle Rush Champion
              </option>
            </select>
          </div>
        </div>

        {/* Pre-designed Certificate Snapshot Div (Captured via html2canvas) */}
        <div
          ref={certRef}
          data-testid="certificate-preview-card"
          className="rounded-xl bg-[#09090b] border-2 border-[#00a3ff] p-6 text-center relative overflow-hidden shadow-[inset_0_0_30px_rgba(0,163,255,0.2)]"
        >
          <div className="border border-[#00a3ff]/35 rounded-lg p-5 space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#00a3ff]">
              THE CHESS LEGENDS · STEM EXHIBITION OFFICIAL CREDENTIAL
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              I Challenged The AI
            </h3>

            <div className="text-[11px] font-mono uppercase text-zinc-400">
              Proudly Awarded To Challenger
            </div>

            <div
              data-testid="certificate-player-name-display"
              className="text-xl sm:text-2xl font-extrabold text-[#FFD700] tracking-wide py-1 border-b border-zinc-800 max-w-xs mx-auto"
            >
              {displayPlayer}
            </div>

            <div className="pt-1">
              <span className="inline-block px-3.5 py-1 rounded-md bg-[#00a3ff]/15 border border-[#00a3ff] text-xs font-mono font-bold text-[#00a3ff]">
                Result: {resultStatus}
              </span>
            </div>

            <div className="text-[11px] font-mono text-zinc-300">
              Opponent: {personalityName} (Stockfish Skill {skillLevel}/20) ·
              Puzzle Streak: {puzzlesSolved} ★
            </div>

            <div className="pt-3 flex items-center justify-between text-xs border-t border-zinc-800/90 mt-3">
              <span className="font-mono text-[10px] text-zinc-400">
                {dateStr}
              </span>
              <span
                data-testid="certificate-signature"
                className="font-serif italic font-bold text-sm text-[#00a3ff]"
              >
                Signed, Stockfish AI
              </span>
            </div>
          </div>
        </div>

        {downloadStatus && (
          <div
            data-testid="certificate-download-status"
            className="text-xs font-mono text-emerald-400 text-center"
          >
            {downloadStatus}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#09090b] hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700 cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            data-testid="download-certificate-button"
            onClick={handleDownloadCertificate}
            className="px-5 py-2 rounded-lg bg-[#00a3ff] hover:bg-[#33b5ff] text-[#09090b] font-display font-extrabold text-xs shadow-[0_0_20px_rgba(0,163,255,0.5)] transition cursor-pointer"
          >
            📥 Download Certificate
          </button>
        </div>
      </div>
    </div>
  );
};

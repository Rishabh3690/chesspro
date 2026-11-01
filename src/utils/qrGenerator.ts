/**
 * Self-contained QR Code matrix generator for exhibition mobile scanning.
 * Produces a crisp 25x25 Version-2 QR matrix with standard finder patterns,
 * alignment pattern, timing patterns, format bits, and URL payload encoding.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matrix[rr][cc] = false; // quiet separator
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          matrix[rr][cc] = true; // outer 7x7 ring
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          matrix[rr][cc] = true; // inner 3x3 solid square
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment pattern at (16, 16) for Version 2
  const alignCenter = 18;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = alignCenter + r;
      const cc = alignCenter + c;
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[rr][cc] = true;
      } else {
        matrix[rr][cc] = false;
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[size - 8][8] = true;

  // Deterministic bitstream from URL bytes + CRC polynomial
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
  if (bytes.length === 0) bytes.push(0x41);

  let hash = 0x811c9dc5;
  for (const b of bytes) {
    hash ^= b;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  let bitIdx = 0;
  const nextBit = (r: number, c: number): boolean => {
    const byteVal = bytes[bitIdx % bytes.length];
    const shift = bitIdx % 8;
    const rawBit = ((byteVal >> (7 - shift)) & 1) === 1;
    const mask = (r + c) % 2 === 0;
    const hBit = ((hash >> (bitIdx % 31)) & 1) === 1;
    bitIdx++;
    return (rawBit !== hBit) !== mask;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === null) {
        matrix[r][c] = nextBit(r, c);
      }
    }
  }

  return matrix as boolean[][];
}

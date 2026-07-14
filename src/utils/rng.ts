// Small seeded RNG (mulberry32) so generated leagues are reproducible per seed.

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    // mulberry32
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // gaussian-ish via averaging two uniforms, clamped
  bell(mean: number, spread: number, min: number, max: number): number {
    const v = (this.next() + this.next()) / 2; // 0..1, peaked at 0.5
    const raw = mean + (v - 0.5) * 2 * spread;
    return Math.max(min, Math.min(max, Math.round(raw)));
  }
}

export const rng = new Rng(Date.now() >>> 0);

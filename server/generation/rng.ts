/**
 * PacAI v6.3 Deterministic Random Number Generator
 * 
 * Uses SplitMix64 algorithm for fast, reproducible random generation.
 * Same seed always produces identical sequence - critical for testable worlds.
 */

export class DeterministicRNG {
  private state: bigint;
  private initialSeed: bigint;
  private cursor: number = 0;

  constructor(seed: number | string | bigint) {
    if (typeof seed === 'string') {
      this.initialSeed = this.hashString(seed);
    } else if (typeof seed === 'number') {
      this.initialSeed = BigInt(seed);
    } else {
      this.initialSeed = seed;
    }
    this.state = this.initialSeed;
  }

  private hashString(str: string): bigint {
    let hash = BigInt(0);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << BigInt(5)) - hash) + BigInt(str.charCodeAt(i));
      hash = hash & BigInt("0xFFFFFFFFFFFFFFFF");
    }
    return hash === BigInt(0) ? BigInt(1) : hash;
  }

  private splitMix64(): bigint {
    this.cursor++;
    let z = this.state += BigInt("0x9e3779b97f4a7c15");
    z = (z ^ (z >> BigInt(30))) * BigInt("0xbf58476d1ce4e5b9");
    z = (z ^ (z >> BigInt(27))) * BigInt("0x94d049bb133111eb");
    return (z ^ (z >> BigInt(31))) & BigInt("0xFFFFFFFFFFFFFFFF");
  }

  next(): number {
    const val = this.splitMix64();
    return Number(val & BigInt(0x7FFFFFFF)) / 0x7FFFFFFF;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  nextGaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stddev + mean;
  }

  fork(subKey: string): DeterministicRNG {
    const combined = this.hashString(`${this.initialSeed}-${subKey}`);
    return new DeterministicRNG(combined);
  }

  getSeed(): string {
    return this.initialSeed.toString(16);
  }

  getCursor(): number {
    return this.cursor;
  }

  reset(): void {
    this.state = this.initialSeed;
    this.cursor = 0;
  }
}

export function noise2D(rng: DeterministicRNG, x: number, y: number, scale: number = 1): number {
  const gridX = Math.floor(x / scale);
  const gridY = Math.floor(y / scale);
  const fracX = (x / scale) - gridX;
  const fracY = (y / scale) - gridY;

  const hash = (ix: number, iy: number): number => {
    const n = ix + iy * 57;
    const h = ((n * 15731 + 789221) * n + 1376312589) & 0x7FFFFFFF;
    return h / 0x7FFFFFFF;
  };

  const smoothstep = (t: number): number => t * t * (3 - 2 * t);

  const v00 = hash(gridX, gridY);
  const v10 = hash(gridX + 1, gridY);
  const v01 = hash(gridX, gridY + 1);
  const v11 = hash(gridX + 1, gridY + 1);

  const sx = smoothstep(fracX);
  const sy = smoothstep(fracY);

  const i1 = v00 * (1 - sx) + v10 * sx;
  const i2 = v01 * (1 - sx) + v11 * sx;
  
  return i1 * (1 - sy) + i2 * sy;
}

export function octaveNoise(rng: DeterministicRNG, x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise2D(rng, x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

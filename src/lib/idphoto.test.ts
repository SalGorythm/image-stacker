import { describe, expect, it } from 'vitest';
import { backgroundCheck, guides, ID_SPECS, placeFace, printSheet } from './idphoto';

const us = ID_SPECS.find(s => s.id === 'us')!;
const india = ID_SPECS.find(s => s.id === 'in')!;

describe('guides', () => {
  it('puts the chin a mid-range head height below the crown', () => {
    const g = guides(us);
    expect(g.crown).toBeCloseTo(60);
    expect(g.chin).toBeCloseTo(60 + 0.595 * 600);
    expect(g.chinMin).toBeLessThan(g.chin);
    expect(g.chinMax).toBeGreaterThan(g.chin);
  });
});

describe('placeFace', () => {
  it('scales and positions a detected face so the head lands on the guides', () => {
    const face = { x: 400, y: 300, width: 200, height: 240 };
    const v = placeFace(face, india);
    const toOut = (y: number) => (y - v.cy) * v.zoom + india.px.h / 2;
    const g = guides(india);
    const crownSrc = face.y + face.height - face.height * 1.45;
    expect(toOut(crownSrc)).toBeCloseTo(g.crown, 5);
    expect(toOut(face.y + face.height)).toBeCloseTo(g.chin, 5);
  });
});

describe('backgroundCheck', () => {
  const make = (bg: number[], w = 100, h = 120) => {
    const px = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) px.set([...bg, 255], i * 4);
    return px;
  };
  it('passes a plain white background', () => expect(backgroundCheck(make([245, 245, 242]), 100, 120).ok).toBe(true));
  it('flags a dark or coloured background', () => {
    expect(backgroundCheck(make([90, 90, 90]), 100, 120).issues).toContain('too dark');
    expect(backgroundCheck(make([120, 200, 250]), 100, 120).issues).toContain('coloured');
  });
});

describe('printSheet', () => {
  it('fits six 2 × 2 in photos or eight 35 × 45 mm photos on a 6 × 4 in print', () => {
    expect(printSheet(us).slots.length).toBe(6);
    expect(printSheet(india).slots.length).toBe(8);
    expect(printSheet(india).photo).toEqual({ w: 413, h: 531 });
  });
});

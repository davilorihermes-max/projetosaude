// test/avatar-helpers.test.ts
import { describe, it, expect } from 'vitest';
import { getInitials, getGradientForName } from '../src/components/Avatar.js';

describe('Avatar Helpers & Initials Resolution', () => {
  it('extracts correct initials for single-word names', () => {
    expect(getInitials('Henrique')).toBe('HE');
    expect(getInitials('Davi')).toBe('DA');
  });

  it('extracts first and last initials for compound names', () => {
    expect(getInitials('Henrique Meyer')).toBe('HM');
    expect(getInitials('Davi Lori Hermes')).toBe('DH');
    expect(getInitials('Sérgio Hermes Meyer')).toBe('SM');
  });

  it('strips medical honorifics and clinical prefixes before computing initials', () => {
    expect(getInitials('Dra. Camila Nogueira')).toBe('CN');
    expect(getInitials('Dr. Rafael Fontes')).toBe('RF');
    expect(getInitials('Enf. Marcos Vinicius')).toBe('MV');
    expect(getInitials('Ft. Amanda Dias')).toBe('AD');
  });

  it('handles empty or invalid names safely without throwing errors', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials(null as any)).toBe('');
    expect(getInitials(undefined as any)).toBe('');
    expect(getInitials('   ')).toBe('');
  });

  it('returns a deterministic CSS gradient for names', () => {
    const grad1 = getGradientForName('Henrique');
    const grad2 = getGradientForName('Henrique');
    expect(grad1).toBe(grad2);
    expect(grad1).toContain('linear-gradient');

    const defaultGrad = getGradientForName('');
    expect(defaultGrad).toContain('linear-gradient');
  });
});

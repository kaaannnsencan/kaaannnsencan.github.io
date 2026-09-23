import { describe, expect, it } from 'vitest'
import { glyph, hasGlyph, measure, normalize, wrap } from '../src/world/PixelFont'

describe('PixelFont', () => {
  it('has every glyph the site needs, including Turkish letters', () => {
    for (const ch of normalize('Kaan Şencan çğiöü İstinye 0123456789 .,:!?-/()&@#★')) expect(hasGlyph(ch), ch).toBe(true)
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZÇĞİÖŞÜ') expect(glyph(ch).length).toBeGreaterThanOrEqual(7)
  })

  it('measures text in font pixels', () => {
    expect(measure('A')).toBe(5)
    expect(measure('AA')).toBe(11)
  })

  it('wraps on word boundaries', () => {
    const lines = wrap('HELLO WORLD FROM KAAN', measure('HELLO WORLD'))
    expect(lines).toEqual(['HELLO WORLD', 'FROM KAAN'])
  })
})

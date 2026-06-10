import { describe, it, expect } from 'vitest'
import { korosztalyok, korosztalyokSummary } from './korosztalyok'

const byName = (name: string) => korosztalyok.find(k => k.name === name)!

describe('korosztályok MCSSZ compliance', () => {
  it('kiscserkész uses the national orange neckerchief', () => {
    expect(byName('Kiscserkész').neckColor).toBe('#f97316')
    expect(byName('Kiscserkész').neckLabel).toBe('Narancssárga nyakkendő')
    expect(korosztalyokSummary.find(k => k.name === 'Kiscserkész')!.neckColor).toBe('#f97316')
  })
  it('cserkész próbák are Újoncpróba + I. próba only', () => {
    expect(byName('Cserkész').probák).toEqual(['Újoncpróba', 'I. próba'])
  })
  it('kósza holds II. próba, III. próba and őrsvezetői képzés', () => {
    expect(byName('Kósza').probák).toEqual(
      expect.arrayContaining(['II. próba', 'III. próba', 'Őrsvezetői képzés'])
    )
  })
  it('no unofficial (szalag)/(nyílhegy) próba labels anywhere', () => {
    const all = korosztalyok.flatMap(k => k.probák).join(' ')
    expect(all).not.toMatch(/szalag|nyílhegy/)
  })
  it('does not state an unverified camp length in any description field', () => {
    const allText = korosztalyok.flatMap(k => [k.desc, k.descShort]).join(' ')
    expect(allText).not.toMatch(/14 napig/)
  })
  it('no age section still uses the old blue neckerchief', () => {
    const all = [...korosztalyok, ...korosztalyokSummary]
    expect(all.every(k => k.neckColor !== '#3b82f6')).toBe(true)
  })
})

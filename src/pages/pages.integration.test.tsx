import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Join from './Join'
import Home from './Home'

// These tests guard against the pages drifting from the shared korosztalyok data
// (the original failure: /csatlakozas kept a stale blue neckerchief + "14 napig").

describe('Join page consumes the shared korosztályok data', () => {
  it('shows the corrected kiscserkész neckerchief label, not the old blue one', () => {
    render(<MemoryRouter><Join /></MemoryRouter>)
    expect(screen.getAllByText('Narancssárga nyakkendő').length).toBeGreaterThan(0)
    expect(screen.queryByText('Kék nyakkendő')).toBeNull()
  })
  it('does not state the unverified 14-day camp length', () => {
    render(<MemoryRouter><Join /></MemoryRouter>)
    expect(screen.queryByText(/14 napig/)).toBeNull()
  })
})

describe('Home page consumes the shared summary data', () => {
  it('renders the age-group cards from shared data', () => {
    const { container } = render(<MemoryRouter><Home /></MemoryRouter>)
    const grid = container.querySelector('.age-card')!.parentElement!
    expect(within(grid).getByText('Vándor')).toBeInTheDocument()
    expect(within(grid).getByText('Kiscserkész')).toBeInTheDocument()
  })
})

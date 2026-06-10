import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Scouting from './Scouting'

describe('Scouting page', () => {
  it('frames the greeting as Jó munkát! → Légy résen! in the banner', () => {
    render(<MemoryRouter><Scouting /></MemoryRouter>)
    const banner = screen.getByRole('banner')
    expect(within(banner).getByText('Jó munkát!')).toBeInTheDocument()
    expect(within(banner).getByText('Légy résen!')).toBeInTheDocument()
  })
  it('shows the symbols section and the patron-saint note', () => {
    render(<MemoryRouter><Scouting /></MemoryRouter>)
    expect(screen.getByText('A cserkészliliom és a kézfogás')).toBeInTheDocument()
    expect(screen.getByText(/Szent József/)).toBeInTheDocument()
  })
})

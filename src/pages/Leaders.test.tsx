import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Leaders from './Leaders'

// Guards against the fallback regression: an empty (but non-null) leaders.json
// must not blank the page, since `data ?? leadersStatic` never falls back for `[]`.
describe('Leaders page falls back to static data when content.json is empty', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders leader cards even when the fetched leaders array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ leaders: [] }),
    }))

    render(<MemoryRouter><Leaders /></MemoryRouter>)

    expect(await screen.findAllByText('Kucsera Boglárka')).not.toHaveLength(0)
  })
})

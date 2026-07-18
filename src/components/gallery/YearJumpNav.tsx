import './YearJumpNav.css';

interface Props {
  years: number[];
  activeYear: number | null;
  onSelectYear: (year: number | null) => void;
}

export default function YearJumpNav({ years, activeYear, onSelectYear }: Props) {
  if (years.length === 0) return null;

  return (
    <nav className="year-jump-nav" aria-label="Év szerinti ugrás">
      <div className="year-jump-nav__buttons" role="group">
        <button
          type="button"
          className={`year-jump-nav__btn${activeYear === null ? ' year-jump-nav__btn--active' : ''}`}
          onClick={() => onSelectYear(null)}
          aria-pressed={activeYear === null}
        >
          Összes év
        </button>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            className={`year-jump-nav__btn${activeYear === year ? ' year-jump-nav__btn--active' : ''}`}
            onClick={() => onSelectYear(year)}
            aria-pressed={activeYear === year}
          >
            {year}
          </button>
        ))}
      </div>

      <label className="year-jump-nav__select-wrap">
        <span className="sr-only">Év kiválasztása</span>
        <select
          className="year-jump-nav__select"
          value={activeYear ?? 'all'}
          onChange={(e) => onSelectYear(e.target.value === 'all' ? null : Number(e.target.value))}
        >
          <option value="all">Összes év</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}

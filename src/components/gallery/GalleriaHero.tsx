import FleurDeLisIcon from './FleurDeLisIcon';
import type { GaleriaView } from '../../pages/GaleriaPage';
import './GalleriaHero.css';

const VIEWS: { key: GaleriaView; label: string }[] = [
  { key: 'all', label: 'Összes' },
  { key: 'events', label: 'Események' },
  { key: 'camps', label: 'Táborok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'videos', label: 'Videók' },
  { key: 'years', label: 'Évek' },
];

interface Props {
  activeView: GaleriaView;
  onViewChange: (view: GaleriaView) => void;
}

export default function GalleriaHero({ activeView, onViewChange }: Props) {
  return (
    <section className="page-hero" aria-labelledby="gallery-page-heading">
      <div className="container">
        <div className="hero-badge">
          <FleurDeLisIcon size={16} /> Galéria
        </div>
        <h1 id="gallery-page-heading" className="section-title section-title--lg">
          Fotógaléria
        </h1>
        <p className="page-hero__subtitle">
          Táboraink, portyáink és közösségi életünk pillanatai képekben — a válogatott
          fotóink mellett a legfrissebb Instagram bejegyzéseink is itt élnek.
        </p>

        <div className="galeria-toggle" role="group" aria-label="Nézet szűrő">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={`galeria-toggle__btn${activeView === v.key ? ' galeria-toggle__btn--active' : ''}`}
              onClick={() => onViewChange(v.key)}
              aria-pressed={activeView === v.key}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

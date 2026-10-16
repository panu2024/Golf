import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { COURSES, formatPrice, getHelsinkiDate } from '../lib/golf';
import type { Criteria } from '../lib/golf';
import { Icon } from './Icon';

export function criteriaError(criteria: Criteria): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(criteria.date) || criteria.date < getHelsinkiDate()) return 'Valitse tämä päivä tai tuleva päivä.';
  if (!criteria.earliest || !criteria.latest || criteria.earliest > criteria.latest) return 'Aikaisin lähtöaika saa olla enintään myöhäisin lähtöaika.';
  if (!Number.isInteger(criteria.players) || criteria.players < 1 || criteria.players > 4) return 'Pelaajamäärän tulee olla 1–4.';
  if (!Number.isFinite(criteria.maxPrice) || criteria.maxPrice < 0 || criteria.maxPrice > 10000) return 'Anna enimmäishinnaksi 0–10 000 euroa.';
  return null;
}

type Props = {
  value: Criteria;
  onChange: (criteria: Criteria) => void;
  onSubmit: () => void;
  submitLabel?: string;
  extraFields?: ReactNode;
  error?: string | null;
  idPrefix?: string;
};

export function SearchForm({ value, onChange, onSubmit, submitLabel = 'Hae lähtöaikoja', extraFields, error, idPrefix = 'search' }: Props) {
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(idPrefix === 'watch');
  const set = <K extends keyof Criteria>(key: K, next: Criteria[K]) => onChange({ ...value, [key]: next });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (criteriaError(value)) setAdvancedOpen(true);
    onSubmit();
  };
  const revealInvalidField = (event: FormEvent<HTMLFormElement>) => {
    if (advancedRef.current?.contains(event.target as Node)) {
      // Avaa myös ennen selaimen omaa validointifokusta, jotta kenttä on näkyvissä.
      advancedRef.current.open = true;
      setAdvancedOpen(true);
    }
  };
  useEffect(() => {
    if (error) setAdvancedOpen(true);
  }, [error]);
  return (
    <form onSubmit={submit} onInvalidCapture={revealInvalidField}>
      {extraFields && <div className="form-grid">{extraFields}</div>}
      <div className="form-grid search-main-fields">
        <div className="form-field">
          <label htmlFor={`${idPrefix}-location`}>Alue tai golfkenttä</label>
          <select id={`${idPrefix}-location`} value={value.location} onChange={(e) => set('location', e.target.value)}>
            <option value="all">Kaikki demoalueet ja kentät</option>
            <optgroup label="Alueet">{[...new Set(COURSES.map((c) => c.region))].map((region) => <option key={region} value={`region:${region}`}>{region}</option>)}</optgroup>
            <optgroup label="Golfkentät">{COURSES.map((course) => <option key={course.id} value={`course:${course.id}`}>{course.name} · {course.city}</option>)}</optgroup>
          </select>
        </div>
        <div className="form-field"><label htmlFor={`${idPrefix}-date`}>Pelipäivä</label><input id={`${idPrefix}-date`} type="date" required min={getHelsinkiDate()} max="9999-12-31" value={value.date} onChange={(e) => set('date', e.target.value)} /></div>
        <div className="form-field"><label htmlFor={`${idPrefix}-players`}>Pelaajamäärä</label><select id={`${idPrefix}-players`} value={value.players} onChange={(e) => set('players', Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'pelaaja' : 'pelaajaa'}</option>)}</select></div>
      </div>
      <details className="advanced-filters" ref={advancedRef} open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
        <summary><span>Lisäehdot</span><span className="advanced-summary">{value.earliest.replace(':', '.') || '—'}–{value.latest.replace(':', '.') || '—'} · enintään {formatPrice(value.maxPrice)} / pelaaja</span></summary>
        <div className="form-grid advanced-fields">
          <div className="form-field"><label htmlFor={`${idPrefix}-earliest`}>Aikaisin lähtöaika</label><input id={`${idPrefix}-earliest`} type="time" required value={value.earliest} onChange={(e) => set('earliest', e.target.value)} /></div>
          <div className="form-field"><label htmlFor={`${idPrefix}-latest`}>Myöhäisin lähtöaika</label><input id={`${idPrefix}-latest`} type="time" required value={value.latest} onChange={(e) => set('latest', e.target.value)} /></div>
          <div className="form-field"><label htmlFor={`${idPrefix}-price`}>Enimmäishinta / pelaaja (€)</label><input id={`${idPrefix}-price`} type="number" required min="0" max="10000" step="0.01" value={value.maxPrice} onChange={(e) => set('maxPrice', Number(e.target.value))} /></div>
        </div>
      </details>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="button button-primary" type="submit"><Icon name={submitLabel === 'Hae lähtöaikoja' ? 'search' : 'check'} />{submitLabel}</button>
      </div>
    </form>
  );
}

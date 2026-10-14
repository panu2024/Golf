import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { COURSES, EMPTY_STATE, defaultCriteria, findMatches, formatDate, formatPrice, getHelsinkiDate, getSlots, loadState, newMatchNotices, saveState } from './lib/golf';
import type { Criteria, DemoState, TeeTime, Watch } from './lib/golf';
import { Icon } from './components/Icon';
import { SearchForm, criteriaError } from './components/SearchForm';
import { TeeCard } from './components/TeeCard';

type View = 'search' | 'watches' | 'demo';
type WatchEditor = { id?: string; name: string; criteria: Criteria };
const titles: Record<View, string> = { search: 'Lähtöaikojen haku', watches: 'Omat vahdit', demo: 'Kentän demo' };

function initialState() {
  try { return loadState(window.localStorage); }
  catch { return { state: EMPTY_STATE, warning: 'Selaimen tallennus ei ole käytettävissä. Tiedot säilyvät vain tämän käyttökerran.' }; }
}

function locationName(location: string): string {
  if (location === 'all') return 'Kaikki demoalueet';
  if (location.startsWith('region:')) return location.slice(7);
  return COURSES.find((c) => `course:${c.id}` === location)?.name ?? location;
}

function futureSlot(slot: TeeTime, now: Date): boolean {
  const date = getHelsinkiDate(now);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
  return `${slot.date}T${slot.time}:00` >= `${date}T${time}`;
}

function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="flag" size={30} /></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current!;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]')].filter((element) => !element.hasAttribute('disabled'));
    focusable()[1]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef}><div className="modal-header"><div><p className="eyebrow">OMA GOLFVAHTISI</p><h2 id="modal-title">{title}</h2></div><button className="button button-ghost" aria-label="Sulje lomake" onClick={onClose}><Icon name="close" /></button></div>{children}</div></div>;
}

export default function App() {
  const [loaded] = useState(initialState);
  const [state, setState] = useState<DemoState>(loaded.state);
  const [now, setNow] = useState(() => new Date());
  const today = getHelsinkiDate(now);
  const previousDay = useRef(today);
  const [view, setView] = useState<View>('search');
  const [criteria, setCriteria] = useState<Criteria>(() => defaultCriteria(today));
  const [query, setQuery] = useState(criteria);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(loaded.warning);
  const [storageError, setStorageError] = useState(false);
  const [editor, setEditor] = useState<WatchEditor | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [demoSlot, setDemoSlot] = useState({ courseId: COURSES[0].id, date: today, time: '16:00', price: 45, available: 4 });
  const [demoError, setDemoError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState('');
  const [releaseSeats, setReleaseSeats] = useState(2);
  const slots = useMemo(() => getSlots(state, today), [state, today]);
  const matches = findMatches(slots, query, now);
  const unread = state.notifications.filter((notice) => !notice.read).length;
  const candidates = slots.filter((slot) => slot.available < 4 && futureSlot(slot, now));
  // Näytä vahtien pelipäiviä koskevat lähdöt ensin, jotta peruutusta on helppo kokeilla.
  candidates.sort((a, b) => Number(state.watches.some((watch) => watch.criteria.date === b.date)) - Number(state.watches.some((watch) => watch.criteria.date === a.date)));
  const selectedCancellation = candidates.find((slot) => slot.id === cancelId) ?? candidates[0];
  const effectiveRelease = Math.min(releaseSeats, selectedCancellation ? 4 - selectedCancellation.available : 0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const yesterday = previousDay.current;
    if (today === yesterday) return;
    setCriteria((current) => current.date === yesterday ? { ...current, date: today } : current);
    setQuery((current) => current.date === yesterday ? { ...current, date: today } : current);
    setDemoSlot((current) => current.date === yesterday ? { ...current, date: today } : current);
    previousDay.current = today;
  }, [today]);
  useEffect(() => {
    try { setStorageError(!saveState(window.localStorage, state)); }
    catch { setStorageError(true); }
  }, [state]);

  const changeView = (next: View) => { setView(next); setNotificationsOpen(false); };
  const search = () => {
    const error = criteriaError(criteria);
    setSearchError(error);
    if (!error) { setQuery({ ...criteria }); setNow(new Date()); }
  };
  const openEditor = (watch?: Watch) => {
    const error = watch ? null : criteriaError(criteria);
    setSearchError(error);
    if (error) return;
    setEditor(watch ? { id: watch.id, name: watch.name, criteria: { ...watch.criteria } } : { name: `${locationName(criteria.location)} · ${criteria.date.split('-').reverse().slice(0, 2).join('.')}`, criteria: { ...criteria } });
    setEditorError(null);
  };
  const saveWatch = () => {
    if (!editor) return;
    const error = criteriaError(editor.criteria) ?? (editor.name.trim() ? null : 'Anna vahdille nimi.');
    setEditorError(error);
    if (error) return;
    const watchId = editor.id ?? crypto.randomUUID();
    const createdAt = new Date().toISOString();
    setState((current) => {
      const existing = current.watches.find((watch) => watch.id === editor.id);
      const watch: Watch = { id: watchId, name: editor.name.trim(), criteria: { ...editor.criteria }, createdAt: existing?.createdAt ?? createdAt };
      return { ...current, watches: existing ? current.watches.map((item) => item.id === watch.id ? watch : item) : [...current.watches, watch] };
    });
    setMessage(editor.id ? 'Vahdin hakuehdot päivitettiin.' : 'Vahti tallennettiin. Saat ilmoituksen, kun uusi sopiva lähtö vapautuu tässä demossa.');
    setEditor(null);
  };
  const deleteWatch = (watch: Watch) => {
    setState((current) => ({ ...current, watches: current.watches.filter((item) => item.id !== watch.id), notifications: current.notifications.filter((notice) => notice.watchId !== watch.id) }));
    setMessage(`Vahti ”${watch.name}” poistettiin.`);
  };

  // Sama muutos päivittää lähtöajat ja muodostaa ilmoitukset vain uusista osumista.
  const updateDemo = (update: (current: DemoState) => DemoState) => {
    const changeTime = new Date();
    setState((current) => {
      const next = update(current);
      const newNotices = newMatchNotices(getSlots(current, getHelsinkiDate(changeTime)), getSlots(next, getHelsinkiDate(changeTime)), current.watches, changeTime);
      return { ...next, notifications: [...newNotices, ...current.notifications].slice(0, 100) };
    });
    setNow(changeTime);
  };
  const addSlot = (event: FormEvent) => {
    event.preventDefault();
    const slot: TeeTime = { ...demoSlot, id: `added:${crypto.randomUUID()}` };
    if (!futureSlot(slot, new Date())) { setDemoError('Valitse tuleva lähtöaika Suomen ajassa.'); return; }
    if (slots.some((item) => item.courseId === slot.courseId && item.date === slot.date && item.time === slot.time)) { setDemoError('Kentällä on jo lähtö tähän aikaan. Valitse toinen kellonaika tai vapauta paikkoja peruutuksella.'); return; }
    updateDemo((current) => ({ ...current, addedSlots: [...current.addedSlots, slot] }));
    setDemoError(null);
    setMessage(`Uusi lähtö lisättiin: ${COURSES.find((c) => c.id === slot.courseId)!.name}, ${formatDate(slot.date)} klo ${slot.time}.`);
  };
  const cancel = () => {
    if (!selectedCancellation || effectiveRelease < 1) return;
    const selected = selectedCancellation;
    updateDemo((current) => {
      const departure = getSlots(current, getHelsinkiDate()).find((slot) => slot.id === selected.id);
      if (!departure || !futureSlot(departure, new Date())) return current;
      return { ...current, availabilityOverrides: { ...current.availabilityOverrides, [selected.id]: Math.min(4, departure.available + effectiveRelease) } };
    });
    setMessage(`Peruutus simuloitu: ${effectiveRelease} ${effectiveRelease === 1 ? 'paikka vapautui' : 'paikkaa vapautui'} klo ${selected.time}. Haku ja vahdit päivittyivät.`);
  };
  const readNotices = () => setState((current) => ({ ...current, notifications: current.notifications.map((notice) => ({ ...notice, read: true })) }));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => changeView('search')} aria-label="Golfvahti, siirry lähtöaikojen hakuun"><span className="brand-mark"><Icon name="flag" size={29} /></span><span className="brand-wordmark">golfvahti<span>OMA HETKESI VIHERIÖLLÄ</span></span></button>
        <nav className="nav-list" aria-label="Päänavigaatio">
          {(['search', 'watches', 'demo'] as View[]).map((item) => <button key={item} className={`nav-button ${view === item ? 'is-active' : ''}`} aria-current={view === item ? 'page' : undefined} onClick={() => changeView(item)}><span className="nav-icon"><Icon name={item === 'search' ? 'search' : item === 'watches' ? 'bell' : 'course'} /></span>{titles[item]}{item === 'watches' && <span className="nav-count">{state.watches.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><Icon name="course" size={34} /><p>Vähemmän etsimistä.<br /><strong>Enemmän pelaamista.</strong></p><div className="sidebar-note"><span>PAIKALLINEN DEMO</span><p>Kuvitteelliset kentät.<br />Oikeasti toimivat vahdit.</p></div></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><span className="breadcrumb">Golfvahti <span>/</span> {titles[view]}</span><div className="topbar-actions"><span className="demo-badge"><span />Paikallinen demo</span><button className="notification-toggle" aria-label={`Ilmoitukset, ${unread} lukematonta`} aria-expanded={notificationsOpen} aria-controls="notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Icon name="bell" />{unread > 0 && <span className="notification-dot">{unread}</span>}</button></div></header>
        {notificationsOpen && <section id="notifications" className="notification-panel" aria-label="Ilmoitukset"><div className="notification-header"><h2>Ilmoitukset</h2><button className="button button-ghost button-small" onClick={readNotices} disabled={unread === 0}>Merkitse luetuiksi</button></div>{state.notifications.length === 0 ? <p className="muted">Ei vielä ilmoituksia. Tallenna vahti ja kokeile peruutusta kentän demossa.</p> : state.notifications.map((notice) => <article className={`notification-item ${!notice.read ? 'is-unread' : ''}`} key={notice.id}><strong>Uusi sopiva lähtö vapautui</strong><p>{notice.courseName} · {formatDate(notice.date)} klo {notice.time} · {formatPrice(notice.price)} / pelaaja</p><small>Vahti: {notice.watchName}</small><button className="button button-ghost button-small" onClick={() => { setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === notice.id ? { ...item, read: true } : item) })); changeView('watches'); }}>Näytä vahdit <Icon name="arrow" size={16} /></button></article>)}</section>}
        <main className="content" id="main-content">
          {storageError && <div className="status-banner is-error" role="alert">Selaimeen tallentaminen epäonnistui. Muutokset toimivat nyt, mutta eivät välttämättä säily sivua päivitettäessä.</div>}
          {message && <div className="status-banner" role="status"><Icon name="check" /><span>{message}</span><button className="button button-ghost button-small" onClick={() => setMessage(null)} aria-label="Sulje viesti"><Icon name="close" size={17} /></button></div>}
          {unread > 0 && !notificationsOpen && <button className="status-banner notification-banner" onClick={() => setNotificationsOpen(true)}><Icon name="bell" /><span>{unread} {unread === 1 ? 'uusi sopiva lähtö vapautui' : 'uutta sopivaa lähtöä vapautui'}. Avaa ilmoitukset.</span><Icon name="arrow" /></button>}

          {view === 'search' && <>
            <section className="hero"><div className="hero-copy"><p className="eyebrow">HYVÄ KIERROS ALKAA TÄSTÄ</p><h1 className="page-title">Löydä oma hetkesi<br />viheriöllä.</h1><p className="page-description">Kerro milloin haluat pelata. Me näytämme sopivat lähdöt ja vahdimme vapautuvia paikkoja.</p><div className="hero-stats"><div className="hero-stat"><strong>4</strong><span>demokenttää</span></div><div className="hero-stat"><strong>7</strong><span>päivää lähtöaikoja</span></div><div className="hero-stat"><strong>Sinulle</strong><span>sopivat pelipaikat</span></div></div></div><div className="hero-visual" aria-hidden="true"><div className="golf-landscape"><div className="landscape-hill" /><div className="landscape-path" /><div className="landscape-flag" /></div></div></section>
            <div className="demo-callout"><Icon name="course" /><p><strong>Kokeile Golfvahtia.</strong> Tämä on paikallinen demo kuvitteellisilla kentillä. Ilmoitukset toimivat sovelluksen ollessa avoinna.</p></div>
            <section className="panel search-panel" aria-labelledby="search-title"><div className="panel-header"><div><h2 id="search-title" className="section-title">Milloin lähdetään pelaamaan?</h2><p className="section-description">Valitse itsellesi sopiva pelipäivä ja hakuehdot.</p></div><span className="info-pill"><Icon name="clock" size={15} />Suomen aika</span></div><SearchForm value={criteria} onChange={(next) => { setCriteria(next); setSearchError(null); }} onSubmit={search} onSaveWatch={() => openEditor()} error={searchError} /><p className="help-text">Voit tallentaa vahdin myös silloin, kun sopivia lähtöjä ei vielä löydy.</p></section>
            <section aria-labelledby="results-title"><div className="results-heading"><div><h2 id="results-title" className="section-title">Sinulle sopivat lähtöajat <span className="results-count">{matches.length}</span></h2><p className="filter-summary">{locationName(query.location)} · {formatDate(query.date)} · {query.earliest}–{query.latest} · {query.players} pelaajaa · enintään {formatPrice(query.maxPrice)} / pelaaja</p></div><span className="muted">Päivittyy demon muutoksista</span></div>{matches.length ? <div className="results-grid">{matches.map((slot) => <TeeCard key={slot.id} slot={slot} />)}</div> : <EmptyState title="Näillä ehdoilla ei löytynyt vapaita lähtöjä">Kokeile laajempaa aikaväliä, toista päivää tai suurempaa hintarajaa. Tallenna vahti, niin ilmoitamme uusista sopivista lähdöistä.</EmptyState>}</section>
          </>}

          {view === 'watches' && <>
            <div className="page-heading"><p className="eyebrow">ANNA VAHDIN ETSIÄ</p><h1 className="page-title">Omat vahdit</h1><p className="page-description">Sinun pelitoiveesi, yhdessä paikassa. Vahti ilmoittaa, kun demossa vapautuu uusi hakuehtoihisi sopiva lähtö.</p></div>
            <div className="demo-callout"><Icon name="bell" /><p>Vahdit säilyvät tässä selaimessa. <strong>Ilmoituksia syntyy vain avoimen demon muutoksista.</strong> Kokeile vapauttaa lähtöpaikkoja Kentän demo -näkymässä.</p></div>
            {state.watches.length === 0 ? <EmptyState title="Ensimmäinen vahtisi odottaa">Tee lähtöaikojen haku ja tallenna sinulle sopivat hakuehdot vahdiksi.<br />Sopivan lähtöajan ei tarvitse löytyä heti.<br /><br /><button className="button button-primary" onClick={() => changeView('search')}><Icon name="plus" />Luo ensimmäinen vahti</button></EmptyState> : <div className="watch-grid">{state.watches.map((watch) => {
              const watchMatches = findMatches(slots, watch.criteria, now);
              const expired = watch.criteria.date < today;
              return <article className="panel watch-card" key={watch.id}><div className="watch-heading"><div><span className="editing-badge">{expired ? 'Pelipäivä on mennyt' : 'Vahti käytössä'}</span><h2 className="watch-title">{watch.name}</h2></div><div className="watch-actions"><button className="button button-ghost button-small" aria-label={`Muokkaa vahtia ${watch.name}`} onClick={() => openEditor(watch)}><Icon name="edit" /></button><button className="button button-ghost button-small button-danger" aria-label={`Poista vahti ${watch.name}`} onClick={() => deleteWatch(watch)}><Icon name="trash" /></button></div></div><p className="watch-criteria">{locationName(watch.criteria.location)}<br />{formatDate(watch.criteria.date)} · {watch.criteria.earliest}–{watch.criteria.latest}<br />{watch.criteria.players} pelaajaa · enintään {formatPrice(watch.criteria.maxPrice)} / pelaaja</p><div className="watch-matches"><h3>{watchMatches.length} sopivaa lähtöä</h3>{watchMatches.length ? watchMatches.map((slot) => <TeeCard key={slot.id} slot={slot} compact />) : <p className="muted">{expired ? 'Muokkaa vahtiin uusi pelipäivä jatkaaksesi seurantaa.' : 'Ei sopivia lähtöjä vielä. Vahti seuraa demon muutoksia.'}</p>}</div></article>;
            })}</div>}
          </>}

          {view === 'demo' && <>
            <div className="page-heading"><p className="eyebrow">KOKEILE MITEN VAHTI TOIMII</p><h1 className="page-title">Kentän demo</h1><p className="page-description">Avaa uusi lähtö tai simuloi peruutus. Muutokset näkyvät heti haussa ja sopivissa vahdeissa.</p></div>
            <div className="demo-callout"><Icon name="course" /><p><strong>Sinä ohjaat demoa.</strong> Tallenna ensin vahti. Vapauta sitten paikkoja sen pelipäivälle ja aikavälille hintarajan sisällä.</p></div>
            <div className="demo-grid"><section className="panel" aria-labelledby="add-title"><div className="panel-header"><div><h2 id="add-title" className="section-title">Lisää vapaa lähtöaika</h2><p className="section-description">Luo uusi lähtö yhdelle demokentistä.</p></div><Icon name="plus" /></div><form onSubmit={addSlot}><div className="form-grid"><div className="form-field field-full"><label htmlFor="demo-course">Golfkenttä</label><select id="demo-course" value={demoSlot.courseId} onChange={(e) => setDemoSlot({ ...demoSlot, courseId: e.target.value })}>{COURSES.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></div><div className="form-field"><label htmlFor="demo-date">Pelipäivä</label><input id="demo-date" type="date" required min={today} value={demoSlot.date} onChange={(e) => setDemoSlot({ ...demoSlot, date: e.target.value })} /></div><div className="form-field"><label htmlFor="demo-time">Lähtöaika (Suomen aika)</label><input id="demo-time" type="time" required value={demoSlot.time} onChange={(e) => setDemoSlot({ ...demoSlot, time: e.target.value })} /></div><div className="form-field"><label htmlFor="demo-price">Hinta / pelaaja (€)</label><input id="demo-price" type="number" min="0" max="10000" step="0.01" required value={demoSlot.price} onChange={(e) => setDemoSlot({ ...demoSlot, price: Number(e.target.value) })} /></div><div className="form-field"><label htmlFor="demo-seats">Vapaat paikat</label><select id="demo-seats" value={demoSlot.available} onChange={(e) => setDemoSlot({ ...demoSlot, available: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'paikka' : 'paikkaa'}</option>)}</select></div></div>{demoError && <p className="field-error" role="alert">{demoError}</p>}<div className="form-actions"><button className="button button-primary" type="submit"><Icon name="plus" />Lisää lähtöaika</button></div></form></section>
            <section className="panel" aria-labelledby="cancel-title"><div className="panel-header"><div><h2 id="cancel-title" className="section-title">Simuloi peruutus</h2><p className="section-description">Vapauta varattuja paikkoja olemassa olevaan lähtöön.</p></div><Icon name="bell" /></div><div className="form-field"><label htmlFor="cancel-slot">Lähtö, johon vapautetaan paikkoja</label><select id="cancel-slot" value={selectedCancellation?.id ?? ''} onChange={(e) => setCancelId(e.target.value)} disabled={candidates.length === 0}>{candidates.map((slot) => <option key={slot.id} value={slot.id}>{COURSES.find((course) => course.id === slot.courseId)!.name} · {slot.date.split('-').reverse().join('.')} klo {slot.time} · {slot.available}/4 vapaana</option>)}</select></div>{selectedCancellation ? <><div className="demo-slot"><strong>{COURSES.find((course) => course.id === selectedCancellation.courseId)!.name}</strong><p>{formatDate(selectedCancellation.date)} klo {selectedCancellation.time}</p><p>{formatPrice(selectedCancellation.price)} / pelaaja · <strong>{selectedCancellation.available}/4 paikkaa vapaana</strong></p></div><div className="form-field"><label htmlFor="release-seats">Vapautettavat paikat</label><select id="release-seats" value={effectiveRelease} onChange={(e) => setReleaseSeats(Number(e.target.value))}>{Array.from({ length: 4 - selectedCancellation.available }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'paikka' : 'paikkaa'}</option>)}</select></div><div className="form-actions"><button className="button button-primary" onClick={cancel}><Icon name="check" />Vapauta lähtöpaikkoja</button></div><p className="help-text">Ilmoitus syntyy, kun vapaita paikkoja on ensimmäistä kertaa tarpeeksi vahtisi koko ryhmälle.</p></> : <p className="muted">Kaikki tulevat lähdöt ovat täysin vapaita. Lisää uusi lähtö tai odota seuraavaa demopäivää.</p>}</section></div>
            {state.addedSlots.length > 0 && <section className="panel added-slots"><h2 className="section-title">Itse lisäämäsi lähtöajat</h2><div className="demo-slot-list">{slots.filter((slot) => state.addedSlots.some((added) => added.id === slot.id)).map((slot) => <TeeCard key={slot.id} slot={slot} compact />)}</div></section>}
          </>}
          <footer className="footer-note"><span><Icon name="flag" size={16} />Golfvahti · paikallinen prototyyppi</span><span>Kaikki ajat: Suomi (Europe/Helsinki)</span><p>Oikeat kenttäintegraatiot, taustavalvonta, sähköpostit, maksut ja kirjautuminen kuuluvat myöhempään vaiheeseen.</p></footer>
        </main>
      </div>
      {editor && <Modal title={editor.id ? 'Muokkaa vahtia' : 'Tallenna oma vahti'} onClose={() => setEditor(null)}><SearchForm idPrefix="watch" value={editor.criteria} onChange={(next) => { setEditor({ ...editor, criteria: next }); setEditorError(null); }} onSubmit={saveWatch} submitLabel={editor.id ? 'Tallenna muutokset' : 'Tallenna vahti'} error={editorError} extraFields={<div className="form-field field-full"><label htmlFor="watch-name">Vahdin nimi</label><input id="watch-name" required maxLength={100} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} /></div>} /><p className="help-text">Vahti tallennetaan tämän selaimen localStorageen. Ilmoitukset toimivat avoimessa demossa.</p></Modal>}
    </div>
  );
}

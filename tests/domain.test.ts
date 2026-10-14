import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COURSES,
  EMPTY_STATE,
  STORAGE_KEY,
  addDays,
  defaultCriteria,
  findMatches,
  generateDemoSlots,
  getHelsinkiDate,
  getSlots,
  loadState,
  matchesCriteria,
  newMatchNotices,
  saveState,
  type Criteria,
  type DemoState,
  type TeeTime,
  type Watch,
} from '../src/lib/golf.ts';

// Kiinteä kello tekee testeistä toistettavia myös tulevina vuosina.
const NOW = new Date('2026-10-14T08:00:00Z'); // Helsingissä 11.00.
const TODAY = '2026-10-14';

function criteria(overrides: Partial<Criteria> = {}): Criteria {
  return { ...defaultCriteria(TODAY), ...overrides };
}

function teeTime(overrides: Partial<TeeTime> = {}): TeeTime {
  return {
    id: 'custom:test',
    courseId: 'havumetsa',
    date: TODAY,
    time: '13:10',
    price: 50,
    available: 4,
    ...overrides,
  };
}

function watch(overrides: Partial<Watch> = {}): Watch {
  return {
    id: 'watch:test',
    name: 'Iltapäivän kierros',
    criteria: criteria(),
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

function state(overrides: Partial<DemoState> = {}): DemoState {
  return {
    watches: [],
    addedSlots: [],
    availabilityOverrides: {},
    notifications: [],
    ...overrides,
  };
}

class MemoryStorage {
  private entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

test('Suomen päivä vaihtuu paikallisena keskiyönä talvi- ja kesäaikana', () => {
  assert.equal(getHelsinkiDate(new Date('2026-01-01T21:59:59Z')), '2026-01-01');
  assert.equal(getHelsinkiDate(new Date('2026-01-01T22:00:00Z')), '2026-01-02');
  assert.equal(getHelsinkiDate(new Date('2026-06-01T20:59:59Z')), '2026-06-01');
  assert.equal(getHelsinkiDate(new Date('2026-06-01T21:00:00Z')), '2026-06-02');
});

test('kalenteripäivän lisääminen kestää kesäajan vaihdon ja karkauspäivän', () => {
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
});

test('demotiedot kattavat jokaisen kentän seitsemänä nykyisestä päivästä alkavana päivänä', () => {
  const slots = generateDemoSlots(TODAY);
  const expectedDays = Array.from({ length: 7 }, (_, day) => addDays(TODAY, day));

  assert.ok(COURSES.length >= 4);
  assert.deepEqual([...new Set(slots.map((slot) => slot.date))], expectedDays);
  assert.equal(new Set(slots.map((slot) => slot.id)).size, slots.length);

  for (const course of COURSES) {
    for (const date of expectedDays) {
      const departures = slots.filter((slot) => slot.courseId === course.id && slot.date === date);
      assert.ok(departures.length > 0, `${course.name}: ${date} puuttuu`);
      assert.ok(departures.some((slot) => slot.available === 0), 'peruutusdemoon on täysi lähtö');
      assert.ok(departures.every((slot) => slot.available >= 0 && slot.available <= 4));
    }
  }
});

test('päiväikkunan siirtyminen säilyttää yhteisten päivien peruslähtöajat', () => {
  const first = generateDemoSlots(TODAY);
  const tomorrow = addDays(TODAY, 1);
  const second = generateDemoSlots(tomorrow);

  assert.deepEqual(
    first.filter((slot) => slot.date >= tomorrow),
    second.filter((slot) => slot.date <= addDays(TODAY, 6)),
  );
  assert.equal(second[0].date, tomorrow);
  assert.equal(second.at(-1)?.date, addDays(TODAY, 7));
});

test('hakuehtojen aika-, hinta- ja paikkarajat hyväksyvät täsmälleen sopivan lähdön', () => {
  const slot = teeTime();
  const exact = criteria({ earliest: '13:10', latest: '13:10', players: 4, maxPrice: 50 });

  assert.equal(matchesCriteria(slot, exact, NOW), true);
  assert.equal(matchesCriteria(slot, { ...exact, earliest: '13:11' }, NOW), false);
  assert.equal(matchesCriteria(slot, { ...exact, latest: '13:09' }, NOW), false);
  assert.equal(matchesCriteria(slot, { ...exact, maxPrice: 49.99 }, NOW), false);
  assert.equal(matchesCriteria({ ...slot, available: 3 }, exact, NOW), false);
  assert.equal(matchesCriteria(slot, { ...exact, date: addDays(TODAY, 1) }, NOW), false);
});

test('hakua voi rajata alueeseen tai yhteen kenttään', () => {
  const slot = teeTime();
  assert.equal(matchesCriteria(slot, criteria({ location: 'all' }), NOW), true);
  assert.equal(matchesCriteria(slot, criteria({ location: 'region:Uusimaa' }), NOW), true);
  assert.equal(matchesCriteria(slot, criteria({ location: 'region:Pirkanmaa' }), NOW), false);
  assert.equal(matchesCriteria(slot, criteria({ location: 'course:havumetsa' }), NOW), true);
  assert.equal(matchesCriteria(slot, criteria({ location: 'course:harjukallio' }), NOW), false);
  assert.equal(matchesCriteria({ ...slot, courseId: 'tuntematon' }, criteria(), NOW), false);
});

test('jo menneet ajat eivät palaa tuloksiin; nykyinen lähtöminuutti tarkistetaan sekunteina', () => {
  const slot = teeTime({ time: '11:00' });
  assert.equal(matchesCriteria(slot, criteria(), NOW), true);
  assert.equal(matchesCriteria(slot, criteria(), new Date('2026-10-14T08:00:01Z')), false);
  assert.equal(matchesCriteria(teeTime({ time: '10:40' }), criteria(), NOW), false);
  assert.equal(matchesCriteria(teeTime({ date: '2026-10-13' }), criteria({ date: '2026-10-13' }), NOW), false);
});

test('löydetyt ajat suodattuvat yhdessä ja palautuvat aikajärjestyksessä', () => {
  const slots = [
    teeTime({ id: 'late', time: '17:20' }),
    teeTime({ id: 'expensive', price: 90 }),
    teeTime({ id: 'early', time: '12:00' }),
    teeTime({ id: 'full', available: 0 }),
    teeTime({ id: 'other-day', date: addDays(TODAY, 1) }),
    teeTime({ id: 'other-region', courseId: 'harjukallio' }),
  ];
  const inputIds = slots.map((slot) => slot.id);

  assert.deepEqual(
    findMatches(slots, criteria({ location: 'region:Uusimaa' }), NOW).map((slot) => slot.id),
    ['early', 'late'],
  );
  assert.deepEqual(slots.map((slot) => slot.id), inputIds, 'haku ei muuta lähtölistan järjestystä');
});

test('peruutus ilmoittaa vain vahdeille, joille paikkoja vapautuu tarpeeksi', () => {
  const previous = teeTime({ available: 1 });
  const next = { ...previous, available: 4 };
  const watches = [
    watch({ id: 'solo', criteria: criteria({ players: 1 }) }),
    watch({ id: 'group', criteria: criteria({ players: 4 }) }),
    watch({ id: 'cheap', criteria: criteria({ players: 4, maxPrice: 49 }) }),
    watch({ id: 'tomorrow', criteria: criteria({ date: addDays(TODAY, 1) }) }),
  ];

  const notices = newMatchNotices([previous], [next], watches, NOW);
  assert.deepEqual(notices.map((notice) => notice.watchId), ['group']);
  assert.equal(notices[0].teeTimeId, next.id);
  assert.equal(notices[0].read, false);
  assert.equal(notices[0].createdAt, NOW.toISOString());
  assert.deepEqual(newMatchNotices([next], [{ ...next, available: 4 }], watches, NOW), []);
});

test('uusi lähtö synnyttää ilmoituksen, täysi tai jo mennyt lähtö ei', () => {
  const watches = [watch()];
  const matching = teeTime();
  assert.equal(newMatchNotices([], [matching], watches, NOW).length, 1);
  assert.deepEqual(newMatchNotices([], [{ ...matching, available: 0 }], watches, NOW), []);
  assert.deepEqual(newMatchNotices([], [{ ...matching, time: '10:40' }], watches, NOW), []);
});

test('vapautetut paikat ja lisätyt lähtöajat säilyvät päiväikkunan vaihtuessa', () => {
  const tomorrow = addDays(TODAY, 1);
  const seeded = generateDemoSlots(TODAY).find((slot) => slot.date === tomorrow && slot.available === 0)!;
  const custom = teeTime({ id: 'custom:tomorrow', date: tomorrow, time: '14:30', available: 2 });
  const saved = state({ addedSlots: [custom], availabilityOverrides: { [seeded.id]: 4, [custom.id]: 3 } });

  for (const windowStart of [TODAY, tomorrow]) {
    const slots = getSlots(saved, windowStart);
    assert.equal(slots.find((slot) => slot.id === seeded.id)?.available, 4);
    assert.deepEqual(slots.find((slot) => slot.id === custom.id), { ...custom, available: 3 });
  }
});

test('vahdit, demon muutokset ja ilmoitukset tallentuvat ja palautuvat kokonaisina', () => {
  const storage = new MemoryStorage();
  const added = teeTime();
  const watches = [watch()];
  const notifications = newMatchNotices([], [added], watches, NOW);
  const saved = state({ watches, addedSlots: [added], availabilityOverrides: { [added.id]: 3 }, notifications });

  assert.equal(saveState(storage, saved), true);
  assert.deepEqual(loadState(storage), { state: saved, warning: null });
  const restored = loadState(storage).state;
  assert.equal(getSlots(restored, TODAY).find((slot) => slot.id === added.id)?.available, 3);
});

test('virheellinen tai tuntemattoman version tallennus palautuu turvalliseen demoon', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(loadState(storage), { state: EMPTY_STATE, warning: null });

  for (const raw of [
    '{broken json',
    JSON.stringify({ version: 99, state: state() }),
    JSON.stringify({ version: 1, state: state({ addedSlots: [teeTime({ available: 8 })] }) }),
    JSON.stringify({ version: 1, state: state({ watches: [watch({ criteria: criteria({ date: '2026-02-30' }) })] }) }),
    JSON.stringify({ version: 1, state: state({ availabilityOverrides: { 'tuntematon-id': 4 } }) }),
  ]) {
    storage.setItem(STORAGE_KEY, raw);
    const loaded = loadState(storage);
    assert.deepEqual(loaded.state, EMPTY_STATE);
    assert.ok(loaded.warning);
  }
});

test('selaimen tallennuksen estyminen ei kaada sovelluslogiikkaa', () => {
  const blocked = {
    getItem(): never { throw new Error('Storage blocked'); },
    setItem(): never { throw new Error('Quota exceeded'); },
  };
  assert.deepEqual(loadState(blocked).state, EMPTY_STATE);
  assert.ok(loadState(blocked).warning);
  assert.equal(saveState(blocked, state()), false);
});

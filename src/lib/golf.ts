export interface Course {
  id: string;
  name: string;
  region: string;
  city: string;
  description: string;
}

export interface Criteria {
  location: string;
  date: string;
  earliest: string;
  latest: string;
  players: number;
  maxPrice: number;
}

export interface Watch {
  id: string;
  name: string;
  criteria: Criteria;
  createdAt: string;
}

export interface TeeTime {
  id: string;
  courseId: string;
  date: string;
  time: string;
  price: number;
  available: number;
}

export interface Notice {
  id: string;
  watchId: string;
  watchName: string;
  teeTimeId: string;
  courseName: string;
  date: string;
  time: string;
  price: number;
  createdAt: string;
  read: boolean;
}

export interface DemoState {
  watches: Watch[];
  addedSlots: TeeTime[];
  availabilityOverrides: Record<string, number>;
  notifications: Notice[];
}

export const COURSES: Course[] = [
  {
    id: 'havumetsa',
    name: 'Havumetsä Golf',
    region: 'Uusimaa',
    city: 'Espoo',
    description: 'Rauhalliset metsäväylät ja avarat viheriöt.',
  },
  {
    id: 'rannikkolahti',
    name: 'Rannikkolahti Golf',
    region: 'Uusimaa',
    city: 'Porvoo',
    description: 'Merituulta ja kumpuilevaa puistomaisemaa.',
  },
  {
    id: 'harjukallio',
    name: 'Harjukallio Golf',
    region: 'Pirkanmaa',
    city: 'Tampere',
    description: 'Harjumaisemia ja vaihtelevia korkeuseroja.',
  },
  {
    id: 'saaristoniemi',
    name: 'Saaristoniemi Golf',
    region: 'Varsinais-Suomi',
    city: 'Turku',
    description: 'Saariston tunnelmaa ja luonnonläheisiä väyliä.',
  },
];

export const STORAGE_KEY = 'golfvahti-demo-v1';

export const EMPTY_STATE: DemoState = {
  watches: [],
  addedSlots: [],
  availabilityOverrides: {},
  notifications: [],
};

const finnishClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function helsinkiParts(now: Date): Record<string, string> {
  return Object.fromEntries(
    finnishClock.formatToParts(now).map((part) => [part.type, part.value]),
  );
}

export function getHelsinkiDate(now = new Date()): string {
  const parts = helsinkiParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Päivämäärä on kalenteripäivä, ei hetki. UTC-laskenta välttää kesäajan
// aiheuttamat 23 ja 25 tunnin vuorokaudet päivien lisäämisessä.
export function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fi-FI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'Europe/Helsinki',
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

export function defaultCriteria(today: string): Criteria {
  return {
    location: 'all',
    date: today,
    earliest: '07:00',
    latest: '20:00',
    players: 2,
    maxPrice: 80,
  };
}

export function generateDemoSlots(today: string): TeeTime[] {
  const times = ['08:20', '10:40', '13:10', '17:20', '18:30'];
  const slots: TeeTime[] = [];

  for (let day = 0; day < 7; day += 1) {
    const date = addDays(today, day);
    // Sama päivä saa aina samat tiedot, vaikka seitsemän päivän ikkuna siirtyy.
    const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

    COURSES.forEach((course, courseIndex) => {
      times.forEach((time, timeIndex) => {
        let available = 2 + ((dayNumber + courseIndex + timeIndex) % 3);
        if (timeIndex === 1) available = 1;
        if (timeIndex === times.length - 1) available = 0;

        slots.push({
          id: `seed:${course.id}:${date}:${time}`,
          courseId: course.id,
          date,
          time,
          price: 35 + courseIndex * 9 + timeIndex * 4 + (dayNumber % 3) * 3,
          available,
        });
      });
    });
  }

  return slots;
}

export function getSlots(state: DemoState, today: string): TeeTime[] {
  const slots = new Map<string, TeeTime>();

  for (const slot of [...generateDemoSlots(today), ...state.addedSlots]) {
    slots.set(slot.id, {
      ...slot,
      available: state.availabilityOverrides[slot.id] ?? slot.available,
    });
  }

  return [...slots.values()].sort(compareSlots);
}

function compareSlots(left: TeeTime, right: TeeTime): number {
  return (
    left.date.localeCompare(right.date) ||
    left.time.localeCompare(right.time) ||
    left.courseId.localeCompare(right.courseId)
  );
}

export function matchesCriteria(
  slot: TeeTime,
  criteria: Criteria,
  now = new Date(),
): boolean {
  const course = COURSES.find((item) => item.id === slot.courseId);
  if (!course) return false;

  const locationMatches =
    criteria.location === 'all' ||
    criteria.location === `region:${course.region}` ||
    criteria.location === `course:${course.id}`;

  const current = helsinkiParts(now);
  const currentTime = `${current.year}-${current.month}-${current.day}T${current.hour}:${current.minute}:${current.second}`;
  const departure = `${slot.date}T${slot.time}:00`;

  return (
    locationMatches &&
    slot.date === criteria.date &&
    slot.time >= criteria.earliest &&
    slot.time <= criteria.latest &&
    slot.available >= criteria.players &&
    slot.price <= criteria.maxPrice &&
    departure >= currentTime
  );
}

export function findMatches(
  slots: TeeTime[],
  criteria: Criteria,
  now = new Date(),
): TeeTime[] {
  return slots.filter((slot) => matchesCriteria(slot, criteria, now)).sort(compareSlots);
}

export function newMatchNotices(
  previousSlots: TeeTime[],
  nextSlots: TeeTime[],
  watches: Watch[],
  now = new Date(),
): Notice[] {
  const previousById = new Map(previousSlots.map((slot) => [slot.id, slot]));
  const notices: Notice[] = [];

  for (const watch of watches) {
    for (const slot of findMatches(nextSlots, watch.criteria, now)) {
      const previous = previousById.get(slot.id);
      if (previous && matchesCriteria(previous, watch.criteria, now)) continue;

      const course = COURSES.find((item) => item.id === slot.courseId)!;
      notices.push({
        // Sama muutos tuottaa saman tunnisteen myös Reactin kehitystilan uusinta-ajossa.
        id: `${now.toISOString()}:${watch.id}:${slot.id}`,
        watchId: watch.id,
        watchName: watch.name,
        teeTimeId: slot.id,
        courseName: course.name,
        date: slot.date,
        time: slot.time,
        price: slot.price,
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  return notices;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) &&
    isDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10_000;
}

function isSeats(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4;
}

function isLocation(value: unknown): value is string {
  return (
    value === 'all' ||
    COURSES.some((course) => value === `course:${course.id}` || value === `region:${course.region}`)
  );
}

function isCriteria(value: unknown): value is Criteria {
  return (
    isRecord(value) &&
    isLocation(value.location) &&
    isDate(value.date) &&
    isTime(value.earliest) &&
    isTime(value.latest) &&
    value.earliest <= value.latest &&
    isSeats(value.players) &&
    value.players >= 1 &&
    isPrice(value.maxPrice)
  );
}

function isWatch(value: unknown): value is Watch {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.name) &&
    isCriteria(value.criteria) &&
    isTimestamp(value.createdAt)
  );
}

function isSlot(value: unknown): value is TeeTime {
  return (
    isRecord(value) &&
    isText(value.id) &&
    COURSES.some((course) => course.id === value.courseId) &&
    isDate(value.date) &&
    isTime(value.time) &&
    isPrice(value.price) &&
    isSeats(value.available)
  );
}

function isNotice(value: unknown): value is Notice {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.watchId) &&
    isText(value.watchName) &&
    isText(value.teeTimeId) &&
    COURSES.some((course) => course.name === value.courseName) &&
    isDate(value.date) &&
    isTime(value.time) &&
    isPrice(value.price) &&
    isTimestamp(value.createdAt) &&
    typeof value.read === 'boolean'
  );
}

function uniqueIds(values: { id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}

function isSeedId(id: string): boolean {
  const parts = id.split(':');
  return (
    parts.length === 5 &&
    parts[0] === 'seed' &&
    COURSES.some((course) => course.id === parts[1]) &&
    isDate(parts[2]) &&
    isTime(`${parts[3]}:${parts[4]}`)
  );
}

function isDemoState(value: unknown): value is DemoState {
  if (!isRecord(value)) return false;
  const { watches, addedSlots, availabilityOverrides, notifications } = value;

  if (
    !Array.isArray(watches) ||
    !watches.every(isWatch) ||
    !uniqueIds(watches) ||
    !Array.isArray(addedSlots) ||
    !addedSlots.every(isSlot) ||
    !uniqueIds(addedSlots) ||
    !Array.isArray(notifications) ||
    !notifications.every(isNotice) ||
    !uniqueIds(notifications) ||
    !isRecord(availabilityOverrides)
  ) {
    return false;
  }

  const addedIds = new Set(addedSlots.map((slot) => slot.id));
  return Object.entries(availabilityOverrides).every(
    ([id, seats]) => (isSeedId(id) || addedIds.has(id)) && isSeats(seats),
  );
}

function freshState(): DemoState {
  return { watches: [], addedSlots: [], availabilityOverrides: {}, notifications: [] };
}

export function loadState(storage: Pick<Storage, 'getItem'>): {
  state: DemoState;
  warning: string | null;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { state: freshState(), warning: null };

    const saved: unknown = JSON.parse(raw);
    // Tallennettu sisältö tarkistetaan myös ajonaikaisesti: TypeScriptin tyypit
    // eivät suojaa rikkinäiseltä tai käsin muokatulta localStorage-tiedolta.
    if (!isRecord(saved) || saved.version !== 1 || !isDemoState(saved.state)) {
      return {
        state: freshState(),
        warning: 'Tallennetut demotiedot olivat virheellisiä. Demo avattiin oletustiedoilla.',
      };
    }

    return { state: saved.state, warning: null };
  } catch {
    return {
      state: freshState(),
      warning: 'Tallennettuja demotietoja ei voitu lukea. Demo avattiin oletustiedoilla.',
    };
  }
}

export function saveState(storage: Pick<Storage, 'setItem'>, state: DemoState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));
    return true;
  } catch {
    return false;
  }
}

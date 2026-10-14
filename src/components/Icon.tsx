type IconName = 'flag' | 'search' | 'bell' | 'course' | 'arrow' | 'plus' | 'edit' | 'trash' | 'close' | 'check' | 'people' | 'clock' | 'pin';

const paths: Record<IconName, string> = {
  flag: 'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',
  search: 'm21 21-5-5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  course: 'M12 17V3l8 4-8 4M9 16c-5 0-7 1-7 3s4 3 10 3 10-1 10-3-2-3-7-3',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  edit: 'm16 3 5 5-12 12-6 1 1-6L16 3m-3 3 5 5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8m5 9v-2a4 4 0 0 0-3-4',
  clock: 'M12 8v4l3 2m-3 7a9 9 0 1 0 0-18 9 9 0 0 0 0 18',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0m-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

import { COURSES, formatDate, formatPrice } from '../lib/golf';
import type { TeeTime } from '../lib/golf';
import { Icon } from './Icon';

export function TeeCard({ slot, compact = false }: { slot: TeeTime; compact?: boolean }) {
  const course = COURSES.find((item) => item.id === slot.courseId)!;
  if (compact) return <div className="compact-tee"><span><strong>{course.name}</strong><small>{formatDate(slot.date)} · klo {slot.time} · {slot.available} vapaata paikkaa</small></span><strong>{formatPrice(slot.price)}</strong></div>;
  return (
    <article className="tee-row">
      <div className="tee-departure"><strong className="tee-time">{slot.time}</strong><span className="tee-date">{formatDate(slot.date)}</span></div>
      <div className="tee-course"><h3 className="course-name">{course.name}</h3><p className="course-location">{course.city} · {course.region}</p></div>
      <div className="tee-price"><strong>{formatPrice(slot.price)}</strong><span>/ pelaaja</span></div>
      <span className="availability"><Icon name="people" size={17} />{slot.available} {slot.available === 1 ? 'vapaa paikka' : 'vapaata paikkaa'}</span>
    </article>
  );
}

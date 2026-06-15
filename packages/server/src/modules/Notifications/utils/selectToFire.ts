// © 2026 Bigfin
import * as moment from 'moment';

export interface Candidate {
  eventType: string;
  dedupKey: string;
  title: string;
  body: string;
  payload: any;
}
export interface RecentFire {
  dedupKey: string;
  firedAt: string;
}

/** Отбирает кандидатов, по которым не было срабатывания за последние cooldownHours. */
export const selectToFire = (
  candidates: Candidate[],
  recent: RecentFire[],
  cooldownHours: number,
  now: string,
): Candidate[] => {
  const cutoff = moment(now).subtract(cooldownHours, 'hours');
  const blocked = new Set(
    recent.filter((r) => moment(r.firedAt).isAfter(cutoff)).map((r) => r.dedupKey),
  );
  return candidates.filter((c) => !blocked.has(c.dedupKey));
};

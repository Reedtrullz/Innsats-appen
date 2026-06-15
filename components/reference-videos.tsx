import type { ReferenceVideo } from '@/lib/content/schemas';
import { OperationalIcon } from './ui/operational-icons';

/** Linkable URL for an approved video: the specific Vimeo page when known, else the channel. */
export function referenceVideoUrl(video: ReferenceVideo): string {
  return video.vimeoId ? `https://vimeo.com/${video.vimeoId}` : video.channelUrl;
}

/** Only approved videos may ever be shown (copyright — SFK permission). */
function approvedOnly(videos: ReferenceVideo[]): ReferenceVideo[] {
  return videos.filter((video) => video.permissionStatus === 'approved');
}

/** Small "opens the web / not available offline" marker reused on every link. */
function OnlineTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.66rem] font-bold text-amber-900">
      <OperationalIcon name="alert" className="h-3 w-3" aria-hidden="true" />
      åpner nett · ikke offline
    </span>
  );
}

/**
 * "Demonstrasjonsvideoer (eksterne)" list for /kilder. External SFK/Vimeo links
 * only — never an embed/iframe (CSP connect-src 'self'). Renders nothing until at
 * least one video is permission-approved, so the section is intentionally empty today.
 */
export function ReferenceVideoSection({ videos }: { videos: ReferenceVideo[] }) {
  const approved = approvedOnly(videos);
  if (approved.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm" aria-labelledby="reference-videos-heading">
      <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Eksterne ressurser</p>
      <h2 id="reference-videos-heading" className="text-2xl font-black">Demonstrasjonsvideoer (eksterne)</h2>
      <p className="mt-1 text-sm text-slate-700">Offisielle demonstrasjoner hos utgiveren. Lenkene åpner nettleseren og virker ikke offline.</p>
      <ul className="mt-3 space-y-2">
        {approved.map((video) => (
          <li key={video.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-slate-950">{video.title}</h3>
              <OnlineTag />
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-600">{video.publisher}</p>
            <a
              href={referenceVideoUrl(video)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#082F49] px-4 text-sm font-bold text-white"
            >
              Se demonstrasjon
              <OperationalIcon name="chevron" className="h-4 w-4" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Secondary "Se offisiell demonstrasjon (åpner nett)" link for an action card,
 * shown only when an approved video lists the card's slug in relatedCardSlugs.
 */
export function RelatedDemonstrationLinks({ videos, cardSlug }: { videos: ReferenceVideo[]; cardSlug: string }) {
  const related = approvedOnly(videos).filter((video) => video.relatedCardSlugs.includes(cardSlug));
  if (related.length === 0) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm" aria-labelledby="card-demo-heading">
      <h2 id="card-demo-heading" className="text-xl font-black">Offisiell demonstrasjon</h2>
      <ul className="mt-3 space-y-2">
        {related.map((video) => (
          <li key={video.id}>
            <a
              href={referenceVideoUrl(video)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-950"
            >
              <OperationalIcon name="chevron" className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Se offisiell demonstrasjon (åpner nett)</span>
              <OnlineTag />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { describe, expect, it } from 'vitest';
import { getActionCards, getReferenceVideos } from '@/lib/content/load-content';
import { ReferenceVideoSchema } from '@/lib/content/schemas';

const videos = getReferenceVideos();
const cardSlugs = new Set(getActionCards().map((card) => card.slug));

describe('reference videos (SFK demonstrations)', () => {
  it('loads the curated reference-video records', () => {
    expect(videos.length).toBeGreaterThan(0);
  });

  it('every relatedCardSlug points to an existing action card', () => {
    const dangling = videos.flatMap((video) =>
      video.relatedCardSlugs.filter((slug) => !cardSlugs.has(slug)).map((slug) => `${video.id} → ${slug}`),
    );
    expect(dangling, `Unknown action-card slugs referenced by videos:\n${dangling.join('\n')}`).toEqual([]);
  });

  it('an approved video is always linkable (vimeoId or channelUrl)', () => {
    const unlinkable = videos
      .filter((video) => video.permissionStatus === 'approved')
      .filter((video) => !video.vimeoId && !video.channelUrl)
      .map((video) => video.id);
    expect(unlinkable, `Approved videos must have a vimeoId or channelUrl:\n${unlinkable.join('\n')}`).toEqual([]);
  });

  it('defaults permissionStatus to needs-permission (copyright gate)', () => {
    const parsed = ReferenceVideoSchema.parse({
      id: 'demo-x',
      title: 'Demo',
      publisher: 'SFK',
      channelUrl: 'https://vimeo.com/sivilforsvaret',
      topic: 'demo',
    });
    expect(parsed.permissionStatus).toBe('needs-permission');
    expect(parsed.relatedCardSlugs).toEqual([]);
  });
});

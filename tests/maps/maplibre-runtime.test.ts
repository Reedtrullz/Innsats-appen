import { describe, expect, it, vi } from 'vitest';

describe('MapLibre runtime guard', () => {
  it('does not register pmtiles protocol during server-side import', async () => {
    const runtime = await import('@/lib/maps/maplibre-runtime');

    expect(runtime.MAPLIBRE_RUNTIME_BROWSER_ONLY).toBe(true);
    expect(typeof runtime.registerPmtilesProtocolOnce).toBe('function');
  });

  it('registers the pmtiles protocol only once for a browser maplibre instance', async () => {
    vi.resetModules();
    const runtime = await import('@/lib/maps/maplibre-runtime');
    const addProtocol = vi.fn();
    const removeProtocol = vi.fn();
    const protocol = { tile: vi.fn() };

    runtime.registerPmtilesProtocolOnce({ addProtocol, removeProtocol }, protocol);
    runtime.registerPmtilesProtocolOnce({ addProtocol, removeProtocol }, protocol);

    expect(addProtocol).toHaveBeenCalledTimes(1);
    expect(addProtocol).toHaveBeenCalledWith('pmtiles', protocol.tile);
  });
});

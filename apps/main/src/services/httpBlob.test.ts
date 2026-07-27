// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeBlobData } from './httpBlob';

describe('normalizeBlobData', () => {
  afterEach(() => vi.restoreAllMocks());

  it('recovers JSON envelope from blob with json content-type', async () => {
    const blob = new Blob([JSON.stringify({ status: 0, msg: 'ok', data: { id: 1 } })], {
      type: 'application/json',
    });
    const result = await normalizeBlobData(blob, {});
    expect(result).toEqual({ status: 0, msg: 'ok', data: { id: 1 } });
  });

  it('triggers download and returns synthetic success for attachment blob', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const blob = new Blob(['data'], { type: 'application/octet-stream' });
    const result = await normalizeBlobData(blob, {
      headers: { 'content-disposition': 'attachment; filename="report.csv"' },
    });
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(result).toEqual({ status: 0, msg: 'downloading' });
  });

  it('returns blob as-is for non-attachment non-json content', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL');
    const blob = new Blob(['raw'], { type: 'image/png' });
    const result = await normalizeBlobData(blob, { headers: { 'content-type': 'image/png' } });
    expect(result).toBe(blob);
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('uses downloadFileName even without content-disposition', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const blob = new Blob(['data'], { type: 'application/octet-stream' });
    const result = await normalizeBlobData(blob, { downloadFileName: 'custom.csv' });
    expect(createUrl).toHaveBeenCalled();
    expect(result).toEqual({ status: 0, msg: 'downloading' });
  });
});

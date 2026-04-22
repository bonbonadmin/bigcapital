import { getPdfFileUrl } from './utils';

describe('ChromiumlyTenancy utils', () => {
  describe('getPdfFileUrl', () => {
    it('builds a valid document URL when the base URL ends with a slash', () => {
      expect(
        getPdfFileUrl('http://server:3000/public/', 'document-print-1.html'),
      ).toBe('http://server:3000/public/pdf/document-print-1.html');
    });

    it('builds a valid document URL when the base URL has no trailing slash', () => {
      expect(
        getPdfFileUrl('http://server:3000/public', 'document-print-1.html'),
      ).toBe('http://server:3000/public/pdf/document-print-1.html');
    });

    it('throws a helpful error when the docs base URL is missing', () => {
      expect(() => getPdfFileUrl('', 'document-print-1.html')).toThrow(
        'GOTENBERG_DOCS_URL is not configured.',
      );
    });
  });
});

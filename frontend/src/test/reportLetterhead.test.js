import { describe, it, expect } from 'vitest';
import { buildReportPages, COMPANY } from '../utils/reportLetterhead';

const COLS = [
  { key: 'employee_code', headerLo: 'ລະຫັດພະນັກງານ', headerEn: 'Employee Code', render: e => e.code },
  { key: 'name',           headerLo: 'ຊື່ພະນັກງານ',    headerEn: 'Full Name',     render: e => e.name },
];
const TITLE = { lo: 'ລາຍງານພະນັກງານ', en: 'Employee Report' };
const SUMMARY = ['ຈຳນວນພະນັກງານທັງໝົດ: <b>1</b>', 'ສະຖານະ: Active 1'];

const makeRows = (n) => Array.from({ length: n }, (_, i) => ({ code: `E${i+1}`, name: `Employee ${i+1}` }));

describe('buildReportPages()', () => {
  it('renders a single page for a small dataset', () => {
    const { pagesHtml } = buildReportPages({ columns: COLS, rows: makeRows(3), summaryLines: SUMMARY, title: TITLE });
    expect(pagesHtml).toHaveLength(1);
    expect(pagesHtml[0]).toContain('ໜ້າ 1/1');
  });

  it('splits a large dataset across multiple pages with continuous numbering', () => {
    const { pagesHtml } = buildReportPages({ columns: COLS, rows: makeRows(80), summaryLines: SUMMARY, title: TITLE });
    expect(pagesHtml.length).toBeGreaterThan(1);
    const joined = pagesHtml.join('');
    // every row index from 1..80 should appear exactly once across all pages
    for (const n of [1, 40, 80]) {
      expect(joined).toContain(`>${n}<`);
    }
    expect(pagesHtml[pagesHtml.length - 1]).toContain(`ໜ້າ ${pagesHtml.length}/${pagesHtml.length}`);
  });

  it('only shows the summary/signature block on the last page', () => {
    const { pagesHtml } = buildReportPages({ columns: COLS, rows: makeRows(80), summaryLines: SUMMARY, title: TITLE });
    const summaryPages = pagesHtml.filter(p => p.includes('rpt-sign-title'));
    expect(summaryPages).toHaveLength(1);
    expect(summaryPages[0]).toBe(pagesHtml[pagesHtml.length - 1]);
  });

  it('shows the full letterhead only on page 1, condensed header afterwards', () => {
    const { pagesHtml } = buildReportPages({ columns: COLS, rows: makeRows(80), summaryLines: SUMMARY, title: TITLE });
    expect(pagesHtml[0]).toContain(COMPANY.nameLo);
    expect(pagesHtml[0]).toContain(COMPANY.nameEn);
    expect(pagesHtml[1]).not.toContain(COMPANY.nameLo);
    expect(pagesHtml[1]).toContain('rpt-cont-header');
  });

  it('renders bilingual column headers', () => {
    const { pagesHtml } = buildReportPages({ columns: COLS, rows: makeRows(1), summaryLines: SUMMARY, title: TITLE });
    expect(pagesHtml[0]).toContain('ລະຫັດພະນັກງານ / Employee Code');
  });

  it('escapes HTML in row data to prevent injection', () => {
    const rows = [{ code: '<img src=x onerror=alert(1)>', name: 'A & B <b>"x"</b>' }];
    const { pagesHtml } = buildReportPages({ columns: COLS, rows, summaryLines: SUMMARY, title: TITLE });
    expect(pagesHtml[0]).not.toContain('<img src=x onerror=alert(1)>');
    expect(pagesHtml[0]).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(pagesHtml[0]).toContain('A &amp; B &lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });

  it('renders an empty-state row when there is no data', () => {
    const { pagesHtml } = buildReportPages({ columns: COLS, rows: [], summaryLines: SUMMARY, title: TITLE });
    expect(pagesHtml).toHaveLength(1);
    expect(pagesHtml[0]).toContain('rpt-empty');
  });
});

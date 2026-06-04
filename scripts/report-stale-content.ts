import { getSourceDocuments } from '../lib/content/load-content';
import { buildStaleContentReport, staleContentReportToMarkdown } from '../lib/content/stale-content-report';

function resolveReportDate() {
  const date = process.env.REPORT_DATE ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('REPORT_DATE must use YYYY-MM-DD');
  return date;
}

const today = resolveReportDate();
const report = buildStaleContentReport({ sources: getSourceDocuments(), today });
const markdown = staleContentReportToMarkdown(report);

if (report.stale.length === 0 && report.expired.length === 0) {
  console.log(`No stale or expired content for ${today}.`);
} else {
  console.log(markdown);
}

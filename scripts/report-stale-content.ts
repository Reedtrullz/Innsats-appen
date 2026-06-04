import { getSourceDocuments } from '../lib/content/load-content';
import { assertIsoDate, buildStaleContentReport, staleContentReportToMarkdown } from '../lib/content/stale-content-report';

function resolveReportDate() {
  return assertIsoDate(process.env.REPORT_DATE ?? new Date().toISOString().slice(0, 10));
}

const today = resolveReportDate();
const report = buildStaleContentReport({ sources: getSourceDocuments(), today });
const markdown = staleContentReportToMarkdown(report);

if (report.stale.length === 0 && report.expired.length === 0) {
  console.log(`No stale or expired content for ${today}.`);
} else {
  console.log(markdown);
}

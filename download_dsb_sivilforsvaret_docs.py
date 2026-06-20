#!/usr/bin/env python3
"""Download public DSB/Sivilforsvaret document files with manifests."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import re
import sys
import time
import unicodedata
import zipfile
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import (
    parse_qsl,
    quote,
    unquote,
    unquote_to_bytes,
    urlencode,
    urljoin,
    urlsplit,
    urlunsplit,
)
from urllib.robotparser import RobotFileParser

import requests


USER_AGENT = "BeredskapsportalenResearchBot/1.0 (+local research; contact: none)"

START_URLS = [
    "https://www.sivilforsvaret.no/",
    "https://www.sivilforsvaret.no/mannskap-i-sivilforsvaret/skjema/",
    "https://www.dsb.no/",
    "https://www.dsb.no/rapporter-og-publikasjoner/",
    "https://www.dsb.no/regelverk/",
]

ALLOWED_DOMAINS = ("sivilforsvaret.no", "dsb.no")

DOCUMENT_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".rtf",
    ".txt",
    ".md",
    ".csv",
    ".xls",
    ".xlsx",
    ".odt",
    ".ods",
}

DOCUMENT_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/rtf": ".rtf",
    "text/rtf": ".rtf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/csv": ".csv",
    "application/vnd.oasis.opendocument.text": ".odt",
    "application/vnd.oasis.opendocument.spreadsheet": ".ods",
}

RELEVANCE_KEYWORDS = [
    "sivilforsvaret",
    "sivilforsvar",
    "dsb",
    "direktoratet for samfunnssikkerhet og beredskap",
    "beredskap",
    "samfunnssikkerhet",
    "nødnett",
    "nødvarsel",
    "radiac",
    "cbrn",
    "ros",
    "risiko",
    "sårbarhet",
    "krise",
    "krisescenario",
    "evakuering",
    "skogbrann",
    "brann",
    "redning",
    "innsats",
    "øvelse",
    "egenberedskap",
    "kommunal beredskapsplikt",
    "sivilbeskyttelsesloven",
    "forskrift om sivilforsvar",
]

INDIRECT_DSB_KEYWORDS = [
    "beredskap",
    "brann",
    "brannvern",
    "nødnett",
    "egenberedskap",
    "øvelse",
    "hendelse",
    "hendelser",
    "ros",
    "risiko",
    "sårbarhet",
    "samfunnssikkerhet",
]

MANIFEST_FIELDS = [
    "local_path",
    "filename",
    "source_domain",
    "source_url",
    "final_url",
    "parent_page_url",
    "link_text",
    "discovered_from_page_title",
    "content_type",
    "file_extension",
    "size_bytes",
    "sha256",
    "relevance_reason",
    "download_status",
    "error_message",
    "timestamp_utc",
]

SKIPPED_FIELDS = [
    "source_url",
    "parent_page_url",
    "link_text",
    "reason",
    "timestamp_utc",
]


@dataclass(frozen=True)
class RelevanceDecision:
    is_relevant: bool
    reason: str


@dataclass
class DocumentCandidate:
    url: str
    parent_page_url: str
    link_text: str
    page_title: str
    nearby_text: str
    metadata: str
    content_type: str = ""
    content_disposition: str = ""
    final_url: str = ""


@dataclass
class DownloadRecord:
    local_path: Path
    filename: str
    source_domain: str
    source_url: str
    final_url: str
    parent_page_url: str
    link_text: str
    discovered_from_page_title: str
    content_type: str
    file_extension: str
    size_bytes: int
    sha256: str
    relevance_reason: str
    download_status: str
    error_message: str
    timestamp_utc: str


@dataclass(frozen=True)
class OutputSummary:
    downloaded_count: int
    failed_count: int
    skipped_count: int
    manifest_csv: Path
    manifest_json: Path
    zip_path: Path


@dataclass(frozen=True)
class PageLink:
    url: str
    text: str
    nearby_text: str


@dataclass(frozen=True)
class ParsedPage:
    title: str
    metadata: str
    links: list[PageLink]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_url(url: str) -> str:
    """Normalize URL identity while preserving meaningful query parameters."""
    parts = urlsplit(url.strip())
    scheme = (parts.scheme or "https").lower()
    hostname = (parts.hostname or "").lower()
    port = ""
    if parts.port and not (
        (scheme == "https" and parts.port == 443) or (scheme == "http" and parts.port == 80)
    ):
        port = f":{parts.port}"
    netloc = f"{hostname}{port}"
    path = quote(unquote(parts.path or "/"), safe="/:@!$&'()*+,;=-._~%")
    query_pairs = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in {"fbclid", "gclid"}
    ]
    query = urlencode(sorted(query_pairs), doseq=True)
    return urlunsplit((scheme, netloc, path, query, ""))


def host_for_url(url: str) -> str:
    return (urlsplit(url).hostname or "").lower()


def is_allowed_domain(url: str) -> bool:
    host = host_for_url(url)
    return any(host == domain or host.endswith(f".{domain}") for domain in ALLOWED_DOMAINS)


def classify_source_bucket(url: str) -> str:
    host = host_for_url(url)
    if host == "sivilforsvaret.no" or host.endswith(".sivilforsvaret.no"):
        return "sivilforsvaret"
    if host == "dsb.no" or host.endswith(".dsb.no"):
        return "dsb"
    return "other"


def content_type_main(content_type: str) -> str:
    return content_type.split(";", 1)[0].strip().lower()


def extension_from_name(name: str) -> str:
    suffix = Path(urlsplit(name).path).suffix.lower()
    return suffix if suffix in DOCUMENT_EXTENSIONS else ""


def content_disposition_filename(content_disposition: str) -> str:
    if not content_disposition:
        return ""
    for part in content_disposition.split(";"):
        key, separator, value = part.strip().partition("=")
        if separator and key.lower() == "filename*":
            value = value.strip().strip('"')
            charset, first_separator, rest = value.partition("'")
            if first_separator:
                _, second_separator, encoded = rest.partition("'")
                if second_separator:
                    try:
                        return unquote_to_bytes(encoded).decode(charset or "utf-8")
                    except (LookupError, UnicodeDecodeError):
                        return unquote(encoded)
            return unquote(value)
    for part in content_disposition.split(";"):
        key, separator, value = part.strip().partition("=")
        if separator and key.lower() == "filename":
            return value.strip().strip('"')
    return ""


def detect_document_extension(
    url: str, content_type: str = "", content_disposition: str = ""
) -> str:
    main_type = content_type_main(content_type)
    disposition_name = content_disposition_filename(content_disposition)
    disposition_extension = extension_from_name(disposition_name)
    url_extension = extension_from_name(url)

    if main_type in {"text/html", "application/xhtml+xml"}:
        return ""
    if main_type in DOCUMENT_CONTENT_TYPES:
        return DOCUMENT_CONTENT_TYPES[main_type]
    if main_type == "application/octet-stream":
        return disposition_extension or url_extension
    if disposition_extension:
        return disposition_extension
    return url_extension


def should_treat_as_document(
    url: str, content_type: str = "", content_disposition: str = ""
) -> bool:
    return bool(detect_document_extension(url, content_type, content_disposition))


def safe_filename(name: str) -> str:
    basename = Path(name.replace("\\", "/")).name
    basename = unicodedata.normalize("NFKC", basename)
    basename = "".join("_" if ord(ch) < 32 else ch for ch in basename)
    basename = re.sub(r'[<>:"/\\|?*]', "_", basename)
    basename = re.sub(r"\s+", " ", basename).strip(" .")
    return basename or "document"


def text_key(text: str) -> str:
    return unicodedata.normalize("NFKC", text).casefold()


def url_relevance_text(url: str) -> str:
    parts = urlsplit(url)
    return unquote(" ".join([parts.path, parts.query]))


def first_keyword(text: str, keywords: Iterable[str]) -> str:
    normalized = text_key(text)
    for keyword in keywords:
        if text_key(keyword) in normalized:
            return keyword
    return ""


def is_candidate_relevant(
    candidate: DocumentCandidate, include_indirect: bool = False
) -> RelevanceDecision:
    host = host_for_url(candidate.url)
    if (
        (host == "sivilforsvaret.no" or host.endswith(".sivilforsvaret.no"))
        and should_treat_as_document(
            candidate.url, candidate.content_type, candidate.content_disposition
        )
    ):
        return RelevanceDecision(True, "document_on_sivilforsvaret_no")

    searchable = " ".join(
        [
            url_relevance_text(candidate.url),
            candidate.link_text,
            candidate.page_title,
            candidate.nearby_text,
            candidate.metadata,
        ]
    )
    keyword = first_keyword(searchable, RELEVANCE_KEYWORDS)
    if keyword:
        return RelevanceDecision(True, f"keyword:{keyword}")

    is_dsb = host == "dsb.no" or host.endswith(".dsb.no")
    if include_indirect and is_dsb:
        indirect_keyword = first_keyword(searchable, INDIRECT_DSB_KEYWORDS)
        if indirect_keyword:
            return RelevanceDecision(True, f"indirect_dsb_keyword:{indirect_keyword}")

    return RelevanceDecision(False, "no_relevance_keyword")


def build_manifest_row(record: DownloadRecord, base_dir: Path) -> dict[str, str]:
    try:
        local_path = record.local_path.relative_to(base_dir).as_posix()
    except (ValueError, TypeError):
        local_path = record.local_path.as_posix() if str(record.local_path) else ""
    return {
        "local_path": local_path,
        "filename": record.filename,
        "source_domain": record.source_domain,
        "source_url": record.source_url,
        "final_url": record.final_url,
        "parent_page_url": record.parent_page_url,
        "link_text": record.link_text,
        "discovered_from_page_title": record.discovered_from_page_title,
        "content_type": record.content_type,
        "file_extension": record.file_extension,
        "size_bytes": str(record.size_bytes),
        "sha256": record.sha256,
        "relevance_reason": record.relevance_reason,
        "download_status": record.download_status,
        "error_message": record.error_message,
        "timestamp_utc": record.timestamp_utc,
    }


def write_csv(path: Path, fields: list[str], rows: Iterable[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def write_outputs(
    out_dir: Path,
    zip_path: Path,
    records: list[DownloadRecord],
    skipped_links: list[dict[str, str]],
    start_urls: list[str],
    crawled_domains: list[str],
    included_extensions: Iterable[str],
    run_started_utc: str,
    pages_crawled: int,
) -> OutputSummary:
    out_dir.mkdir(parents=True, exist_ok=True)
    base_dir = out_dir.parent
    manifest_rows = [build_manifest_row(record, base_dir) for record in records]

    manifest_csv = out_dir / "manifest.csv"
    manifest_json = out_dir / "manifest.json"
    failed_csv = out_dir / "failed_downloads.csv"
    skipped_csv = out_dir / "skipped_links.csv"
    readme = out_dir / "README.md"

    write_csv(manifest_csv, MANIFEST_FIELDS, manifest_rows)
    manifest_json.write_text(
        json.dumps(manifest_rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_csv(
        failed_csv,
        MANIFEST_FIELDS,
        [row for row in manifest_rows if row["download_status"] == "failed"],
    )
    write_csv(skipped_csv, SKIPPED_FIELDS, skipped_links)

    downloaded_count = sum(1 for record in records if record.download_status == "downloaded")
    failed_count = sum(1 for record in records if record.download_status == "failed")
    skipped_count = len(skipped_links)
    readme.write_text(
        "\n".join(
            [
                "# DSB/Sivilforsvaret dokumentnedlasting",
                "",
                f"Kjørt: {run_started_utc}",
                "",
                "## Start-URL-er",
                *[f"- {url}" for url in start_urls],
                "",
                "## Domener crawlet",
                *[f"- {domain}" for domain in crawled_domains],
                "",
                "## Filtyper inkludert",
                ", ".join(sorted(included_extensions)),
                "",
                "## Resultat",
                f"- HTML-sider crawlet: {pages_crawled}",
                f"- Nedlastede filer: {downloaded_count}",
                f"- Feilede filer: {failed_count}",
                f"- Skippede dokumentlenker: {skipped_count}",
                "",
                "Filene er offentlige dokumenter hentet fra DSB/Sivilforsvaret-kilder.",
                "Manifestene beskriver kilde-URL, slutt-URL, SHA256, status og relevansgrunnlag.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(out_dir.rglob("*")):
            if not path.is_file() or path.resolve() == zip_path.resolve():
                continue
            if path.name == ".DS_Store" or "__pycache__" in path.parts:
                continue
            if path.suffix == ".pyc":
                continue
            else:
                archive.write(path, path.relative_to(base_dir).as_posix())

    return OutputSummary(
        downloaded_count=downloaded_count,
        failed_count=failed_count,
        skipped_count=skipped_count,
        manifest_csv=manifest_csv,
        manifest_json=manifest_json,
        zip_path=zip_path,
    )


class DocumentCrawler:
    def __init__(
        self,
        out_dir: Path,
        max_pages: int,
        max_downloads: int,
        max_depth: int,
        delay: float,
        include_indirect: bool,
        user_agent: str = USER_AGENT,
    ) -> None:
        self.out_dir = out_dir
        self.max_pages = max_pages
        self.max_downloads = max_downloads
        self.max_depth = max_depth
        self.delay = delay
        self.include_indirect = include_indirect
        self.user_agent = user_agent
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})
        self.robots: dict[str, RobotFileParser] = {}
        self.last_request_at: dict[str, float] = {}
        self.seen_pages: set[str] = set()
        self.queued_pages: set[str] = set()
        self.seen_document_urls: set[str] = set()
        self.seen_final_urls: set[str] = set()
        self.seen_hashes: set[str] = set()
        self.used_filenames: set[str] = set()
        self.records: list[DownloadRecord] = []
        self.skipped_links: list[dict[str, str]] = []
        self.pages_crawled = 0

    def crawl(self, start_urls: list[str]) -> None:
        queue: deque[tuple[str, int]] = deque()
        for url in start_urls:
            normalized = normalize_url(url)
            queue.append((normalized, 0))
            self.queued_pages.add(normalized)

        while queue and self.pages_crawled < self.max_pages:
            page_url, depth = queue.popleft()
            normalized_page = normalize_url(page_url)
            if normalized_page in self.seen_pages or depth > self.max_depth:
                continue
            if not is_allowed_domain(page_url):
                continue

            parsed = self.fetch_and_parse_page(page_url)
            self.seen_pages.add(normalized_page)
            if parsed is None:
                continue

            self.pages_crawled += 1
            for link in parsed.links:
                if self.downloaded_count() >= self.max_downloads:
                    return

                if self.is_probable_document_link(link):
                    candidate = DocumentCandidate(
                        url=link.url,
                        parent_page_url=page_url,
                        link_text=link.text,
                        page_title=parsed.title,
                        nearby_text=link.nearby_text,
                        metadata=parsed.metadata,
                    )
                    self.consider_document(candidate)
                    continue

                if depth < self.max_depth and self.should_follow_page(link.url):
                    normalized_link = normalize_url(link.url)
                    if (
                        normalized_link not in self.seen_pages
                        and normalized_link not in self.queued_pages
                    ):
                        queue.append((normalized_link, depth + 1))
                        self.queued_pages.add(normalized_link)

    def downloaded_count(self) -> int:
        return sum(1 for record in self.records if record.download_status == "downloaded")

    def fetch_and_parse_page(self, url: str) -> ParsedPage | None:
        try:
            response = self.request("GET", url, timeout=30)
        except requests.RequestException as error:
            print(f"SKIP page {url}: {error}", file=sys.stderr)
            return None
        content_type = response.headers.get("Content-Type", "")
        if response.status_code >= 400:
            print(f"SKIP page {url}: HTTP {response.status_code}", file=sys.stderr)
            return None
        if should_treat_as_document(
            response.url,
            content_type,
            response.headers.get("Content-Disposition", ""),
        ):
            candidate = DocumentCandidate(
                url=url,
                parent_page_url=url,
                link_text=Path(urlsplit(response.url).path).name,
                page_title="",
                nearby_text="",
                metadata="",
                content_type=content_type,
                content_disposition=response.headers.get("Content-Disposition", ""),
                final_url=response.url,
            )
            self.consider_document(candidate)
            return None
        if "html" not in content_type_main(content_type):
            return None
        return parse_html_links(response.text, response.url)

    def request(self, method: str, url: str, **kwargs) -> requests.Response:
        if not self.can_fetch(url):
            raise requests.RequestException(f"robots.txt disallows {url}")
        self.wait_for_domain(url)
        response = self.session.request(method, url, allow_redirects=True, **kwargs)
        response.raise_for_status()
        return response

    def wait_for_domain(self, url: str) -> None:
        host = host_for_url(url)
        now = time.monotonic()
        last = self.last_request_at.get(host)
        if last is not None:
            target_delay = max(0.0, self.delay + random.uniform(-0.15, 0.15))
            wait = target_delay - (now - last)
            if wait > 0:
                time.sleep(wait)
        self.last_request_at[host] = time.monotonic()

    def can_fetch(self, url: str) -> bool:
        parser = self.robot_parser_for(url)
        return parser.can_fetch(self.user_agent, url)

    def robot_parser_for(self, url: str) -> RobotFileParser:
        host = host_for_url(url)
        if host in self.robots:
            return self.robots[host]
        robots_url = urlunsplit((urlsplit(url).scheme or "https", host, "/robots.txt", "", ""))
        parser = RobotFileParser()
        parser.set_url(robots_url)
        try:
            self.wait_for_domain(robots_url)
            response = self.session.get(robots_url, timeout=20)
            if response.status_code < 400:
                parser.parse(response.text.splitlines())
            else:
                parser.parse([])
        except requests.RequestException:
            parser.parse([])
        self.robots[host] = parser
        return parser

    def should_follow_page(self, url: str) -> bool:
        if not is_allowed_domain(url):
            return False
        if extension_from_name(url) in DOCUMENT_EXTENSIONS:
            return False
        scheme = urlsplit(url).scheme.lower()
        return scheme in {"http", "https"}

    def is_probable_document_link(self, link: PageLink) -> bool:
        if not is_allowed_domain(link.url):
            return bool(extension_from_name(link.url))
        if should_treat_as_document(link.url):
            return True
        lower = text_key(" ".join([link.url, link.text]))
        return any(
            marker in lower
            for marker in [
                "last ned",
                "download",
                ".pdf",
                ".doc",
                ".xls",
                "vedlegg",
                "globalassets",
                "contentassets",
                "siteassets",
            ]
        )

    def consider_document(self, candidate: DocumentCandidate) -> None:
        normalized_url = normalize_url(candidate.url)
        if normalized_url in self.seen_document_urls:
            self.add_skip(candidate, "duplicate_normalized_url")
            return
        self.seen_document_urls.add(normalized_url)

        candidate = self.with_head_metadata(candidate)
        final_url = normalize_url(candidate.url)
        if candidate.final_url:
            final_url = normalize_url(candidate.final_url)
        if final_url in self.seen_final_urls:
            self.add_skip(candidate, "duplicate_final_url")
            return

        if not should_treat_as_document(
            candidate.url,
            candidate.content_type,
            candidate.content_disposition,
        ):
            if extension_from_name(candidate.url):
                self.add_skip(candidate, "html_or_unknown_response_for_document_url")
            return

        relevance = is_candidate_relevant(candidate, self.include_indirect)
        if not relevance.is_relevant:
            self.add_skip(candidate, relevance.reason)
            return

        if self.downloaded_count() >= self.max_downloads:
            self.add_skip(candidate, "max_downloads_reached")
            return

        self.download_document(candidate, relevance.reason)

    def with_head_metadata(self, candidate: DocumentCandidate) -> DocumentCandidate:
        try:
            response = self.request("HEAD", candidate.url, timeout=30)
        except requests.RequestException:
            return candidate
        return DocumentCandidate(
            url=candidate.url,
            final_url=response.url,
            parent_page_url=candidate.parent_page_url,
            link_text=candidate.link_text,
            page_title=candidate.page_title,
            nearby_text=candidate.nearby_text,
            metadata=candidate.metadata,
            content_type=response.headers.get("Content-Type", ""),
            content_disposition=response.headers.get("Content-Disposition", ""),
        )

    def download_document(self, candidate: DocumentCandidate, relevance_reason: str) -> None:
        try:
            response = self.request("GET", candidate.url, timeout=90)
        except requests.RequestException as error:
            self.records.append(self.failed_record(candidate, "", "", str(error)))
            return

        content_type = response.headers.get("Content-Type", candidate.content_type)
        content_disposition = response.headers.get(
            "Content-Disposition", candidate.content_disposition
        )
        extension = detect_document_extension(response.url, content_type, content_disposition)
        if not extension:
            self.add_skip(candidate, "html_or_unknown_response_for_document_url")
            return

        content = response.content
        sha256 = hashlib.sha256(content).hexdigest()
        if sha256 in self.seen_hashes:
            self.add_skip(candidate, f"duplicate_sha256:{sha256[:12]}")
            return
        self.seen_hashes.add(sha256)
        self.seen_final_urls.add(normalize_url(response.url))

        filename = self.filename_for(response.url, content_disposition, extension, sha256)
        bucket = classify_source_bucket(response.url)
        local_path = self.out_dir / bucket / filename
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(content)

        self.records.append(
            DownloadRecord(
                local_path=local_path,
                filename=filename,
                source_domain=host_for_url(candidate.url),
                source_url=candidate.url,
                final_url=response.url,
                parent_page_url=candidate.parent_page_url,
                link_text=candidate.link_text,
                discovered_from_page_title=candidate.page_title,
                content_type=content_type,
                file_extension=extension,
                size_bytes=len(content),
                sha256=sha256,
                relevance_reason=relevance_reason,
                download_status="downloaded",
                error_message="",
                timestamp_utc=utc_now(),
            )
        )
        print(f"DOWNLOADED {local_path} <- {response.url}")

    def filename_for(
        self, final_url: str, content_disposition: str, extension: str, sha256: str
    ) -> str:
        raw_name = (
            content_disposition_filename(content_disposition)
            or unquote(Path(urlsplit(final_url).path).name)
            or f"document{extension}"
        )
        filename = safe_filename(raw_name)
        if Path(filename).suffix.lower() not in DOCUMENT_EXTENSIONS:
            filename = f"{filename}{extension}"
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        candidate = filename
        if candidate in self.used_filenames:
            candidate = f"{stem}-{sha256[:10]}{suffix}"
        self.used_filenames.add(candidate)
        return candidate

    def failed_record(
        self,
        candidate: DocumentCandidate,
        content_type: str,
        extension: str,
        error: str,
    ) -> DownloadRecord:
        return DownloadRecord(
            local_path=Path(),
            filename=safe_filename(unquote(Path(urlsplit(candidate.url).path).name) or "document"),
            source_domain=host_for_url(candidate.url),
            source_url=candidate.url,
            final_url=candidate.final_url,
            parent_page_url=candidate.parent_page_url,
            link_text=candidate.link_text,
            discovered_from_page_title=candidate.page_title,
            content_type=content_type,
            file_extension=extension,
            size_bytes=0,
            sha256="",
            relevance_reason=is_candidate_relevant(candidate, self.include_indirect).reason,
            download_status="failed",
            error_message=error,
            timestamp_utc=utc_now(),
        )

    def add_skip(self, candidate: DocumentCandidate, reason: str) -> None:
        self.skipped_links.append(
            {
                "source_url": candidate.url,
                "parent_page_url": candidate.parent_page_url,
                "link_text": candidate.link_text,
                "reason": reason,
                "timestamp_utc": utc_now(),
            }
        )


def parse_html_links(html: str, base_url: str) -> ParsedPage:
    try:
        from bs4 import BeautifulSoup
    except ImportError as error:
        raise RuntimeError(
            "beautifulsoup4 is required. Install with: python3 -m pip install beautifulsoup4"
        ) from error

    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    metadata_parts: list[str] = []
    for meta in soup.find_all("meta"):
        name = (meta.get("name") or meta.get("property") or "").lower()
        if name in {"description", "keywords", "og:description"} or name.startswith("dc."):
            content = meta.get("content")
            if content:
                metadata_parts.append(str(content))

    links: list[PageLink] = []
    for anchor in soup.find_all("a", href=True):
        href = str(anchor["href"]).strip()
        if not href or href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        absolute = normalize_url(urljoin(base_url, href))
        text = anchor.get_text(" ", strip=True)
        nearby = ""
        if anchor.parent:
            nearby = anchor.parent.get_text(" ", strip=True)
        links.append(PageLink(url=absolute, text=text, nearby_text=nearby[:500]))
    return ParsedPage(title=title, metadata=" ".join(metadata_parts), links=links)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Crawl public DSB/Sivilforsvaret pages and download relevant document files."
    )
    parser.add_argument("--out", default="downloads", type=Path)
    parser.add_argument("--zip", default="sivilforsvaret_dsb_dokumenter.zip", type=Path)
    parser.add_argument("--max-pages", default=1500, type=int)
    parser.add_argument("--max-downloads", default=1000, type=int)
    parser.add_argument("--max-depth", default=4, type=int)
    parser.add_argument("--delay", default=1.0, type=float)
    parser.add_argument("--include-indirect", action="store_true")
    return parser.parse_args(argv)


def print_summary(summary: OutputSummary, crawler: DocumentCrawler) -> None:
    print("")
    print("Oppsummering")
    print("-----------")
    print(f"HTML-sider crawlet: {crawler.pages_crawled}")
    print(f"Nedlastede filer: {summary.downloaded_count}")
    print(f"Feilede filer: {summary.failed_count}")
    print(f"Skippede dokumentlenker: {summary.skipped_count}")
    print(f"Manifest CSV: {summary.manifest_csv}")
    print(f"Manifest JSON: {summary.manifest_json}")
    print(f"ZIP: {summary.zip_path}")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    run_started = utc_now()
    crawler = DocumentCrawler(
        out_dir=args.out,
        max_pages=args.max_pages,
        max_downloads=args.max_downloads,
        max_depth=args.max_depth,
        delay=args.delay,
        include_indirect=args.include_indirect,
    )

    crawler.crawl(START_URLS)
    summary = write_outputs(
        out_dir=args.out,
        zip_path=args.zip,
        records=crawler.records,
        skipped_links=crawler.skipped_links,
        start_urls=START_URLS,
        crawled_domains=list(ALLOWED_DOMAINS),
        included_extensions=DOCUMENT_EXTENSIONS,
        run_started_utc=run_started,
        pages_crawled=crawler.pages_crawled,
    )
    print_summary(summary, crawler)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

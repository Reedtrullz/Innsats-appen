import csv
import json
import zipfile
from pathlib import Path

import pytest

from download_dsb_sivilforsvaret_docs import (
    DOCUMENT_EXTENSIONS,
    DocumentCandidate,
    DownloadRecord,
    RelevanceDecision,
    build_manifest_row,
    classify_source_bucket,
    content_disposition_filename,
    detect_document_extension,
    is_candidate_relevant,
    normalize_url,
    safe_filename,
    should_treat_as_document,
    write_outputs,
)


def test_normalize_url_removes_fragments_and_sorts_query_parameters():
    assert (
        normalize_url("HTTPS://WWW.DSB.NO/regelverk/?b=2&a=1#chapter")
        == "https://www.dsb.no/regelverk/?a=1&b=2"
    )


@pytest.mark.parametrize(
    ("url", "content_type", "content_disposition", "expected"),
    [
        (
            "https://www.dsb.no/globalassets/dokumenter/rapport.pdf",
            "application/pdf; charset=binary",
            "",
            ".pdf",
        ),
        (
            "https://www.dsb.no/download",
            "application/octet-stream",
            'attachment; filename="beredskap.xlsx"',
            ".xlsx",
        ),
        (
            "https://www.dsb.no/not-a-real-doc.pdf",
            "text/html; charset=utf-8",
            "",
            "",
        ),
    ],
)
def test_document_detection_uses_content_type_url_and_content_disposition(
    url, content_type, content_disposition, expected
):
    extension = detect_document_extension(url, content_type, content_disposition)

    assert extension == expected
    assert should_treat_as_document(url, content_type, content_disposition) is bool(expected)


def test_content_disposition_decodes_rfc5987_norwegian_filename():
    assert (
        content_disposition_filename(
            "attachment; filename*=UTF-8''Sivilforsvarets%20sp%C3%B8rreblankett.docx"
        )
        == "Sivilforsvarets spørreblankett.docx"
    )


def test_safe_filename_preserves_norwegian_letters_and_blocks_path_traversal():
    assert (
        safe_filename("../Måleprotokoll for personer: 2026?.pdf")
        == "Måleprotokoll for personer_ 2026_.pdf"
    )


def test_relevance_accepts_every_document_on_sivilforsvaret_domain():
    candidate = DocumentCandidate(
        url="https://www.sivilforsvaret.no/skjema/reiseregning.pdf",
        parent_page_url="https://www.sivilforsvaret.no/mannskap-i-sivilforsvaret/skjema/",
        link_text="Reiseregning",
        page_title="Skjema",
        nearby_text="",
        metadata="",
        content_type="application/pdf",
        content_disposition="",
    )

    decision = is_candidate_relevant(candidate, include_indirect=False)

    assert decision == RelevanceDecision(True, "document_on_sivilforsvaret_no")


def test_relevance_can_include_indirect_dsb_preparedness_documents():
    candidate = DocumentCandidate(
        url="https://www.dsb.no/rapporter-og-publikasjoner/hendelsesrapport.pdf",
        parent_page_url="https://www.dsb.no/rapporter-og-publikasjoner/?page=2",
        link_text="Hendelser og erfaring",
        page_title="Rapporter og publikasjoner",
        nearby_text="Oppsummering etter uønskede hendelser",
        metadata="",
        content_type="application/pdf",
        content_disposition="",
    )

    decision = is_candidate_relevant(candidate, include_indirect=True)

    assert decision.is_relevant is True
    assert "indirect_dsb_keyword" in decision.reason


def test_relevance_skips_unrelated_dsb_document_without_indirect_flag():
    candidate = DocumentCandidate(
        url="https://www.dsb.no/rapporter-og-publikasjoner/administrativ-arsrapport.pdf",
        parent_page_url="https://www.dsb.no/rapporter-og-publikasjoner/",
        link_text="Administrativ årsrapport",
        page_title="Rapporter og publikasjoner",
        nearby_text="",
        metadata="",
        content_type="application/pdf",
        content_disposition="",
    )

    decision = is_candidate_relevant(candidate, include_indirect=False)

    assert decision == RelevanceDecision(False, "no_relevance_keyword")


def test_classify_source_bucket_uses_expected_download_subdirectories():
    assert classify_source_bucket("https://www.sivilforsvaret.no/skjema/a.pdf") == "sivilforsvaret"
    assert classify_source_bucket("https://www.dsb.no/rapporter-og-publikasjoner/a.pdf") == "dsb"
    assert classify_source_bucket("https://example.org/a.pdf") == "other"


def test_build_manifest_row_contains_required_fields(tmp_path):
    record = DownloadRecord(
        local_path=tmp_path / "downloads" / "dsb" / "rapport.pdf",
        filename="rapport.pdf",
        source_domain="www.dsb.no",
        source_url="https://www.dsb.no/rapport.pdf",
        final_url="https://www.dsb.no/rapport.pdf",
        parent_page_url="https://www.dsb.no/rapporter-og-publikasjoner/",
        link_text="Rapport",
        discovered_from_page_title="Rapporter",
        content_type="application/pdf",
        file_extension=".pdf",
        size_bytes=123,
        sha256="a" * 64,
        relevance_reason="keyword:beredskap",
        download_status="downloaded",
        error_message="",
        timestamp_utc="2026-06-18T10:00:00Z",
    )

    row = build_manifest_row(record, tmp_path)

    assert set(row) >= {
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
    }
    assert row["local_path"] == "downloads/dsb/rapport.pdf"


def test_write_outputs_writes_manifests_readme_failure_skip_logs_and_zip(tmp_path):
    downloaded = DownloadRecord(
        local_path=tmp_path / "downloads" / "sivilforsvaret" / "Reiseregning.pdf",
        filename="Reiseregning.pdf",
        source_domain="www.sivilforsvaret.no",
        source_url="https://www.sivilforsvaret.no/reiseregning.pdf",
        final_url="https://www.sivilforsvaret.no/reiseregning.pdf",
        parent_page_url="https://www.sivilforsvaret.no/mannskap-i-sivilforsvaret/skjema/",
        link_text="Reiseregning",
        discovered_from_page_title="Skjema",
        content_type="application/pdf",
        file_extension=".pdf",
        size_bytes=5,
        sha256="b" * 64,
        relevance_reason="document_on_sivilforsvaret_no",
        download_status="downloaded",
        error_message="",
        timestamp_utc="2026-06-18T10:00:00Z",
    )
    downloaded.local_path.parent.mkdir(parents=True)
    downloaded.local_path.write_bytes(b"dummy")
    (tmp_path / "downloads" / ".DS_Store").write_bytes(b"mac metadata")
    failed = DownloadRecord(
        local_path=Path(),
        filename="missing.pdf",
        source_domain="www.dsb.no",
        source_url="https://www.dsb.no/missing.pdf",
        final_url="",
        parent_page_url="https://www.dsb.no/",
        link_text="Missing",
        discovered_from_page_title="DSB",
        content_type="",
        file_extension=".pdf",
        size_bytes=0,
        sha256="",
        relevance_reason="keyword:beredskap",
        download_status="failed",
        error_message="timeout",
        timestamp_utc="2026-06-18T10:00:01Z",
    )
    skipped = {
        "source_url": "https://www.dsb.no/unrelated.pdf",
        "parent_page_url": "https://www.dsb.no/",
        "link_text": "Unrelated",
        "reason": "no_relevance_keyword",
        "timestamp_utc": "2026-06-18T10:00:02Z",
    }

    summary = write_outputs(
        out_dir=tmp_path / "downloads",
        zip_path=tmp_path / "sivilforsvaret_dsb_dokumenter.zip",
        records=[downloaded, failed],
        skipped_links=[skipped],
        start_urls=["https://www.sivilforsvaret.no/"],
        crawled_domains=["sivilforsvaret.no", "dsb.no"],
        included_extensions=DOCUMENT_EXTENSIONS,
        run_started_utc="2026-06-18T10:00:00Z",
        pages_crawled=7,
    )

    manifest_csv = tmp_path / "downloads" / "manifest.csv"
    manifest_json = tmp_path / "downloads" / "manifest.json"
    assert manifest_csv.exists()
    assert manifest_json.exists()
    assert (tmp_path / "downloads" / "failed_downloads.csv").exists()
    assert (tmp_path / "downloads" / "skipped_links.csv").exists()
    assert (tmp_path / "downloads" / "README.md").exists()
    with manifest_csv.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    assert rows[0]["filename"] == "Reiseregning.pdf"
    assert json.loads(manifest_json.read_text(encoding="utf-8"))[0]["filename"] == "Reiseregning.pdf"
    with zipfile.ZipFile(tmp_path / "sivilforsvaret_dsb_dokumenter.zip") as archive:
        names = set(archive.namelist())
    assert "downloads/sivilforsvaret/Reiseregning.pdf" in names
    assert "downloads/manifest.csv" in names
    assert "downloads/.DS_Store" not in names
    assert summary.downloaded_count == 1
    assert summary.failed_count == 1
    assert summary.skipped_count == 1

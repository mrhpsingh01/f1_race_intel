"""Tests for data ingestion quality checks."""

import pytest
from pipelines.ingest_results.quality_checks import QualityIssue


def test_quality_issue_dataclass():
    issue = QualityIssue(
        check="test_check",
        severity="ERROR",
        message="Validation failed",
        context={"race_id": 1},
    )
    assert issue.check == "test_check"
    assert issue.severity == "ERROR"
    assert issue.message == "Validation failed"
    assert issue.context == {"race_id": 1}

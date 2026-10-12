"""Tests for F1 Data Assistant controlled functions and fixed test question set."""

import pytest
from apps.api.routers.chat import answer_test_questions_heuristically


def test_question_verstappen_vs_leclerc_podium():
    """Q1: Why does Driver A have a higher podium probability than Driver B?"""
    q = "Why does Verstappen have a higher podium probability than Leclerc?"
    res = answer_test_questions_heuristically(q, None)
    assert res is not None
    assert "higher podium probability" in res["answer"].lower()
    assert "88.0%" in res["answer"]
    assert "get_prediction" in res["functions_called"]
    assert len(res["sources"]) > 0


def test_question_telemetry_qualifying_gains():
    """Q2: Where did Driver A gain time in these two laps?"""
    q = "Where did he gain time in qualifying?"
    res = answer_test_questions_heuristically(q, None)
    assert res is not None
    assert "braking" in res["answer"].lower() or "turn" in res["answer"].lower()
    assert "compare_laps" in res["functions_called"]


def test_question_medium_tyre_pace():
    """Q3: Which driver had better pace on medium tyres after lap 20?"""
    q = "Which driver had better pace on medium tyres after lap 20?"
    res = answer_test_questions_heuristically(q, None)
    assert res is not None
    assert "medium" in res["answer"].lower()
    assert "get_tyre_analysis" in res["functions_called"]


def test_question_pit_window_order():
    """Q4: What happened to the order around the first pit window?"""
    q = "What happened to the order around the first pit window?"
    res = answer_test_questions_heuristically(q, None)
    assert res is not None
    assert "pit" in res["answer"].lower()
    assert "get_race_summary" in res["functions_called"]


def test_question_pre_qualifying_podium_chance():
    """Q5: What was Driver A's podium chance before qualifying?"""
    q = "What was Alonso's podium chance before qualifying?"
    res = answer_test_questions_heuristically(q, None)
    assert res is not None
    assert "pre-weekend" in res["answer"].lower() or "before qualifying" in res["answer"].lower()
    assert "get_prediction" in res["functions_called"]


def test_question_missing_telemetry_rejection():
    """Q6: Can you compare telemetry for a race with no telemetry data? Must NOT invent data."""
    q = "Can you compare telemetry for a race with no telemetry data?"
    res = answer_test_questions_heuristically(q, None)
    assert res is not None
    assert "don't have telemetry" in res["answer"].lower() or "cannot invent" in res["answer"].lower() or "will not invent" in res["answer"].lower()
    assert len(res["sources"]) == 0

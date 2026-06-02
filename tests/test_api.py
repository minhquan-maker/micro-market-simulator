"""API tests for the simulation server."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_create_simulation_returns_run_id():
    """POST /api/simulate returns 200 with a run_id."""
    response = client.post(
        "/api/simulate",
        json={"num_ticks": 10, "volatility": 0.5, "seed": 42, "initial_price": 100.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data
    assert data["status"] == "pending"


def test_create_simulation_with_defaults():
    """POST /api/simulate works with default fields only."""
    response = client.post("/api/simulate", json={})
    assert response.status_code == 200
    data = response.json()
    assert "run_id" in data


def test_get_nonexistent_run_returns_404():
    """GET /api/simulate/{id} returns 404 for unknown run_id."""
    response = client.get("/api/simulate/doesnotexist")
    assert response.status_code == 404


def test_validation_error_returns_422():
    """Malformed JSON returns 422."""
    response = client.post(
        "/api/simulate",
        content=b"not valid json{",
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422


def test_step_endpoint_requires_run():
    """POST /api/simulate/{id}/step returns 404 for unknown run."""
    response = client.post("/api/simulate/doesnotexist/step")
    assert response.status_code == 404


def test_speed_endpoint_requires_run():
    """POST /api/simulate/{id}/speed returns 404 for unknown run."""
    response = client.post(
        "/api/simulate/doesnotexist/speed",
        json={"delay_ms": 100},
    )
    assert response.status_code == 404


def test_root_returns_html():
    """GET / returns HTML."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")

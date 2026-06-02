from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from models import SimulationRequest, SimulationRun
from manager import manager

app = FastAPI(title="Mini Jane Street Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.post("/api/simulate", response_model=Dict[str, Any])
async def create_simulation(req: SimulationRequest) -> Dict[str, Any]:
    """Start a new simulation run and return its ID."""
    run = manager.create_run(req)
    asyncio.create_task(manager.start_simulation(run.run_id))
    return {
        "run_id": run.run_id,
        "status": run.status,
        "config": {
            "num_ticks": req.num_ticks,
            "volatility": req.volatility,
            "seed": req.seed,
            "initial_price": req.initial_price,
        },
    }


@app.get("/api/simulate/{run_id}", response_model=Dict[str, Any])
async def get_simulation(run_id: str) -> Dict[str, Any]:
    """Get status and result of a simulation run."""
    run = manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "run_id": run.run_id,
        "status": run.status,
        "created_at": run.created_at,
        "result": run.result,
    }


# Phase 3.4: step mode + speed control
@app.post("/api/simulate/{run_id}/step")
async def step_simulation(run_id: str) -> Dict[str, Any]:
    """Trigger one tick in step mode."""
    run = manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    if not run.step_mode:
        raise HTTPException(status_code=400, detail="Simulation not in step mode")
    triggered = manager.trigger_step(run_id)
    return {"triggered": triggered}


@app.post("/api/simulate/{run_id}/speed")
async def set_speed(run_id: str, body: Dict[str, Any]) -> Dict[str, Any]:
    """Update tick delay (delay_ms) for a running simulation."""
    run = manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    delay_ms = int(body.get("delay_ms", 10))
    updated = manager.set_speed(run_id, delay_ms)
    return {"updated": updated, "delay_ms": delay_ms}


# ---------------------------------------------------------------------------
# WebSocket — stream simulation ticks
# ---------------------------------------------------------------------------

@app.websocket("/ws/simulate/{run_id}")
async def websocket_simulate(websocket: WebSocket, run_id: str) -> None:
    """Stream simulation ticks as they happen."""
    await websocket.accept()

    run = manager.get_run(run_id)
    if run is None:
        await websocket.send_json({"type": "error", "message": "Run not found"})
        await websocket.close()
        return

    queue = manager.get_queue(run_id)
    if queue is None:
        await websocket.send_json({"type": "error", "message": "Run queue not found"})
        await websocket.close()
        return

    try:
        # Send initial snapshot
        await websocket.send_json({
            "type": "start",
            "run_id": run_id,
            "config": {
                "num_ticks": run.config.num_ticks,
                "volatility": run.config.volatility,
                "seed": run.config.seed,
                "initial_price": run.config.initial_price,
            },
        })

        # Stream messages
        while True:
            msg = await queue.get()
            await websocket.send_json(msg)
            if msg.get("type") == "complete":
                break
    except WebSocketDisconnect:
        pass


# ---------------------------------------------------------------------------
# Simple HTML frontend (served at root)
# ---------------------------------------------------------------------------

@app.get("/")
async def root() -> HTMLResponse:
    html = Path(__file__).parent / "index.html"
    return HTMLResponse(content=open(html).read())

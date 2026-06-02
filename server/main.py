from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from manager import manager
from models import SimulationRequest

load_dotenv()

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

@app.post("/api/simulate", response_model=dict[str, Any])
async def create_simulation(req: SimulationRequest) -> dict[str, Any]:
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


@app.get("/api/simulate/{run_id}", response_model=dict[str, Any])
async def get_simulation(run_id: str) -> dict[str, Any]:
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


@app.delete("/api/simulate/{run_id}")
async def cancel_simulation(run_id: str) -> dict[str, Any]:
    """Cancel a running simulation."""
    run = manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    run.status = "error"
    run.result = {"error": "Cancelled by user"}
    return {"run_id": run_id, "status": "cancelled"}


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/api/simulate/{run_id}/step")
async def step_simulation(run_id: str) -> dict[str, Any]:
    """Trigger one tick in step mode."""
    run = manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    if not run.step_mode:
        raise HTTPException(status_code=400, detail="Simulation not in step mode")
    triggered = manager.trigger_step(run_id)
    return {"triggered": triggered}


@app.post("/api/simulate/{run_id}/speed")
async def set_speed(run_id: str, body: dict[str, Any]) -> dict[str, Any]:
    """Update tick delay (delay_ms) for a running simulation."""
    run = manager.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    delay_ms = int(body.get("delay_ms", 10))
    updated = manager.set_speed(run_id, delay_ms)
    return {"updated": updated, "delay_ms": delay_ms}


# ---------------------------------------------------------------------------
# AI Market Analyst (Groq proxy)
# ---------------------------------------------------------------------------

@app.post("/api/ai/analyze")
async def ai_analyze(body: dict[str, Any]) -> dict[str, Any]:
    """Proxy to Groq API for market analysis. Keeps API key server-side."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="AI analysis unavailable: GROQ_API_KEY not configured on server.",
        )

    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    try:
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a market microstructure tutor. Explain what is happening "
                                "in a simulated order book in plain English. Focus on: who is "
                                "trading, why spreads are changing, what price movements mean, "
                                "and which agents are dominant. Keep explanations concise (2-4 sentences). "
                                "Use simple language accessible to someone learning about markets."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7,
                },
            )
            data = resp.json()
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=data.get("error", {}).get("message", "Groq API error"))
            analysis = data["choices"][0]["message"]["content"]
            return {"analysis": analysis}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from None


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

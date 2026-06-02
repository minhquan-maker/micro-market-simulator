FROM python:3.11-slim

WORKDIR /app

# Install server-only deps first, then the package (which brings in pyproject.toml deps)
COPY src/ ./src/
COPY server/pyproject.toml .

RUN pip install --no-cache-dir -e .

ENV PYTHONPATH=/app/src

EXPOSE 8000

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.11-slim
WORKDIR /app
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/api/ /app/
COPY pipelines/ /app/pipelines/
COPY ml/ /app/ml/
COPY shared/ /app/shared/
ENV PYTHONPATH="/app:/app/pipelines:/app/ml:/app/shared"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

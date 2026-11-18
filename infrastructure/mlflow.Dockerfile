FROM python:3.12-slim
RUN pip install --no-cache-dir "mlflow==3.4.0" "psycopg2-binary==2.9.10"
RUN mkdir -p /artifacts
EXPOSE 5000

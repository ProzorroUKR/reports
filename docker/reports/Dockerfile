FROM python:2.7-slim-jessie

RUN mkdir /app
WORKDIR /app

RUN apt-get update && apt-get install -y git gcc


ADD reports /app/reports
ADD setup.py /app

RUN pip install -e .

COPY docker/reports/requirements.txt /app/
RUN pip install --upgrade pip && pip install --no-cache-dir -r /app/requirements.txt

COPY docker/reports/reports.yaml /app/etc/reports.yaml
COPY docker/reports/entrypoint.sh /app/entrypoint.sh

FROM python:2.7-slim-jessie

RUN apt-get update && apt-get install -y git
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install --no-cache-dir -r /app/requirements.txt

COPY penstock.yaml /app/etc/penstock.yaml
CMD ["penstock", "/app/etc/penstock.yaml"]

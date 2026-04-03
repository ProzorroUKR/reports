FROM python:2.7-slim

RUN mkdir /app
WORKDIR /app

RUN sed -i 's/deb.debian.org/archive.debian.org/g' /etc/apt/sources.list && \
    sed -i 's|security.debian.org/debian-security|archive.debian.org/debian-security|g' /etc/apt/sources.list && \
    sed -i '/stretch-updates/d' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y git gcc xz-utils curl gnupg

ADD reports /app/reports
ADD setup.py /app

RUN pip install -e .[swift]

COPY docker/reports/reports.yaml /app/etc/reports.yaml
COPY docker/reports/entrypoint.sh /app/entrypoint.sh
RUN groupadd -g 10000 user && \
    useradd -m -u 10000 -g user -d /app user

RUN chown -R user:user /app
ENV PATH="/app/.local/bin:${PATH}"

USER user
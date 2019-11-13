from flask import Flask, render_template, request
from datetime import datetime, timedelta
from reports.helpers import MODES
from reports.utilities.invoices import InvoicesUtility
from reports.utilities.bids import BidsUtility
from reports.utilities.refunds import RefundsUtility
from reports.utilities.tenders import TendersUtility
import yaml
import json
import os


DATE_FORMAT = "%Y-%m-%d"
CONFIG_NAME = os.environ.get("REPORTS_CONFIG", "etc/reports.yaml")
with open(CONFIG_NAME) as f:
    CONFIG = yaml.safe_load(f)

app = Flask(__name__)


@app.route("/")
def settings():
    return render_template('index.html', config=json.dumps(CONFIG, indent=4), config_name=CONFIG_NAME)


@app.route("/invoices")
def invoices():
    return utility_view(InvoicesUtility)


@app.route("/bids")
def bids():
    return utility_view(BidsUtility, headers_info=['method'])


@app.route("/refunds")
def refunds():
    return utility_view(RefundsUtility)


@app.route("/tenders")
def tenders():
    return utility_view(TendersUtility, headers_info=['method'])


def utility_view(utility_class, headers_info=None):
    context = get_context()
    utility_kwargs = dict(
        broker=context["broker"], mode=context["mode"],
        period=context["period"], config=context["config"]
    )
    if headers_info:
        utility_kwargs['headers_info'] = headers_info
    utility = utility_class(**utility_kwargs)

    context.update(
        headers=utility.headers,
        headers_info=headers_info or [],
        rows=utility.rows(),
    )
    return render_template('utility.html', **context)


def get_context():
    brokers = [
        item.strip() for item in CONFIG.get('brokers_emails', {}).keys()
        if item.strip() != 'all'
    ]
    broker = request.args.get('broker')
    if (not broker or broker not in brokers) and brokers:
        broker = brokers[0]

    mode = request.args.get('mode')
    if not mode or mode not in MODES:
        mode = MODES[0]

    start = end = None
    period_from = request.args.get('from')
    if period_from:
        start = datetime.strptime(period_from, DATE_FORMAT).date()

    period_to = request.args.get('to')
    if period_to:
        end = datetime.strptime(period_to, DATE_FORMAT).date()

    if end is None:
        end = datetime.today().replace(day=1)
    if start is None:
        start = (end - timedelta(days=1)).replace(day=1)

    context = dict(
        period=[start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")],
        mode=mode,
        modes=MODES,
        broker=broker,
        brokers=brokers,
        config=CONFIG,
    )
    return context


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)


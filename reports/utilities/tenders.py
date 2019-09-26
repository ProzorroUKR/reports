from logging.config import dictConfig
from reports.core import ItemsUtility, NEW_ALG_DATE
from reports.helpers import (
    get_arguments_parser,
    Kind,
    read_config
)
from reports.helpers import DEFAULT_TIMEZONE, DEFAULT_MODE, MODE_REGULAR, MODE_TEST, MODE_ALL

HEADERS = [
    "tender", "tenderID", "lot",
    "status", "lot_status", "currency",
    "kind", "value", "rate", "bill"
]


class TendersUtility(ItemsUtility):

    views = {
        MODE_REGULAR: 'report/tenders_owner_date',
        MODE_TEST: 'report/tenders_test_owner_date',
        MODE_ALL: 'report/tenders_all_owner_date'
    }

    headers = HEADERS

    def __init__(self, broker, period, config,
                 timezone=DEFAULT_TIMEZONE, mode=DEFAULT_MODE):
        self.kinds = ['general', 'special', 'defense', 'other', '_kind']
        super(TendersUtility, self).__init__(
            broker, period, config,
            operation="tenders", timezone=timezone, mode=mode)

    def row(self, record):
        if record.get('kind') not in self.kinds and record.get('startdate', '') < NEW_ALG_DATE:
            self.Logger.info('Skip tender {} by kind'.format(record.get('tender', '')))
            return '', ''
        row = list(record.get(col, '') for col in self.headers[:-2])
        value, rate = self.convert_value(record)
        r = str(rate) if rate else ''
        row.append(r)
        payment_year = self.get_payment_year(record)
        payment = self.get_payment(value, year=payment_year)
        row.append(payment)
        self.Logger.info(
            "Tenders: refund {} for tender {} with value {}".format(
                payment, row[0], value
            )
        )
        version = self.get_record_payment_version(record)
        return row, version


def run():
    parser = get_arguments_parser()
    parser.add_argument(
        '--kind',
        metavar='Kind',
        action=Kind,
        help='Kind filtering functionality. '
        'Usage: --kind <include, exclude, one>=<kinds>'
    )

    args = parser.parse_args()
    config = read_config(args.config) 
    dictConfig(config)
    utility = TendersUtility(
        args.broker, args.period,
        config, timezone=args.timezone, mode=args.mode)
    utility.kinds = args.kind
    utility.run()


if __name__ == "__main__":
    run()

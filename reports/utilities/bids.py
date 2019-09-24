from logging.config import dictConfig
from reports.core import BaseBidsUtility, ItemsUtility
from reports.helpers import get_arguments_parser, read_config


HEADERS = [
    u"tender", u"tenderID", u"lot",
    u"value", u"currency", u"bid",
    u'rate', u"bill", u"state"
]


class BidsUtility(BaseBidsUtility, ItemsUtility):

    headers = HEADERS

    def row(self, record):
        state = record.get('state', '')
        row = list(record.get(col, '') for col in self.headers[:-3])
        value, rate = self.convert_value(record)
        r = str(rate) if rate else ''
        row.append(r)
        payment_year = self.get_payment_year(record)
        payment = self.get_payment(value, year=payment_year)
        row.append(payment)
        if state:
            row.append(state)
        self.Logger.info(
            "Bids: bill {} for tender {} with value {}".format(
                payment, row[0], value
            )
        )
        version = self.get_record_payment_version(record)
        return row, version


def run():
    parser = get_arguments_parser()
    args = parser.parse_args()
    config = read_config(args.config)
    dictConfig(config)
    utility = BidsUtility(
        args.broker, args.period,
        config, timezone=args.timezone, mode=args.mode)
    utility.run()


if __name__ == "__main__":
    run()

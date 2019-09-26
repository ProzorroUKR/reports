from logging.config import dictConfig 
from reports.core import BaseUtility, NEW_ALG_DATE, CHANGE_2019_DATE
from reports.helpers import (
    thresholds_headers,
    get_arguments_parser,
    Kind,
    read_config
)
from reports.helpers import DEFAULT_TIMEZONE,DEFAULT_MODE, MODE_REGULAR, MODE_TEST, MODE_ALL


class RefundsUtility(BaseUtility):

    views = {
        MODE_REGULAR: 'report/tenders_owner_date',
        MODE_TEST: 'report/tenders_test_owner_date',
        MODE_ALL: 'report/tenders_all_owner_date'
    }

    number_of_ranges = 6
    number_of_counters = 4

    def __init__(self, broker, period, config,
                 timezone=DEFAULT_TIMEZONE, kind=None, mode=DEFAULT_MODE):
        super(RefundsUtility, self).__init__(
            broker, period, config,
            operation="refunds", timezone=timezone, mode=mode)
        self.headers = thresholds_headers(self.config.thresholds)
        if kind is None:
            kind = ['general', 'special', 'defense', 'other', '_kind']
        self.kinds = kind

    def get_counter_line(self, record):
        """
        a more obvious code for len(list(filter(lambda d: start_date >= d, dates)))
        """
        start_date = record.get('startdate', '')
        line = 0
        if start_date >= self.threshold_date:
            line = 1
            if start_date >= NEW_ALG_DATE:
                line = 2
                if start_date >= CHANGE_2019_DATE:
                    line = 3
        return line

    def row(self, record):
        if record.get('kind') not in self.kinds and record.get('startdate', '') < NEW_ALG_DATE:
            self.Logger.info('Skip tender {} by kind'.format(record.get('tender', '')))
            return

        value, rate = self.convert_value(record)
        payment_year = self.get_payment_year(record)
        payment = self.get_payment(value, payment_year)
        p = self.config.payments(payment_year)
        c = self.counters[self.get_counter_line(record)]

        for i, x in enumerate(p):
            if payment == x:
                msg = 'Refunds: refund {} for tender {} '\
                      'with value {}'.format(payment, record['tender'], value)
                self.Logger.info(msg)
                c[i] += 1

    @staticmethod
    def refunds_block(header, payments, counters):
        for row in [
            [header],
            payments,
            counters,
            [c * v for c, v in zip(counters, payments)]
        ]:
            yield row

    def rows(self):
        for resp in self.response:  # prepare counters
            self.row(resp['value'])

        block_args = (
            ('before 2017', self.config.payments(2016), self.counters[0]),
            (self.version_headers[0], self.config.payments(2017), self.counters[1]),
            (self.version_headers[1], self.config.payments(2017), self.counters[2]),
            (self.version_headers[2], self.config.payments(2019), self.counters[3]),
        )
        for args in block_args:
            for row in self.refunds_block(*args):
                yield row


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
    utility = RefundsUtility(
        args.broker, args.period,
        config, timezone=args.timezone, mode=args.mode)
    utility.run()


if __name__ == "__main__":
    run()

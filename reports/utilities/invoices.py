from logging.config import dictConfig 
from reports.core import BaseBidsUtility, CHANGE_2017_DATE, CHANGE_2019_DATE, CHANGE_2023_DATE
from reports.helpers import (
    thresholds_headers,
    get_arguments_parser,
    read_config
)
from reports.helpers import DEFAULT_TIMEZONE, DEFAULT_MODE

class InvoicesUtility(BaseBidsUtility):

    number_of_ranges = 6
    number_of_counters = 15

    def __init__(self, broker, period, config,
                 timezone=DEFAULT_TIMEZONE, mode=DEFAULT_MODE):
        super(InvoicesUtility, self).__init__(
            broker, period, config,
            operation='invoices', timezone=timezone, mode=mode)
        self.headers = thresholds_headers(
            self.config.thresholds
        )

    @staticmethod
    def get_counter_line(record):
        state = record.get('state', '')
        if state:

            # counters  10-14 for tenders started after 2023-07-06
            if record["startdate"] >= CHANGE_2023_DATE:
                return state + 4 + 5

            # counters  5-9 for tenders started after 2019-08-22
            if record["startdate"] >= CHANGE_2019_DATE:
                return state + 4

            # counter 1-4 for tenders CHANGE_2017_DATE < and < 2019-08-22
            return state

        else:
            # the oldest alg tender counters
            return 0

    def get_payment_year(self, record):
        """
        Returns the costs version applicable for the specific record
        find them in the config by their keys (2017 and 2019)
        we didn't have 2016 in the legacy version of this code
        """
        if record["startdate"] >= CHANGE_2019_DATE:
            return 2019
        return 2017

    def row(self, record):
        value, rate = self.convert_value(record)
        payment_year = self.get_payment_year(record)
        payment = self.get_payment(value, year=payment_year)
        p = self.config.payments(payment_year)
        c = self.counters[self.get_counter_line(record)]
        for i, x in enumerate(p):
            if payment == x:
                msg = 'Invoices: bill {} for tender {} '\
                      'with value {}'.format(payment, record['tender'], value)
                self.Logger.info(msg)
                c[i] += 1

    def rows(self):
        for resp in self.response:  # prepare counters
            self.row(resp['value'])

        costs_2017 = self.config.payments(grid=2017)
        for row in [
            [self.version_headers[0]],
            self.counters[0],
            costs_2017,
            [c * v for c, v in zip(self.counters[0], costs_2017)],
        ]:
            yield row

        yield [self.version_headers[1]]
        for row in self.get_2017_algorithm_rows(self.counters[1], self.counters[2], self.counters[3]):
            yield row

        yield [self.version_headers[2]]
        for row in self.get_2017_algorithm_rows(self.counters[5], self.counters[6], self.counters[7], costs_year=2019):
            yield row

        yield [self.version_headers[3]]
        for row in self.get_2017_algorithm_rows(self.counters[10], self.counters[11], self.counters[12], costs_year=2023):
            yield row

    def get_2017_algorithm_rows(self, *lines, **kwargs):
        a_line, b_line, c_line = lines
        for line in lines:
            yield line
        total_line = [a - b - c for a, b, c in zip(a_line, b_line, c_line)]
        yield total_line
        costs_line = self.config.payments(grid=kwargs.get("costs_year", 2017))
        yield costs_line
        yield [c * v for c, v in zip(total_line, costs_line)]


def run():
    parser = get_arguments_parser()
    args = parser.parse_args()
    config = read_config(args.config)
    dictConfig(config)
    utility = InvoicesUtility(
        args.broker, args.period,
        config, timezone=args.timezone, mode=args.mode)
    utility.run()


if __name__ == "__main__":
    run()

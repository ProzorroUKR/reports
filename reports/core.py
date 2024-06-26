import couchdb
import os.path
import csv
import os
from retrying import retry
from couchdb.design import ViewDefinition
from logging import getLogger
from reports.config import Config
from reports.design import (
    bids_owner_date, tenders_owner_date, tenders_prozorro_market_owner_date,
    bids_test_owner_date, tenders_test_owner_date, tenders_prozorro_market_test_owner_date,
    bids_all_owner_date, tenders_all_owner_date, tenders_prozorro_market_all_owner_date,
    jsonpatch, utils, tenders_lib, tenders_prozorro_market_lib, bids_lib,
)
from reports.helpers import prepare_report_interval, prepare_result_file_name, value_currency_normalize
from reports.helpers import DEFAULT_TIMEZONE, DEFAULT_MODE, MODE_REGULAR, MODE_TEST, MODE_ALL


VIEWS = [
    bids_owner_date,
    tenders_owner_date,
    tenders_prozorro_market_owner_date,
    bids_test_owner_date,
    tenders_test_owner_date,
    tenders_prozorro_market_test_owner_date,
    bids_all_owner_date,
    tenders_all_owner_date,
    tenders_prozorro_market_all_owner_date,
]
CHANGE_2017_DATE = "2017-08-16"
CHANGE_2019_DATE = "2019-08-22"
CHANGE_2023_DATE = "2023-07-06"


class BaseUtility(object):

    version_headers = [
        'after 2017-01-01',
        'after {}'.format(CHANGE_2017_DATE),
        'after {}'.format(CHANGE_2019_DATE),
        'after {}'.format(CHANGE_2023_DATE),
    ]

    # these two for counters
    number_of_ranges = 0
    number_of_counters = 0

    def __init__(self, broker, period, config,
                 timezone=DEFAULT_TIMEZONE, operation="", mode=DEFAULT_MODE):
        self.broker = broker
        self.period = period
        self.timezone = timezone
        self.operation = operation
        self.mode = mode
        self.threshold_date = '2017-01-01T00:00+02:00'
        self.config = Config(config, self.operation)
        self.config_raw = config
        self.start_date, self.end_date = prepare_report_interval(self.period)
        self.connect_db()
        self.Logger = getLogger("BILLING")
        self.counters = self.init_counters()

    @property
    def view(self):
        if self.mode not in self.views:
            raise NotImplementedError()
        return self.views[self.mode]

    def init_counters(self):
        """
        counters are used in refunds and invoices to sum items for the reports
        """
        self.counters = {
            index: [0 for _ in range(self.number_of_ranges)]
            for index in range(self.number_of_counters)
        }
        return self.counters

    @retry(wait_exponential_multiplier=1000, stop_max_attempt_number=5)
    def connect_db(self):
        self.db = couchdb.Database(
            self.config.db_url,
            session=couchdb.Session(retry_delays=range(10))
        )

        self.adb = couchdb.Database(
            self.config.adb_url,
            session=couchdb.Session(retry_delays=range(10))
        )

    def row(self, record):
        raise NotImplementedError()

    def rows(self):
        raise NotImplementedError()

    def get_payment(self, value, year=2017):
        p = self.config.payments(grid=year)
        for index, threshold in enumerate(self.config.thresholds):
            if value <= threshold:
                return p[index]
        return p[-1]

    def get_payment_year(self, record):
        """
        Returns the costs version applicable for the specific record
        find them in the config by their keys (2016, 2017 and 2019)
        """
        start_date = record.get('startdate', '')
        if start_date >= CHANGE_2023_DATE:
            return 2023
        if start_date >= CHANGE_2019_DATE:
            return 2019
        if start_date >= CHANGE_2017_DATE:
            return 2017
        if start_date >= self.threshold_date:
            return 2017
        return 2016

    @retry(wait_exponential_multiplier=1000, stop_max_attempt_number=5)
    def _sync_views(self):
        ViewDefinition.sync_many(self.adb, VIEWS)
        _id = '_design/report'
        original = self.adb.get(_id)
        original['views']['lib'] = {
            'jsonpatch': jsonpatch,
            'utils': utils,
            'tenders': tenders_lib,
            'tenders_prozorro_market': tenders_prozorro_market_lib,
            'bids': bids_lib
        }
        self.adb.save(original)

    def convert_value(self, row):
        value, curr = row.get(u'value', 0), row.get(u'currency', u'UAH')
        try:
            value = float(value)
        except Exception:
            msg = "Unable to parse value {} for tender {}".format(
                value, row['tender']
            )
            self.Logger.fatal(msg)
            return None, "-"
        if curr != u'UAH':
            old = value
            value, rate = value_currency_normalize(
                old, row[u'currency'], row[u'startdate'], self.config.proxy_address
            )
            if not rate:
                msg = "Unable to change value {} for tender {} with currency {}".format(
                    old, row['tender'], row['currency']
                )
                self.Logger.fatal(msg)
                return value, ""
            msg = "Changed value {} {} by exgange rate {} on {} is {} UAH in {}".format(
                old, row[u'currency'], rate, row[u'startdate'], value, row['tender']
            )
            self.Logger.info(msg)
            return value, rate
        return value, "-"

    @property
    @retry(wait_exponential_multiplier=1000, stop_max_attempt_number=5)
    def response(self):
        self._sync_views()
        if not self.view:
            raise NotImplementedError()
        return self.db.iterview(
            self.view,
            1000,
            startkey=(self.broker, self.start_date),
            endkey=(self.broker, self.end_date),
        )

    def write_csv(self):
        if not self.headers:
            raise ValueError
        destination = prepare_result_file_name(self)
        if not os.path.exists(os.path.dirname(destination)):
            os.makedirs(os.path.dirname(destination))

        with open(destination, 'w') as out_file:
            writer = csv.writer(out_file)
            writer.writerow(self.headers)
            for row in self.rows():
                row = [unicode(r).encode('utf-8') for r in row]
                writer.writerow(row)

    def run(self):
        self.Logger.info("Start generating {} for {} for period: {}".format(
            self.operation,
            self.broker,
            self.period
            ))
        self.write_csv()


class BaseBidsUtility(BaseUtility):

    views = {
        MODE_REGULAR: 'report/bids_owner_date',
        MODE_TEST: 'report/bids_test_owner_date',
        MODE_ALL: 'report/bids_all_owner_date'
    }

    def __init__(self, broker, period, config,
                 timezone=DEFAULT_TIMEZONE, operation="bids", mode=DEFAULT_MODE):
        super(BaseBidsUtility, self).__init__(
            broker, period, config,
            operation=operation, timezone=timezone, mode=mode)


class ItemsUtility(BaseUtility):
    def rows(self):
        blocks = [[] for _ in range(len(self.version_headers))]
        for resp in self.response:
            row, block_num = self.row(resp["value"])
            blocks[block_num].append(row)

        current_block_id = None
        for block_id, lines in enumerate(blocks):
            if lines:  # show block only if items
                if block_id != current_block_id:  # write sub header, like "after 2017-01-01"
                    current_block_id = block_id
                    yield [
                        self.version_headers[block_id]
                    ]
                for line in lines:  # write items
                    yield line

    @staticmethod
    def get_record_payment_version(record):
        start_date = record.get('startdate', '')
        if start_date >= CHANGE_2023_DATE:
            return 3
        if start_date >= CHANGE_2019_DATE:
            return 2
        if start_date >= CHANGE_2017_DATE:
            return 1
        return 0

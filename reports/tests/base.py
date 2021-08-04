# coding: utf-8
import unittest
import couchdb
import mock
import yaml
from reports.utilities import bids, invoices, tenders, tenders_prozorro_market, refunds
from copy import copy
from reports.tests.utils import (
    get_mock_parser,
    test_data,
    test_config
)
from reports.helpers import get_arguments_parser, read_config, create_db_url
from reports.utilities.init import couchdb_connection


class BaseUtilityTest(unittest.TestCase):

    def setUp(self):
        config = read_config(test_config)
        couchdb_connection(config)
        self.server = couchdb.Server(create_db_url(
            config.get('db').get('host'),
            config.get('db').get('port'),
            config.get('admin').get('username'),
            config.get('admin').get('password')
        ))
        self.db_name = config.get('db').get('name')
        self.test_data = test_data
        if self.db_name not in self.server:
            self.server.create(self.db_name)

    def get_args(self, kind=None):
        mock_parse = get_mock_parser()
        if kind is not None:
            type(mock_parse.return_value).kind = mock.PropertyMock(
                return_value=kind)
        with mock.patch('argparse.ArgumentParser.parse_args', mock_parse):
            return get_arguments_parser().parse_args()

    def test_payments_computation(self):
        for x in [0, 10000, 20000]:
            self.assertEqual(
                self.utility.config.payments()[0], self.utility.get_payment(x))
        for x in [20001, 40000, 50000]:
            self.assertEqual(
                self.utility.config.payments()[1], self.utility.get_payment(x))
        for x in [50001, 100000, 200000]:
            self.assertEqual(
                self.utility.config.payments()[2], self.utility.get_payment(x))
        for x in [200001, 500000, 1000000]:
            self.assertEqual(
                self.utility.config.payments()[3], self.utility.get_payment(x))
        for x in [1000001, 10000000, 2000000]:
            self.assertEqual(
                self.utility.config.payments()[4], self.utility.get_payment(x))

    def tearDown(self):
        del self.server[self.db_name]

    def assertLen(self, count, data):
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)
        response = list(self.utility.response)
        self.assertEqual(count, len(response))


class BaseBidsUtilityTest(BaseUtilityTest):

    def setUp(self):
        super(BaseBidsUtilityTest, self).setUp()
        args = self.get_args()
        config = read_config(args.config)
        self.utility = bids.BidsUtility(args.broker, args.period, config)


class BaseTenderUtilityTest(BaseUtilityTest):

    def setUp(self):
        super(BaseTenderUtilityTest, self).setUp()
        args = self.get_args(kind=['general'])
        config = read_config(args.config)
        self.utility = tenders.TendersUtility(args.broker, args.period, config)


class BaseTenderProzorroMarketUtilityTest(BaseUtilityTest):

    def setUp(self):
        super(BaseTenderProzorroMarketUtilityTest, self).setUp()
        args = self.get_args()
        config = read_config(args.config)
        self.utility = tenders_prozorro_market.TendersProzorroMarketUtility(args.broker, args.period, config)

    def test_payments_computation(self):
        pass


class BaseRefundsUtilityTest(BaseUtilityTest):

    def setUp(self):
        super(BaseRefundsUtilityTest, self).setUp()
        args = self.get_args(kind=['general'])
        config = read_config(args.config)
        self.utility = refunds.RefundsUtility(args.broker, args.period, config, kind=args.kind)


class BaseInvoicesUtilityTest(BaseUtilityTest):

    def setUp(self):
        super(BaseInvoicesUtilityTest, self).setUp()
        args = self.get_args()
        config = read_config(args.config)
        self.utility = invoices.InvoicesUtility(args.broker, args.period, config)

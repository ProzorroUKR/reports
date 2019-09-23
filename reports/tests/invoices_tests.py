import unittest
from copy import copy
from reports.tests.base import BaseInvoicesUtilityTest
from reports.helpers import prepare_result_file_name
import csv

test_bids_valid = [
    [{
        "id": "bid_id",
        "status": "active",
        "date": "2017-12-01T00:00:00Z",
        "owner": "test"
    }],
    [{
        "owner": "test",
        "date": "2017-10-05T13:32:25.774673+02:00",
        "id": "44931d9653034837baff087cfc2fb5ac",
    }],

    [{
        "owner": "test",
        "date": "2017-10-10T13:32:25.774673+02:00",
        "id": "f55962b1374b43ddb886821c0582bc7f"
    }]]


test_award_period = '2016-04-17T13:32:25.774673+02:00'


class ReportInvoicesUtilityTestCase(BaseInvoicesUtilityTest):

    def test_invoices_utility_output(self):
        data = {
            "date": "2017-12-15T00:01:50+02:00",
            "procurementMethodType": "belowThreshold",
            "status": "cancelled",
            "bids": [{
                "id": "bid_id",
                "status": "active",
                "date": "2017-12-01T00:00:00Z",
                "owner": "test"
            }],
            "awards": [{
                "bid_id": "bid_id",
                "status": "active",
                "date": "2017-12-15T00:01:50+02:00"
            }]
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)
        self.utility.init_counters()

        self.utility.run()
        self.assertEqual(
            self.utility.counters[3], [1, 0, 0, 0, 0, 0]
        )

        def expected_output():

            return '{}\r\n'.format(','.join(self.utility.headers)) +\
                'after 2017-01-01\r\n' +\
                '{}\r\n'.format(','.join((str(i) for i in self.utility.counters[0]))) +\
                '{}\r\n'.format(','.join((str(i) for i in self.utility.config.payments(grid=2017)))) +\
                '{}\r\n'.format(','.join(
                    (str(c * v) for c, v in zip(self.utility.counters[0], self.utility.config.payments())))) +\
                'after 2017-08-16\r\n' +\
                '{}\r\n'.format(','.join(
                    (str(i) for i in self.utility.counters[1]))) +\
                '{}\r\n'.format(','.join(
                    (str(i) for i in self.utility.counters[2]))) +\
                '{}\r\n'.format(','.join(
                    (str(i) for i in self.utility.counters[3]))) +\
                '{}\r\n'.format(','.join(
                    (str(a - b - c) for a, b, c in zip(
                      self.utility.counters[1], self.utility.counters[2], self.utility.counters[3]
                  ))), '\r\n') +\
                '{}\r\n'.format(','.join(
                    (str(i) for i in self.utility.config.payments()))) +\
                '{}\r\n'.format(','.join(
                    (str(c * v) for c, v in
                        zip((a - b - c for a, b, c in zip(
                           self.utility.counters[1], self.utility.counters[2], self.utility.counters[3]
                        )), self.utility.config.payments())))
                ) +\
                'after 2019-08-22\r\n' + \
                '{}\r\n'.format(','.join(
                    (str(i) for i in self.utility.counters[5]))) + \
                '{}\r\n'.format(','.join(
                    (str(i) for i in self.utility.counters[6]))) + \
                '{}\r\n'.format(','.join(
                    (str(i) for i in self.utility.counters[7]))) + \
                '{}\r\n'.format(','.join(
                   (str(a - b - c) for a, b, c in zip(
                       self.utility.counters[5], self.utility.counters[6], self.utility.counters[7]
                   ))), '\r\n') + \
                '{}\r\n'.format(','.join(
                   (str(i) for i in self.utility.config.payments(grid=2019)))) + \
                '{}\r\n'.format(','.join(
                   (str(c * v) for c, v in
                    zip((a - b - c for a, b, c in zip(
                        self.utility.counters[5], self.utility.counters[6], self.utility.counters[7]
                    )), self.utility.config.payments(grid=2019))))
               )

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 25000, 'currency': 'UAH'}})
        self.utility.db.save(doc)
        self.utility.init_counters()

        self.utility.run()
        self.utility.counter = self.utility.counters[3]
        self.assertEqual(
            self.utility.counters[3], [0, 1, 0, 0, 0, 0]
        )
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 55000, 'currency': 'UAH'}})
        self.utility.db.save(doc)
        self.utility.init_counters()

        self.utility.run()
        self.assertEqual(
            self.utility.counters[3], [0, 0, 1, 0, 0, 0]
        )
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        self.utility.counter = [0 for _ in self.utility.config.payments()]
        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 255000, 'currency': 'UAH'}})
        self.utility.db.save(doc)
        self.utility.init_counters()

        self.utility.run()
        self.assertEqual(
            self.utility.counters[3], [0, 0, 0, 1, 0, 0]
        )
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        self.utility.counter = [0 for _ in self.utility.config.payments()]
        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 1255000, 'currency': 'UAH'}})
        self.utility.db.save(doc)
        self.utility.init_counters()

        self.utility.run()
        self.assertEqual(
            self.utility.counters[3], [0, 0, 0, 0, 1, 0]
        )
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        del self.utility.db[doc['_id']]

    def test_success_4m1_output_2019(self):
        data = {
            "value": {
                "currency": "UAH",
                "amount": 4000001,
                "valueAddedTaxIncluded": False
            },
            "date": "2019-08-31T00:01:50+02:00",
            "enquiryPeriod": {
                "startDate": "2019-08-22T00:01:50+02:00"
            },
            "qualificationPeriod": {
                "startDate": "2019-08-27T00:01:50+02:00"
            },
            "status": "wondering",
            "bids": [{
                "id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00",
                "owner": "test"
            }],
            "awards": [{
                "bid_id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00"
            }]
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.init_counters()
        self.utility.run()

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            file_data = csv.reader(file.readlines())

        self.assertEqual(
            list(file_data),
            [
                ['<= 20.0', '>20.0<=50.0', '>50.0<=200.0', '>200.0<=1000.0', '>1000.0<=4000.0', '>4000.0'],
                ['after 2017-01-01'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-08-16'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2019-08-22'],
                ['0', '0', '0', '0', '0', '1'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '1'],
                ['5.0', '25.0', '80.0', '110.0', '500.0', '1100.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0', '1100.0']
            ]
        )

    def test_cancelled_4m_output_2019(self):
        data = {
            "value": {
                "currency": "UAH",
                "amount": 4000000,
                "valueAddedTaxIncluded": False
            },
            "date": "2019-08-31T00:01:50+02:00",
            "enquiryPeriod": {
                "startDate": "2019-08-22T00:01:50+02:00"
            },
            "qualificationPeriod": {
                "startDate": "2019-08-27T00:01:50+02:00"
            },
            "status": "cancelled",
            "bids": [{
                "id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00",
                "owner": "test"
            }],
            "awards": [{
                "bid_id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00"
            }]
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.init_counters()
        self.utility.run()

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            file_data = csv.reader(file.readlines())
        self.assertEqual(
            list(file_data),
            [
                ['<= 20.0', '>20.0<=50.0', '>50.0<=200.0', '>200.0<=1000.0', '>1000.0<=4000.0', '>4000.0'],
                ['after 2017-01-01'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-08-16'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2019-08-22'],
                ['0', '0', '0', '0', '1', '0'],
                ['0', '0', '0', '0', '1', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '500.0', '1100.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0', '0.0']
            ]
        )

    def test_cancelled_4m1_output_2019(self):
        data = {
            "value": {
                "currency": "UAH",
                "amount": 4000001,
                "valueAddedTaxIncluded": False
            },
            "date": "2019-08-31T00:01:50+02:00",
            "enquiryPeriod": {
                "startDate": "2019-08-22T00:01:50+02:00"
            },
            "qualificationPeriod": {
                "startDate": "2019-08-27T00:01:50+02:00"
            },
            "status": "cancelled",
            "bids": [{
                "id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00",
                "owner": "test"
            }],
            "awards": [{
                "bid_id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00"
            }]
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.init_counters()
        self.utility.run()

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            file_data = csv.reader(file.readlines())
        self.assertEqual(
            list(file_data),
            [
                ['<= 20.0', '>20.0<=50.0', '>50.0<=200.0', '>200.0<=1000.0', '>1000.0<=4000.0', '>4000.0'],
                ['after 2017-01-01'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-08-16'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2019-08-22'],
                ['0', '0', '0', '0', '0', '1'],
                ['0', '0', '0', '0', '0', '1'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '500.0', '1100.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0', '0.0']
            ]
        )

    def test_cancelled_4m1_output_2017(self):
        data = {
            "value": {
                "currency": "UAH",
                "amount": 4000001,
                "valueAddedTaxIncluded": False
            },
            "date": "2019-08-31T00:01:50+02:00",
            "enquiryPeriod": {
                "startDate": "2019-07-22T00:01:50+02:00"
            },
            "qualificationPeriod": {
                "startDate": "2019-08-27T00:01:50+02:00"
            },
            "status": "cancelled",
            "bids": [{
                "id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00",
                "owner": "test"
            }],
            "awards": [{
                "bid_id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00"
            }]
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.init_counters()
        self.utility.run()

        # check csv file
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            file_data = csv.reader(file.readlines())
        self.assertEqual(
            list(file_data),
            [
                ['<= 20.0', '>20.0<=50.0', '>50.0<=200.0', '>200.0<=1000.0', '>1000.0<=4000.0', '>4000.0'],
                ['after 2017-01-01'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-08-16'],
                ['0', '0', '0', '0', '1', '0'],
                ['0', '0', '0', '0', '1', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2019-08-22'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '500.0', '1100.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0', '0.0'],
            ]
        )

    def test_cancelled_3m_output_2017(self):
        data = {
            "value": {
                "currency": "UAH",
                "amount": 3000000,
                "valueAddedTaxIncluded": False
            },
            "date": "2019-08-31T00:01:50+02:00",
            "enquiryPeriod": {
                "startDate": "2019-07-22T00:01:50+02:00"
            },
            "qualificationPeriod": {
                "startDate": "2019-08-27T00:01:50+02:00"
            },
            "status": "cancelled",
            "bids": [{
                "id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00",
                "owner": "test"
            }],
            "awards": [{
                "bid_id": "bid_1",
                "status": "active",
                "date": "2019-08-25T00:01:50+02:00"
            }]
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.init_counters()
        self.utility.run()

        # check csv file
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            file_data = csv.reader(file.readlines())
        self.assertEqual(
            list(file_data),
            [
                ['<= 20.0', '>20.0<=50.0', '>50.0<=200.0', '>200.0<=1000.0', '>1000.0<=4000.0', '>4000.0'],
                ['after 2017-01-01'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-08-16'],
                ['0', '0', '0', '0', '1', '0'],
                ['0', '0', '0', '0', '1', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '400.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2019-08-22'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0', '0', '0', '0', '0', '0'],
                ['5.0', '25.0', '80.0', '110.0', '500.0', '1100.0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0', '0.0'],
            ]
        )


def suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(ReportInvoicesUtilityTestCase))
    return suite


if __name__ == '__main__':
    unittest.main(defaultTest='suite')

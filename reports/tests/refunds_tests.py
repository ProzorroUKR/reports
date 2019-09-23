import unittest
from reports.tests.base import BaseRefundsUtilityTest
from copy import copy
from reports.utilities.refunds import NEW_ALG_DATE, CHANGE_2019_DATE
from reports.helpers import prepare_result_file_name
import csv

test_award_period = '2016-04-17T13:32:25.774673+02:00'


class ReportRefundsUtilityTestCase(BaseRefundsUtilityTest):

    def test_invoices_utility_output(self):
        data = {
            "procurementMethodType": "aboveThresholdUA",
            "contracts": [{
                "status": "active",
                "date": "2017-12-18T22:00:00"
            }],
            "procuringEntity": {
                "kind": "general"
            }
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.run()
        self.assertEqual(
            self.utility.counters[2], [1, 0, 0, 0, 0, 0]
        )

        def expected_output():
            return '{}{}'.format(','.join(self.utility.headers), '\r\n') +\
                'before 2017\r\n' +\
                '{}\r\n'.format(','.join((str(i) for i in self.utility.config.payments(2016)))) +\
                '{}\r\n'.format(
                    ','.join((str(i) for i in self.utility.counters[0]))
                ) +\
                '{}\r\n'.format(
                    ','.join((str(i) for i in
                              (c * v for c, v in zip(self.utility.counters[0], self.utility.config.payments(2016)))
                            ))
                ) +\
                'after 2017-01-01\r\n' + \
                '{}\r\n'.format(
                    ','.join((str(i) for i in self.utility.config.payments(2017)))
                ) +\
                '{}\r\n'.format(
                    ','.join((str(i) for i in self.utility.counters[1]))
                ) +\
                '{}\r\n'.format(
                    ','.join((str(i) for i in
                              (c * v for c, v in zip(self.utility.counters[1], self.utility.config.payments(2017)))
                              ))
                ) +\
                'after {}\r\n'.format(NEW_ALG_DATE) +\
                '{}\r\n'.format(
                    ','.join((str(i) for i in self.utility.config.payments(2017)))
                ) +\
                '{}\r\n'.format(
                    ','.join((str(i) for i in self.utility.counters[2]))
                ) +\
                '{}\r\n'.format(
                    ','.join((str(i) for i in
                              (c * v for c, v in zip(self.utility.counters[2], self.utility.config.payments(2017)))
                              ))
                ) + \
                'after {}\r\n'.format(CHANGE_2019_DATE) + \
                '{}\r\n'.format(
                    ','.join((str(i) for i in self.utility.config.payments(2019)))
                ) + \
                '{}\r\n'.format(
                    ','.join((str(i) for i in self.utility.counters[3]))
                ) + \
                '{}\r\n'.format(
                    ','.join((str(i) for i in
                             (c * v for c, v in zip(self.utility.counters[3], self.utility.config.payments(2019)))
                             ))
                )

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        self.utility.init_counters()
        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 25000, 'currency': 'UAH'}})
        self.utility.db.save(doc)
        self.utility.run()
        self.assertEqual(
            self.utility.counters[2], [0, 1, 0, 0, 0, 0]
        )

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        self.utility.init_counters()
        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 55000, 'currency': 'UAH'}})
        self.utility.db.save(doc)

        self.utility.run()
        self.assertEqual(
            self.utility.counters[2], [0, 0, 1, 0, 0, 0]
        )

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        self.utility.init_counters()
        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 255000, 'currency': 'UAH'}})
        self.utility.db.save(doc)

        self.utility.run()
        self.assertEqual(
            self.utility.counters[2], [0, 0, 0, 1, 0, 0]
        )

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        self.utility.init_counters()
        doc = self.utility.db[doc['_id']]
        doc.update({'value': {'amount': 1255000, 'currency': 'UAH'}})
        self.utility.db.save(doc)

        self.utility.run()
        self.assertEqual(
            self.utility.counters[2], [0, 0, 0, 0, 1, 0]
        )

        with open(prepare_result_file_name(self.utility), 'rb') as file:
            self.assertEqual(file.read(), expected_output())

        del self.utility.db[doc['_id']]

    def test_2019_4m(self):
        data = {
            "enquiryPeriod": {
                "startDate": "2019-08-22T00:01:50+02:00"
            },
            "value": {
                "currency": "UAH",
                "amount": 4000000,
                "valueAddedTaxIncluded": False
            },
            "procurementMethodType": "aboveThresholdUA",
            "contracts": [{
                "status": "active",
                "date": "2017-12-18T22:00:00"
            }],
            "procuringEntity": {
                "kind": "general"
            }
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.run()
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            file_data = list(csv.reader(file.readlines()))

        self.assertEqual(
            file_data,
            [
                ['<= 20.0', '>20.0<=50.0', '>50.0<=200.0', '>200.0<=1000.0', '>1000.0<=4000.0', '>4000.0'],
                ['before 2017'],
                ['5.0', '20.0', '50.0', '75.0', '350.0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-01-01'],
                ['3.0', '15.0', '40.0', '60.0', '300.0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-08-16'],
                ['3.0', '15.0', '40.0', '60.0', '300.0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2019-08-22'],
                ['3.0', '15.0', '40.0', '60.0', '300.0', '600.0'],
                ['0', '0', '0', '0', '1', '0'],
                ['0.0', '0.0', '0.0', '0.0', '300.0', '0.0'],
            ]
        )

    def test_2019_4m1(self):
        data = {
            "enquiryPeriod": {
                "startDate": "2019-08-22T00:01:50+02:00"
            },
            "value": {
                "currency": "UAH",
                "amount": 4000001,
                "valueAddedTaxIncluded": False
            },
            "procurementMethodType": "aboveThresholdUA",
            "contracts": [{
                "status": "active",
                "date": "2017-12-18T22:00:00"
            }],
            "procuringEntity": {
                "kind": "general"
            }
        }
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)

        self.utility.run()
        with open(prepare_result_file_name(self.utility), 'rb') as file:
            file_data = list(csv.reader(file.readlines()))

        self.assertEqual(
            file_data,
            [
                ['<= 20.0', '>20.0<=50.0', '>50.0<=200.0', '>200.0<=1000.0', '>1000.0<=4000.0', '>4000.0'],
                ['before 2017'],
                ['5.0', '20.0', '50.0', '75.0', '350.0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-01-01'],
                ['3.0', '15.0', '40.0', '60.0', '300.0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2017-08-16'],
                ['3.0', '15.0', '40.0', '60.0', '300.0'],
                ['0', '0', '0', '0', '0', '0'],
                ['0.0', '0.0', '0.0', '0.0', '0.0'],
                ['after 2019-08-22'],
                ['3.0', '15.0', '40.0', '60.0', '300.0', '600.0'],
                ['0', '0', '0', '0', '0', '1'],
                ['0.0', '0.0', '0.0', '0.0', '0.0', '600.0'],
            ]
        )


def suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(ReportRefundsUtilityTestCase))
    return suite


if __name__ == '__main__':
    unittest.main(defaultTest='suite')

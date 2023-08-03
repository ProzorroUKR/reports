import unittest
from copy import copy
from reports.tests.base import BaseTenderUtilityTest
from reports.helpers import prepare_result_file_name
import csv
test_award_period = '2016-04-17T13:32:25.774673+02:00'


class ReportTendersTestCase(BaseTenderUtilityTest):

    def test_tenders_view_invalid_date(self):
        data = {
            "procurementMethodType": "aboveThresholdUA",
            "contracts": [{
                "status": "active",
                "date": "2017-12-18T22:00:00"
            }],
            "enquiryPeriod": {
                "startDate": "2016-03-11-T12:34:43"
            }
        }
        self.assertLen(0, data)

    def test_tenders_view_invalid_method(self):
        data = {
            "procurementMethod": "test",
            "procurementMethodType": "aboveThresholdUA",
            "contracts": [{
                "status": "active",
                "date": "2017-12-18T22:00:00"
            }],
        }
        self.assertLen(0, data)

    def test_tenders_view_invalid_mode(self):
        data = {
            "mode": "test",
            "procurementMethodType": "aboveThresholdUA",
            "enquiryPeriod": {
                "startDate": '2016-04-17T13:32:25.774673+02:00',
            },
            'owner': 'test',
            "contracts": [
                {
                    "status": "active",
                }],
        }
        self.assertLen(0, data)

    def test_tenders_view_invalid_status(self):
        data = {
            "procurementMethodType": "aboveThresholdUA",
            "enquiryPeriod": {
                "startDate": '2016-04-17T13:32:25.774673+02:00',
            },
            "contracts": [{
                "status": "unsuccessful",
            }],
        }
        self.assertLen(0, data)

    def test_tenders_view_valid(self):
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
        self.assertLen(1, data)


    def test_tenders_multilot(self):
        data = {
            "procurementMethodType": "aboveThresholdUA",
            "contracts": [{
                "status": "active",
                "date": "2017-12-18T22:00:00",
                "awardID": "award_id"
            }],
            "awards": [{
                "id": "award_id",
                "lotID": "lot_id"
            }],
            "lots": [{
                "id": "lot_id",
                "value": {
                    "currency": "UAH",
                    "amount": 100500,
                    "valueAddedTaxIncluded": False
                }
            }],
            "procuringEntity": {
                "kind": "general"
            }
        }
        self.assertLen(1, data)


class ReportTendersUtilityTestCase(BaseTenderUtilityTest):

    def setUp(self):
        super(ReportTendersUtilityTestCase, self).setUp()

    def tearDown(self):
        del self.server[self.db_name]

    def test_tenders_utility_output(self):
        self.assertResult(
            [
                {
                    "procurementMethodType": "aboveThresholdUA",
                    "procuringEntity": {
                        "kind": "general"
                    },
                    "contracts": [
                        {
                            "status": "active",
                            "date": '2017-04-22T13:32:25.774673+02:00',
                        }
                    ],
                }
            ],
            [
                ['tender', 'tenderID', 'lot', 'status', 'lot_status', 'currency', 'kind', 'value', 'rate', 'bill'],
                ['after 2017-08-16'],
                ['tender_id', 'UA-2017-11-30', '', '', '', 'UAH', 'general', '1000', '-', '3.0'],
            ]
        )

    def test_before_2019_changes(self):
        self.assertResult(
            [
                {
                    "procurementMethodType": "aboveThresholdUA",
                    "enquiryPeriod": {
                        "startDate": "2019-07-22T00:01:50+02:00"
                    },
                    "procuringEntity": {
                        "kind": "general"
                    },
                    "contracts": [
                        {
                            "status": "active",
                            "date": '2017-04-22T13:32:25.774673+02:00',
                        }
                    ],
                    "value": {
                        "currency": "UAH",
                        "amount": 4000001,
                        "valueAddedTaxIncluded": False
                    },
                }
            ],
            [
                ['tender', 'tenderID', 'lot', 'status', 'lot_status', 'currency', 'kind', 'value', 'rate', 'bill'],
                ['after 2017-08-16'],
                ['tender_id', 'UA-2017-11-30', '', '', '', 'UAH', 'general', '4000001', '-', '300.0'],
            ]
        )

    def test_2019(self):
        self.assertResult(
            [
                {
                    "procurementMethodType": "aboveThresholdUA",
                    "enquiryPeriod": {
                        "startDate": "2019-08-22T00:01:50+02:00"
                    },
                    "procuringEntity": {
                        "kind": "general"
                    },
                    "contracts": [
                        {
                            "status": "active",
                            "date": '2017-04-22T13:32:25.774673+02:00',
                        }
                    ],
                    "value": {
                        "currency": "UAH",
                        "amount": 4000001,
                        "valueAddedTaxIncluded": False
                    },
                }
            ],
            [
                ['tender', 'tenderID', 'lot', 'status', 'lot_status', 'currency', 'kind', 'value', 'rate', 'bill'],
                ['after 2019-08-22'],
                ['tender_id', 'UA-2017-11-30', '', '', '', 'UAH', 'general', '4000001', '-', '600.0'],
            ]
        )


def suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(ReportTendersTestCase))
    suite.addTest(unittest.makeSuite(ReportTendersUtilityTestCase))
    return suite


if __name__ == '__main__':
    unittest.main(defaultTest='suite')

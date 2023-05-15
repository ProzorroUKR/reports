import unittest
import mock
import sys
from copy import copy, deepcopy
from reports.tests.base import BaseTenderProzorroMarketUtilityTest
from reports.tests.utils import CatalogApiResponce
from reports.helpers import prepare_result_file_name

import csv
test_award_period = '2016-04-17T13:32:25.774673+02:00'

test_pq_data = {
    "_id": "tender_id_1",
    "procurementMethod": "selective",
    "procurementMethodType": "priceQuotation",
    "awards": [
        {
            "id": "test_award_id",
            "bid_id": "test_bid_id",
        }
    ],
    "bids": [
        {
            "id": "test_bid_id",
            "owner": "test_bid_owner",
        }
    ],
    "contracts": [{
        "status": "active",
        "date": "2017-12-18T22:00:00",
        "awardID": "test_award_id",
        "value": {
            "amount": 1000,
            "currency": "UAH",
            "valueAddedTaxIncluded": False,
        },
        "suppliers": [
            {
                "name": "test_supplier_name",
                "identifier": {
                    "scheme": "UA-EDR",
                    "id": "32490244",
                },
            }
        ],
    }],
    "procuringEntity": {
        "kind": "general",
        "name": "test_procuringEntity_name",
        "identifier": {
            "scheme": "UA-EDR",
            "id": "42751893",
        },
    },
    "profile": "502503-15220000-815175-40996564",
}

test_reporting_data = deepcopy(test_pq_data)
del test_reporting_data["profile"]
test_reporting_data["_id"] = "tender_id_2"
test_reporting_data["procurementMethod"] = "limited"
test_reporting_data["procurementMethodType"] = "reporting"
test_reporting_data["procurementMethodRationale"] = "catalogue, offer=df1ab52df383f6c220d5025fbc61a144;df1ab52df383f6c220d5025fbc61a145"


class ReportTendersProzorroMarketTestCase(BaseTenderProzorroMarketUtilityTest):
    def test_tenders_view_invalid_method_pq(self):
        data = deepcopy(test_pq_data)
        data["procurementMethodType"] = "aboveThresholdUA"
        self.assertLen(0, data)

    def test_tenders_view_invalid_method_reporting(self):
        data = deepcopy(test_reporting_data)
        data["procurementMethodType"] = "aboveThresholdUA"
        self.assertLen(0, data)

    def test_tenders_view_invalid_status_pq(self):
        data = deepcopy(test_pq_data)
        data["contracts"][0]["status"] = "unsuccessful"
        self.assertLen(0, data)

    def test_tenders_view_invalid_status_reporting(self):
        data = deepcopy(test_reporting_data)
        data["contracts"][0]["status"] = "unsuccessful"
        self.assertLen(0, data)

    def test_tenders_view_valid_pq(self):
        data = deepcopy(test_pq_data)
        self.assertLen(1, data)

    def test_tenders_view_valid_reporting(self):
        data = deepcopy(test_reporting_data)
        self.assertLen(1, data)


class ReportTendersProzorroMarketUtilityTestCase(BaseTenderProzorroMarketUtilityTest):
    def tearDown(self):
        del self.server[self.db_name]

    def test_tenders_utility_output_pq(self):
        data = deepcopy(test_pq_data)
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)
        self.utility.run()

        with open(prepare_result_file_name(self.utility), 'rb') as file_fd:
            file_data = list(csv.reader(file_fd.readlines()))

        self.assertEqual(len(file_data), 2)
        self.assertEqual(
            file_data[0],
            [
                'tender_id', 'tenderID', 'contract_date', 'procuringEntity_name', 'procuringEntity_identifier_id',
                'contract_supplier_name', 'contract_supplier_identifier_id', 'contracts_value_amount',
                'tender_owner', 'bid_owner', 'product_owner', 'tariff_group', 'method'
            ],
        )
        self.assertEqual(
            file_data[1],
            [
                'tender_id_1', 'UA-2017-11-30', '2017-12-18T22:00:00', 'test_procuringEntity_name', '42751893',
                'test_supplier_name', '32490244', '1000', 'test', 'test_bid_owner',
                'access_owner_of_profile_502503-15220000-815175-40996564', 'under 50k UAH', 'priceQuotation'
            ],
        )

    def test_tenders_utility_output_reporting(self):
        data = deepcopy(test_reporting_data)
        doc = copy(self.test_data)
        doc.update(data)
        self.utility.db.save(doc)
        self.utility.run()

        with open(prepare_result_file_name(self.utility), 'rb') as file_fd:
            file_data = list(csv.reader(file_fd.readlines()))
            sys.stdout.flush()

        self.assertEqual(len(file_data), 2)
        self.assertEqual(
            file_data[0],
            [
                'tender_id', 'tenderID', 'contract_date', 'procuringEntity_name', 'procuringEntity_identifier_id',
                'contract_supplier_name', 'contract_supplier_identifier_id', 'contracts_value_amount',
                'tender_owner', 'bid_owner', 'product_owner', 'tariff_group', 'method'
            ],
        )
        self.assertEqual(
            file_data[1],
            [
                'tender_id_2', 'UA-2017-11-30', '2017-12-18T22:00:00', 'test_procuringEntity_name', '42751893',
                'test_supplier_name', '32490244', '1000', 'test',
                'access_owner_of_offer_df1ab52df383f6c220d5025fbc61a144, access_owner_of_offer_df1ab52df383f6c220d5025fbc61a145',
                'access_owner_of_profile_relatedProfile_of_product_, access_owner_of_profile_relatedProfile_of_product_',
                'under 50k UAH', 'reporting'
            ],
        )


def suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(ReportTendersProzorroMarketTestCase))
    suite.addTest(unittest.makeSuite(ReportTendersProzorroMarketUtilityTestCase))
    return suite


if __name__ == '__main__':
    unittest.main(defaultTest='suite')

import unittest
import sys
from copy import copy, deepcopy
from reports.tests.base import BaseTenderProzorroMarketUtilityTest
from reports.helpers import prepare_result_file_name

import csv
test_award_period = '2016-04-17T13:32:25.774673+02:00'

test_tender_base_data = {
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
}

test_pq_data = deepcopy(test_tender_base_data)
test_pq_data.update({
    "_id": "tender_id_1",
    "procurementMethod": "selective",
    "procurementMethodType": "priceQuotation",
    "items": [
        {
            "id": "test_item_id_1",
            "profile": "502503-15220000-815175-40996564",
        },
        {
            "id": "test_item_id_2",
            "profile": "502503-15220000-815175-40996565",
        }
    ],
})

test_pq_deprecated_data = deepcopy(test_tender_base_data)
test_pq_deprecated_data.update({
    "_id": "tender_id_2",
    "procurementMethod": "selective",
    "procurementMethodType": "priceQuotation",
    "profile": "502503-15220000-815175-40996564",
})

test_reporting_data = deepcopy(test_tender_base_data)
test_reporting_data.update({
    "_id": "tender_id_3",
    "procurementMethod": "limited",
    "procurementMethodType": "reporting",
    "procurementMethodRationale": (
        "catalogue, "
        "offer=df1ab52df383f6c220d5025fbc61a144;df1ab52df383f6c220d5025fbc61a145"
    ),
})


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

    def test_tenders_view_valid_pq_deprecated(self):
        data = deepcopy(test_pq_deprecated_data)
        self.assertLen(1, data)

    def test_tenders_view_valid_reporting(self):
        data = deepcopy(test_reporting_data)
        self.assertLen(1, data)


class ReportTendersProzorroMarketUtilityTestCase(BaseTenderProzorroMarketUtilityTest):
    def tearDown(self):
        del self.server[self.db_name]

    def test_tenders_utility_output_pq(self):
        result = self.get_result([
            deepcopy(test_pq_data),
        ])

        self.assertEqual(len(result), 2)
        self.assertEqual(
            result[0],
            [
                'tender_id',
                'tenderID',
                'contract_date',
                'procuringEntity_name',
                'procuringEntity_identifier_id',
                'contract_supplier_name',
                'contract_supplier_identifier_id',
                'contracts_value_amount',
                'tender_owner',
                'bid_owner',
                'owner',
                'tariff_group',
                'method',
            ],
        )
        self.assertEqual(
            result[1],
            [
                'tender_id_1',
                'UA-2017-11-30',
                '2017-12-18T22:00:00',
                'test_procuringEntity_name',
                '42751893',
                'test_supplier_name',
                '32490244',
                '1000',
                'test',
                'test_bid_owner',
                (
                    'access_owner_of_profile_502503-15220000-815175-40996565, '
                    'access_owner_of_profile_502503-15220000-815175-40996564'
                ),
                'under 50k UAH',
                'priceQuotation',
            ],
        )

    def test_tenders_utility_output_pq_deprecated(self):
        result = self.get_result([
            deepcopy(test_pq_deprecated_data),
        ])

        self.assertEqual(len(result), 2)
        self.assertEqual(
            result[0],
            [
                'tender_id',
                'tenderID',
                'contract_date',
                'procuringEntity_name',
                'procuringEntity_identifier_id',
                'contract_supplier_name',
                'contract_supplier_identifier_id',
                'contracts_value_amount',
                'tender_owner',
                'bid_owner',
                'owner',
                'tariff_group',
                'method',
            ],
        )
        self.assertEqual(
            result[1],
            [
                'tender_id_2',
                'UA-2017-11-30',
                '2017-12-18T22:00:00',
                'test_procuringEntity_name',
                '42751893',
                'test_supplier_name',
                '32490244',
                '1000',
                'test',
                'test_bid_owner',
                'access_owner_of_profile_502503-15220000-815175-40996564',
                'under 50k UAH',
                'priceQuotation',
            ],
        )

    def test_tenders_utility_output_reporting(self):
        result = self.get_result([
            deepcopy(test_reporting_data),
        ])

        self.assertEqual(len(result), 2)
        self.assertEqual(
            result[0],
            [
                'tender_id',
                'tenderID',
                'contract_date',
                'procuringEntity_name',
                'procuringEntity_identifier_id',
                'contract_supplier_name',
                'contract_supplier_identifier_id',
                'contracts_value_amount',
                'tender_owner',
                'bid_owner',
                'owner',
                'tariff_group',
                'method',
            ],
        )
        self.assertEqual(
            result[1],
            [
                'tender_id_3',
                'UA-2017-11-30',
                '2017-12-18T22:00:00',
                'test_procuringEntity_name',
                '42751893',
                'test_supplier_name',
                '32490244',
                '1000',
                'test',
                (
                    'access_owner_of_offer_df1ab52df383f6c220d5025fbc61a144, '
                    'access_owner_of_offer_df1ab52df383f6c220d5025fbc61a145'
                ),
                (
                    'access_owner_of_product_relatedProduct_of_offer_df1ab52df383f6c220d5025fbc61a144, '
                    'access_owner_of_product_relatedProduct_of_offer_df1ab52df383f6c220d5025fbc61a145'
                ),
                'under 50k UAH',
                'reporting',
            ],
        )

    def test_tenders_utility_output_multiple(self):
        result = self.get_result([
            deepcopy(test_pq_data),
            deepcopy(test_pq_deprecated_data),
            deepcopy(test_reporting_data),
        ])

        self.assertEqual(len(result), 4)
        self.assertEqual(
            result[0],
            [
                'tender_id',
                'tenderID',
                'contract_date',
                'procuringEntity_name',
                'procuringEntity_identifier_id',
                'contract_supplier_name',
                'contract_supplier_identifier_id',
                'contracts_value_amount',
                'tender_owner',
                'bid_owner',
                'owner',
                'tariff_group',
                'method',
            ],
        )
        self.assertEqual(
            result[1],
            [
                'tender_id_1',
                'UA-2017-11-30',
                '2017-12-18T22:00:00',
                'test_procuringEntity_name',
                '42751893',
                'test_supplier_name',
                '32490244',
                '1000',
                'test',
                'test_bid_owner',
                (
                    'access_owner_of_profile_502503-15220000-815175-40996565, '
                    'access_owner_of_profile_502503-15220000-815175-40996564'
                ),
                'under 50k UAH',
                'priceQuotation'
            ],
        )
        self.assertEqual(
            result[2],
            [
                'tender_id_2',
                'UA-2017-11-30',
                '2017-12-18T22:00:00',
                'test_procuringEntity_name',
                '42751893',
                'test_supplier_name',
                '32490244',
                '1000',
                'test',
                'test_bid_owner',
                'access_owner_of_profile_502503-15220000-815175-40996564',
                'under 50k UAH',
                'priceQuotation'
            ],
        )
        self.assertEqual(
            result[3],
            [
                'tender_id_3',
                'UA-2017-11-30',
                '2017-12-18T22:00:00',
                'test_procuringEntity_name',
                '42751893',
                'test_supplier_name',
                '32490244',
                '1000',
                'test',
                (
                    'access_owner_of_offer_df1ab52df383f6c220d5025fbc61a144, '
                    'access_owner_of_offer_df1ab52df383f6c220d5025fbc61a145'
                ),
                (
                    'access_owner_of_product_relatedProduct_of_offer_df1ab52df383f6c220d5025fbc61a144, '
                    'access_owner_of_product_relatedProduct_of_offer_df1ab52df383f6c220d5025fbc61a145'
                ),
                'under 50k UAH',
                'reporting',
            ],
        )


def suite():
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(ReportTendersProzorroMarketTestCase))
    suite.addTest(unittest.makeSuite(ReportTendersProzorroMarketUtilityTestCase))
    return suite


if __name__ == '__main__':
    unittest.main(defaultTest='suite')

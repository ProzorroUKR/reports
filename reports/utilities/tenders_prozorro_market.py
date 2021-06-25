import requests
from retrying import retry

from logging.config import dictConfig
from reports.catalog import CatalogApi
from reports.core import BaseUtility
from reports.helpers import (
    get_arguments_parser,
    read_config
)
from reports.helpers import DEFAULT_TIMEZONE, DEFAULT_MODE, MODE_REGULAR, MODE_TEST, MODE_ALL

HEADERS = [
    "tender_id",
    "tenderID",
    "contract_date",
    "procuringEntity_name",
    "procuringEntity_identifier_id",
    "contract_supplier_name",
    "contract_supplier_identifier_id",
    "contracts_value_amount",
    "tender_owner",
    "bid_owner",
    "profile_owner",
    "tariff_group",
    "method",
]


class TendersProzorroMarketUtility(BaseUtility):

    views = {
        MODE_REGULAR: 'report/tenders_prozorro_market_owner_date',
        MODE_TEST: 'report/tenders_prozorro_market_test_owner_date',
        MODE_ALL: 'report/tenders_prozorro_market_all_owner_date'
    }

    headers = HEADERS

    def __init__(
            self, broker, period, config,
            timezone=DEFAULT_TIMEZONE,
            mode=DEFAULT_MODE, headers_info=None
    ):
        super(TendersProzorroMarketUtility, self).__init__(
            broker, period, config,
            operation="tenders_prozorro_market",
            timezone=timezone, mode=mode
        )
        self.catalog_api = CatalogApi(self.config.config["catalog_api"])
        self.catalog_api_search_url = "{}/search?access_token={}".format(
            self.config.config["catalog_api"]["url"],
            self.config.config["catalog_api"]["access_token"]
        )

    @property
    @retry(wait_exponential_multiplier=1000, stop_max_attempt_number=5)
    def response(self):
        self._sync_views()
        if not self.view:
            raise NotImplementedError()
        return self.db.iterview(
            self.view,
            1000,
            startkey=self.start_date,
            endkey=self.end_date,
        )

    @staticmethod
    def unpack_offers(procurement_method_rationale):
        if not procurement_method_rationale:
            return []

        if "offer=" not in procurement_method_rationale:
            return []

        offers = procurement_method_rationale.split("offer=")[1]
        if offers:
            return offers.split(",")

        return []

    @staticmethod
    def unpack_convert_to_list(profile):
        if profile:
            return [profile]
        return []

    def row(self, record):
        row = list(record.get(col, '') for col in self.headers)
        row = [", ".join(r) if isinstance(r, list) else r for r in row]
        row = [unicode(r) for r in row]

        return row

    def get_catalog_api_resource(self, resource, ids, fields):
        r = requests.post(
            url=self.catalog_api_search_url,
            json={
                "data": {
                    "resource": resource,
                    "ids": ids,
                    "fields": fields,
                }
            }
        )

        resources = {}
        for resource in r.json()["data"]:
            resources[resource["id"]] = resource

        return resources

    def rows(self):
        tenders = []
        for resp in self.response:
            tenders.append(resp["value"])

        for tender in tenders:
            tender["offers"] = self.unpack_offers(tender["procurementMethodRationale"])
            tender["profile"] = self.unpack_convert_to_list(tender["profile"])
            tender["bid_owner"] = self.unpack_convert_to_list(tender["bid_owner"])

        offer_ids = []
        for tender in tenders:
            if tender["method"] == "reporting":
                offer_ids.extend(tender["offers"])

        if offer_ids:
            catalog_offers = self.get_catalog_api_resource(
                resource="offer",
                ids=offer_ids,
                fields=["id", "relatedProduct", "access_owner"],
            )

            for tender in tenders:
                if tender["method"] == "reporting":

                    tender["bid_owner"] = [
                        catalog_offers[tender_offer_id]["access_owner"]
                        for tender_offer_id
                        in tender["offers"]
                    ]

                    tender["related_product_ids"] = [
                        catalog_offers[tender_offer_id]["relatedProduct"]
                        for tender_offer_id
                        in tender["offers"]
                    ]

        related_product_ids = []
        for tender in tenders:
            if tender["method"] == "reporting":
                related_product_ids.extend(tender["related_product_ids"])

        if related_product_ids:
            catalog_products = self.get_catalog_api_resource(
                resource="product",
                ids=related_product_ids,
                fields=["id", "relatedProfile"],
            )

            for tender in tenders:
                if tender["method"] == "reporting":
                    tender["profile"] = [
                        catalog_products[tender_product_id]["relatedProfile"]
                        for tender_product_id
                        in tender["related_product_ids"]
                    ]

        related_profile_ids = []
        for tender in tenders:
            related_profile_ids.extend(tender["profile"])

        if related_profile_ids:
            catalog_profiles = self.get_catalog_api_resource(
                resource="profile",
                ids=related_profile_ids,
                fields=["id", "access_owner"],
            )

            for tender in tenders:
                tender["profile_owner"] = [
                    catalog_profiles[tender_profile_id]["access_owner"]
                    for tender_profile_id
                    in tender["profile"]
                ]

        for tender in tenders:
            yield self.row(tender)


def run():
    parser = get_arguments_parser()

    args = parser.parse_args()
    config = read_config(args.config)
    dictConfig(config)
    utility = TendersProzorroMarketUtility(
        args.broker, args.period,
        config, timezone=args.timezone, mode=args.mode)
    utility.run()


if __name__ == "__main__":
    run()

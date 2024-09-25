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
    "owner",
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
        self.catalog_api = CatalogApi(
            self.Logger,
            self.config_raw,
            self.config.config["catalog_api"],
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
            return offers.split(";")

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

        self.Logger.info(
            "Tenders prozorro market: tender {} with value {}".format(
                record["tender_id"], record["contracts_value_amount"]
            )
        )

        return row

    def rows(self):
        tenders = []
        for resp in self.response:
            tenders.append(resp["value"])

        offer_ids = []
        related_profile_ids = []
        tenders_by_method = {"reporting": [], "priceQuotation": []}
        for tender in tenders:
            tender["offers"] = self.unpack_offers(tender["procurementMethodRationale"])
            tender["profile"] = self.unpack_convert_to_list(tender["profile"])
            if not tender["profile"]:
                profile_ids = {
                    item["profile"]
                    for item in tender.get("items", [])
                    if "profile" in item
                }
                if profile_ids:
                    tender["profile"] = list(profile_ids)

            tender["bid_owner"] = self.unpack_convert_to_list(tender["bid_owner"])
            tender["procuringEntity_name"] = tender["procuringEntity_name"].replace("\n", "")
            tender["contract_supplier_name"] = tender["contract_supplier_name"].replace("\n", "")

            if tender["method"] == "reporting":
                offer_ids.extend(tender["offers"])
            elif tender["method"] == "priceQuotation":
                related_profile_ids.extend(tender["profile"])

            tenders_by_method[tender["method"]].append(tender)

        related_product_ids = []
        if offer_ids:
            catalog_offers = self.catalog_api.search(
                resource="offer",
                ids=offer_ids,
                fields=["id", "relatedProduct", "owner"],
            )

            for tender in tenders_by_method["reporting"]:
                tender["bid_owner"] = []
                tender["product"] = []
                for tender_offer_id in tender["offers"]:
                    tender["bid_owner"].append(catalog_offers.get(tender_offer_id, {}).get("owner", "ERROR"))
                    if tender_offer_id in catalog_offers:
                        tender["product"].append(catalog_offers[tender_offer_id].get("relatedProduct"))
                        related_product_ids.extend(tender["product"])

        self.set_tender_owner("reporting", tenders_by_method, related_product_ids)
        self.set_tender_owner("priceQuotation", tenders_by_method, related_profile_ids)
        for tender in tenders:
            yield self.row(tender)

    def set_tender_owner(self, method, tenders, resource_ids):
        resource_by_tender_method = {
            "reporting": "product",
            "priceQuotation": "profile",
        }
        if resource_ids:
            resource_name = resource_by_tender_method.get(method)
            catalog_resources = self.catalog_api.search(
                resource=resource_name,
                ids=resource_ids,
                fields=["id", "marketAdministrator.identifier.id"],
            )

            for tender in tenders[method]:
                tender["owner"] = []
                for tender_resource_id in tender[resource_name]:
                    catalog_resource = catalog_resources.get(tender_resource_id, {})
                    owner = catalog_resource.get("marketAdministrator", {}).get("identifier", {}).get("id", "ERROR")
                    tender["owner"].append(owner)


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

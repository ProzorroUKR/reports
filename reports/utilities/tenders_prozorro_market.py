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
    def get_offers(tender):
        procurement_method_rationale = tender["procurementMethodRationale"]

        if not procurement_method_rationale:
            return []

        if "offer=" not in procurement_method_rationale:
            return []

        offers = procurement_method_rationale.split("offer=")[1]
        if offers:
            return offers.split(";")

        return []

    @classmethod
    def get_profiles(cls, tender):
        profile_ids = {
            item["profile"]
            for item in tender.get("items", [])
            if "profile" in item
        }
        if profile_ids:
            return list(profile_ids)

        return cls.convert_to_list(tender["profile"])

    @classmethod
    def get_categories(cls, tender):
        category_ids = {
            item["category"]
            for item in tender.get("items", [])
            if "profile" not in item and "category" in item
        }
        if category_ids:
            return list(category_ids)

        return []

    @staticmethod
    def convert_to_list(obj):
        if obj:
            return [obj]
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
        
        for tender in tenders:
            tender["offers"] = self.get_offers(tender)
            tender["profile"] = self.get_profiles(tender)
            tender["category"] = self.get_categories(tender)
            
            tender["owner"] = []
            tender["bid_owner"] = self.convert_to_list(tender["bid_owner"])
            tender["procuringEntity_name"] = tender["procuringEntity_name"].replace("\n", "")
            tender["contract_supplier_name"] = tender["contract_supplier_name"].replace("\n", "")

        self.resolve_market_resource(tenders, "product")
        self.resolve_market_resource(tenders, "profile")
        self.resolve_market_resource(tenders, "category")
        
        for tender in tenders:
            yield self.row(tender)

    def resolve_market_resource(self, tenders, resource_name):
        if resource_name == "product":
            self.resolve_market_offers(tenders)

        resource_ids = []
        for tender in tenders:
            if tender.get(resource_name, []):
                resource_ids.extend(tender[resource_name])

        if not resource_ids:
            return

        catalog_resources = self.catalog_api.search(
            resource=resource_name,
            ids=resource_ids,
            fields=["id", "marketAdministrator.identifier.id"],
        )

        if not catalog_resources:
            return

        for tender in tenders:
            for tender_resource_id in tender.get(resource_name, []):
                catalog_resource = catalog_resources.get(tender_resource_id, {})
                owner = catalog_resource.get("marketAdministrator", {}).get("identifier", {}).get("id", "ERROR")
                tender["owner"].append(owner)

    def resolve_market_offers(self, tenders):
        offer_ids = []
        for tender in tenders:
            if tender["offers"]:
                tender["bid_owner"] = []
                tender["product"] = []
                offer_ids.extend(tender["offers"])

        if not offer_ids:
            return
        
        catalog_offers = self.catalog_api.search(
            resource="offer",
            ids=offer_ids,
            fields=["id", "relatedProduct", "owner"],
        )

        if not catalog_offers:
            return

        related_product_ids = []
        for tender in tenders:
            if tender["offers"]:
                for tender_offer_id in tender["offers"]:
                    tender["bid_owner"].append(catalog_offers.get(tender_offer_id, {}).get("owner", "ERROR"))
                    if tender_offer_id in catalog_offers:
                        tender["product"].append(catalog_offers[tender_offer_id].get("relatedProduct"))
                        related_product_ids.extend(tender["product"])

        return related_product_ids


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

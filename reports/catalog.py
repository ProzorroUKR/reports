import sys
from logging import getLogger
import requests
from requests.exceptions import RequestException

LOGGER = getLogger("BILLING")


class CatalogApi(object):
    def __init__(self, config):
        self.config = config
        self.catalog_api_search_url = "{}/search?access_token={}".format(
            self.config["url"],
            self.config["access_token"]
        )
        self.health_check()

    def health_check(self):
        self.make_get_request(
            url="{}/categories".format(
                self.config["url"],
            )
        )

    @staticmethod
    def map_by_id(resources_list):
        resources = {}
        for resource in resources_list:
            resources[resource["id"]] = resource
        return resources

    @staticmethod
    def make_get_request(url):
        try:
            r = requests.get(url=url)
            return r.json()["data"]

        except RequestException as e:
            LOGGER.fatal(
                    "Catalog API error: {}."
                    "Exit".format(e)
            )
            sys.exit(1)

    def make_post_request(self, url, data):
        try:
            r = requests.post(
                url=url,
                json={
                    "data": data
                },
                auth=(self.config["user"], self.config["password"])
            )
            return r.json()["data"]

        except RequestException as e:
            LOGGER.fatal(
                    "Catalog API error: {}."
                    "Exit".format(e)
            )
            sys.exit(1)

    def search(self, resource, ids, fields):
        response = self.make_post_request(
            url=self.catalog_api_search_url,
            data={
                "resource": resource,
                "ids": ids,
                "fields": fields,
            }
        )

        resources_list = response.json()["data"]
        resources = self.map_by_id(resources_list)
        return resources

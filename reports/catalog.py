import sys
import requests
import json
from requests.exceptions import RequestException
from logging.config import dictConfig

LIST_OBJECT_LIMIT = 1000


class CatalogApi(object):
    def __init__(self, logger, config_raw, catalog_api_config):
        self.catalog_api_config = catalog_api_config
        dictConfig(config_raw)
        self.Logger = logger
        self.catalog_api_search_url = "{}/search?access_token={}".format(
            self.catalog_api_config["url"],
            self.catalog_api_config["access_token"]
        )
        self.health_check()

    def health_check(self):
        self.make_get_request(
            url="{}/categories".format(
                self.catalog_api_config["url"],
            )
        )

    @staticmethod
    def map_by_id(resources_list):
        resources = {}
        for resource in resources_list:
            resources[resource["id"]] = resource
        return resources

    @staticmethod
    def split_into_chunks(input_list, chunk_len):
        return [
            input_list[i:i + chunk_len]
            for i
            in xrange(0, len(input_list), chunk_len)
        ]

    def make_get_request(self, url):
        try:
            r = requests.get(url=url)
            r.raise_for_status()
            return r.json()["data"]

        except RequestException as e:
            self.Logger.fatal(
                    "Catalog API error: {}. Exit.".format(e.response.text)
            )
            sys.exit(1)

    def make_post_request(self, url, data):
        headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
        try:
            r = requests.post(
                url=url,
                data=json.dumps({"data": data}),
                headers=headers,
                auth=(self.catalog_api_config["user"], self.catalog_api_config["password"])
            )

            r.raise_for_status()
            return r.json()["data"]

        except RequestException as e:
            self.Logger.fatal(
                    "Catalog API error: {}. Exit.".format(e.response.text)
            )
            sys.exit(1)

    def search(self, resource, ids, fields):
        self.Logger.info(
            "Catalog API: making search request for {} {}s.".format(len(ids), resource)
        )

        ids_chunks = self.split_into_chunks(ids, LIST_OBJECT_LIMIT)
        resources_list = []
        for ids_chunk in ids_chunks:
            r = self.make_post_request(
                url=self.catalog_api_search_url,
                data={
                    "resource": resource,
                    "ids": ids_chunk,
                    "fields": fields,
                }
            )
            resources_list.extend(r)

        resources = self.map_by_id(resources_list)
        missing_resources = [resource_id for resource_id in ids if resource_id not in resources]
        if missing_resources:
            self.Logger.fatal(
                    "Catalog API error: missing {} {}. Exit.".format(resource, missing_resources)
            )

        return resources

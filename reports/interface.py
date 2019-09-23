try:
    from SimpleHTTPServer import SimpleHTTPRequestHandler
    from SocketServer import TCPServer
    MOVED_PERMANENTLY = 301
except ImportError:
    from http.server import SimpleHTTPRequestHandler
    from socketserver import TCPServer
    from http.HTTPStatus import MOVED_PERMANENTLY

import logging.config
import logging
import argparse
import yaml

parser = argparse.ArgumentParser(description="Billing Interface")
parser.add_argument('-c', '--config', required=True)
ARGS = parser.parse_args()

with open(ARGS.config) as _in:
    CONFIG = yaml.load(_in)

logger = logging.getLogger("BILLING")
logging.config.dictConfig(CONFIG)

interface_conf = CONFIG.get("interface", {})
serve_path = interface_conf.get("serve_path", "/data/")


class InterfaceHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not self.path.startswith(serve_path):
            self.send_response(MOVED_PERMANENTLY)
            self.send_header("Location", serve_path)
            self.end_headers()
            return
        return SimpleHTTPRequestHandler.do_GET(self)


def run():
    port = interface_conf.get("port", "8000")
    TCPServer.allow_reuse_address = True
    httpd = TCPServer(("", port), InterfaceHandler)
    logger.info("Serving UI at port {}".format(port))
    httpd.serve_forever()

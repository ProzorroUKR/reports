import couchdb.design
import os
basepath = os.path.dirname(__file__)


with open(os.path.join(basepath, 'design/bids.js')) as bids_file:
    bids = bids_file.read()

with open(os.path.join(basepath, 'design/bids_all.js')) as bids_all_file:
    bids_all = bids_all_file.read()

with open(os.path.join(basepath, 'design/bids_test.js')) as bids_test_file:
    bids_test = bids_test_file.read()

with open(os.path.join(basepath, 'design/tenders.js')) as tenders_file:
    tenders = tenders_file.read()

with open(os.path.join(basepath, 'design/tenders_all.js')) as tenders_all_file:
    tenders_all = tenders_all_file.read()

with open(os.path.join(basepath, 'design/tenders_test.js')) as tenders_test_file:
    tenders_test = tenders_test_file.read()

with open(os.path.join(basepath, 'design/lib/jsonpatch.js')) as jsonp:
    jsonpatch = jsonp.read()

with open(os.path.join(basepath, 'design/lib/utils.js')) as ul:
    utils = ul.read()

with open(os.path.join(basepath, 'design/lib/tenders.js')) as tl:
    tenders_lib = tl.read()

with open(os.path.join(basepath, 'design/lib/bids.js')) as bl:
    bids_lib = bl.read()

bids_owner_date = couchdb.design.ViewDefinition(
    'report', 'bids_owner_date', bids
)
bids_all_owner_date = couchdb.design.ViewDefinition(
    'report', 'bids_all_owner_date', bids_all
)
bids_test_owner_date = couchdb.design.ViewDefinition(
    'report', 'bids_test_owner_date', bids_test
)
tenders_owner_date = couchdb.design.ViewDefinition(
    'report', 'tenders_owner_date', tenders
)
tenders_all_owner_date = couchdb.design.ViewDefinition(
    'report', 'tenders_all_owner_date', tenders_all
)
tenders_test_owner_date = couchdb.design.ViewDefinition(
    'report', 'tenders_test_owner_date', tenders_test
)

from couchdb import Server, Session
from couchdb.http import Unauthorized, extract_credentials
import argparse
import logging
import yaml
from reports.config import (
    Config
)
from reports.helpers import (
    create_db_url
)
from pbkdf2 import PBKDF2

LOGGER = logging.getLogger(__name__)

SECURITY = {u'admins': {u'names': [], u'roles': ['_admin']}, u'members': {u'names': [], u'roles': ['_admin']}}
VALIDATE_DOC_ID = '_design/_auth'
VALIDATE_DOC_UPDATE = """function(newDoc, oldDoc, userCtx){
    if(newDoc._deleted && newDoc.tenderID) {
        throw({forbidden: 'Not authorized to delete this document'});
    }
    if(userCtx.roles.indexOf('_admin') !== -1 && newDoc._id.indexOf('_design/') === 0) {
        return;
    }
    if(userCtx.name === '%s') {
        return;
    } else {
        throw({forbidden: 'Only authorized user may edit the database'});
    }
}"""


def couchdb_connection(config):
    # CouchDB connection
    db_config = config.get('db')
    db_name = db_config['name']
    aserver = Server(create_db_url(
        db_config['host'],
        db_config['port'],
        db_config['admin']['name'],
        db_config['admin']['password']), session=Session(retry_delays=range(10)))
    users_db = aserver['_users']

    username = db_config['user']['name']
    password = db_config['user']['password']

    user_doc = users_db.get('org.couchdb.user:{}'.format(username), {'_id': 'org.couchdb.user:{}'.format(username)})

    if not user_doc.get('derived_key', '') or PBKDF2(password, user_doc.get('salt', ''), user_doc.get('iterations', 10)).hexread(int(len(user_doc.get('derived_key', '')) / 2)) != user_doc.get('derived_key', ''):
        user_doc.update({
            "name": username,
            "roles": [],
            "type": "user",
            "password": password
        })
        LOGGER.info("Updating api db main user", extra={'MESSAGE_ID': 'update_api_main_user'})
        users_db.save(user_doc)
    if db_name not in aserver:
        aserver.create(db_name)
    db = aserver[db_name]

    SECURITY[u'members'][u'names'] = [username, ]
    if SECURITY != db.security:
        LOGGER.info("Updating api db security", extra={'MESSAGE_ID': 'update_api_security'})
        db.security = SECURITY

    auth_doc = db.get(VALIDATE_DOC_ID, {'_id': VALIDATE_DOC_ID})
    if auth_doc.get('validate_doc_update') != VALIDATE_DOC_UPDATE % username:
        auth_doc['validate_doc_update'] = VALIDATE_DOC_UPDATE % username
        LOGGER.info("Updating api db validate doc", extra={'MESSAGE_ID': 'update_api_validate_doc'})
        db.save(auth_doc)


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument('-c')
    args = parser.parse_args()
    with open(args.c) as in_yaml:
        config = yaml.load(in_yaml)
    couchdb_connection(config)


if __name__ == '__main__':
    run()
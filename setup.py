from setuptools import setup

NAME = 'reports'
VERSION = '1.1.26'
AUTHOR = 'Quintagroup, Ltd.'
LICENSE = 'Apache License 2.0'
REQUIRES = [
    'gunicorn==19.10.0',
    'gevent==21.1.2',
    'flask==1.1.4',
    'couchdb==1.2',
    'pbkdf2==1.3',
    'requests==2.25.1',
    'certifi<=2020.4.5.1',
    'gevent==21.1.2',
    'pytz==2021.1',
    'pyminizip>=0.2.3',
    'arrow==0.17.0',
    'boto3==1.17.84',
    'Jinja2==2.11.3',
    'PyYaml==5.4.1',
    'repoze.lru==0.7',
    'hvac==0.10.14',
    'retrying==1.3.3',
    'MarkupSafe==1.1.1',
    'iso8601==0.1.12',
    'cffi<=1.15.1',
    'netaddr<=0.8.0',
    'sentry-sdk',
]
EXTRA = REQUIRES + [
    'python-swiftclient==3.4.0',
    'python-keystoneclient==3.14.0',
    'keystoneauth1==3.3.0'
]
TEST_REQUIRES = REQUIRES + [
    'mock'
]

setup(
    name=NAME,
    version=VERSION,
    packages=[
        'reports',
    ],
    author=AUTHOR,
    author_email='info@quintagroup.com',
    license=LICENSE,
    url='https://github.com/openprocurement/reports',
    entry_points={
        'console_scripts': [
            'bids = reports.utilities.bids:run',
            'tenders = reports.utilities.tenders:run',
            'tenders_prozorro_market = reports.utilities.tenders_prozorro_market:run',
            'refunds = reports.utilities.refunds:run',
            'invoices = reports.utilities.invoices:run',
            'init = reports.utilities.init:run',
            'zip = reports.utilities.zip:run',
            'send = reports.utilities.send:run',
            'generate = reports.generate:run',
        ],
        'billing.storages': [
            's3 = reports.storages:S3Storage',
            'memory = reports.storages:MemoryStorage',
            'swift = reports.storages:SwiftStorage[swift]'
        ]
    },
    include_package_data=True,
    zip_safe=False,
    install_requires=REQUIRES,
    tests_require=TEST_REQUIRES,
    test_suite='reports.tests.main.suite',
    extras_require={
        'test': TEST_REQUIRES,
        'swift': EXTRA
    },
)

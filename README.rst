Documentation
=============

Reports is a collection of utilities for generating OpenProcurement
billing reports.

Building
--------

Use following commands to build :

``python bootstrap.py``

``bin/buildout -N``

Running with docker-compose
----------------------------

``docker-compose up``

wait vault is ready, then run the following (u can update the setting in this file before):

``./vault-config.sh``


To generate reports go to the containers shell:

``docker-compose exec reports bash``

There U can run all the commands, ex.:

``generate -c etc/reports.yaml  --notify=y``


Usage
------

Threre are four utilities for renerating report : **bids**,
**invioces**, **refund**, **tenders**. **init** script used to
initialize database. **zip** creates encrypted zip archives.

General options for all utilities:
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

::

    Optional arguments:
      -h, --help            show help message and exit

``bids`` and ``invoices`` usage
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

::

    usage: bids [-h] -c CONFIG -b BROKER [-p PERIOD [PERIOD ...]] [-t TIMEZONE]
                [-m {regular,test,all}]

    Report:
      Report parameters

      -c CONFIG, --config CONFIG
                            Path to config file. Required
      -b BROKER, --broker BROKER
                            Broker name. Required
      -p PERIOD [PERIOD ...], --period PERIOD [PERIOD ...]
                            Specifies period for billing report. By default report
                            will be generated from all database
      -t TIMEZONE, --timezone TIMEZONE
                            Timezone. Default "Europe/Kiev"
      -m {regular,test,all}, --mode {regular,test,all}
                            Mode. Default "regular"

``tenders`` and ``refunds`` usage
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

::

    usage: refunds [-h] -c CONFIG -b BROKER [-p PERIOD [PERIOD ...]] [-t TIMEZONE]
                   [-m {regular,test,all}] [--kind Kind]

    Report:
      Report parameters

      -c CONFIG, --config CONFIG
                            Path to config file. Required
      -b BROKER, --broker BROKER
                            Broker name. Required
      -p PERIOD [PERIOD ...], --period PERIOD [PERIOD ...]
                            Specifies period for billing report. By default report
                            will be generated from all database
      -t TIMEZONE, --timezone TIMEZONE
                            Timezone. Default "Europe/Kiev"
      -m {regular,test,all}, --mode {regular,test,all}
                            Mode. Default "regular"

``generate`` usage
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

::

    usage: generate [-h] -c CONFIG [--brokers BROKERS] [--period PERIOD]
                    [--notify {y,yes,true,t,n,no,false,f}] [--timestamp TIMESTAMP]
                    [--include INCLUDE] [--notify-brokers NOTIFY_BROKERS]
                    [--timezone TIMEZONE] [--mode {regular,test,all}]
                    [--clean {y,yes,true,t,n,no,false,f}]

Examples:

Run script to generate report to broker test with period that starts at
2016-01-01 and ands at 2016-02-01:

::

    bin/bids -c etc/reports.yaml -b test -p 2016-01-01 2016-02-01:

Run script with changed default timezone.

::

    bin/bids -c etc/reports.yaml -b test -p 2016-01-01 2016-02-01 -t Europe/Amsterdam

To filter kinds use ``include``, ``exclude`` or ``one``.

::

    bin/tenders -c etc/reports.yaml -b test --kind include=other[exclude=general][one=general]

Report documents will be placed to ``var/reports/`` directory.

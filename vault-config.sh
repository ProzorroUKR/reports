#!/bin/bash

# check if sealed then unseal
curl http://0.0.0.0:1234/v1/sys/seal-status

# if you want to send emails
curl -X PUT http://0.0.0.0:1234/v1/secret/billing/smtp  -H "Content-Type: application/json" -H "X-Vault-Token: myroot" -d '{"user": "aleksey.stryukov@raccoongang.com", "password": "Udbetteruseyourown"}'

# passwords for zip files
curl -X PUT http://0.0.0.0:1234/v1/secret/billing/passwords  -H "Content-Type: application/json"  -H "X-Vault-Token: myroot" -d '{"all": "1234", "test.quintagroup.com": "1234"}'


# settings for memory storage, never used but required
curl -X PUT  -H "Content-Type: application/json" -H "X-Vault-Token: myroot" --data '{"user": "", "password": ""}' http://0.0.0.0:1234/v1/secret/billing/storage







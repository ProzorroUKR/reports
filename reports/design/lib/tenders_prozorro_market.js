var utils = require('./utils');

var TARIFF_LIMITS = [
    {"limit": 50000, "name": "under 50k UAH"},
    {"limit": 200000, "name": "under 200k UAH"},
    {"limit": 0, "name": "above 200k UAH"},
]

function get_contract_award(tender, contract) {
    var award_id = contract.awardID;
    var contract_award = null;
    (tender.awards || []).forEach(function(award) {
        if (award_id === award.id) {
            contract_award = award;
        }
    });
    return contract_award;
}

function get_contract_bid(tender, contract) {
    var award = get_contract_award(tender, contract);
    var contract_bid = null;
    if (award) {
        bid_id = award.bid_id;
        (tender.bids || []).forEach(function(bid) {
            if (bid_id === bid.id) {
                contract_bid = bid;
            }
        });
    }
    return contract_bid;
}

function get_bid_owner(tender, contract) {
    switch (tender.procurementMethodType) {
        case 'priceQuotation':
            var bid = get_contract_bid(tender, contract);
            return bid.owner;
        case 'reporting':
            return '';
        default:
            throw 'Not implemented';
    }
}

function get_tariff_group(contract) {
    var amount = contract.value.amount;
    if (amount <= TARIFF_LIMITS[0]["limit"]) {
        return TARIFF_LIMITS[0]["name"];
    }
    else if (amount <= TARIFF_LIMITS[1]["limit"]) {
        return TARIFF_LIMITS[1]["name"];
    }
    else {
        return TARIFF_LIMITS[2]["name"];
    }
}

var emitter = {
    tender: function(tender, contract, results) {
        results.push({
            key: utils.date_normalize(contract.date),
            value: {
                tender_id: tender._id,
                tenderID: tender.tenderID,
                contract_date: contract.date,
                procuringEntity_name: tender.procuringEntity.name,
                procuringEntity_identifier_id: tender.procuringEntity.identifier.id,
                contract_supplier_name: contract.suppliers[0].name,
                contract_supplier_identifier_id: contract.suppliers[0].identifier.id,
                contracts_value_amount: contract.value.amount,
                tender_owner: tender.owner,
                bid_owner: get_bid_owner(tender, contract),
                tariff_group: get_tariff_group(contract),
                method: tender.procurementMethodType,
                profile: tender.profile || "",
                procurementMethodRationale: tender.procurementMethodRationale || "",
            }
        });
    }
};

function get_active_contract(tender) {
    var active_contract = null;
    (tender.contracts || []).forEach(function(contract) {
        if (contract.status === 'active') {
            active_contract = contract;
        }
    });
    return active_contract;
}

function emit_results(tender, results) {
    emitter.tender(tender, tender.contracts[0], results);
}

function main(doc, mode) {
    if ((mode !== "__all__") && ((doc.mode || null) !== mode)) {
        return [];
    }

    if (utils.exclude_tenders_prozorro_market(doc)) {
        return [];
    }

    var results = [];
    emit_results(doc, results);
    return results;
}

exports.main = main;
exports.get_contract_award = get_contract_award;
exports.get_contract_bid = get_contract_bid;
exports.get_bid_owner = get_bid_owner;
exports.get_tariff_group = get_tariff_group;
exports.get_active_contract = get_active_contract;
exports.emit_results = emit_results;

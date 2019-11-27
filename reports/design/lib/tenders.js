var utils = require('./utils');

var emitter = {
    lot: function (tender, lot, value, date, results) {
        results.push({
            key: [tender.owner, utils.date_normalize(date), lot.id],
            value: {
                tender: tender._id,
                lot: lot.id,
                value: value.amount,
                currency: value.currency,
                kind: tender.procuringEntity.kind || "_kind",
                lot_status: lot.status,
                status: tender.status,
                datemodified: tender.dateModified,
                startdate: utils.get_start_date(tender),
                tenderID: tender.tenderID,
                method: tender.procurementMethodType,
            }
        });
    },
    tender: function(tender, value, date, results) {
        results.push({
            key: [tender.owner, utils.date_normalize(date)],
            value: {
                tender: tender._id,
                value: value.amount,
                currency: value.currency,
                kind: tender.procuringEntity.kind || "_kind",
                lot_status: undefined,
                status: tender.status,
                datemodified: tender.dateModified,
                startdate: utils.get_start_date(tender),
                tenderID: tender.tenderID,
                method: tender.procurementMethodType,
            }
        });
    }
};


function get_contract_date(tender) {
    var date = '';
    (tender.contracts || []).forEach(function(contract) {
        if (contract.status === 'active') {
            date = contract.date;
        }
    });
    return date;
}

function get_contract_date_for_lot(tender, lot) {
    var date = '';
    (tender.contracts || []).forEach(function(contract) {
        var award_id = contract.awardID;
        if (contract.status === 'active') {
            (tender.awards || []).forEach(function(award) {
                if (award_id === award.id) {
                    if (award.lotID === lot.id) {
                        date = contract.date;
                    }
                }
            });
        }
    });
    return date;
}

function get_agreement_date_for_lot(tender, lot) {
    var date = '';
    (tender.agreements || []).forEach(function(agreement) {
        if (agreement.status === 'active') {
            (agreement.contracts || []).forEach(function(contract) {
                if (contract.status === 'active') {
                    (tender.awards || []).forEach(function (award) {
                        if (contract.awardID === award.id) {
                            if (award.lotID === lot.id) {
                                date = agreement.date;
                            }
                        }
                    });
                }
            });
        }
    });
    return date;
}

function find_date_from_revisions(original_tender, lot) {
    var date = 'date';
    var active_awards = original_tender.awards.filter(function(award) {
        return ((award.status === "active") && (typeof lot !== "undefined" ? award.lotID === lot.id : true));
    });
    if (active_awards.length > 0) {
        date = active_awards[0].date;
    }
    utils.apply_revisions(original_tender, function (prev) {
        if (!('awards' in prev)) {
            return true;
        } else {
            for (var j = 0; j < prev.awards.length; j++) {
                var award = prev.awards[j];
                if ((award.status === 'active') && (typeof lot !== "undefined" ? award.lotID === lot.id : true)) {
                    date = (date > award.date) ? award.date : date;
                }
            }
        }
    });
    if (date !== 'date') {
        return date;
    }
}

function get_first_award_date(tender, lot) {
    var non_unsuccessful_aw = (tender.awards  || []).filter(function(awd) {
        return (['unsuccessful', 'pending'].indexOf(awd.status) === -1);
    });

    if (typeof lot !== "undefined") {
        non_unsuccessful_aw = non_unsuccessful_aw.filter(function(award) {
            return (award.lotID === lot.id);
        });
    }

    if (non_unsuccessful_aw.length > 0) {
        if (non_unsuccessful_aw[0].status === 'cancelled') {
            return find_date_from_revisions(tender);
        }
        else {
            return non_unsuccessful_aw[0].date;
        }
    } else {
        return null;
    }
}

function tender_date_new_alg(tender) {
    switch (tender.procurementMethodType) {
        case 'belowThreshold':
            return get_first_award_date(tender);
        case 'competitiveDialogueUA.stage2':
        case 'aboveThresholdUA':
        case 'competitiveDialogueEU.stage2':
        case 'aboveThresholdEU':
        case 'esco':
        case 'aboveThresholdUA.defense':
        case 'competitiveDialogueUA':
        case 'competitiveDialogueEU':
            return get_contract_date(tender);
        case 'closeFrameworkAgreementUA':
            throw 'Not implemented';
        default:
            throw 'Not implemented';
    }
}

function lot_date_new_alg(tender, lot) {
    switch (tender.procurementMethodType) {
        case 'belowThreshold':
            return get_first_award_date(tender, lot);
        case 'competitiveDialogueUA.stage2':
        case 'aboveThresholdUA':
        case 'competitiveDialogueEU.stage2':
        case 'aboveThresholdEU':
        case 'esco':
        case 'aboveThresholdUA.defense':
        case 'competitiveDialogueUA':
        case 'competitiveDialogueEU':
            return get_contract_date_for_lot(tender, lot);
        case 'closeFrameworkAgreementUA':
            return get_agreement_date_for_lot(tender, lot);
        default:
            throw 'Not implemented';
    }
}

function find_value(tender, lot, bid) {
    switch (tender.procurementMethodType) {
        case 'esco':
            return utils.find_bid_value(tender, lot, bid);
        default:
            return utils.find_lot_value(tender, lot);

    }
}

function find_bid_for_lot(tender, lot) {
    var date = null;
    var value = {};
    (tender.awards || []).forEach(function(award) {
        if (award.lotID === lot.id) {
            if (['active', 'pending', 'cancelled'].indexOf(award.status) !== -1) {
                (tender.bids || []).forEach(function (bid) {
                    if (award.bid_id === bid.id) {
                        if (date === null) {
                            date = award.date;
                        }
                        if (award.date >= date) {
                            date = award.date;
                            value = bid;
                        }
                    }
                });
            }
        }
    });
    return value;
}

function find_bid_for_tender(tender) {
    var date = null;
    var value = {};
    (tender.awards || []).forEach(function(award) {
        if (['active', 'pending', 'cancelled'].indexOf(award.status) !== -1) {
            (tender.bids || []).forEach(function (bid) {
                if (award.bid_id === bid.id) {
                    if (award.bid_id === bid.id) {
                        if (date === null) {
                            date = award.date;
                        }
                        if (award.date >= date) {
                            date = award.date;
                            value = bid;
                        }
                    }
                }
            });
        }
    });
    return value;
}

function emit_results_tenders(tender, results) {
    if (utils.check_tender_multilot(tender)) {
        tender.lots.forEach(function(lot) {
            var date_opened = lot_date_new_alg(tender, lot);
            var value = find_value(tender, lot, find_bid_for_lot(tender, lot));
            if (date_opened) {
                emitter.lot(tender, lot, value, date_opened, results);
            }
        });
    } else {
        var date_opened = tender_date_new_alg(tender);
        var value = find_value(tender, null, find_bid_for_tender(tender));
        if (date_opened) {
            emitter.tender(tender, value, date_opened, results);
        }
    }
}

function emit_results(tender, results) {
    emit_results_tenders(tender, results);
}

function main(doc, mode) {
    if ((mode !== "__all__") && ((doc.mode || null) !== mode)) {
        return [];
    }

    if (utils.exclude_tenders(doc)) {
        return [];
    }

    var results = [];
    emit_results(doc, results);
    return results;
}

exports.main = main;
exports.get_contract_date = get_contract_date;
exports.get_contract_date_for_lot = get_contract_date_for_lot;
exports.find_date_from_revisions = find_date_from_revisions;
exports.get_first_award_date = get_first_award_date;
exports.emit_results = emit_results;

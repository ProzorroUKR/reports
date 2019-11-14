var jsp = require('./jsonpatch');
var utils = require('./utils');

var emitter = {
    lot: function (tender, lot, value, date, results) {
        results.push({
            key: [tender.owner, date_normalize(date), lot.id],
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
            key: [tender.owner, date_normalize(date)],
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

function count_lot_bids(lot, bids) {
    return (bids || []).map(function(bid) {
        return (bid.lotValues || []).filter(function(value) {
            return value.relatedLot === lot.id;
        }).length;
    }).reduce(function(total, curr) {
        return total + curr;
    }, 0) || 0;
}

function filter_bids(bids) {
    var min_date = Date.parse("2016-04-01T00:00:00+03:00");
    return bids.filter(function(bid) {
        var bid_date = Date.parse(bid.date);
        return (((bid.status || "invalid") === "active") && (+bid_date > +min_date));
    });
}

function count_lot_qualifications(qualifications, lot_id) {
    if ((typeof qualifications === 'undefined') || (qualifications.length === 0)) {
        return 0;
    }
    return qualifications.filter(function(qualification) {
        return qualification.lotID === lot_id;
    }).length;
}

function max_date(obj) {
    //helper function to find max date in object 
    var dates = [];

    ['date', 'dateSigned', 'documents'].forEach(function(field){
        var date = obj[field] || '';
        if (date) {
            if (typeof date === "object") {
                date.forEach(function(d) {
                    dates.push(new Date(d.datePublished));
                });
            } else {
                dates.push(new Date(date));
            }
        }
    });
    return new Date(Math.max.apply(null, dates));
}

function date_normalize(date) {
    //return date in UTC format
    return ((typeof date === 'object') ? date : (new Date(date))).toISOString().slice(0, 23);
}

function find_complaint_date(complaints) {
    return new Date(Math.max.apply(null, complaints.map(function(c) {
        var d = (c.type === 'claim') ? c.dateAnswered : c.dateDecision;
        if ((typeof d === 'undefined') || (d === null)) {
            return null;
        } else {
            return new Date(d);
        }
    }).filter(function(d) {
        return d !== null;
    })));
}

function find_tender_max_date(tender) {
    switch (tender.procurementMethodType) {
        case 'closeFrameworkAgreementUA':
            throw 'Not implemented';
        default:
            return new Date(Math.max.apply(null, (tender.contracts || []).filter(function(item) {
                return item.status === 'active';
            }).map(function(item){
                return max_date(item);
            })));
        }
}

function find_cancellation_max_date(cancellations) {
    if ((typeof cancellations === 'undefined') || (cancellations.length === 0)) {
        return null;
    }
    if (cancellations.length > 1) {
        return max_date(cancellations.reduce(function(prev_doc, curr_doc) {
            return (prev_doc.date > curr_doc.date) ? curr_doc : prev_doc;
        }));
    } else {
        return max_date(cancellations[0]);
    }
}

function find_lot_contract_max_date(contracts, awards, lot) {
    var contract_date = '';
    awards.forEach(function(award) {
        if (award.lotID === lot.id) {
            (contracts).forEach(function(contract) {
                if (award.id === contract.awardID) {
                    if (contract.status === 'active') {
                        contract_date = max_date(contract);
                    }
                }
            });
        }
    });
    return contract_date;
}

function find_lot_agreement_max_date(agreements, awards, lot) {
    var agreement_date = '';
    awards.forEach(function(award) {
        if (award.lotID === lot.id) {
            (agreements).forEach(function(agreement) {
                if (agreement.status === 'active') {
                    (agreement.contracts).forEach(function (contract) {
                        if (award.id === contract.awardID) {
                            if (contract.status === 'active') {
                                agreement_date = max_date(agreement);
                            }
                        }
                    });
                }
            });
        }
    });
    return agreement_date;
}

function find_lot_max_date(tender, lot) {
    switch (tender.procurementMethodType) {
        case 'closeFrameworkAgreementUA':
            return find_lot_agreement_max_date(tender.agreements || [], tender.awards || [], lot);
        default:
            return find_lot_contract_max_date(tender.contracts || [], tender.awards || [], lot);
    }
}

function find_awards_max_date(awards) {
    if ((typeof awards === 'undefined') || (awards.length === 0)) {
        return null;
    }
    var date = new Date(Math.max.apply(null, awards.map(function(aw) {
        if('complaints' in aw)  {
            var d = find_complaint_date(aw.complaints);
            if (isNaN(d.getTime())) {
                return new Date(aw.complaintPeriod.endDate);
            } else {
                return d;
            }
        } else {
            return new Date(aw.complaintPeriod.endDate);
        }
    })));
    return  date;
}

function Handler(tender) {
    this.status = tender.status;
    this.is_multilot = utils.check_tender_multilot(tender);
    var bids_disclojure_date = utils.get_bids_disclojure_date(tender);
    this.bids_disclosure_standstill = new Date(bids_disclojure_date);
    if ('date' in tender) {
        if (['complete', 'cancelled', 'unsuccessful'].indexOf(tender.status) !== -1) {
            if (tender.status === 'cancelled') {
                if ((new Date(tender.date)) < this.bids_disclosure_standstill) {
                    this.tender_date = null;
                } else {
                    this.tender_date = new Date(tender.date);
                }
            } else {
                this.tender_date = new Date(tender.date);
            }
        } else {
            this.tender_date = null;
        }
    } else {
        switch (this.status) {
        case 'complete':
            this.tender_date = find_tender_max_date(tender);
            break;
        case 'unsuccessful':
            this.tender_date = find_awards_max_date(tender.awards);
            break;
        case 'cancelled':
            var cancellation_date = find_cancellation_max_date(tender.cancellations.filter(function(cancellation) {
                return ((cancellation.status === 'active') && (cancellation.cancellationOf === 'tender'));
            }));
            if (cancellation_date < this.bids_disclosure_standstill) {
                this.tender_date = null;
            } else {
                this.tender_date = cancellation_date;
            }
            break;
        default:
            this.tender_date = null;
        }
    }
}

function lotHandler(lot, tender){
    this.status = lot.status;
    this.tender_handler = new Handler(tender);
    if ('date' in lot) {
        if (['complete', 'cancelled', 'unsuccessful'].indexOf(lot.status) !== -1) {
            if (this.status === 'cancelled') {
                if ((new Date(lot.date)) < this.tender_handler.bids_disclosure_standstill) {
                    this.lot_date = null;
                } else {
                    this.lot_date = new Date(lot.date);
                }
            } else {
                this.lot_date = new Date(lot.date);
            }
        } else {
            if (this.tender_handler.status === 'cancelled') {
                this.lot_date = (this.tender_handler.tender_date !== null) ? this.tender_handler.tender_date : null;
            } else {
                this.lot_date = null;
            }
        }
    } else {
        switch(this.status) {
        case 'unsuccessful':
            this.lot_date = find_awards_max_date((tender.awards || []).filter(function(award) {
                return award.lotID === lot.id;
            }));
            break;
        case 'cancelled':
            var lot_cancellation = find_cancellation_max_date((tender.cancellations || []).filter(function(cancellation) {
                return (cancellation.status === 'active') && (cancellation.cancellationOf === 'lot') && (cancellation.relatedLot === lot.id);
            }));
            if ((lot_cancellation !== null) && (lot_cancellation > this.tender_handler.bids_disclosure_standstill)) {
                this.lot_date = lot_cancellation;
            } else {
                this.lot_date = null;
            }
             break;
        case 'complete':
            this.lot_date = find_lot_max_date(tender, lot) || null;
            break;
        default:
            if (tender.status === 'cancelled') {
                if (this.tender_handler.tender_date !== null) {
                    if (this.tender_handler.tender_date > this.tender_handler.bids_disclosure_standstill) {
                        this.lot_date = this.tender_handler.tender_date;
                    } else {
                        this.lot_date = null;
                    }
                } else {
                    this.lot_date = null;
                }
            } else {
                this.lot_date = find_lot_max_date(tender, lot) || null;
            }
        }
    }
}

function check_lot(lot, tender) {
    var bids = filter_bids(tender.bids || []);

    switch (tender.procurementMethodType) {
        case 'competitiveDialogueUA.stage2':
        case 'aboveThresholdUA':
            if (count_lot_bids(lot, bids) > 1) {
                return true;
            }
            break;
        case 'competitiveDialogueEU.stage2':
        case 'aboveThresholdEU':
        case 'esco':
            if (count_lot_qualifications((tender.qualifications || []), lot.id) > 1) {
                return true;
            }
            break;
        case 'competitiveDialogueUA':
        case 'competitiveDialogueEU':
        case 'closeFrameworkAgreementUA':
            if (count_lot_qualifications((tender.qualifications || []), lot.id) > 2) {
                return true;
            }
            break;
        case 'aboveThresholdUA.defense':
            var lot_awards = ('awards' in tender) ? (
                tender.awards.filter(function(a) {
                    return a.lotID === lot.id;
                })
            ) : [];
            if ((count_lot_bids(lot, bids) < 2) && (lot_awards.length === 0)) {
                return false;
            } else {
                if (count_lot_bids(lot, bids) > 0) {
                    return true;
                }
            }
            break;
        default:
            if (count_lot_bids(lot, bids) > 0) {
                return true;
            }
    }
    return false;
}

function check_tender(tender) {
    switch (tender.procurementMethodType) {
        case 'competitiveDialogueUA.stage2':
        case 'aboveThresholdUA':
            if (tender.numberOfBids > 1) {
                return true;
            }
            break;
        case 'competitiveDialogueEU.stage2':
        case 'aboveThresholdEU':
            if (((tender.qualifications || []).length) > 1) {
                return true;
            }
            break;
        case 'aboveThresholdUA.defense':
            if((tender.numberOfBids < 2) && !('awards' in tender)) {
                return false;
            } else {
                if (tender.numberOfBids > 0) {
                    return true;
                }
            }
            break;
        case 'competitiveDialogueUA':
        case 'competitiveDialogueEU':
            if (((tender.qualifications || []).length) > 2) {
                return true;
            }
            break;
        case 'closeFrameworkAgreementUA':
            throw 'Not implemented';
        default:
            if (tender.numberOfBids > 0) {
                return true;
            }
    }
    return false;
}

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
    var revs = original_tender.revisions.slice().reverse().slice(0, original_tender.revisions.length - 1);
    var tender = JSON.parse(JSON.stringify(original_tender));
    for (var i = 0; i < revs.length; i++) {
        try{
            var prev = jsp.apply_patch(tender, revs[i].changes);
        }
        catch (e) {
            log(e)
        }
        if (!('awards' in prev)) {
            break;
        } else {
            for (var j = 0; j < prev.awards.length; j++) {
                var award = prev.awards[j];
                if ((award.status === 'active') && (typeof lot !== "undefined" ? award.lotID === lot.id : true)) {
                    date = (date > award.date) ? award.date : date;
                }
            }
        }
    }
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
        case 'closeFrameworkAgreementUA':
            throw 'Not implemented';
        default:
            return get_contract_date(tender);
    }
}

function lot_date_new_alg(tender, lot) {
    switch (tender.procurementMethodType) {
        case 'belowThreshold':
            return get_first_award_date(tender, lot);
        case 'closeFrameworkAgreementUA':
            return get_agreement_date_for_lot(tender, lot);
        default:
            return get_contract_date_for_lot(tender, lot);
    }
}

function emit_results_old() {
    var handler = new Handler(tender);
    if (handler.is_multilot) {
        tender.lots.forEach(function(lot){
            if (check_lot(lot, tender)) {
                var lot_handler = new lotHandler(lot, tender);
                if (lot_handler.lot_date !== null) {
                    var value = utils.find_value(tender, lot, find_bid_for_lot(tender, lot));
                    emitter.lot(tender, lot, value, lot_handler.lot_date, results);
                }
            }
        });
    } else {
        if (check_tender(tender)) {
            if (tender.status === 'cancelled') {
                if (handler.tender_date < handler.bids_disclosure_standstill) { return; }
            }
            if (handler.tender_date !==  null) {
                var value = utils.find_value(tender, "", find_bid_for_tender(tender));
                emitter.tender(tender, value, handler.tender_date, results);
            }
        }
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

function emit_results_new(tender, results) {
    if (utils.check_tender_multilot(tender)) {
        tender.lots.forEach(function(lot) {
            var date_opened = lot_date_new_alg(tender, lot);
            var value = utils.find_value(tender, lot, find_bid_for_lot(tender, lot));
            if (date_opened) {
                emitter.lot(tender, lot, value, date_opened, results);
            }
        });
    } else {
        var date_opened = tender_date_new_alg(tender);
        var value = utils.find_value(tender, "", find_bid_for_tender(tender));
        if (date_opened) {
            emitter.tender(tender, value, date_opened, results);
        }
    }
}

function emit_results(tender, results) {
    var new_alg_date = '2017-08-16T00:00:01';
    if (utils.get_start_date(tender) < new_alg_date) {
        emit_results_old(tender, results);
    } else {
        emit_results_new(tender, results);
    }
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
exports.count_lot_bids = count_lot_bids;
exports.filter_bids = filter_bids;
exports.count_lot_qualifications = count_lot_qualifications;
exports.max_date = max_date;
exports.find_complaint_date = find_complaint_date;
exports.find_cancellation_max_date = find_cancellation_max_date;
exports.find_awards_max_date = find_awards_max_date;
exports.Handler = Handler;
exports.lotHandler = lotHandler;
exports.check_lot = check_lot;
exports.check_tender = check_tender;
exports.get_contract_date = get_contract_date;
exports.get_contract_date_for_lot = get_contract_date_for_lot;
exports.find_date_from_revisions = find_date_from_revisions;
exports.get_first_award_date = get_first_award_date;

var utils = require('./utils');

var NEW_ALG_START_DATE = "2017-08-16T00:00:01";

var emitter = {
    lot: function (owner, date, bid, value, lot, tender, audits, init_date, date_terminated, state, results) {
        results.push({
            key: [owner, date, bid.id, lot.id, state],
            value: {
                tender: tender._id,
                lot: lot.id,
                value: value.amount,
                currency: value.currency,
                bid: bid.id,
                startdate: utils.get_start_date(tender),
                audits: audits,
                tender_start_date: tender.tenderPeriod.startDate,
                tenderID: tender.tenderID,
                initial_date: init_date,
                date_terminated: date_terminated,
                state: state,
                status: tender.status,
                lot_status: lot.status,
                bid_status: bid.status,
                method: tender.procurementMethodType,
            }
        });
    },
    tender: function(owner, date, bid, value, tender, audits, init_date, date_terminated, state, results) {
        results.push({
            key: [owner, date, bid.id, state],
            value: {
                tender: tender._id,
                value: value.amount,
                currency: value.currency,
                bid: bid.id,
                audits: audits,
                startdate: utils.get_start_date(tender),
                tender_start_date: tender.tenderPeriod.startDate,
                tenderID: tender.tenderID,
                initial_date: init_date,
                date_terminated: date_terminated,
                state: state,
                status: tender.status,
                lot_status: undefined,
                bid_status: bid.status,
                method: tender.procurementMethodType,
            }
        });
    }
};

function get_eu_tender_bids(tender) {
    var qualified_bids = (tender.qualifications || []).map(function(qualification) {
        return qualification.bidID;
    });
    return (tender.bids || []).filter(function(bid) {
        return (qualified_bids.indexOf(bid.id) !== -1);
    });
}

function find_matched_revs(revisions, pattern) {
    return revisions.filter(function(rev) {
        var changes = rev.changes.filter(function(change) {
           return (change.path.indexOf(pattern) !== -1);
        });
        return (changes.length !== 0);
    });
}

function find_initial_bid_date(revisions, bid_index) {
    var revs = find_matched_revs(revisions, '/bids/' + bid_index);
    if (typeof revs === 'undefined' || revs.length === 0) {
        revs = find_matched_revs(revisions, '/bids');
    }
    if (typeof revs === 'undefined' || revs.length === 0) {
        return '';
    }
    return revs[0].date || '';
}

function filter_bids(bids) {
    var min_date = Date.parse("2017-01-01T00:00:00+03:00");
    return (bids || []).filter(function(bid) {
        var bid_date = Date.parse(bid.date);
        return (([
            "active",
            "invalid.pre-qualification"
        ].indexOf(bid.status) !== -1) && (+bid_date > +min_date));
    });
}

function get_bids(tender) {
    switch (tender.procurementMethodType) {
        case 'aboveThresholdEU':
        case 'competitiveDialogueEU':
        case 'competitiveDialogueUA':
        case 'esco':
            return get_eu_tender_bids(tender);
        case 'aboveThresholdUA':
        case 'belowThreshold':
        case 'aboveThresholdUA.defense':
            return filter_bids(tender.bids);
        case 'closeFrameworkAgreementUA':
            if (utils.exclude_old_cfa(tender)) {
                return filter_bids(tender.bids);
            } else {
                return get_eu_tender_bids(tender);
            }
        default:
            throw 'Not implemented';
    }
}

function count_lot_bids(lot, tender) {
    return get_bids(tender).map(function(bid) {
        return (bid.lotValues || []).filter(function(value) {
            return value.relatedLot === lot.id;
        }).length;
    }).reduce(function(total, curr) {
        return total + curr;
    }, 0);
}

function count_lot_qualifications(tender, lot) {
    var qualifications = tender.qualifications;
    if ((typeof qualifications === 'undefined') || (qualifications.length === 0)) {
        return 0;
    }
    if (lot.status !== "cancelled") {
        return qualifications.filter(function(qualification) {
            return (
                (qualification.lotID === lot.id) &&
                ((qualification.status || "active") !== "cancelled")
            );
        }).length;
    } else {
        return qualifications.filter(function(qualification) {
            return (qualification.lotID === lot.id) && (qualification.status || "");
        }).length;
    }
}

function check_lot_qualifications_count(tender, lot, count) {
    return count_lot_qualifications(tender, lot) >= count;
}

function count_tender_qualifications(tender) {
    return (tender.qualifications || []).length;
}

function check_tender_qualifications_count(tender, count) {
    return count_tender_qualifications(tender) >= count;
}

function check_tender_bids_from_bt_atu(tender) {
    if ('awards' in tender) {
        return true;
    } else {
        return check_bids_from_bt_atu(tender, null);
    }
}

function check_lot_bids_from_bt_atu(tender, lot) {
    var lot_awards = (tender.awards || []).filter(function(award) {
        return (award.lotID || "") === lot.id;
    });
    if (lot_awards.length > 0) {
        return true;
    } else {
        return check_bids_from_bt_atu(tender, lot);
    }
}

function check_bids_from_bt_atu(tender, lot) {
    switch (tender.procurementMethodType) {
        case 'aboveThresholdUA':
            var bids_n = 0;
            if (utils.check_tender_multilot(tender)) {
                bids_n = count_lot_bids(lot, tender);
            } else {
                bids_n = tender.numberOfBids || 0;
            }
            return bids_n >= 2;
        case 'belowThreshold':
        case 'aboveThresholdUA.defense':
            return true;
        case 'aboveThresholdEU':
        case 'esco':
        case 'competitiveDialogueEU':
        case 'competitiveDialogueUA':
        case 'closeFrameworkAgreementUA':
            return false;
        default:
            throw 'Not implemented';
    }
}

function check_tender_bids(tender) {
    switch (tender.procurementMethodType) {
        case 'aboveThresholdEU':
        case 'esco':
            return check_tender_qualifications_count(tender, 2);
        case 'competitiveDialogueEU':
        case 'competitiveDialogueUA':
            return check_tender_qualifications_count(tender, 3);
        case 'belowThreshold':
        case 'aboveThresholdUA':
        case 'aboveThresholdUA.defense':
            return check_tender_bids_from_bt_atu(tender);
        case 'closeFrameworkAgreementUA':
            if (utils.exclude_old_cfa(tender)) {
                return check_tender_bids_from_bt_atu(tender)
            } else {
                return check_tender_qualifications_count(tender, 3);
            }
        default:
            throw 'Not implemented';
    }
}

function check_lot_bids(tender, lot) {
    switch (tender.procurementMethodType) {
        case 'aboveThresholdEU':
        case 'esco':
            return check_lot_qualifications_count(tender, lot, 2);
        case 'competitiveDialogueEU':
        case 'competitiveDialogueUA':
            return check_lot_qualifications_count(tender, lot, 3);
        case 'belowThreshold':
        case 'aboveThresholdUA':
        case 'aboveThresholdUA.defense':
            return check_lot_bids_from_bt_atu(tender, lot);
        case 'closeFrameworkAgreementUA':
            if (utils.exclude_old_cfa(tender)) {
                return check_lot_bids_from_bt_atu(tender, lot);
            } else {
                return check_lot_qualifications_count(tender, lot, 3);
            }
        default:
            throw 'Not implemented';
    }
}

function check_tender(tender) {
    switch(tender.status) {
        case "cancelled":
            if ((new Date(tender.date)) < (new Date(utils.get_bids_disclojure_date(tender)))) {
                return false;
            }
            return check_tender_bids(tender);
        case "unsuccessful":
            return check_tender_bids(tender);
        default:
            return true;
    }
}

function check_lot(tender, lot) {
    switch (lot.status) {
        case "cancelled":
            if ((new Date(lot.date)) < (new Date(utils.get_bids_disclojure_date(tender)))) {
                return false;
            }
            return check_lot_bids(tender, lot);
        case "unsuccessful":
            return check_lot_bids(tender, lot);
        default:
            return true;
    }
}

function get_audit(tender, pattern) {
    var audits = (tender.documents || []).filter(function(tender_doc) {
        return tender_doc.title.indexOf(pattern) !== -1;
    });
    var audit = '';
    if (audits.length > 1) {
        audit = audits.reduce(function(prev_doc, curr_doc) {
            return (prev_doc.dateModified > curr_doc.dateModified) ? curr_doc : prev_doc;
        });
    } else {
        audit = audits[0] || null;
    }
    return audit;
}

function find_lot_for_bid(tender, lotValue) {
    var lots = (tender.lots || []).filter(function(lot) {
        return lot.id === lotValue.relatedLot;
    });
    if (lots.length > 0) {
        return lots[0];
    } else {
        return false
    }
}

function check_award_for_bid(tender, bid) {
    var checker = false;
    var is_awarded = false;
    var date = null;
    (tender.awards || []).forEach(function(award) {
        if (award.bid_id === bid.id) {
            is_awarded = true;
            if (date === null) {
                date = award.date;
            }
            if (award.date >= date) {
                date = award.date;
                checker = (['active', 'pending', 'cancelled'].indexOf(award.status) !== -1);
            }
        }
    });
    return ((checker) || (!is_awarded));
}

function check_award_for_bid_multilot(tender, bid, lot) {
    var checker = false;
    var is_awarded = false;
    var date = null;
    (tender.awards || []).forEach(function(award) {
        if ((award.bid_id === bid.id) && (award.lotID === lot.id)) {
            is_awarded = true;
            if (date === null) {
                date = award.date;
            }
            if (award.date >= date) {
                date = award.date;
                checker = (['active', 'pending', 'cancelled'].indexOf(award.status) !== -1);
            }
        }
    });
    // this check is unnecessary
    if ((!checker) && !('awards' in tender)) {
        checker = check_bids_from_bt_atu(tender, lot);
    }
    return ((checker) || (!is_awarded));
}

function check_qualification_for_bid(tender, bid, lot) {
    var checker = false;
    (tender.qualifications || []).forEach(function(qualification) {
        if ((qualification.bidID === bid.id) && (lot ? qualification.lotID === lot.id : true)) {
            if (qualification.status === 'active') {
                checker = true;
            }
        }
    });
    return checker;
}

function get_month(date) {
    return (new Date(date.split("T")[0])).getMonth();
}

function get_info_about_cancelled_lot(actual_tender, old_tender, bid, lot) {
    var checker = false;
    if (old_tender.status === 'active.pre-qualification') {
        old_tender.qualifications.forEach(function(qual) {
            if ((qual.bidID === bid.id) && (qual.lotID === lot.id) && (qual.status !== 'cancelled')) {
                checker = true;
            }
        });
    } else if (old_tender.status === 'active.pre-qualification.stand-still') {
        old_tender.qualifications.forEach(function(qual) {
            if ((qual.bidID === bid.id) && (qual.lotID === lot.id) && (qual.status === 'active')) {
                checker = true;
            }
        });
    } else {
        if ("awards" in old_tender) {
            return (
                check_qualification_for_bid(lot.status === 'cancelled' ? old_tender : actual_tender, bid, lot) &&
                check_award_for_bid_multilot(actual_tender, bid, lot)
            );
        } else {
            return check_qualification_for_bid(actual_tender, bid, lot);
        }
    }
    return checker;
}

function find_prev_revision(tender) {
    return utils.apply_revisions(tender, function () { return true; })
}


function check_tender_lot_not_canceled(tender, lot_id) {
    var found = tender.lots.filter(function(l) {
        return ((l.status !== 'cancelled') && (l.id === lot_id));
    });
    if (found.length > 0) {
        return true;
    }
}

function check_qualification_for_eu_bid(tender, bid, lot) {
    var checker = false;
    if (lot) {
        if (lot.status === 'unsuccessful') {
            return (
                check_qualification_for_bid(tender, bid, lot) &&
                check_award_for_bid_multilot(tender, bid, lot)
            );
        } else {
            var tender_old = utils.apply_revisions(tender, function(tender_old) {
                return check_tender_lot_not_canceled(tender_old, lot.id);
            });
            return get_info_about_cancelled_lot(tender, tender_old, bid, lot);
        }
    } else {
        if (tender.status === 'unsuccessful') {
            return check_qualification_for_bid(tender, bid);
        } else {
            var prev = find_prev_revision(tender);
            if (prev.status === 'active.pre-qualification') {
                prev.qualifications.forEach(function(qual) {
                    if (qual.status !== 'cancelled') {
                        checker = true;
                    }
                });
            } else if (prev.status === 'active.pre-qualification.stand-still') {
                prev.qualifications.forEach(function(qual) {
                    if (qual.status === 'active') {
                        checker = true;
                    }
                });
            } else {
                if ('awards' in prev) {
                    return (
                        check_award_for_bid(tender, bid) &&
                        check_qualification_for_bid(tender, bid)
                    );
                } else {
                    return check_qualification_for_bid(tender, bid);
                }
            }
        }
    }
    return checker;
}

function check_award_and_qualification(tender, bid, lot) {
    switch (tender.procurementMethodType) {
        case 'aboveThresholdEU':
        case 'competitiveDialogueEU':
        case 'competitiveDialogueUA':
        case 'esco':
            return check_qualification_for_eu_bid(tender, bid, lot);
        case 'belowThreshold':
        case 'aboveThresholdUA':
        case 'aboveThresholdUA.defense':
            return check_award_for_bt_atu_bid(tender, bid, lot);
        case 'closeFrameworkAgreementUA':
            if (utils.exclude_old_cfa(tender)) {
                return check_award_for_bt_atu_bid(tender, bid, lot);
            } else {
                return check_qualification_for_eu_bid(tender, bid, lot);
            }
        default:
            throw 'Not implemented';
    }
}

function check_award_for_bt_atu_bid(tender, bid, lot) {
    if (lot) {
        return check_award_for_bid_multilot(tender, bid, lot);
    } else {
        return check_award_for_bid(tender, bid);
    }
}

function check_bid(actual_bids, old_bid) {
    var checker = actual_bids.filter(function (bid) {
        return (bid.id === old_bid.id);
    });
    return (checker.length > 0);
}

function check_if_lot_not_cancelled(old_tender, cancelled_lots_ids) {
    var non_cancelled_lots = old_tender.lots.filter(function (lot) {
        return ((cancelled_lots_ids.indexOf(lot.id) !== -1) && (lot.status !== 'cancelled'));
    });
    if (non_cancelled_lots.length > 0) {
        return non_cancelled_lots;
    } else {
        return false;
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

function find_actual_lot(tender, lot_id) {
    return tender.lots.filter(function (lot) {
        return lot.id === lot_id;
    });
}

function emit_deleted_lot_values(tender, actual_bids, results) {
    if (!('cancellations' in tender)) {
        return;
    }

    var cancelled_lots_ids = tender.cancellations.filter(function(cancellation) {
        return ((cancellation.cancellationOf === 'lot') && (cancellation.status === 'active'));
    }).map(function (lot) {
        return lot.relatedLot;
    });
    
    var all_lot_values = [];
    actual_bids.forEach(function (bid) {
        (bid.lotValues || []).forEach(function (lotValue) {
            all_lot_values.push(lotValue.relatedLot);
        });
    });
    
    cancelled_lots_ids = cancelled_lots_ids.filter(function (id) {
        return all_lot_values.indexOf(id) === -1;
    });

    if (cancelled_lots_ids.length > 0) {
        utils.apply_revisions(tender, function (old_tender) {
            var non_cancelled_lots = check_if_lot_not_cancelled(old_tender, cancelled_lots_ids);
            (non_cancelled_lots || []).forEach(function (old_lot) {
                var id = old_lot.id;
                (old_tender.bids || []).forEach(function (old_bid) {
                    if (check_bid(actual_bids, old_bid)) {
                        (old_bid.lotValues || []).forEach(function (lotValue) {
                            if (lotValue.relatedLot === old_lot.id) {
                                var actual_lot;
                                if (get_info_about_cancelled_lot(tender, old_tender, old_bid, old_lot)) {
                                    actual_lot = find_actual_lot(tender, old_lot.id)[0];
                                    emit_cancelled(old_bid, actual_lot, tender, utils.date_normalize(tender.date), true, results);
                                } else {
                                    actual_lot = find_actual_lot(tender, old_lot.id)[0];
                                    emit_successful(old_bid, actual_lot, tender, results);
                                }
                            }
                        });
                    }
                });
                cancelled_lots_ids = cancelled_lots_ids.filter(function (id_) {
                    return id_ !== id;
                });
            });
        })
    }
}

function check_cancelled_with_award_and_qualification(tender, bid, lot, status) {
    return (['unsuccessful', 'cancelled'].indexOf(status) !== -1) && (check_award_and_qualification(tender, bid, lot));
}

function emit_cancelled(bid, lot, tender, date_terminated, deleted, results) {
    var init_date = find_initial_bid_date(tender.revisions || [], tender.bids.indexOf(bid));
    var bids_disclojure_date = utils.get_bids_disclojure_date(tender);
    var state = (get_month(bids_disclojure_date) !== get_month(date_terminated)) ? 3: 2;
    var term_norm = utils.date_normalize(date_terminated);
    var discl_norm = utils.date_normalize(bids_disclojure_date);
    var value = find_value(tender, lot, bid);
    if (lot) {
        var audit = get_audit(tender, "audit_" + tender.id + "_" + lot.id);
        if (state === 2 || deleted) {
            emitter.lot(bid.owner, discl_norm, bid, value, lot, tender, audit, init_date, false, 1, results);
        }
        emitter.lot(bid.owner, term_norm, bid, value, lot, tender, audit, init_date, term_norm, state, results);
    } else {
        var audits = get_audit(tender, "audit");
        if (state === 2 || deleted) {
            emitter.tender(bid.owner, discl_norm, bid, value, tender, audits, init_date, false, 1, results);
        }
        emitter.tender(bid.owner, term_norm, bid, value, tender, audits, init_date, term_norm, state, results);
    }
}

function emit_successful(bid, lot, tender, results) {
    var init_date = find_initial_bid_date(tender.revisions || [], tender.bids.indexOf(bid));
    var bids_disclojure_date = utils.get_bids_disclojure_date(tender);
    var discl_norm = utils.date_normalize(bids_disclojure_date);
    var value = find_value(tender, lot, bid);
    if (lot) {
        var audit = get_audit(tender, "audit_" + tender.id + "_" + lot.id);
        emitter.lot(bid.owner, discl_norm, bid, value, lot, tender, audit, init_date, false, 1, results);
        emitter.lot(bid.owner, discl_norm, bid, value, lot, tender, audit, init_date, false, 4, results);
    } else {
        var audits = get_audit(tender, "audit");
        emitter.tender(bid.owner, discl_norm, bid, value, tender, audits, init_date, false, 1, results);
        emitter.tender(bid.owner, discl_norm, bid, value, tender, audits, init_date, false, 4, results);
    }
}

function emit_old(bid, lot, tender, results) {
    var init_date = find_initial_bid_date(tender.revisions || [], tender.bids.indexOf(bid));
    var bids_disclojure_date = utils.get_bids_disclojure_date(tender);
    var discl_norm = utils.date_normalize(bids_disclojure_date);
    var value = find_value(tender, lot, bid);
    if (lot) {
        var audit = get_audit(tender, "audit_" + tender.id + "_" + lot.id);
        emitter.lot(bid.owner, discl_norm, bid, value, lot, tender, audit, init_date, false, false, results);
    } else {
        var audits = get_audit(tender, "audit");
        emitter.tender(bid.owner, discl_norm, bid, value, tender, audits, init_date, false, false, results);
    }
}

function emit_results_old(tender, bids, results) {
    if(utils.check_tender_multilot(tender)) {
        (bids || []).forEach(function (bid) {
            (bid.lotValues || []).forEach(function (value) {
                tender.lots.forEach(function (lot) {
                    if (check_lot(tender, lot)) {
                        if (value.relatedLot === lot.id) {
                            emit_old(bid, lot, tender, results)
                        }
                    }
                });
            });
        });
    } else {
        if (!(check_tender(tender))) { return; }
        (bids || []).forEach(function (bid) {
            emit_old(bid, null, tender, results)
        });
    }
}

function emit_results_new(tender, bids, results) {
    switch (tender.procurementMethodType) {
        case 'aboveThresholdEU':
        case 'competitiveDialogueEU':
        case 'esco':
            emit_deleted_lot_values(tender, bids, results);
            break;
        case 'closeFrameworkAgreementUA':
            if (!utils.exclude_old_cfa(tender)) {
                emit_deleted_lot_values(tender, bids, results);
            }
            break;
    }

    bids.forEach(function(bid) {
        if (utils.check_tender_multilot(tender)) {
            (bid.lotValues || []).forEach(function(lotValue) {
                var lot = find_lot_for_bid(tender, lotValue);

                if (!lot) { return; }

                var bids_disclojure_date = utils.get_bids_disclojure_date(tender);

                if ((lot.status === 'cancelled') && (lot.date < bids_disclojure_date)) { return; }

                if (check_lot_bids(tender, lot)) {
                    if (check_cancelled_with_award_and_qualification(tender, bid, lot, lot.status)) {
                        emit_cancelled(bid, lot, tender, utils.date_normalize(lot.date), false, results);

                    } else if (check_cancelled_with_award_and_qualification(tender, bid, lot, tender.status)) {
                        emit_cancelled(bid, lot, tender, utils.date_normalize(tender.date), false, results);

                    } else {
                        emit_successful(bid, lot, tender, results);
                    }
                }
            });
        } else {
            if (check_tender_bids(tender, bid)) {
                if (check_cancelled_with_award_and_qualification(tender, bid, null, tender.status)) {
                    emit_cancelled(bid, null, tender, utils.date_normalize(tender.date), false, results);

                } else {
                    emit_successful(bid, null, tender, results);
                }
            }
        }
    });
}

function emit_results(tender, results) {
    var bids = get_bids(tender);

    var bids_disclojure_date = utils.get_bids_disclojure_date(tender);

    if((tender.status === 'cancelled') && (tender.date < bids_disclojure_date)) { return; }

    if (bids) {
        if (utils.get_start_date(tender) > NEW_ALG_START_DATE) {
            emit_results_new(tender, bids, results)
        } else {
            emit_results_old(tender, bids, results)
        }
    }
}

function main(doc, mode) {
    if ((mode !== "__all__") && ((doc.mode || null) !== mode)) {
        return [];
    }

    if (utils.exclude_bids(doc)) {
        return [];
    }

    var results = [];
    emit_results(doc, results);
    return results;
}

function main_all(doc) {
    return main(doc, '__all__')
}

function main_regular(doc) {
    return main(doc, null)
}

exports.main = main;
exports.main_all = main_all;
exports.main_regular = main_regular;
exports.get_eu_tender_bids = get_eu_tender_bids;
exports.find_matched_revs = find_matched_revs;
exports.find_initial_bid_date = find_initial_bid_date;
exports.filter_bids = filter_bids;
exports.get_bids = get_bids;
exports.count_lot_bids = count_lot_bids;
exports.count_lot_qualifications = count_lot_qualifications;
exports.check_bids_from_bt_atu = check_bids_from_bt_atu;
exports.check_tender_bids = check_tender_bids;
exports.check_lot_bids = check_lot_bids;
exports.check_tender = check_tender;
exports.check_lot = check_lot;
exports.get_audit = get_audit;
exports.find_lot_for_bid = find_lot_for_bid;
exports.check_award_and_qualification = check_award_and_qualification;
exports.check_award_for_bid = check_award_for_bid;
exports.check_award_for_bid_multilot = check_award_for_bid_multilot;
exports.check_qualification_for_bid = check_qualification_for_bid;
exports.check_qualification_for_eu_bid = check_qualification_for_eu_bid;
exports.emit_deleted_lotValues = emit_deleted_lot_values;
exports.get_info_about_cancelled_lot = get_info_about_cancelled_lot;

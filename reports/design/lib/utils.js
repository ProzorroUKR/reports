var jsp = require('./jsonpatch');

var TENDERS_START_DATE = "2016-04-01";
var CFA_START_DATE = "2019-11-01T00:00:01+02:00";
var ESCO_START_DATE = "2019-11-01T00:00:01+02:00";

function error(msg) {
    try {
        log(msg);
    }
    catch (e) {
        console.error(msg);
    }
}

function apply_revisions(doc, callback, ctx) {
    var revs = doc.revisions.slice().reverse().slice(0, doc.revisions.length - 1);
    var prev = JSON.parse(JSON.stringify(doc));
    for (var i = 0; i < revs.length; i++) {
        try {
            prev = jsp.apply_patch(prev, revs[i].changes);
        }
        catch (e) {
            error(e);
        }
        if (callback.call(ctx, prev)) {
            return prev;
        }
    }
    return prev
}

function find(arr, callback, ctx) {
    var elements = (arr || []).filter(function(element, index) {
        return callback.call(ctx, element, index, arr);
    });
    return (elements.length > 0) ? elements[0] : false;
}

function date_normalize(date) {
    //return date in UTC format
    return ((typeof date === 'object') ? date : new Date(date)).toISOString().slice(0, 23);
}

function find_first_revision_date(doc) {
    if ((typeof doc.revisions === 'undefined') || (doc.revisions.length === 0)) {
        return '';
    }
    return doc.revisions[0].date || '';
}

function get_start_date(doc) {
    return (doc.enquiryPeriod || {}).startDate || find_first_revision_date(doc) || '';
}

function get_bids_disclojure_date(doc) {
    return (doc.qualificationPeriod || {}).startDate || (doc.awardPeriod || {}).startDate || '';
}

function find_lot_value(tender, lot) {
    return (lot ? lot : tender).value;
}

function find_pre_qual_bid(tender, bid) {
    var tender = apply_revisions(tender, function (prev) {
        return (prev.qualifications || []).length === 0;
    });


    return find(tender.bids || [], function(value) {
        return value.id === bid.id;
    });
}

function find_bid_value(tender, lot, bid) {
    if ((tender.qualifications || []).length > 0) {
        bid = find_pre_qual_bid(tender, bid) || bid;
    }

    return (lot ? find_lot_value_for_bid(lot, bid) : bid).value;
}

function find_lot_value_for_bid(lot, bid) {
    return find(bid.lotValues || [], function(value) {
        return value.relatedLot === lot.id;
    });
}

function check_tender_multilot(tender) {
    return 'lots' in tender;
}

function exclude_not_tender_doc_type(doc) {
    return doc.doc_type !== "Tender";
}

function exclude_not_bids_disclojure_date(doc) {
    return !get_bids_disclojure_date(doc)
}

function exclude_before(doc, date) {
    var start_date = get_start_date(doc);
    return ((!start_date) || (start_date < date));
}

function exclude_old(doc) {
    return exclude_before(doc, TENDERS_START_DATE);
}

function exclude_old_cfa(doc) {
    if (doc.procurementMethodType === 'closeFrameworkAgreementUA') {
        return exclude_before(doc, CFA_START_DATE);
    }
}

function exclude_old_esco(doc) {
    if (doc.procurementMethodType === 'esco') {
        return exclude_before(doc, ESCO_START_DATE);
    }
}

function exclude_cd_completed_tenders(doc) {
    switch (doc.procurementMethodType) {
        case 'competitiveDialogueEU':
        case 'competitiveDialogueUA':
            var methods = ['unsuccessful', 'cancelled'];
            return methods.indexOf(doc.status) === -1;
        default:
            return false;
    }
}

function exclude_methods(doc, methods) {
    return methods.indexOf([
        doc.procurementMethod,
        doc.procurementMethodType
    ].join(':')) === -1
}

function exclude_methods_tenders(doc) {
    return exclude_methods(doc, [
        "open:belowThreshold",
        "open:aboveThresholdUA",
        "open:aboveThresholdUA.defense",
        "open:simple.defense",
        "open:aboveThresholdEU",
        "open:competitiveDialogueEU",
        "open:competitiveDialogueUA",
        "selective:competitiveDialogueEU.stage2",
        "selective:competitiveDialogueUA.stage2",
        "open:closeFrameworkAgreementUA",
        "open:esco"
    ])
}

function exclude_methods_tenders_prozorro_market(doc) {
    // exclude_methods returns true (to exclude) if doc method is NOT in list
    is_not_pq = exclude_methods(doc, [
        "selective:priceQuotation",
    ])

    is_direct = (
        !exclude_methods(doc, ["limited:reporting"]) &&
        (doc.procurementMethodRationale || "").indexOf("catalogue, offer=") === 0
    )

    return is_not_pq && !is_direct
}

function exclude_methods_bids(doc) {
    return exclude_methods(doc, [
        "open:belowThreshold",
        "open:aboveThresholdUA",
        "open:aboveThresholdUA.defense",
        "open:simple.defense",
        "open:aboveThresholdEU",
        "open:competitiveDialogueEU",
        "open:competitiveDialogueUA",
        "open:closeFrameworkAgreementUA",
        "open:esco"
    ])
}

function exclude_no_active_contracts(doc) {
    return (doc.contracts || []).map(
        function (contract) {
            return contract.status !== 'active'
        }
    ).every(
        function (element) {
            return element === true
        }
    )
}

function exclude(doc, excluders) {
    return excluders.map(function (excluder) {
        return excluder(doc);
    }).some(function (element) {
        return element === true;
    })
}

function exclude_tenders(doc) {
    return exclude(doc, [
        exclude_not_tender_doc_type,
        exclude_methods_tenders,
        exclude_cd_completed_tenders,
        exclude_not_bids_disclojure_date,
        exclude_old,
        exclude_old_cfa,
        exclude_old_esco,
    ]);
}

function exclude_tenders_prozorro_market(doc) {
    return exclude(doc, [
        exclude_not_tender_doc_type,
        exclude_methods_tenders_prozorro_market,
        exclude_no_active_contracts,
    ]);
}

function exclude_bids(doc) {
    return exclude(doc, [
        exclude_not_tender_doc_type,
        exclude_methods_bids,
        exclude_not_bids_disclojure_date,
        exclude_old_esco,
    ]);
}

exports.find_first_revision_date = find_first_revision_date;
exports.get_bids_disclojure_date = get_bids_disclojure_date;
exports.get_start_date = get_start_date;
exports.check_tender_multilot = check_tender_multilot;
exports.find_lot_value = find_lot_value;
exports.find_bid_value = find_bid_value;
exports.find_lot_value_for_bid = find_lot_value_for_bid;
exports.find_pre_qual_bid = find_pre_qual_bid;
exports.apply_revisions = apply_revisions;
exports.date_normalize = date_normalize;
exports.exclude_not_tender_doc_type = exclude_not_tender_doc_type;
exports.exclude_not_bids_disclojure_date = exclude_not_bids_disclojure_date;
exports.exclude_cd_not_completed_tenders = exclude_cd_completed_tenders;
exports.exclude_old_tenders = exclude_old;
exports.exclude_old_cfa = exclude_old_cfa;
exports.exclude_old_esco = exclude_old_esco;
exports.exclude_methods_tenders = exclude_methods_tenders;
exports.exclude_methods_tenders_prozorro_market = exclude_methods_tenders_prozorro_market;
exports.exclude_methods_bids = exclude_methods_bids;
exports.exclude_no_active_contracts = exclude_no_active_contracts;
exports.exclude_tenders = exclude_tenders;
exports.exclude_tenders_prozorro_market = exclude_tenders_prozorro_market;
exports.exclude_bids = exclude_bids;

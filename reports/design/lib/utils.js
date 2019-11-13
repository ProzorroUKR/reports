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

function check_tender_multilot(tender) {
    return 'lots' in tender;
}

function exclude_not_tender_doc_type(doc) {
    return doc.doc_type !== "Tender";
}

function exclude_not_bids_disclojure_date(doc) {
    return !get_bids_disclojure_date(doc)
}

function exclude_old_tenders(doc) {
    var start_date = get_start_date(doc);
    return ((!start_date) || (start_date < "2016-04-01"));
}

function exclude_old_cfa_tenders(doc) {
    if (doc.procurementMethodType === 'closeFrameworkAgreementUA') {
        var start_date = get_start_date(doc);
        return (!start_date) || (start_date < "2019-11-01T00:00:01+02:00")
    }
}

function exclude_cd_completed_tenders(doc) {
    if (['competitiveDialogueEU', 'competitiveDialogueUA'].indexOf(doc.procurementMethodType) !== -1) {
        if (['unsuccessful', 'cancelled'].indexOf(doc.status) === -1) {
            return true;
        }
    }

    return false;
}

function exclude_methods(doc, methods) {
    return methods.indexOf([doc.procurementMethod, doc.procurementMethodType].join(':')) === -1
}

function exclude_methods_tenders(doc) {
    return exclude_methods(doc, [
        "open:belowThreshold",
        "open:aboveThresholdUA",
        "open:aboveThresholdUA.defense",
        "open:aboveThresholdEU",
        "open:competitiveDialogueEU",
        "open:competitiveDialogueUA",
        "selective:competitiveDialogueEU.stage2",
        "selective:competitiveDialogueUA.stage2",
        "open:closeFrameworkAgreementUA",
        "open:esco",
    ])
}

function exclude_methods_bids(doc) {
    return exclude_methods(doc, [
        "open:belowThreshold",
        "open:aboveThresholdUA",
        "open:aboveThresholdUA.defense",
        "open:aboveThresholdEU",
        "open:competitiveDialogueEU",
        "open:competitiveDialogueUA",
        "open:closeFrameworkAgreementUA",
        "open:esco",
    ])
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
        exclude_old_tenders,
        exclude_old_cfa_tenders
    ]);
}

function exclude_bids(doc) {
    return exclude(doc, [
        exclude_not_tender_doc_type,
        exclude_methods_bids,
        exclude_not_bids_disclojure_date
    ]);
}

exports.find_first_revision_date = find_first_revision_date;
exports.get_bids_disclojure_date = get_bids_disclojure_date;
exports.get_start_date = get_start_date;
exports.check_tender_multilot = check_tender_multilot;
exports.exclude_not_tender_doc_type = exclude_not_tender_doc_type;
exports.exclude_not_bids_disclojure_date = exclude_not_bids_disclojure_date;
exports.exclude_cd_not_completed_tenders = exclude_cd_completed_tenders;
exports.exclude_old_tenders = exclude_old_tenders;
exports.exclude_old_cfa_tenders = exclude_old_cfa_tenders;
exports.exclude_methods_tenders = exclude_methods_tenders;
exports.exclude_methods_bids = exclude_methods_bids;
exports.exclude_tenders = exclude_tenders;
exports.exclude_bids = exclude_bids;

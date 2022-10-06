"use strict";

const utils = require("../../design/lib/utils");
const chai = require("../../../node_modules/chai");
const spies = require("../../../node_modules/chai-spies");

chai.use(spies);

const expect = chai.expect;
const assert = chai.assert;
const spy = chai.spy;

describe("utils tests", () => {
    describe("find_first_revision_date", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return empty string - no revisions.", () => {
            assert.strictEqual(utils.find_first_revision_date(doc), "");
        });

        it("should return empty string - revisions are empty array.", () => {
            doc.revisions = [];
            assert.strictEqual(utils.find_first_revision_date(doc), "");
        });

        it("should return empty string - first revision has no date.", () => {
            doc.revisions = [{}];
            assert.strictEqual(utils.find_first_revision_date(doc), "");
        });

        it("should return empty string - tender has revision with date.", () => {
            doc.revisions = [{date: "2017-11-13T00:00:00Z"}];
            assert.strictEqual(utils.find_first_revision_date(doc), doc.revisions[0].date);
        });
    });

    describe("get_bids_disclojure_date", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return empty string - no qualificationPeriod and no awardPeriod.", () => {
            assert.strictEqual(utils.get_bids_disclojure_date(doc), "");
        });

        it("should return qualificationPeriod startDate - qualificationPeriod and awardPeriod.", () => {
            doc.qualificationPeriod = {startDate: "2017-01-01T00:00:00Z"};
            doc.awardPeriod = {startDate: "2018-01-01T00:00:00Z"};
            assert.strictEqual(utils.get_bids_disclojure_date(doc), "2017-01-01T00:00:00Z");
        });

        it("should return qualificationPeriod startDate - qualificationPeriod and no awardPeriod.", () => {
            doc.qualificationPeriod = {startDate: "2017-01-01T00:00:00Z"};
            assert.strictEqual(utils.get_bids_disclojure_date(doc), "2017-01-01T00:00:00Z");
        });

        it("should return awardPeriod startDate - no qualificationPeriod and awardPeriod.", () => {
            doc.awardPeriod = {startDate: "2018-01-01T00:00:00Z"};
            assert.strictEqual(utils.get_bids_disclojure_date(doc), "2018-01-01T00:00:00Z");
        });

        it("should return awardPeriod startDate - no startDate in qualificationPeriod and awardPeriod.", () => {
            doc.qualificationPeriod = {};
            doc.awardPeriod = {startDate: "2018-01-01T00:00:00Z"};
            assert.strictEqual(utils.get_bids_disclojure_date(doc), "2018-01-01T00:00:00Z");
        });

        it("should return empty string - no startDate in qualificationPeriod and no startDate in awardPeriod.", () => {
            doc.qualificationPeriod = {};
            doc.awardPeriod = {};
            assert.strictEqual(utils.get_bids_disclojure_date(doc), "");
        });
    });

    describe("get_start_date", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return awardPeriod startDate - awardPeriod exists.", () => {
            doc.enquiryPeriod = {startDate: "2017-01-01T00:00:00Z"};
            assert.strictEqual(utils.get_start_date(doc), "2017-01-01T00:00:00Z");
        });

        it("should return find_first_revision_date() - awardPeriod not exists.", () => {
            doc.revisions = [{date: "2017-01-01T00:00:00Z"}];
            assert.strictEqual(utils.get_start_date(doc), "2017-01-01T00:00:00Z");
        });

        it("should return empty string - awardPeriod not exists and no revisions.", () => {
            doc.revisions = [{}];
            assert.strictEqual(utils.get_start_date(doc), "");
        });
    });

    describe("exclude_not_tender_doc_type", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return true - no doc_type.", () => {
            assert.strictEqual(utils.exclude_not_tender_doc_type(doc), true);
        });

        it("should return true - invalid doc_type.", () => {
            doc.doc_type = "Invalid";
            assert.strictEqual(utils.exclude_not_tender_doc_type(doc), true);
        });

        it("should return false - doc_type is Tender.", () => {
            doc.doc_type = "Tender";
            assert.strictEqual(utils.exclude_not_tender_doc_type(doc), false);
        });
    });

    describe("exclude_methods_tenders", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return true - wrong procurementMethodType.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "something";
            assert.strictEqual(utils.exclude_methods_tenders(doc), true);
        });

        it("should return true - wrong procurementMethod.", () => {
            doc.procurementMethod = "something";
            doc.procurementMethodType = "belowThreshold";
            assert.strictEqual(utils.exclude_methods_tenders(doc), true);
        });

        it("should return false - open:esco.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "esco";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:belowThreshold.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "belowThreshold";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:aboveThresholdUA.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThresholdUA";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:aboveThreshold.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThreshold";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:aboveThresholdUA.defense.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThresholdUA.defense";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:aboveThresholdEU.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThresholdEU";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:closeFrameworkAgreementUA.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "closeFrameworkAgreementUA";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:competitiveDialogueEU.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "competitiveDialogueEU";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - open:competitiveDialogueUA.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "competitiveDialogueUA";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - selective:competitiveDialogueEU.stage2.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "competitiveDialogueEU.stage2";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });

        it("should return false - selective:competitiveDialogueUA.stage2.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "competitiveDialogueUA.stage2";
            assert.strictEqual(utils.exclude_methods_tenders(doc), false);
        });
    });

    describe("exclude_methods_tenders_prozorro_market", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return true - wrong procurementMethodType.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "something";
            assert.strictEqual(utils.exclude_methods_tenders_prozorro_market(doc), true);
        });

        it("should return true - wrong procurementMethod.", () => {
            doc.procurementMethod = "something";
            doc.procurementMethodType = "priceQuotation";
            assert.strictEqual(utils.exclude_methods_tenders_prozorro_market(doc), true);
        });

        it("should return false - selective:priceQuotation.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "priceQuotation";
            assert.strictEqual(utils.exclude_methods_tenders_prozorro_market(doc), false);
        });

        it("should return true - wrong procurementMethod.", () => {
            doc.procurementMethod = "something";
            doc.procurementMethodType = "reporting";
            doc.procurementMethodRationale = "catalogue, offer=d1e02742121be58e3f8e02db5fc37838";
            assert.strictEqual(utils.exclude_methods_tenders_prozorro_market(doc), true);
        });
        it("should return true - wrong procurementMethodType.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "something";
            doc.procurementMethodRationale = "catalogue, offer=d1e02742121be58e3f8e02db5fc37838";
            assert.strictEqual(utils.exclude_methods_tenders_prozorro_market(doc), true);
        });

        it("should return true - wrong procurementMethodRationale.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "reporting";
            doc.procurementMethodRationale = "something";
            assert.strictEqual(utils.exclude_methods_tenders_prozorro_market(doc), true);
        });

        it("should return false - limited:reporting.", () => {
            doc.procurementMethod = "limited";
            doc.procurementMethodType = "reporting";
            doc.procurementMethodRationale = "catalogue, offer=d1e02742121be58e3f8e02db5fc37838";
            assert.strictEqual(utils.exclude_methods_tenders_prozorro_market(doc), false);
        });
    });

    describe("exclude_methods_bids", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return true - wrong procurementMethodType.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "something";
            assert.strictEqual(utils.exclude_methods_bids(doc), true);
        });

        it("should return true - wrong procurementMethod.", () => {
            doc.procurementMethod = "something";
            doc.procurementMethodType = "belowThreshold";
            assert.strictEqual(utils.exclude_methods_bids(doc), true);
        });

        it("should return false - open:esco.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "esco";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:belowThreshold.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "belowThreshold";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:aboveThresholdUA.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThresholdUA";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:aboveThreshold.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThreshold";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:aboveThresholdUA.defense.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThresholdUA.defense";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:simple.defense.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "simple.defense";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:aboveThresholdEU.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThresholdEU";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:closeFrameworkAgreementUA.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "closeFrameworkAgreementUA";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:competitiveDialogueEU.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "competitiveDialogueEU";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return false - open:competitiveDialogueUA.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "competitiveDialogueUA";
            assert.strictEqual(utils.exclude_methods_bids(doc), false);
        });

        it("should return true - selective:competitiveDialogueEU.stage2.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "competitiveDialogueEU.stage2";
            assert.strictEqual(utils.exclude_methods_bids(doc), true);
        });

        it("should return true - selective:competitiveDialogueUA.stage2.", () => {
            doc.procurementMethod = "selective";
            doc.procurementMethodType = "competitiveDialogueUA.stage2";
            assert.strictEqual(utils.exclude_methods_bids(doc), true);
        });
    });

    describe("exclude_no_active_contracts", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return true - no contracts.", () => {
            assert.strictEqual(utils.exclude_no_active_contracts(doc), true);
        });

        it("should return true - contracts are empty array.", () => {
            doc.contracts = [];
            assert.strictEqual(utils.exclude_no_active_contracts(doc), true);
        });

        it("should return true - all contract has no status.", () => {
            doc.contracts = [{}, {}];
            assert.strictEqual(utils.exclude_no_active_contracts(doc), true);
        });

        it("should return true - all contracts status not active.", () => {
            doc.contracts = [{"status": "not_active"}, {"status": "something"}];
            assert.strictEqual(utils.exclude_no_active_contracts(doc), true);
        });

        it("should return false - one contracts status active.", () => {
            doc.contracts = [{"status": "not_active"}, {"status": "active"}];
            assert.strictEqual(utils.exclude_no_active_contracts(doc), false);
        });
    });

    describe("exclude_not_bids_disclojure_date", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return false - can get bids disclojure date.", () => {
            doc.qualificationPeriod = {startDate: "2017-01-01T00:00:00Z"};
            assert.strictEqual(utils.exclude_not_bids_disclojure_date(doc), false);
        });

        it("should return false - can't get bids disclojure date.", () => {
            assert.strictEqual(utils.exclude_not_bids_disclojure_date(doc), true);
        });
    });

    describe("find_lot_value", () => {
        let tender, lot;

        beforeEach(() => {
            tender = {};
            lot = {};
        });

        it("should return lot.value - if lot passed.", () => {
            tender.value = "tender.value";
            lot.value = "lot.value";
            assert.strictEqual(utils.find_lot_value(tender, lot), lot.value);
        });

        it("should return tender.value - if lot doesn't passed.", () => {
            assert.strictEqual(utils.find_lot_value(tender, ""), tender.value);
        });
    });

    describe("find_lot_value_for_bid", () => {
        let bid, lot, lot_value;

        beforeEach(() => {
            lot_value = {
                value: {amount: 100},
                relatedLot: 'lot_id'
            };
            bid = {};
            lot = {};
        });

        it("should return value - if lotValues relatedLot exists.", () => {
            lot.id = 'lot_id';
            lot_value.relatedLot = 'lot_id';
            bid.lotValues = [lot_value];
            assert.strictEqual(utils.find_lot_value_for_bid(lot, bid), lot_value);
        });

        it("should return false - if lotValues relatedLot doesn't exists.", () => {
            lot.id = 'lot_id';
            lot_value.relatedLot = 'lot_id_wrong';
            bid.lotValues = [lot_value];
            assert.isFalse(utils.find_lot_value_for_bid(lot, bid));
        });

        it("should return false - if no lotValues.", () => {
            lot.id = 'lot_id_1';
            assert.isFalse(utils.find_lot_value_for_bid(lot, bid));
        });
    });

    describe("find_bid_value", () => {
        let tender, bid, lot;

        beforeEach(() => {
            bid = {};
            lot = {};
            tender = {};
        });

        it("should return bid.value - if lot doesn't passed.", () => {
            assert.strictEqual(utils.find_bid_value(tender, null, bid), bid.value);
        });

        it("should return find_lot_value_for_bid(lot, bid) - if lot passed.", () => {
            lot.id = 'lot_id';
            bid.lotValues = [{
                value: {amount: 100},
                relatedLot: 'lot_id'
            }];
            var actual = utils.find_bid_value(tender, lot, bid);
            var expected = utils.find_lot_value_for_bid(lot, bid).value;
            assert.strictEqual(actual, expected);
            assert.strictEqual(actual.amount, 100);
        });

        it("should return value for pre qual bid - if qualifications.", () => {
            bid.value = {amount: 100};
            tender.qualifications = [{}];
            tender.bids = [bid];
            tender.revisions = [];
            tender.revisions.push({
                date: "2017-11-07T00:00:00Z",
                changes: [{
                    path: "/something",
                    op: "remove"
                }]
            });
            tender.revisions.push({
                date: "2019-11-09T00:00:00Z",
                changes: [
                    {
                        path: "/qualifications/0",
                        op: "remove"
                    }
                ]
            });
            tender.revisions.push({
                date: "2019-11-10T00:00:00Z",
                changes: [
                    {
                        path: "/bids/0/value/amount",
                        op: "replace",
                        value:  90
                    }
                ]
            });

            assert.strictEqual(utils.find_bid_value(tender, null, bid).amount, 90);
        });
    });

    describe("find_pre_qual_bid", () => {
        let tender, bid;

        beforeEach(() => {
            bid = {};
            tender = {};
        });

        it("should return value for pre qual bid - if qualifications.", () => {
            bid.id = "bid_id";
            bid.value = {
                amount: 100
            };
            tender.qualifications = [{}];
            tender.bids = [bid];
            tender.revisions = [];
            tender.revisions.push({
                date: "2017-11-07T00:00:00Z",
                changes: [{
                    path: "/something",
                    op: "remove"
                }]
            });
            tender.revisions.push({
                date: "2019-11-08T00:00:00Z",
                changes: [
                    {
                        path: "/bids/0/value/amount",
                        op: "replace",
                        value:  80
                    }
                ]
            });
            tender.revisions.push({
                date: "2019-11-09T00:00:00Z",
                changes: [
                    {
                        path: "/qualifications/0",
                        op: "remove"
                    }
                ]
            });
            tender.revisions.push({
                date: "2019-11-10T00:00:00Z",
                changes: [
                    {
                        path: "/bids/0/value/amount",
                        op: "replace",
                        value:  90
                    }
                ]
            });

            assert.strictEqual(utils.find_pre_qual_bid(tender, bid).value.amount, 90);
        });
    });

    describe("apply_revisions", () => {
        let doc;

        beforeEach(() => {
            doc = {};
        });

        it("should return old doc version by callback condition.", () => {
            doc.something = 'something';
            doc.revisions = [];
            doc.revisions.push({
                date: "2017-11-09T00:30:00Z",
                changes: [{
                    path: "/something",
                    op: "remove"
                }]
            });
            doc.revisions.push({
                date: "2019-11-09T01:00:00Z",
                changes: [
                    {
                        path: "/something",
                        op: "replace",
                        value:  "previous"
                    }
                ]
            });

            assert.strictEqual(utils.apply_revisions(doc, function (prev) {
                return prev.something === "previous";
            }).something, "previous");
        });

        it("should log if apply goes wrong.", () => {
            doc.something = 'something';
            doc.revisions = [];
            doc.revisions.push({
                date: "2017-11-09T00:00:00Z",
                changes: [{
                    path: "/something",
                    op: "remove"
                }]
            });
            doc.revisions.push({
                date: "2017-11-09T00:30:00Z",
                changes: [{
                    path: "/wrongpath",
                    op: "remove"
                }]
            });

            spy.on(console, 'error', function (msg) {});

            utils.apply_revisions(doc, function (prev) { return true; });

            expect(console.error).to.have.been.called();
        });
    });
});

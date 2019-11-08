"use strict";

let utils = require("../../design/lib/utils");
let assert = require("../../../node_modules/chai").assert;

describe("utils tests", () => {
    describe("find_first_revision_date", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return null - no revisions.", () => {
            assert.strictEqual(utils.find_first_revision_date(doc), null);
        });

        it("should return null - revisions are empty array.", () => {
            doc.revisions = [];
            assert.strictEqual(utils.find_first_revision_date(doc), null);
        });

        it("should return null - first revision has no date.", () => {
            doc.revisions = [{}];
            assert.strictEqual(utils.find_first_revision_date(doc), null);
        });

        it("should return null - tender has revision with date.", () => {
            doc.revisions = [{date: "2017-11-13T00:00:00Z"}];
            assert.strictEqual(utils.find_first_revision_date(doc), doc.revisions[0].date);
        });
    });

    describe("get_bids_disclojure_date", () => {
        let doc;

        beforeEach(() => {
            doc = {}
        });

        it("should return null - no qualificationPeriod and no awardPeriod.", () => {
            assert.strictEqual(utils.get_bids_disclojure_date(doc), null);
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

        it("should return null - no startDate in qualificationPeriod and no startDate in awardPeriod.", () => {
            doc.qualificationPeriod = {};
            doc.awardPeriod = {};
            assert.strictEqual(utils.get_bids_disclojure_date(doc), null);
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

        it("should return null - awardPeriod not exists and no revisions.", () => {
            doc.revisions = [{}];
            assert.strictEqual(utils.get_start_date(doc), null);
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

        it("should return true - open:esco.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "esco";
            assert.strictEqual(utils.exclude_methods_tenders(doc), true);
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

        it("should return true - open:esco.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "esco";
            assert.strictEqual(utils.exclude_methods_bids(doc), true);
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

        it("should return false - open:aboveThresholdUA.defense.", () => {
            doc.procurementMethod = "open";
            doc.procurementMethodType = "aboveThresholdUA.defense";
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
});

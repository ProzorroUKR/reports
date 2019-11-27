"use strict";

let tenders = require("../../../design/lib/tenders");
let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender, lot, bid;

describe("competitiveDialogueUA.stage2", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "selective",
            procurementMethodType: "competitiveDialogueUA.stage2"
        };
        lot = {id: "lot_id"};
        bid = {id: "bid_id"};
    });

    describe("exclude_tenders", () => {
        it("should return false", () => {
            assert.isFalse(utils.exclude_tenders(tender));
        });
    });

    describe("exclude_bids", () => {
        it("should return true", () => {
            assert.isTrue(utils.exclude_bids(tender));
        });
    });
});

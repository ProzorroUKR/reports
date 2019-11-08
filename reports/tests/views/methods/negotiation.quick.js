"use strict";

let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender;

describe("negotiation.quick", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "open",
            procurementMethodType: "negotiation.quick"
        };
    });

    describe("exclude_tenders", () => {
        it("should return true", () => {
            assert.isTrue(utils.exclude_tenders(tender));
        });
    });

    describe("exclude_bids", () => {
        it("should return true", () => {
            assert.isTrue(utils.exclude_bids(tender));
        });
    });
});

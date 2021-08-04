"use strict";

let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender;

describe("priceQuotation", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "selective",
            procurementMethodType: "priceQuotation",
            contracts: [{"status": "active"}],
        };
    });

    describe("exclude_tenders_prozorro_market", () => {
        it("should return false", () => {
            assert.isFalse(utils.exclude_tenders_prozorro_market(tender));
        });
    });
});

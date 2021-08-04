"use strict";

let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender;

describe("reporting", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "limited",
            procurementMethodType: "reporting",
            procurementMethodRationale: "catalogue, offer=d1e02742121be58e3f8e02db5fc37838",
            contracts: [{"status": "active"}],
        };
    });

    describe("exclude_tenders_prozorro_market", () => {
        it("should return false", () => {
            assert.isFalse(utils.exclude_tenders_prozorro_market(tender));
        });
    });
});

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

    describe("check_lot", () => {
        it("should return count_lot_bids(lot, filter_bids(tender.bids || []) > 1", () => {
            assert.strictEqual(
                tenders.count_lot_bids(lot, tenders.filter_bids(tender.bids || [])) > 1,
                tenders.check_lot(lot, tender)
            );

            tender.bids = [
                {
                    date: "2017-11-20T00:00:00Z",
                    lotValues: [{
                        relatedLot: lot.id
                    }]
                },
                {
                    date: "2017-11-20T00:00:00Z",
                    lotValues: [{
                        relatedLot: "not_lot_id"
                    }]      
                }
            ];

            assert.strictEqual(
                tenders.count_lot_bids(lot, tenders.filter_bids(tender.bids || [])) > 1,
                tenders.check_lot(lot, tender)
            );

            tender.bids.push({
                date: "2017-11-20T00:00:00Z",
                lotValues: [{
                    relatedLot: lot.id
                }]
            });

            assert.strictEqual(
                tenders.count_lot_bids(lot, tenders.filter_bids(tender.bids || [])) > 1,
                tenders.check_lot(lot, tender)
            );
        });
    });

    describe("check_tender", () => {
        it("should return tender.numberOfBids > 1", () => {
            tender.numberOfBids = 0;
            assert.strictEqual(tender.numberOfBids > 1, tenders.check_tender(tender));
            tender.numberOfBids = 1;
            assert.strictEqual(tender.numberOfBids > 1, tenders.check_tender(tender));
            tender.numberOfBids = 2;
            assert.strictEqual(tender.numberOfBids > 1, tenders.check_tender(tender));
        });
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

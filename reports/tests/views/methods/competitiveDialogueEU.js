"use strict";

let tenders = require("../../../design/lib/tenders");
let bids = require("../../../design/lib/bids");
let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender, lot, bid;

describe("competitiveDialogueEU", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "open",
            procurementMethodType: "competitiveDialogueEU"
        };
        lot = {id: "lot_id"};
        bid = {id: "bid_id"};
    });

    describe("check_lot", () => {
        it("should return count_lot_qualifications((tender.qualifications || []), lot.id) > 2", () => {
            assert.strictEqual(
                tenders.count_lot_qualifications((tender.qualifications || []), lot.id) > 2,
                tenders.check_lot(lot, tender)
            );
            tender.qualifications = [{
                lotID: lot.id
            }];
            assert.strictEqual(
                tenders.count_lot_qualifications((tender.qualifications || []), lot.id) > 2,
                tenders.check_lot(lot, tender)
            );
            tender.qualifications.push(tender.qualifications[0], tender.qualifications[0]);
            assert.strictEqual(
                tenders.count_lot_qualifications((tender.qualifications || []), lot.id) > 2,
                tenders.check_lot(lot, tender)
            );
        });
    });

    describe("check_tender", () => {
        it("should return (tender.qualifiactions || []).length > 2", () => {
            tender.qualifications = [];
            assert.isFalse(tenders.check_tender(tender));
            tender.qualifications = [null, null, null];
            assert.isTrue(tenders.check_tender(tender));
        })
    });

    describe("get_bids", () => {
        it("should return get_eu_tender_bids(tender)", () => {
            tender.qualifications = [];
            tender.bids = [];
            assert.deepEqual(
                bids.get_eu_tender_bids(tender),
                bids.get_bids(tender)
            );
            tender.qualifications.push({
                bidID: "not_bid_id"
            });
            tender.bids.push({
                id: bid.id
            });
            assert.deepEqual(
                bids.get_eu_tender_bids(tender),
                bids.get_bids(tender)
            );
            tender.qualifications[0].bidID = bid.id;
            assert.deepEqual(
                bids.get_eu_tender_bids(tender),
                bids.get_bids(tender)
            );
            assert.lengthOf(bids.get_bids(tender), 1);
        });
    });

    describe("check_bids_from_bt_atu", () => {
        it("should always return false", () => {
            assert.isFalse(bids.check_bids_from_bt_atu(tender));
            assert.isFalse(bids.check_bids_from_bt_atu(tender, lot));
        });
    });

    describe("check_tender_bids", () => {
        it("should return (tender.qualifications || []).length >= 2", () => {
            tender.qualifications = [];
            assert.isFalse(bids.check_tender_bids(tender));
            tender.qualifications = [null];
            assert.isFalse(bids.check_tender_bids(tender));
            tender.qualifications.push(null, null);
            assert.isTrue(bids.check_tender_bids(tender));
        });
    });


    describe("check_lot_bids", () => {
        it("should return count_lot_qualifications(tender.qualifications, lot) >= 2", () => {
            lot.status = "cancelled";
            tender.qualifications = [];
            assert.strictEqual(
                bids.count_lot_qualifications(tender, lot) >= 2,
                bids.check_lot_bids(tender, lot)
            );
            tender.qualifications = [
                {
                    lotID: lot.id,
                    status: "active"
                },
                {
                    lotID: "not_lot_id",
                    status: "active"
                },
                {
                    lotID: lot.id,
                    status: ""
                }
            ];
            assert.strictEqual(
                bids.count_lot_qualifications(tender, lot) >= 2,
                bids.check_lot_bids(tender, lot)
            );
            tender.qualifications.push(tender.qualifications[0], tender.qualifications[0]);
            assert.strictEqual(
                bids.count_lot_qualifications(tender, lot) >= 2,
                bids.check_lot_bids(tender, lot)
            );
            lot.status = "active";
            assert.strictEqual(
                bids.count_lot_qualifications(tender, lot) >= 2,
                bids.check_lot_bids(tender, lot)
            );
            tender.qualifications.push(tender.qualifications[0]);
            assert.strictEqual(
                bids.count_lot_qualifications(tender, lot) >= 2,
                bids.check_lot_bids(tender, lot)
            );
        });
    });

    describe("check_award_and_qualification", () => {
        it("should return check_qualification_for_eu_bid", () => {
            lot.status = "unsuccessful";
            tender.qualifications = [{
                bidID: bid.id,
                lotID: lot.id,
                status: "active"
            }];
            assert.strictEqual(
                bids.check_qualification_for_eu_bid(tender, bid, lot),
                bids.check_award_and_qualification(tender, bid, lot)
            );
        });
    });

    describe("exclude_tenders", () => {
        it("should return false - unsuccessful tenders", () => {
            tender.status = "unsuccessful";
            assert.isFalse(utils.exclude_tenders(tender));
        });

        it("should return false - cancelled tenders", () => {
            tender.status = "cancelled";
            assert.isFalse(utils.exclude_tenders(tender));
        });

        it("should return true - completed tenders", () => {
            tender.status = "completed";
            assert.isTrue(utils.exclude_tenders(tender));
        });
    });

    describe("exclude_bids", () => {
        it("should return false", () => {
            assert.isFalse(utils.exclude_bids(tender));
        });
    });
});

"use strict";

let tenders = require("../../../design/lib/tenders");
let bids = require("../../../design/lib/bids");
let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender, lot, bid;

describe("belowThreshold", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "open",
            procurementMethodType: "belowThreshold"
        };
        lot = {id: "lot_id"};
        bid = {id: "bid_id"};
    });

    describe("get_bids", () => {
        it("should return filter_bids(tender.bids).", () => {
            tender.bids = [
                {
                    date: "2016-11-13T00:00:00Z",
                    status: "active",
                },
                {
                    date: "2016-11-13T00:00:00Z",
                    status: "invalid.pre-qualification",
                },
                {
                    date: "2017-11-13T00:00:00Z",
                    status: "cancelled",
                },
                {
                    date: "2017-11-13T00:00:00Z",
                    status: "active",
                },
                {
                    date: "2017-11-13T00:00:00Z",
                    status: "invalid.pre-qualification",
                }
            ];
            assert.deepEqual(bids.get_bids(tender), bids.filter_bids(tender.bids));
        });
    });

    describe("check_bids_from_bt_atu", () => {
    it("should return true.", () => {
            assert.isTrue(bids.check_bids_from_bt_atu(tender));
        });
    });

    describe("check_tender_bids", () => {
        it("should return true.", () => {
            assert.isTrue(bids.check_tender_bids(tender));
            tender.awards = [];
            assert.isTrue(bids.check_tender_bids(tender));
        })
    });

    describe("check_lot_bids", () => {
        it("should return true.", () => {
            tender.awards = [];
            assert.isTrue(bids.check_lot_bids(tender, lot));
            tender.awards = [{
                lotID: "not_lot_id"
            }]
            assert.isTrue(bids.check_lot_bids(tender, lot));
            tender.awards[0].lotID = lot.id;
            assert.isTrue(bids.check_lot_bids(tender, lot));
        })
    });

    describe("check_award_and_qualification", () => {
        it("should return check_award_for_bid_multilot(tender, bid, lot).", () => {
            assert.strictEqual(
                bids.check_award_and_qualification(tender, bid, lot),
                bids.check_award_for_bid_multilot(tender, bid, lot)
            );
        });

        it("should return check_award_for_bid(tender, bid).", () => {
            assert.strictEqual(
                bids.check_award_and_qualification(tender, bid),
                bids.check_award_for_bid_multilot(tender, bid)
            );
        });
    });

    describe("exclude_tenders", () => {
        it("should return false", () => {
            assert.isFalse(utils.exclude_tenders(tender));
        });
    });

    describe("exclude_bids", () => {
        it("should return false", () => {
            assert.isFalse(utils.exclude_bids(tender));
        });
    });
});

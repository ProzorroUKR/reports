"use strict";

let tenders = require("../../../design/lib/tenders");
let bids = require("../../../design/lib/bids");
let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender, lot, bid;

describe("aboveThresholdUA", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "open",
            procurementMethodType: "aboveThresholdUA"
        };
        lot = {id: "lot_id"};
        bid = {id: "bid_id"};
    });

    describe("check_lot", () => {
        it("should return count_lot_bids(lot, filter_bids(tender.bids || []) > 1", () => {
            assert.strictEqual(tenders.count_lot_bids(lot, tenders.filter_bids(tender.bids || [])) > 1, tenders.check_lot(tender, lot));

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

            assert.strictEqual(tenders.count_lot_bids(lot, tenders.filter_bids(tender.bids || [])) > 1, tenders.check_lot(tender, lot));

            tender.bids.push({
                date: "2017-11-20T00:00:00Z",
                lotValues: [{
                    relatedLot: lot.id
                }]
            });

            assert.strictEqual(tenders.count_lot_bids(lot, tenders.filter_bids(tender.bids || [])) > 1, tenders.check_lot(tender, lot));
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
        it("no lots in tender", () => {
            assert.strictEqual((tender.numberOfBids || 0) >= 2, bids.check_bids_from_bt_atu(tender, lot));
            tender.numberOfBids = 0;
            assert.strictEqual((tender.numberOfBids || 0) >= 2, bids.check_bids_from_bt_atu(tender, lot));
            tender.numberOfBids = 2;
            assert.strictEqual((tender.numberOfBids || 0) >= 2, bids.check_bids_from_bt_atu(tender, lot));
        });

        it("lots in tender", () => {
            tender.lots = [];
            assert.strictEqual(bids.count_lot_bids(lot, tender) >= 2, bids.check_bids_from_bt_atu(tender, lot));
            tender.bids = [{
                lotValues: [{
                    relatedLot: lot.id
                }]
            }];
            assert.strictEqual(bids.count_lot_bids(lot, tender) >= 2, bids.check_bids_from_bt_atu(tender, lot));
            tender.bids.push(tender.bids[0]);
            assert.strictEqual(bids.count_lot_bids(lot, tender) >= 2, bids.check_bids_from_bt_atu(tender, lot));
        });
    });

    describe("check_tender_bids", () => {
        it("no awards in tender", () => {
            assert.strictEqual(bids.check_bids_from_bt_atu(tender), bids.check_tender_bids(tender));
            tender.numberOfBids = 2;
            assert.strictEqual(bids.check_bids_from_bt_atu(tender), bids.check_tender_bids(tender));
        });
        it("awards in tender", () => {
            tender.awards = [];
            assert.isTrue(bids.check_tender_bids(tender));
        });
    });

    describe("check_lot_bids", () => {
        it("no awards", () => {
            assert.strictEqual(bids.check_bids_from_bt_atu(tender, lot), bids.check_lot_bids(tender, lot));
        });

        it("awards", () => {
            tender.awards = [{
                lotID: "not_lot_id"
            }];
            assert.strictEqual(bids.check_bids_from_bt_atu(tender, lot), bids.check_lot_bids(tender, lot));
            tender.awards[0].lotID = lot.id;
            assert.isTrue(bids.check_lot_bids(tender, lot));
        });
    });

    describe("check_award_and_qualification", () => {
        it("no lot", () => {
            tender.awards = [{
                lotID: "not_lot_id"
            }];
            assert.strictEqual(bids.check_award_for_bid(tender, bid), bids.check_award_and_qualification(tender, bid));
            tender.awards[0].bidID = bid.id;
            assert.strictEqual(bids.check_award_for_bid(tender, bid), bids.check_award_and_qualification(tender, bid));
            tender.awards[0].status = "active";
            assert.strictEqual(bids.check_award_for_bid(tender, bid), bids.check_award_and_qualification(tender, bid));
        });

        it("lot", () => {
            assert.strictEqual(bids.check_award_for_bid(tender, bid, lot), bids.check_award_and_qualification(tender, bid, lot));
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

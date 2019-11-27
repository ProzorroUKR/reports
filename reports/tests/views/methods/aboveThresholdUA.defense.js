"use strict";

let tenders = require("../../../design/lib/tenders");
let bids = require("../../../design/lib/bids");
let utils = require("../../../design/lib/utils");
let assert = require("../../../../node_modules/chai").assert;

let tender, lot, bid;

describe("aboveThresholdUA.defense", () => {
    beforeEach(() => {
        tender = {
            doc_type: "Tender",
            qualificationPeriod: {startDate: "2019-12-01"},
            enquiryPeriod: {startDate: "2019-12-01"},
            procurementMethod: "open",
            procurementMethodType: "aboveThresholdUA.defense"
        };
        lot = {id: "lot_id"};
        bid = {id: "bid_id"};
    });

    describe("get_bids", () => {
        it("should return filter_bids(tender.bids || [])", () => {
            tender.bids = [];
            assert.deepEqual(bids.get_bids(tender), bids.filter_bids(tender.bids || []));
            tender.bids = [{
                date: "2016-11-21T00:00:00Z",
                status: "cancelled"
            }];
            assert.deepEqual(
                bids.get_bids(tender),
                bids.filter_bids(tender.bids || [])
            );
            tender.bids[0].status = "active";
            assert.deepEqual(
                bids.get_bids(tender),
                bids.filter_bids(tender.bids || [])
            );
            tender.bids[0].date = "2017-11-21T00:00:00Z";
            assert.deepEqual(
                bids.get_bids(tender),
                bids.filter_bids(tender.bids || [])
            );
            assert.lengthOf(bids.get_bids(tender), 1);
        })
    });

    describe("check_bids_from_bt_atu", () => {
        it("should always return true", () => {
            assert.isTrue(bids.check_bids_from_bt_atu(tender, lot));
            assert.isTrue(bids.check_bids_from_bt_atu(tender));
        });
    });

    describe("check_tender_bids", () => {
        it("no awards in tender", () => {
            assert.strictEqual(
                bids.check_bids_from_bt_atu(tender),
                bids.check_tender_bids(tender)
            );
            tender.numberOfBids = 2;
            assert.strictEqual(
                bids.check_bids_from_bt_atu(tender),
                bids.check_tender_bids(tender)
            );
        });
        it("awards in tender", () => {
            tender.awards = [];
            assert.isTrue(bids.check_tender_bids(tender));
        });
    });

    describe("check_lot_bids", () => {
        it("no awards", () => {
            assert.strictEqual(
                bids.check_bids_from_bt_atu(tender, lot),
                bids.check_lot_bids(tender, lot)
            );
        });

        it("awards", () => {
            tender.awards = [{
                lotID: "not_lot_id"
            }];
            assert.strictEqual(
                bids.check_bids_from_bt_atu(tender, lot),
                bids.check_lot_bids(tender, lot)
            );
            tender.awards[0].lotID = lot.id;
            assert.isTrue(bids.check_lot_bids(tender, lot));
        });
    });

    describe("check_award_and_qualification", () => {
        it("no lot", () => {
            tender.awards = [{
                lotID: "not_lot_id"
            }];
            assert.strictEqual(
                bids.check_award_for_bid(tender, bid),
                bids.check_award_and_qualification(tender, bid)
            );
            tender.awards[0].bidID = bid.id;
            assert.strictEqual(
                bids.check_award_for_bid(tender, bid),
                bids.check_award_and_qualification(tender, bid)
            );
            tender.awards[0].status = "active";
            assert.strictEqual(
                bids.check_award_for_bid(tender, bid),
                bids.check_award_and_qualification(tender, bid)
            );
        });

        it("lot", () => {
            assert.strictEqual(
                bids.check_award_for_bid(tender, bid, lot),
                bids.check_award_and_qualification(tender, bid, lot)
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

"use strict";

const tenders = require("../../design/lib/tenders_prozorro_market");
const chai = require("../../../node_modules/chai");

const assert = chai.assert;

describe("tenders_prozorro_market view tests", () => {
    describe("get_contract_award", () => {
        let tender, contract;

        beforeEach(() => {
            tender = {};
            contract = {"awardID": "award_id"};
        });

        it("no tender awards - should return null.", () => {
            assert.strictEqual(tenders.get_contract_award(tender, contract), null);
        });

        it("tender awards is empty array - should return null.", () => {
            tender.awards = []
            assert.strictEqual(tenders.get_contract_award(tender, contract), null);
        });

        it("no related contract awards - should return null.", () => {
            tender.awards = [{"id": "something"}, {"id": "something_2"}]
            assert.strictEqual(tenders.get_contract_award(tender, contract), null);
        });

        it("one related contract award - should return contract award.", () => {
            tender.awards = [{"id": "something"}, {"id": "award_id"}]
            assert.strictEqual(tenders.get_contract_award(tender, contract), tender.awards[1]);
        });
    });

    describe("get_contract_bid", () => {
        let tender, contract;

        beforeEach(() => {
            tender = {};
            contract = {"awardID": "award_id"};
        });

        it("no related award - should return null.", () => {
            tender.bids = [{"id": "bid_id"}]
            assert.strictEqual(tenders.get_contract_bid(tender, contract), null);
        });

        it("no bid_id in related award - should return null.", () => {
            tender.bids = [{"id": "bid_id"}]
            tender.awards = [{"id": "award_id"}]
            assert.strictEqual(tenders.get_contract_bid(tender, contract), null);
        });

        it("bid_id is empty string in related award - should return null.", () => {
            tender.bids = [{"id": "bid_id"}]
            tender.awards = [{"id": "award_id", "bid_id": ""}]
            assert.strictEqual(tenders.get_contract_bid(tender, contract), null);
        });

        it("no related bid found - should return null.", () => {
            tender.bids = [{"id": "bid_id"}]
            tender.awards = [{"id": "award_id", "bid_id": "something"}]
            assert.strictEqual(tenders.get_contract_bid(tender, contract), null);
        });

        it("one related contract bid - should return contract bid.", () => {
            tender.awards = [{"id": "award_id", "bid_id": "bid_id"}]
            tender.bids = [{"id": "bid_id"}]
            assert.strictEqual(tenders.get_contract_bid(tender, contract), tender.bids[0]);
        });
    });

    describe("get_bid_owner", () => {
        let tender, contract;

        beforeEach(() => {
            tender = {};
            contract = {"awardID": "award_id"};
        });

        it("procurementMethodType reporting - should return empty string.", () => {
            tender.procurementMethodType = "reporting"
            assert.strictEqual(tenders.get_bid_owner(tender, contract), "");
        });

        it("procurementMethodType priceQuotation - should return bid owner.", () => {
            tender.procurementMethodType = "priceQuotation"
            tender.awards = [{"id": "award_id", "bid_id": "bid_id"}]
            tender.bids = [{"id": "bid_id", "owner": "bid_owner"}]
            assert.strictEqual(tenders.get_bid_owner(tender, contract), tender.bids[0].owner);
        });
    });

    describe("get_tariff_group", () => {
        let contract;

        it("contract value amount under 50k - should return under 50k UAH.", () => {
            contract = {"value": {"amount": 50000}};
            assert.strictEqual(tenders.get_tariff_group(contract), "under 50k UAH");
        });

        it("contract value amount under 200k - should return under 200k UAH.", () => {
            contract = {"value": {"amount": 200000}};
            assert.strictEqual(tenders.get_tariff_group(contract), "under 200k UAH");
        });

        it("contract value amount above 200k - should return above 200k UAH.", () => {
            contract = {"value": {"amount": 200001}};
            assert.strictEqual(tenders.get_tariff_group(contract), "above 200k UAH");
        });
    });

    describe("get_active_contract", () => {
        let tender;

        beforeEach(() => {
            tender = {};
        });

        it("no tender contracts - should return null.", () => {
            assert.strictEqual(tenders.get_active_contract(tender), null);
        });

        it("tender contracts is empty array - should return null.", () => {
            tender.contracts = []
            assert.strictEqual(tenders.get_active_contract(tender), null);
        });

        it("no active contracts - should return null.", () => {
            tender.contracts = [{"status": "not_active"}, {"status": "not_active"}]
            assert.strictEqual(tenders.get_active_contract(tender), null);
        });

        it("one active contract - should return contract.", () => {
            tender.contracts = [{"status": "not_active"}, {"status": "active"}]
            assert.strictEqual(tenders.get_active_contract(tender), tender.contracts[1]);
        });
    });
});
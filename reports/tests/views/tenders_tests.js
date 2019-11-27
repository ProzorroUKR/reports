"use strict";

const tenders = require("../../design/lib/tenders");
const chai = require("../../../node_modules/chai");

const assert = chai.assert;

describe("tenders view tests", () => {

    describe("get_contract_date", () => {
        let tender;

        it("tender has no 'contracts' field - should return empty string.", () => {
            tender = {};
            assert.strictEqual(tenders.get_contract_date(tender), "");
        });

        it("tender has no contracts in status 'active' - should return empty string.", () => {
            tender.contracts = [{
                status: undefined,
                date: "2017-11-09T00:00:00Z"
            }];
            assert.strictEqual(tenders.get_contract_date(tender), "");
        });

        it("tender has contract in status 'active' - should return contract.date", () => {
            tender.contracts[0].status = "active"; 
            assert.deepEqual(tender.contracts[0].date, tenders.get_contract_date(tender));
        });
    });

    describe("get_contract_date_for_lot", () => {
        let lot, tender;
        
        it("tender has no 'awards' field - should return false", () => {
            lot = {id: "lot_id"};
            tender = {
                contracts: [{
                    status: "active",
                    date: "2017-11-09T00:00:00Z",
                    awardID: "award_id"
                }]
            };

            assert.strictEqual(tenders.get_contract_date_for_lot(tender, lot), "");
        });

        it("tender has valid award - should return contract date.", () => {
            tender.awards = [{
                id: "award_id",
                lotID: "lot_id"
            }];

            assert.strictEqual(tender.contracts[0].date, tenders.get_contract_date_for_lot(tender, lot));
        });
    });

    describe("find_date_from_revisions", () => {
        let lot, tender;

        it("no awards and no revisions - should return undefined.", () => {
            lot = {
                id: "lot_id"
            }
        
            tender = {
                awards: [],
                revisions: [],
                something: 'something'
            };
            
            assert.isUndefined(tenders.find_date_from_revisions(tender));
        });

        it("valid awards and no revisions - should return award date.", () => {
            tender.awards.push({
                status: "active",
                date: "2017-11-09T00:00:00Z"
            });

            assert.strictEqual(tender.awards[0].date, tenders.find_date_from_revisions(tender));
        });
        
        it("no valid awards and no revisions - should return undefined.", () => {
            tender.awards[0].lotID = "not_lot_id";
            assert.isUndefined(tenders.find_date_from_revisions(tender, lot));
        });
        
        it("valid awards and no revisions - should return award date.", () => {
            tender.awards[0].lotID = "lot_id";
            assert.strictEqual(tender.awards[0].date, tenders.find_date_from_revisions(tender, lot));
        });
        
        it("valid awards and revisions didn't changed awards - should return award date.", () => {
            tender.revisions = [{
                date: "2017-11-09T00:30:00Z",
                changes: [{
                    path: "/something",
                    op: "remove"
                }]
            },
            {
                date: "2017-11-09T01:00:00Z",
                changes: [{
                    path: "/numberOfBids",
                    op: "add",
                    value: 0
                }]
            }];

            assert.strictEqual(tender.awards[0].date, tenders.find_date_from_revisions(tender));
        });

        it("valid awards and revisions changed awards status to 'cancelled' - should return actual date.", () => {
            tender.revisions.push({
                date: "2017-11-10T00:00:00Z",
                changes: [{
                    path: "/awards/0",
                    op: "replace",
                    value: {
                        status: "cancelled",
                        date: "2017-11-09T00:00:00Z"
                    }
                }]
            });

            assert.strictEqual(tender.awards[0].date, tenders.find_date_from_revisions(tender));
        });

        it("valid awards and revisions changed awards status to 'cancelled' - should return actual date.", () => {
            tender.revisions.push({
                date: "2017-11-10T00:00:00Z",
                changes: [{
                    path: "/awards/0",
                    op: "replace",
                    value: {
                        status: "unsuccessful",
                        date: "2017-11-09T00:00:00Z"
                    }
                }]
            });

            assert.strictEqual(tender.awards[0].date, tenders.find_date_from_revisions(tender));
        });
    });

    describe("get_first_award_date", () => {
        let tender, lot;
        it("tender awards is empty array - should return null.", () => {
            tender = {
                awards: []
            };

            assert.isNull(tenders.get_first_award_date(tender));
        });

        it("tender awards are only unsuccessful or pending - should return null.", () => {
            tender.awards.push({
                status: "unsuccessful"
            },
            {
                status: "pending"
            });

            assert.isNull(tenders.get_first_award_date(tender));
        });

        it("tender has one complete award - should return this award date.", () => {
            tender.awards.push({
                status: "complete",
                date: "2017-11-10T00:00:00Z"
            });
            
            assert.strictEqual(tender.awards[2].date, tenders.get_first_award_date(tender));
        });

        it("tender has one cancelled and one active award - should return active award date.", () => {
            tender = {
                awards: [{
                    status: "cancelled",
                    date: "2017-11-09T00:00:00Z"
                },
                {
                    status: "active",
                    date: "2017-11-10T00:00:00Z"
                }],
                revisions: []
            };

            assert.strictEqual(tender.awards[1].date, tenders.get_first_award_date(tender));
        });

        it("tender awards 'lotID's don't match lot id - should return null.", () => {
            lot = {
                id: "lot_id"
            };
            tender.awards.forEach(function(award) {
                award.lotID = "not_lot_id";
            });

            assert.isNull(tenders.get_first_award_date(tender, lot));
        });

        it("tender has one cancelled and one active award, awards 'lotID's match lot id - " +
            "should return active award date.", () => {
            tender.awards.forEach(function(award) {
                award.lotID = "lot_id";
            });

            assert.strictEqual(tender.awards[1].date, tenders.get_first_award_date(tender));
        });
    });
});

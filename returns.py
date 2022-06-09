from .base import apply_revisions
from lines.models import LineType


def yield_return_lines(tender):  # deleted
    cancelled_lot_ids = {
        l["id"] for l in tender.get("lots", "")
        if l["status"] == "cancelled"
    }
    if cancelled_lot_ids:
        cancelled_lot_ids = {
            lv["relatedLot"]
            for b in tender.get("bids", "")
            for lv in b.get("lotValues", "")
            if lv["relatedLot"] in cancelled_lot_ids
        }
        actual_bid_ids = {b["id"] for b in tender.get("bids", "")}

        if cancelled_lot_ids and actual_bid_ids:


            def callback(reverted):
                for lot in reverted.get("lots", ""):
                    if lot["status"] != "cancelled" and lot["id"] in cancelled_lot_ids:

                        for bid in reverted.get("bids", ""):
                            if bid["id"] in actual_bid_ids:

                                for lv in bid.get("lotValues", ""):
                                    if lv["relatedLot"] == lot["id"]:
                                        actual_lot = find_actual_lot(tender, old_lot.id)[0];

                                        if get_info_about_cancelled_lot(tender, reverted, bid, lot):
                                            # emmit cancelled
                                            yield dict(
                                                type=LineType.RETURN.value,
                                                month=bids_open_month,
                                                bid_id=bid["id"],
                                                broker=bid["owner"],
                                                lot_id=lot["id"],
                                                tender_id=tender["id"],
                                                tenderID=tender["tenderID"],
                                                amount=get_payment_amount(lot_value.get("amount"), tariff),
                                            )
                                        else:
                                            # emmit successfull
                                            yield dict(
                                                type=LineType.PAYMENT.value,
                                                month=bids_open_month,
                                                bid_id=b["id"],
                                                broker=b["owner"],
                                                lot_id=lot_id,
                                                tender_id=tender_id,
                                                tenderID=tender["tenderID"],
                                                amount=get_payment_amount(lot_value.get("amount"), tariff),
                                            )


def get_info_about_cancelled_lot(actual_tender, old_tender, bid, lot):
    is_active_bid_qualification = False
    for q in old_tender.get("qualifications", ""):
        if q["bidID"] == bid["id"] and q["lotID"] == lot["id"] and q["status"] == "active":
            is_active_bid_qualification = True
            break

    if old_tender["status"] == 'active.pre-qualification':
        for q in old_tender.get("qualifications", ""):
            if q["bidID"] == bid["id"] and q["lotID"] == lot["id"] and q["status"] != "cancelled":
                return True
    elif old_tender["status"] == 'active.pre-qualification.stand-still':
        for q in old_tender.get("qualifications", ""):
            if q["bidID"] == bid["id"] and q["lotID"] == lot["id"] and q["status"] == "active":
                return True
    else:
        if "awards" in old_tender:
            return is_active_bid_qualification and check_award_for_bid_multilot(actual_tender, bid, lot)
        else:
            return is_active_bid_qualification
    return False


def check_award_for_bid_multilot(tender, bid, lot):
    awards = [
        (a["date"], a["status"])
        for a in tender.get("awards", "")
        if a["bid_id"] == bid["id"] and a["lotID"] == lot["id"]
    ]
    if not awards:
        return True
    latest_award_status = max(awards)[1]
    return latest_award_status in ('active', 'pending', 'cancelled')


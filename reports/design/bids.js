function(doc) {
    var bids = require('views/lib/bids').main;
    (bids(doc, null) || []).forEach(function(result) {
        emit(result.key, result.value);
    });
}

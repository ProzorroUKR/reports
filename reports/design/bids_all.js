function(doc) {
    var bids = require('views/lib/bids').main;
    (bids(doc, '__all__') || []).forEach(function(result) {
        emit(result.key, result.value);
    });
}

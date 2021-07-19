function(doc) {
    var tenders = require('views/lib/tenders_prozorro_market').main;
    (tenders(doc, null) || []).forEach(function(result) {
        emit(result.key, result.value);
    });
}

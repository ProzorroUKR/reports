function(doc) {
    var tenders = require('views/lib/tenders').main;
    (tenders(doc, null) || []).forEach(function(result) {
        emit(result.key, result.value);
    });
}

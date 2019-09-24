function(doc) {
    var tenders = require('views/lib/tenders').main;
    (tenders(doc, 'test') || []).forEach(function(result) {
        emit(result.key, result.value);
    });
}

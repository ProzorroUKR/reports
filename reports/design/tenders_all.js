function(doc) {
    var tenders = require('views/lib/tenders').main;
    (tenders(doc, '__all__') || []).forEach(function(result) {
        emit(result.key, result.value);
    });
}

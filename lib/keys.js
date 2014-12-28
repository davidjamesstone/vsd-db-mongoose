var createdDate = {
  type: Date,
  default: Date.now,
  get: function(val) {
    return val ? val.toDateString() + ' ' + val.getHours() + ':' + ('0' + val.getMinutes()).slice(-2) : '';
  }
};


exports.createdDate = exports.anotherCreatedDate = createdDate;

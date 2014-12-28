function modifiedPlugin(schema, options) {
  schema.add({
    modifiedDate: {
      type: Date,
      get: function(val) {
        return val ? val.toDateString() + ' ' + val.getHours() + ':' + ('0' + val.getMinutes()).slice(-2) : '';
      }
    }
  });
  schema.pre('save', function(next, req) {
    this.modifiedDate = new Date();
    next();
  });
}

exports.modifiedPlugin = modifiedPlugin;

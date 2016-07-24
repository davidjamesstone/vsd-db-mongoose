module.exports = function (mongoose) {
  var Schema = mongoose.Schema

  mongoose.connection.on('error', function (err) {
    console.log(err)
  })

  return {
    connect: function (cnnstr, options) {
      return mongoose.connect(cnnstr, options)
    },
    generateSchemas: function (models) {
      var rtn = {}
      var shared = {}
      var schemas = models.schemas
      var refMap = {}

      function checkChildren (keys, path) {
        var items, key

        items = keys.items

        for (var i = 0; i < items.length; i++) {
          key = items[i]
          if (key.type === 'Array' && key.def.oftype === 'ChildDocument') {
            var name = path.join('.') + '.' + key.name
            refMap[key.id] = name
          } else if (key.type === 'NestedDocument') {
            path.push(key.name)
            checkChildren(key.def.keys, path)
          }
        }
      }

      schemas.forEach(function (schema) {
        refMap[schema.id] = schema.name
        checkChildren(schema.keys, [schema.name])
      })

      // create any common child schema first
      for (var i = 0; i < schemas.length; i++) {
        if (schemas[i].isVirtual === true) {
          shared[schemas[i].id] = new Schema(createKeys(schemas[i]))
        }
      }

      for (var j = 0; j < schemas.length; j++) {
        if (!schemas[j].isVirtual) {
          var schema = new Schema(createKeys(schemas[j]))
          rtn[schemas[j].name] = schema
        }
      }

      function createKeys (keys) {
        var k = {}
        var items = keys.keys.items
        for (var i = 0; i < items.length; i++) {
          k[items[i].name] = createKey(items[i])
        }
        return k
      }

      function createKey (key) {
        var t = createType(key)
        if (!Array.isArray(t)) {
          if (key.def.required) t.required = key.def.required
          if (key.def.defaultValue) t.defaultValue = key.def.defaultValue
          if (key.def.unique) t.unique = key.def.unique
          if (key.def.index) t.index = key.def.index
        }
        return t
      }

      function createType (key) {
        var o = {}
        var type = (key.type || key.oftype).toLowerCase()
        var def = key.def
        switch (type.toLowerCase()) {
          case 'string':
            o.type = String
            if (def.enumeration) o.enum = def.enumeration.split(' ')
            if (def.casing === 'upper') o.uppercase = def.uppercase
            if (def.casing === 'lower') o.lowercase = def.lowercase
            if (def.trim) o.trim = def.trim
            if (def.match) o.match = def.match
            break
          case 'boolean':
            o.type = Boolean
            break
          case 'number':
            o.type = Number
            if (!isNaN(def.min)) o.min = Number(def.min)
            if (!isNaN(def.max)) o.max = Number(def.max)
            break
          case 'date':
            o.type = Date
            break
          case 'nesteddocument':
            o = createKeys({
              keys: {
                items: def.keys.items
              }
            })
            break
          case 'array':
            if (def.oftype.toLowerCase() === 'nesteddocument') {
              o = [createKeys({
                keys: {
                  items: def.def.keys.items
                }
              })]
            } else {
              o = [createKey(def)]
            }
            break
          case 'foreignkey':
            o.type = mongoose.Schema.Types.ObjectId
            if (def.ref) o.ref = getRefName(def.ref)
            break
          case 'objectid':
            o.type = mongoose.Schema.Types.ObjectId
            if (def.auto) o.auto = def.auto
            break
          case 'object':
            o.type = mongoose.Schema.Types.Mixed
            break
          case 'buffer':
            o.type = mongoose.Schema.Types.Buffer
            break
          case 'childdocument':
            o = shared[def.ref]
            break
          default:
            throw new Error('Type not supported')
        }
        return o
      }

      function getRefName (id) {
        return refMap[id]
      }

      return rtn
    },
    generateModels: function (schemas) {
      var models = {}
      for (var name in schemas) {
        models[name] = mongoose.model(name, schemas[name])
      }
      return models
    }
  }
}

'use strict';

var Attribute = require('../attribute'),

    accessors = require('./accessors'),
    _defaultGetter = accessors._defaultGetter,
    _defaultSetter = accessors._defaultSetter,

    instanceMethods = require('./instanceMethods'),

    propertyDescriptorBuilders = require('../utils/propertyDescriptorBuilders'),
    _hidden = propertyDescriptorBuilders._hidden,
    _protected = propertyDescriptorBuilders._protected,
    _writable = propertyDescriptorBuilders._writable;


/**********************************************************
* Prototypes for Model classes and instances
**********************************************************/

// baseModelClass works as the prototype of any Model class, any public
// properties that should be available to any model class are to be added
// here.
var baseModelClass = Object.create({}, {
      build: _hidden(build)
    }),

// baseModelInstance works as the prototype of any Model instance, any
// public properties that should be available to any model instance are to
// be added here.
    baseModelInstance = Object.create({}, {
      __isDirty__: _writable(false),
      isDirty:  _hidden(instanceMethods.isDirty),
      save:     _hidden(instanceMethods.save)
    });

/**********************************************************
* End of prototypes for Model classes and instances
**********************************************************/


/**********************************************************
* Internal state
**********************************************************/

var defaultSyncSources = [],
    defaultSyncTargets = [],
    onUpdateHandlers = [];

/**********************************************************
* End of internal state
**********************************************************/


/**********************************************************
* Private, internal utility functions
**********************************************************/

// Given an attributes prototype, creates an object to use
// as a prototype for creating model instances
function createBaseModelInstance(attributesPrototype){
  var baseInstance = Object.create(baseModelInstance, {});

  for (var attributeName in attributesPrototype) {
    var attribute = attributesPrototype[attributeName],
        propertyDesc;

    if (attribute.getter){
      Object.defineProperty(baseInstance, attributeName, {
        configurable: false,
        enumerable: true,
        get: attribute.getter
      });
    } else {
      Object.defineProperty(baseInstance, attributeName, {
        configurable: false,
        enumerable: true,
        get: _defaultGetter(attributeName),
        set: _defaultSetter(attributeName)
      });
    }
  }

  return baseInstance;
}

/**********************************************************
* End of private functions
**********************************************************/


/**********************************************************
* Public, these functions are part of the API of any
* objects built by calling `Model`
**********************************************************/

// Creates an instance of a model with the provided attributes.
// The new object is stored in the Model store.
function build(attributes){
  var instance = Object.create(this.baseInstance, {
    attributes: _hidden({}),
  });

  if (typeof attributes !== 'object') {
    attributes = {};
  }

  for (var attributeName in this.attributesPrototype) {
    var attributeDescriptor = this.attributesPrototype[attributeName];

    if (!attributeDescriptor.getter) {
      if (attributes.hasOwnProperty(attributeName)) {
        instance.attributes[attributeName] = attributes[attributeName];
      } else {
        instance.attributes[attributeName] = attributeDescriptor.defaultValue;
      }
    }
  }

  this.store.push(instance);
  return instance;
}

/**********************************************************
* End of public functions
**********************************************************/

// Model creates a model class, this is the exposed constructor of the module.
// It accepts a `modelName` as a parameter and the modelDescription object.
// So far, the modelDescription should contain an `attributes` property, which
// contains an object describing the model's attributes. i.e.
//
//  Model('User', {
//    attributes: {
//      firstName:  Attribute.text,
//      lastName:   Attribute.text,
//      coins:      Attribute.number,
//
//      fullName: Attribute.computed(function(){
//        return this.firstName + ' ' + this.lastName;
//      })
//    }
//  })
//
function Model(modelName, modelDescription){
  var attributesPrototype, resourcePath, syncSources, syncTargets;

  if (modelName === undefined || typeof modelName.toString !== 'function') {
    throw new TypeError('modelName should be a string or have a .toString method!');
  }
  modelName = modelName.toString();

  if (!Model[modelName]){
    attributesPrototype = (modelDescription.attributes || {});
    resourcePath = modelDescription.resourcePath;
    syncSources = defaultSyncSources.concat(modelDescription.syncSources || []);
    syncTargets = defaultSyncTargets.concat(modelDescription.syncTargets || []);

    Model[modelName] = Object.create(baseModelClass, {
      name: _protected(modelName),

      attributesPrototype: _hidden(attributesPrototype),
      baseInstance: _protected(createBaseModelInstance(attributesPrototype)),
      resourcePath: _hidden(resourcePath),
      store: _protected([]),
      syncSources: _hidden(syncSources),
      syncTargets: _hidden(syncTargets)
    });
  }
  return Model[modelName];
}

Model.notifySyncTargets = function notifySyncTargets(){
  var data = {},
      syncPromises;

  syncPromises = onUpdateHandlers.map(function(handler){
    return handler(data);
  });
  return Promise.all(syncPromises);
};

Model.addSyncSource = function addSyncSource(syncSource){
  syncSource.onUpdate(this.sync);
};

Model.addSyncTarget = function addSyncTarget(syncTarget){
  this.onUpdate(syncTarget.sync);
};

Model.clearSyncTargets = function clearSyncTargets(){
  onUpdateHandlers = [];
};

Model.removeSyncTarget = function removeSyncTarget(syncTarget){
  var index = onUpdateHandlers.indexOf(syncTarget.sync);
  if (index !== -1) {
    onUpdateHandlers.splice(index, 1);
  }
};

Model.onUpdate = function onUpdate(){
  var updateHandlers = Array.prototype.slice.apply(arguments);
  onUpdateHandlers.push.apply(onUpdateHandlers, updateHandlers);
};

Model.sync = function sync(data){
  var modelName, modelClass, updatedData;
  return new Promise(function(resolve, reject){
    for (modelName in data) {
      modelClass = Model[modelName];

      data[modelName].items.forEach(function(item) {
        // TODO update the attributes of affected model instances
      });
    }
    updatedData = Object.create(data, {});
    resolve(updatedData);
  });
};

module.exports = Model;
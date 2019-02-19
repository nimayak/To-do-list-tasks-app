storageEngine = function(){
    var initialised = false;
    var initialisedObjectStores = {};
    function getStorageObject(type){
        var item = localStorage.getItem(type);
        var parsedItem = JSON.parse(item);
        return parsedItem;
    }
        
        return{
            
            init: function(successCallback, errorCallback){
                if(window.localStorage){
                    initialised = true;
                    successCallback(null);
                }
                else{
                    errorCallback('storage_api_not_supported', 'The web storage api is not supported');
                }
            },
            
            initObjectStore: function(type, successCallback, errorCallback){
                if(!initialised){
                    errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');
                }
                else if(!localStorage.getItem(type)){
                    localStorage.setItem(type, JSON.stringify({}));
                    initialisedObjectStores[type]= true;
                    successCallback(null);
                }
                else if(localStorage.getItem(type)){
                    initialisedObjectStores[type] = true;
                    successCallback(null);
                }
            },
            
            save: function(type, obj, successCallback, errorCallback){
                if(!initialised)
                    errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');
                else if(!initialisedObjectStores[type])
                    errorCallback('store_not_initialised', 'The object store ' + type + ' has not been initialised');
                else{
                    if(!obj.id)
                        obj.id = $.now();
                    var storageItem = getStorageObject(type);
                    storageItem[obj.id] = obj;
                    localStorage.setItem(type, JSON.stringify(storageItem));
                    successCallback(obj);
                }
            },
            
            findAll: function(type, successCallback, errorCallback){
                if(!initialised)
                    errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');
                else if(!initialisedObjectStores[type])
                    errorCallback('store_not_initialised', '2. The object store ' + type + ' has not been initialised');
                else{
                    var result = [];
                    var storageItem = getStorageObject(type);
                    $.each(storageItem, function(i, v){
                        result.push(v);
                    });
                    successCallback(result);
                }
            },
            
            delete: function(type, id, successCallback, errorCallback){
                if(!initialised)
                    errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');
                else if(!initialisedObjectStores[type])
                    errorCallback('store_not_initialised', '2. The object store ' + type + ' has not been initialised');
                else{
                    var storageItem = getStorageObject(type);
                    if (storageItem[id]){
                        delete storageItem[id];
                        localStorage.setItem(type, JSON.stringify(storageItem));
                        successCallback(id);
                    }
                    else
                        errorCallback("object_not_found", "The object to be deleted could not be found");
                }
            },
            
            findByProperty: function(type, propertyName, propertyValue, successCallback, errorCallback){
                if (!initialised)
                    errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');
                else if(!initialisedObjectStores[type])
                    errorCallback('store_not_initialised', '2. The object store ' + type + ' has not been initialised');
                else{
                    var result = [];
                    var storageItem = getStorageObject(type);
                    $.each(storageItem, function(i,v){
                        if(v[propertyName] === propertyValue)
                            result.push(v);
                    });
                    successCallback(result);
                }
            },
            
            findById: function(type, id, successCallback, errorCallback){
                if(!initialised)
                    errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');
                else if(!initialisedObjectStores[type])
                    errorCallback('store_not_initialised', '2. The object store ' + type + ' has not been initialised');
                else{
                    var storageItem = getStorageObject(type);
                    var result = storageItem[id];
                    if(!result)
                        result = null;
                    successCallback(result);
                }
                    
            },

            saveAll: function(type, objArray, successCallback, errorCallback){
                if(!initialised)
                    errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');
                else if(!initialisedObjectStores[type])
                    errorCallback('store_not_initialised', '1. The object store ' + type + ' has not been initialised');
                else{
                    var storageItem = getStorageObject(type);
                    $.each(objArray, function(i, obj){
                        if(!obj.id)
                            obj.id = $.now();
                        storageItem[obj.id] = obj;
                    });
                    localStorage.setItem(type, JSON.stringify(storageItem));
                    successCallback(objArray);
                }
            }
        };
}();
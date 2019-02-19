//same code outline as tasks-webstorage.js as they are both trying to implement the same generic data storage API
//a note on the error handling (not the error callbacks) in this storage engine
//methods check that the database is open by inquiring about the private "database" variable
//then even if the db is not open they continue on with their code after logging an error message
//the assumption is the method code will soon crash but an error message has been logged so a maintainer could quickly trace the problem
//this is pretty quick and dirty and not a recommended error handling technique

storageEngine = function() {
	var database;
	var objectStores;
	return {
		//unlike Web Storage this init is not trivial
		init : function(successCallback, errorCallback) {	//called from tasksController.init(...), success callback calls initObjectStore
			console.log("storageEngine.init");
			if (window.indexedDB) {
				//request is assigned synchronously but db not open until callback specified by request.onsuccess executes
				var request = indexedDB.open(window.location.hostname + 'DB'); //open or create a db with the supplied name (domain specific here)
				request.onsuccess = function(event) {		//only executes when db open
					database = request.result;				//a private variable that references the open db
					successCallback(null);					//calls initObjectStore so no attempt to initObjectStore until db open
				};
				request.onerror = function(event) {
					errorCallback('storage_not_initalized', 'It is not possible to initialize storage');
				}
			} else {
				errorCallback('storage_api_not_supported', 'The IndexedDB api is not supported');
			}			
		},
		
		//IndexedDB can store any kind of JS data including objects (cf Web Storage which could only store Strings)
		//when objects are stored they are done so with a primary key which is the value of a programmer-specified property 
		//in addition the concept of an object Store is automatically supported, methods for creating and maintaining these stores as well as getting objects in and out of the stores exist
		//see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API for documentation
		initObjectStore  : function(type, successCallback, errorCallback) {	//success callback is function() {} i.e. the empty function //UPDATE successCallback is function() {callback()} to accommodate the asynchronism of IndexedDB
			//initObjectStore(...) can only be called from the success callback of init(...) so no need to check if db open
			console.log("storageEngine.initObjectStore");
			if (!database) {errorCallback('storage_api_not_initialized', 'The storage engine has not been initialized');}

			
			//we have to do our own searching unlike Web Storage
	    	var exists = false;
	    	$.each(database.objectStoreNames, function(i, v) {
	    		  if (v == type) {
	    			  exists = true;
	    		  }
	    	});
			
	    	if (exists) {
	    		successCallback(null);	//success callback is function() {} i.e. the empty function, only squeal if there is a failure (see else clause) //UPDATE successCallback is function() {callback()} to accommodate the asynchronism of IndexedDB
	    	} 
			else {	//we need to add an object store with tag 'type', this is regarded as changing the structure of the db which requires an open with a a version number greater than its existing version number which fires the onupgradeneeded function 
		    	var version = database.version + 1;	//make sure the version is higher when we reopen
		    	database.close();
		    	var request = indexedDB.open(window.location.hostname + 'DB', version);
				request.onsuccess = function(event) {
					successCallback(null);	//success callback is function() {} i.e. the empty function //UPDATE successCallback is function() {callback()} to accommodate the asynchronism of IndexedDB
				};
				request.onerror = function(event) {
					errorCallback('storage_not_initalized', 'db could not be opened');
				};
				request.onupgradeneeded = function(event) {	//this is the only function that can modify the db structure, it executes when a db is opened with a version number greater than its existing version number
					database = event.target.result;
			    	var objectStore = database.createObjectStore(type, { keyPath: "id", autoIncrement: true });	//names the Object Store to be created and specifies options in a parameter object 
																																					//specifying the object property to be used as a primary key for objects added to the store and that objects added will get an auto-incremented key value					
				};
	    	}
	    },
		
		
	    save : function(type, obj, successCallback, errorCallback) { 
	    	if (!database)
				errorCallback('storage_api_not_initialized', 'The storage engine has not been initialized');
			
			//clean up the id
	    	if (!obj.id)	//toObject will return id="" (= false) for new, unsaved tasks (the id field is hidden and will be empty), we delete that property, db auto-increment will create one
	    		delete obj.id ;
			else			//toObject returns a digit String for already saved tasks which we convert to a number here (already saved???, yes they have just been edited and are now ready for re-saving) 
	    		obj.id = parseInt(obj.id);
			
			//even a single operation process requires a transaction in IndexedDB, [type] is an array of strings of the names of all data stores involved in the transaction, if only 1 data store we can use a String rather than an array of String
	    	var tx = database.transaction([type], "readwrite");	
			
	    	tx.oncomplete = function(event){ //ASYNC
	    		successCallback(obj); //callback passed in by caller of save, it actually doesn't use obj as it refreshes the entire task table with all stored tasks
	    	};
	    	tx.onerror = function(event){
	    		errorCallback('transaction_error', 'It is not possible to store the object');
	    	};
			
			//the following would be VERY wrong because the previous statement is Asynchronous, i.e. the only way we know a transaction (and therefore all its operations) has completed is if its success callback fires
			//successCallback(obj);
			
	    	var objectStore = tx.objectStore(type);	//ASYNC NO WAIT indexdDB knows about data stores of objects such as a data store of task objects
	    	var request = objectStore.put(obj);		//ASYNC NO WAIT indexedDB knows about objects and how to store them in a specified data store, put  adds (new key) or updates (existing key), key was defined as id property when data store was created (see above)
			//presumably IndexedDB will ensure these put callbacks will always be called before the transaction callbacks
	    	request.onsuccess = function(event){
	    		//obj.id = event.target.result;		//not used here but can be useful especially for auto-incremented keys as it returns the key of the object just "put" 
	    	};													//this could be passed back to the calling code (in this case since the calling code completely refreshes the tasks table from all stored tasks it's not required
	    	request.onerror = function(event){
	    		errorCallback('object_not_stored', 'It is not possible to store the object');
	    	};
			//What is the relation between the transactions success/error callbacks and the operation (e.g. put) success/error callbacks?
			//The transaction callbacks cannot fire until the last operation callback has fired
			//btw this suggests how to create a multiple operation transaction: call the second operation in the success callback of the first etc. (not sure about this, could be wrong)
	    },
		
	    findAll : function(type, successCallback, errorCallback) { 
	    	if (!database) {
	    		errorCallback('storage_api_not_initialized', 'The storage engine has not been initialized');
	    	}
	    	var result = [];
	    	var tx = database.transaction(type);		//default param 2 value is just read (not read/write) which suits us fine here
	    	var objectStore = tx.objectStore(type);

	    	//see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#Using_a_cursor
	    	objectStore.openCursor().onsuccess = function(event) { //openCursor() without a parameter iterates over all objects in the object store, the onsuccess callback runs for each successful object retrieval
	    		var cursor = event.target.result;		//The IDBCursor interface of the IndexedDB API represents a cursor for traversing or iterating over multiple records in a database.
	    		if (cursor) {	//if cursor is null (false) reached end of the result set
	    			result.push(cursor.value);
	    			cursor.continue();			//this keeps the transaction alive repeatedly until no more objects are retrieved
	    		}
				else
	    			successCallback(result);	//done, successCallback passed in by calling code, no need to wait for transaction to complete, the find was successful and anyway its passive access
	    	};				
	    },
		
	    delete : function(type, id, successCallback, errorCallback) { 
	    	var obj = {};
	    	obj.id = id;
			
	    	var tx = database.transaction([type], "readwrite");
	    	tx.oncomplete = function(event) {
	    		successCallback(id);					//wait until transaction completes successfully, delete is an active query
	    	};
	    	tx.onerror = function(event) {
	    		console.log(event);
	    		errorCallback('transaction_error', 'It is not possible to store the object');
	    	};
			
	    	var objectStore = tx.objectStore(type);
			
	    	var request = objectStore.delete(id);		//delete just needs a key/id
	    	request.onsuccess = function(event) {				
	    	};
	    	request.onerror = function(event) {
	    		errorCallback('object_not_stored', 'It is not possible to delete the object');
	    	};
	    },
		
		//IndexedDB supports the concept of indexes, each (common) property of the objects in an object store can have a related index which makes access via a property other than the required key/if fast
		//we do not use it here
	    findByProperty : function(type, propertyName, propertyValue, successCallback, errorCallback) {
	    	if (!database) {
	    		errorCallback('storage_api_not_initialized', 'The storage engine has not been initialized');
	    	}
			
	    	var result = [];
	    	var tx = database.transaction(type);
	    	var objectStore = tx.objectStore(type);
	    	objectStore.openCursor().onsuccess = function(event) {
	    		var cursor = event.target.result;
	    		if (cursor) {
	    			if (cursor.value[propertyName] == propertyValue) {
	    				result.push(cursor.value);
	    			}
	    			cursor.continue();
	    		} 
				else {
	    			successCallback(result);						//no need to wait for transaction to complete, the find was successful and its passive
	    		}
	    	};
	    },
		
		findById : function (type, id, successCallback, errorCallback)	{
			if (!database) {
				errorCallback('storage_api_not_initialized', 'The storage engine has not been initialized');
			}
			
			var tx = database.transaction([type]);
			var objectStore = tx.objectStore(type);
			
			var request = objectStore.get(id);						//get just needs a key/id
				request.onsuccess = function(event) {
				successCallback(event.target.result);				//no need to wait for transaction to complete, the find was successful and its passive
			};
			
			request.onerror = function(event) {
				errorCallback('object_not_stored', 'It is not possible to locate the requested object');
			};				
		},

		saveAll : function (type, objArray, successCallback, errorCallback){

        if (!database)
            errorCallback('storage_api_not_initialised', 'The storage engine has not been initialised');

        var tx = database.transaction([type], "readwrite");
        tx.oncomplete = function(event){
            successCallback(objArray);
        };
        tx.onerror = function(event){
            errorCallback('transaction_error', 'It is not possible to store the objects');
        };

        var objectStore = tx.objectStore(type);
        $.each(objArray, function(i, obj){
            if(!obj.id)
                delete obj.id;
            else
                obj.id = parseInt(obj.id);
            var request = objectStore.put(obj);
            request.onsuccess = function(event){

            };
            request.onerror = function(event){
                errorCallback('object_not_stored', 'It is not possible to store the object');
            };
        });

    }


	}
}();

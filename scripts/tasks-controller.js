tasksController = function () {
    var $taskPage;
    var initialised = false;
    var taskCount;

    function errorLogger(errorCode, errorMessage) {
        console.log(errorCode + ':' + errorMessage)
    }

    function updateTaskCount(){
        //var count = storageEngine.find('task').length;
        //var count = $taskPage.find('#tblTasks tbody tr').length;
        storageEngine.findAll('task', function(tasks){
            taskCount = tasks.length + 1;
        }, errorLogger);
         $("footer").find("#tasksCounter").text(taskCount);
    }

    function clearTask(){
        $taskPage.find("form").fromObject({});
    }

    function bandTableRows(){
        $taskPage.find('#tblTasks tbody tr').removeClass('even');
        $taskPage.find('#tblTasks tbody tr:even').addClass('even');
        overdueAndWarningBands();
    }

    function overdueAndWarningBands(){
        $.each($taskPage.find('#tblTasks tbody tr'), function(index, row){
            var $row = $(row);
            var dueDate = Date.parse($row.find("[datetime]").text());
            if (dueDate.compareTo(Date.today()) < 0){
                $row.removeClass('even');
                $row.addClass('overdue');
            }
            else if(dueDate.compareTo((2).days().fromNow()) <= 0){
                $row.removeClass('even');
                $row.addClass('warning');
            }
        });
    }

    function loadFromCSV(event){
        var reader = new FileReader();
        reader.onload = function(evt){
            //console.log(evt.target.result);
            var contents = evt.target.result;
            var lines = contents.split('\n');
            var tasks = [];

            $.each(lines, function(i, val){
                if(i >= 1 && val){
                    var task = loadTask(val);
                    if(task)
                        tasks.push(task);
                }
            });

            storageEngine.saveAll('task', tasks, function(){
                tasksController.loadTasks();
            }, errorLogger);

        };
        reader.onerror = function(evt){
            errorLogger('cannot_read_file', 'Error reading the specified file');
        };

        reader.readAsText(event.target.files[0]);
    }

    function loadTask(csvTask){
        var tokens = $.csv.toArray(csvTask);
        if(tokens.length === 4){
            var task = {};
            task.task = tokens[0];
            task.requiredBy = tokens[1];
            task.category = tokens[2];
            task.complete = tokens[3];
            return task;
        }
        else
            return null;
    }

    return {
        init: function (page, callback) {
            if (initialised) {
                callback();
            }
            else {
                $taskPage = page;

                storageEngine.init(function () {
                    storageEngine.initObjectStore('task', function () {
                        callback();
                    }, errorLogger);
                }, errorLogger);


                $taskPage.find('[required="required"]').prev('label').append('<span>*</span>').children('span').addClass('required');

                $taskPage.find('#btnAddTask').click(function (evt) {
                    evt.preventDefault();
                    $('#taskCreation').removeClass('not');
                });

                $taskPage.find('tbody').on('click', 'td', 'time', function (evt) {
                    $(evt.target).closest('td').siblings().addBack().toggleClass('rowHighlight');
                });

                $taskPage.find('#tblTasks tbody').on('click', '.editRow', function (evt) {
                    $taskPage.find('#taskCreation').removeClass('not');
                    storageEngine.findById('task', $(evt.target).data().taskId, function (task) {
                        $taskPage.find('form').fromObject(task);
                    }, errorLogger);
                });

                $taskPage.find('#tblTasks tbody').on('click', '.completeRow', function(evt){
                    storageEngine.findById('task', $(evt.target).data().taskId, function(task){
                        task.complete = true;
                        storageEngine.save('task', task, function(){
                            tasksController.loadTasks();
                        }, errorLogger)
                    })
                });

                $taskPage.find('#tblTasks tbody').on('click', '.deleteRow', function (evt) {
                    evt.preventDefault();
                    storageEngine.delete('task', $(evt.target).data().taskId, function () {
                        $(evt.target).parents('tr').remove();
                        updateTaskCount();
                        bandTableRows();
                    }, errorLogger);
                });

                $taskPage.find('#saveTask').click(function (evt) {
                    evt.preventDefault();
                    if ($taskPage.find('form').valid()) {
                        var task = $taskPage.find('form').toObject();
                        task.complete = false;
                        storageEngine.save("task", task,
                            function () {
                                tasksController.loadTasks();
                                clearTask();
                                $taskPage.find('#taskCreation').addClass('not');
                        }, errorLogger);
                    }
                });

                $taskPage.find('#btnDeleteTasks').click(function (evt) {
                    evt.preventDefault();
                    var selectedRows = $('#tblTasks tr:has(.rowHighlight)');
                    var answer = confirm("delete " + selectedRows.length + " rows. Are you sure?");

                    if (answer) {

                        $.each(selectedRows, function (i, v) {
                                var id = $(v).find("[data-task-id]").data().taskId;

                                storageEngine.delete('task', id, function () {
                                    $(v).remove();
                                    updateTaskCount();
                                    bandTableRows();
                                }, errorLogger);
                            }
                        );

                        alert(selectedRows.length + " rows deleted.");

                    }
                    else {
                        alert("delete cancelled");
                    }

                });

                $taskPage.find('#clearTask').click(function (evt) {
                    evt.preventDefault();
                    clearTask();
                });

                $('#importFile').change(loadFromCSV);

                initialised = true;
            }

            $taskPage.find('form').validate({
                rules: {
                    task: {
                        required: true,
                        maxlength: 20
                    }
                }

            });
        },

        loadTasks: function () {
            $taskPage.find('#tblTasks tbody').empty();
            storageEngine.findAll('task', function (tasks) {
                tasks.sort(function(task1, task2){
                    var date1, date2;
                    date1 = Date.parse(task1.requiredBy);
                    date2 = Date.parse(task2.requiredBy);

                    return date1.compareTo(date2);
                });


                $.each(tasks, function (index, task) {
                    $('#taskRow').tmpl(task).appendTo($taskPage.find('#tblTasks tbody'));
                });


                updateTaskCount();
                bandTableRows();
            }, errorLogger);

        }
    }


}();
function getFunction() {
    //get data
    d3.json("http://localhost:8181/restconf/operational/fast-system:instance-store/")
        .header("Authorization","Basic " + btoa("admin:admin"))
        .get( function(error, data) {
            // if (error) throw error;
            var data = {"function-store":{"functions":[{"function-id":"req0","function":"Precedence"}]}};
            var row = data['function-store']['functions'];
            var $table = $('#table');
            $table.bootstrapTable('load',row);
            // percentage(row);
        });
}

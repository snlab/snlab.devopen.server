function getInstances() {
    //get data
    // d3.json("http://localhost:8181/restconf/operational/fast-system:instance-store/")
    //     .header("Authorization","Basic " + btoa("admin:admin"))
    //     .get( function(error, data) {
            // if (error) throw error;
            var data = {"instance-store":{"instance":[{"instance-id":"req0","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req2","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req1","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req8","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req7","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req9","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req4","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req3","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req6","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req5","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req16","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req17","class-type":"Demo","state":"Executed","submit-time":"2016/09/05 22:35:26"},{"instance-id":"req14","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req15","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req12","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req13","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req10","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req11","class-type":"Precedence","state":"Executed","submit-time":"2016/09/05 22:00:32"},{"instance-id":"req18","class-type":"Demo","state":"Executed","submit-time":"2016/09/06 17:07:08"}]}};
            var row = data['instance-store']['instance'];

            var $table = $('#table');
            $table.bootstrapTable('load',row);
            // percentage(row);
        // });
}

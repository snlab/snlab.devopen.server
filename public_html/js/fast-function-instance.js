function getInstances() {
  var endpoint = location.protocol + "//" + location.host + "/test";
  // get data
  d3.json(endpoint + '/fast/instance')
    .header("Authorization","Basic " + btoa("admin:admin"))
    .get( function(error, data) {
      if (error) throw error;
      var row = data.map(function(e) {
        return {
          instanceId: e.instanceId,
          invoke: e.instance.invoke,
          status: e.instance.status,
          submitTime: e.instance.submitTime,
          groupId: e.instance.groupId || ""
        };
      });

      var $table = $('#table');
      $table.bootstrapTable('load',row);
      percentage(row);
    });
}

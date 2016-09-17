var request = require('request');

module.exports = function(cfg) {
  this.credentials = {
    grant_type: "password",
    username: "admin",
    password: "admin",
    scope: "sdn"
  };
  this.token = "";

  this.authorize = function() {
    var _this = this;
    request.post(cfg.endpoint + "/oauth2/token",
                 { form: _this.credentials },
                 function(err, res, body) {
                   if (err) {
                     console.log(err);
                     return;
                   }
                   if (res.statusCode == 200 ||
                       res.statusCode == 201) {
                     // success
                     var data = JSON.parse(body);
                     console.log("Successful:", data);
                     // one trick here is that usually the "expires_in" field is in seconds, but ODL actually specifies this in milliseconds
                     _this.setToken(data.access_token,
                                   parseInt(data.expires_in));
                   } else {
                     console.log(body);
                   }
                 });

  };

  this.getToken = function() {
    return this.token;
  };

  this.setToken = function(token, ttl) {
    this.token = token;
    this.expiration = new Date().getTime() + ttl;
    // reapply 60 seconds before token expiring
    setTimeout(this.authorize, ttl * 1000 - 60000);
  };

  this.authorize();

  return this;
}

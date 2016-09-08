module.exports = function(cfg) {
  var cfg = cfg;
  this.info = function(req, res) {
    res.status(200).json({message: "Test!"});
  };

  this.fast = {
    getAllFunction: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    getFunction: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    deleteFunction: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    getAllInstance: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    getInstance: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    submitInstance: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    deleteInstance: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    getPrecedence: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    getAllAccessGraph: function(req, res) {
      res.status(200).json({message: "Test!"});
    },
    getAccessGraph: function(req, res) {
      res.status(200).json({message: "Test!"});
    }
  };

  this.maple = {
    // TODO: Maple Management API
  };

  return this;
};

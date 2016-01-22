var Util = require("../../helpers/Util");

var HealthCheckProtocols = require("../../constants/HealthCheckProtocols");
var HealthCheckPortTypes = require("../../constants/HealthCheckPortTypes");

const healthChecksRowScheme = require("../schemes/healthChecksRowScheme");

function hasOnlyEmptyValues(obj) {
  return obj == null || Util.isObject(obj) &&
    Object.values(obj)
    .every((element) => {
      return element == null ||
        element === false ||
        (Util.isArray(element) && element.length === 0) ||
        Util.isStringAndEmpty(element);
    });
}

const AppFormModelPostProcess = {
  acceptedResourceRoles: (app) => {
    var acceptedResourceRoles = app.acceptedResourceRoles;

    if (acceptedResourceRoles != null &&
        Util.isArray(acceptedResourceRoles) &&
        acceptedResourceRoles.length === 0) {
      app.acceptedResourceRoles = ["*"];
    }
  },
  container: (app) => {
    var container = app.container;

    if (container == null) {
      return;
    }

    let isEmpty = (Util.isArray(container.volumes) &&
        container.volumes.length === 0 ||
        container.volumes == null) &&
      hasOnlyEmptyValues(container.docker);

    if (isEmpty) {
      app.container = null;
    } else {
      // sending null unsets any pre-existing command in the API
      if (Util.isStringAndEmpty(app.cmd)) {
        app.cmd = null;
      }
    }
  },
  fetch: (app) => {
    // This is a quickfix for mesosphere/marathon#3054
    // Please remove this after there is a better solution
    if (Util.isArray(app.fetch) && Util.isArray(app.uris)) {
      if (app.fetch.length === 0) {
        delete app.fetch;
      } else if (app.uris.length === 0) {
        delete app.uris;
      }
    }
  },
  healthChecks: (app) => {
    var healthChecks = app.healthChecks;

    if (healthChecks == null || healthChecks.length !== 1) {
      return;
    }

    let hc = healthChecks[0];

    let isEmpty = hc.protocol === HealthCheckProtocols.HTTP &&
      hc.path == null || Util.isStringAndEmpty(healthChecks.path) &&
      ["portIndex",
      "port",
      "gracePeriodSeconds",
      "intervalSeconds",
      "timeoutSeconds",
      "maxConsecutiveFailures",
      "ignoreHttp1xx"]
        .every((key) => hc[key] === healthChecksRowScheme[key]);

    if (hc.portType === HealthCheckPortTypes.PORT_INDEX) {
      delete hc.port;
    } else if (hc.portType === HealthCheckPortTypes.PORT_NUMBER) {
      delete hc.portIndex;
    }
    delete hc.portType;

    if (isEmpty) {
      app.healthChecks = [];
    }
  }
};

module.exports = Object.freeze(AppFormModelPostProcess);

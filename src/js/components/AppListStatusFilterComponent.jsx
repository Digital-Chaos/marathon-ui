var React = require("react/addons");

var AppStatus = require("../constants/AppStatus");
var AppsStore = require("../stores/AppsStore");
var AppsEvents = require("../events/AppsEvents");

/* TODO extract from AppStatusComponent */
var statusNameMapping = {
  [AppStatus.RUNNING]: "Running",
  [AppStatus.DEPLOYING]: "Deploying",
  [AppStatus.SUSPENDED]: "Suspended",
  [AppStatus.DELAYED]: "Delayed",
  [AppStatus.WAITING]: "Waiting"
};

function getInitialAppStatusCount() {
  return Object.values(AppStatus).reduce(function (memo, status) {
    memo[status] = 0;
    return memo;
  }, {});
}

var AppListStatusFilterComponent = React.createClass({
  displayName: "AppListStatusFilterComponent",

  contextTypes: {
    router: React.PropTypes.func
  },

  propTypes: {
    groupId: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired
  },

  getDefaultProps: function () {
    return {
      groupId: "/"
    };
  },

  getInitialState: function () {
    return {
      appsStatusesCount: getInitialAppStatusCount(),
      selectedStatus: []
    };
  },

  componentWillMount: function () {
    AppsStore.on(AppsEvents.CHANGE, this.onAppsChange);
  },

  componentWillUnmount: function () {
    AppsStore.removeListener(AppsEvents.CHANGE,
      this.onAppsChange);
  },

  componentDidMount: function () {
    this.updateFilterStatus();
  },

  componentWillReceiveProps: function (nextProps) {
    this.updateFilterStatus();
    this.countStatuses(nextProps);
  },

  onAppsChange: function () {
    this.countStatuses(this.props);
  },

  countStatuses: function (props) {
    var appsStatusesCount = getInitialAppStatusCount();
    var groupId = props.groupId;

    AppsStore.apps.forEach(function (app) {
      if (groupId === "/" || app.id.startsWith(groupId)) {
        appsStatusesCount[app.status]++;
      }
    });

    this.setState({
      appsStatusesCount: appsStatusesCount
    });
  },

  setQueryParam: function (filterStatus) {
    var router = this.context.router;
    var queryParams = router.getCurrentQuery();

    if (filterStatus != null && filterStatus.length !== 0) {
      let encodedFilterStatus = filterStatus.map((key) => {
        return encodeURIComponent(`${key}`);
      });
      Object.assign(queryParams, {
        filterStatus: encodedFilterStatus
      });
    } else {
      delete queryParams.filterStatus;
    }

    router.transitionTo(router.getCurrentPathname(), {}, queryParams);
  },

  handleChange: function (statusKey, event) {
    var state = this.state;
    var selectedStatus = [];
    var status = statusKey.toString();

    if (event.target.checked === true) {
      selectedStatus = React.addons.update(state.selectedStatus, {
        $push: [status]
      });
    } else {
      let index = state.selectedStatus.indexOf(status);
      if (index !== -1) {
        selectedStatus = React.addons.update(state.selectedStatus, {
          $splice: [[index, 1]]
        });
      }
    }

    this.setQueryParam(selectedStatus);
  },

  updateFilterStatus: function () {
    var router = this.context.router;
    var state = this.state;
    var queryParams = router.getCurrentQuery();
    var selectedStatus = queryParams.filterStatus;
    var stringify = JSON.stringify;

    if (selectedStatus == null) {
      selectedStatus = [];
    } else {
      selectedStatus = decodeURIComponent(selectedStatus)
        .split(",")
        .filter((statusKey) => {
          let status = statusKey.toString();
          let existingStatus = Object.keys(statusNameMapping).indexOf(status);
          return existingStatus !== -1;
        });
    }

    if (stringify(selectedStatus) !== stringify(state.selectedStatus)) {
      this.setState({
        selectedStatus: selectedStatus
      }, this.props.onChange(selectedStatus));
    }
  },

  getStatusNodes: function () {
    var state = this.state;

    return Object.keys(statusNameMapping).map((key, i) => {
      let optionText = statusNameMapping[key];

      let checkboxProps = {
        type: "checkbox",
        id: `status-${key}-${i}`,
        checked: state.selectedStatus.indexOf(key) !== -1
      };

      return (
        <li className="checkbox" key={i}>
          <input {...checkboxProps}
            onChange={this.handleChange.bind(this, key)} />
          <label htmlFor={`status-${key}-${i}`}>
            {optionText} ({state.appsStatusesCount[key] || 0})
          </label>
        </li>
      );
    });
  },

  render: function () {
    return (
      <ul className="list-group checked-list-box filters">
        {this.getStatusNodes()}
      </ul>
    );
  }

});

module.exports = AppListStatusFilterComponent;

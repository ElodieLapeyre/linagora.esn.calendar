(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalCalendarsConfigurationMobileController', CalendarsConfigurationMobileController);

  function CalendarsConfigurationMobileController($state, calendarHomeService, calendarService, session, userAndExternalCalendars) {
    var self = this;

    self.$onInit = $onInit;
    self.goToSharedCalendarConfiguration = goToSharedCalendarConfiguration;

    ////////////

    function $onInit() {
      calendarHomeService.getUserCalendarHomeId()
        .then(function(calendarHomeId) {
          return calendarService.listPersonalAndAcceptedDelegationCalendars(calendarHomeId);
        })
        .then(function(calendars) {
          var sortedCalendars = userAndExternalCalendars(calendars);

          self.userCalendars = sortedCalendars.userCalendars;
          self.sharedCalendars = sortedCalendars.sharedCalendars.concat(sortedCalendars.publicCalendars);
        });
    }

    function goToSharedCalendarConfiguration(calendar) {
      var stateToGo = calendar.isShared(session.user._id) ? 'calendar.external.shared' : 'calendar.external.public';

      $state.go(stateToGo, { calendarUniqueId: calendar.uniqueId });
    }
  }
})();

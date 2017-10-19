(function() {
  'use strict';

  angular.module('esn.calendar.event-consultation')
         .directive('calEventConsultFormExternalUser', calEventConsultFormExternalUser);

  calEventConsultFormExternalUser.$inject = [
    '$http',
    'CalendarShell',
    'CAL_EVENTS',
    'CAL_ICAL'
  ];

  function calEventConsultFormExternalUser($http, CalendarShell, CAL_EVENTS, CAL_ICAL) {
    var directive = {
      restrict: 'E',
      template: '<div><cal-event-consult-form-body/></div>',
      link: link,
      replace: true,
      controller: 'eventController'
    };

    return directive;

    ////////////

    function link(scope) {
      scope.modifyEventParticipation = modifyEventParticipation;

      var eventJCal = JSON.parse(scope.eventJSON.replace(/&quot;/g, '"'));

      scope.event = CalendarShell.from(eventJCal);
      scope.event.attendees.forEach(function(attendee) {
        if (attendee.email === scope.attendeeEmail) {
          scope.invitedAttendee = attendee;
        }
      });

      var urls = {};

      urls[CAL_ICAL.partstat.accepted] = scope.yesLink;
      urls[CAL_ICAL.partstat.declined] = scope.noLink;
      urls[CAL_ICAL.partstat.tentative] = scope.maybeLink;

      function modifyEventParticipation(partstat) {
        scope.invitedAttendee.partstat = partstat;
        scope.$broadcast(CAL_EVENTS.EVENT_ATTENDEES_UPDATE);
        $http({ method: 'GET', url: urls[partstat] });
      }
    }
  }

})();

(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('CalAttendeesListController', CalAttendeesListController);

  function CalAttendeesListController($scope, CAL_EVENTS) {
    var self = this;

    self.attendeesPerPartstat = {};
    self.attendeeClickedCount = 0;
    self.isOrganizer = isOrganizer;
    self.selectAttendee = selectAttendee;
    self.deleteSelectedAttendees = deleteSelectedAttendees;
    self.$onInit = $onInit;

    function $onInit() {
      updateAttendeeStats();
      $scope.$on(CAL_EVENTS.EVENT_ATTENDEES_UPDATE, function() {
        updateAttendeeStats();
      });
    }

    function isOrganizer(attendee) {
      return attendee && attendee.email && self.organizer && self.organizer.email && self.organizer.email === attendee.email;
    }

    function deleteSelectedAttendees() {
      self.attendees = self.attendees.filter(function(attendee) { return !attendee.clicked; });
      self.attendeeClickedCount = 0;

      updateAttendeeStats();
    }

    function selectAttendee(attendee) {
      if (self.organizer.email !== attendee.email) {
        attendee.clicked = !attendee.clicked;
        self.attendeeClickedCount += attendee.clicked ? 1 : -1;
      }
    }

    function updateAttendeeStats() {
      var partstatMap = self.attendeesPerPartstat = {
        'NEEDS-ACTION': 0,
        ACCEPTED: 0,
        TENTATIVE: 0,
        DECLINED: 0,
        OTHER: 0
      };

      if (!self.attendees || !self.attendees.length) {
        return;
      }

      self.attendees.forEach(function(attendee) {
        partstatMap[attendee.partstat in partstatMap ? attendee.partstat : 'OTHER']++;
      });
    }
  }

})();

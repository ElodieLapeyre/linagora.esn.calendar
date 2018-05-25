(function(angular) {
  'use strict';

  angular.module('esn.calendar').factory('calFreebusyService', calFreebusyService);

  function calFreebusyService(
    $q,
    $rootScope,
    _,
    CalVfreebusyShell,
    calFreebusyAPI,
    calPathBuilder,
    calendarAPI,
    calendarService,
    calAttendeeService,
    calMoment,
    CAL_FREEBUSY,
    ICAL
  ) {

    return {
      listFreebusy: listFreebusy,
      isAttendeeAvailable: isAttendeeAvailable,
      areAttendeesAvailable: areAttendeesAvailable,
      setFreeBusyStatus: setFreeBusyStatus
    };

    function setFreeBusyStatus(attendee, start, end) {
      if (!attendee.id) {
        return calAttendeeService.getUserIdForAttendee(attendee)
          .then(function(id) {
            if (id) {
              attendee.id = id;

              return loadAndPatchAttendee(attendee, start, end);
            }
          });
      }

      return loadAndPatchAttendee(attendee, start, end);

      function loadAndPatchAttendee(attendee, start, end) {
        attendee.freeBusy = CAL_FREEBUSY.LOADING;

        return isAttendeeAvailable(attendee, start, end)
          .then(function(isAvailable) {
            attendee.freeBusy = isAvailable ? CAL_FREEBUSY.FREE : CAL_FREEBUSY.BUSY;
          })
          .catch(function() {
            attendee.freeBusy = CAL_FREEBUSY.UNKNOWN;
          });
      }
    }

    function listFreebusy(userId, start, end) {
      return calendarService.listFreeBusyCalendars(userId).then(function(cals) {
        var calPromises = cals.map(function(cal) {
          return calFreebusyAPI.report(calPathBuilder.forCalendarId(userId, cal.id), start, end);
        });

        return $q.all(calPromises)
          .then(function(freebusies) {
            return freebusies.map(function(freebusy) {
              var vcalendar = new ICAL.Component(freebusy);
              var vfreebusy = vcalendar.getFirstSubcomponent('vfreebusy');

              return new CalVfreebusyShell(vfreebusy);
            });
          });
      }).catch($q.reject);
    }

    /**
     * @name isAttendeeAvailable
     * @description For a given datetime period, determine if user is Free or Busy, for all is calendars
     * @param {string} attendeeId - Id of the attendee
     * @param {string} dateStart - Starting date of the requested period
     * @param {string} dateEnd - Ending date of the requested period
     * @return {boolean} true on free, false on busy
     */
    function isAttendeeAvailable(attendeeId, dateStart, dateEnd) {
      var start = calMoment(dateStart);
      var end = calMoment(dateEnd);

      return listFreebusy(attendeeId, start, end)
        .then(function(freeBusies) {
          return _.every(freeBusies, function(freeBusy) {
            return freeBusy.isAvailable(start, end);
          });
        })
        .catch($q.reject);
    }

    function areAttendeesAvailable() {
      // Will be implemented in #1257 and #1258

      return $q.when(false);
    }
  }
})(angular);

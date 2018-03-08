'use strict';

/* global chai: false, sinon: false, __FIXTURES__: false */

var expect = chai.expect;

describe('The calInboxInvitationMessageBlueBarController', function() {
  var $componentController, $rootScope, $q, calEventService, session, shells = {}, CalendarShell, ICAL, INVITATION_MESSAGE_HEADERS;

  function initCtrl(method, uid, sequence, recurrenceId, sender, attachments) {
    var headers = {};

    headers[INVITATION_MESSAGE_HEADERS.METHOD] = method;
    headers[INVITATION_MESSAGE_HEADERS.UID] = uid;
    headers[INVITATION_MESSAGE_HEADERS.SEQUENCE] = sequence;
    headers[INVITATION_MESSAGE_HEADERS.RECURRENCE_ID] = recurrenceId;

    return $componentController('calInboxInvitationMessageBlueBar', null, {
      message: {
        attachments: attachments || [],
        from: {
          email: sender
        },
        headers: headers
      }
    });
  }

  function qReject(err) {
    return function() {
      return $q.reject(err);
    };
  }

  function qResolve(value) {
    return function() {
      return $q.when(value);
    };
  }

  beforeEach(function() {
    module('esn.calendar');
    module(function($provide) {
      $provide.value('calendarHomeService', {
        getUserCalendarHomeId: function() {
          return $q.when('cal');
        }
      });
      $provide.value('calendarAPI', {
        listCalendars: function() {
          return $q.when([]);
        }
      });
      $provide.value('calEventService', {
        changeParticipation: sinon.spy(function() {
          return $q.when(new CalendarShell(shells.recurringEventWithTwoExceptions.vcalendar, { etag: 'updatedEtag' }));
        }),
        getEventByUID: function() {
          return $q.when(shells.event);
        }
      });
    });
  });

  beforeEach(inject(function(_$componentController_, _$q_, _$rootScope_, _CalendarShell_, _calEventService_, _session_,
                             _ICAL_, _INVITATION_MESSAGE_HEADERS_) {
    $componentController = _$componentController_;
    $q = _$q_;
    $rootScope = _$rootScope_;
    CalendarShell = _CalendarShell_;
    calEventService = _calEventService_;
    session = _session_;

    ICAL = _ICAL_;
    INVITATION_MESSAGE_HEADERS = _INVITATION_MESSAGE_HEADERS_;
  }));

  beforeEach(function() {
    ['event', 'recurringEventWithTwoExceptions'].forEach(function(file) {
      shells[file] = new CalendarShell(ICAL.Component.fromString(__FIXTURES__[('frontend/app/fixtures/calendar/' + file + '.ics')]), {
        etag: 'etag',
        path: 'path'
      });
    });
  });

  describe('The $onInit method', function() {

    it('should expose a "meeting" object, initialized from the message headers', function() {
      var ctrl = initCtrl('REPLY', '1234', '1');

      ctrl.$onInit();

      expect(ctrl.meeting).to.deep.equal({
        method: 'REPLY',
        uid: '1234',
        recurrenceId: undefined,
        sequence: '1'
      });
    });

    it('should expose a "meeting" object, defaulting for METHOD and SEQUENCE', function() {
      var ctrl = initCtrl(null, '1234', null);

      ctrl.$onInit();

      expect(ctrl.meeting).to.deep.equal({
        method: 'REQUEST',
        uid: '1234',
        recurrenceId: undefined,
        sequence: '0'
      });
    });

    it('should report an error if the event cannot be fetched from the calendar', function() {
      var ctrl = initCtrl('REQUEST', '1234', '0');

      calEventService.getEventByUID = qReject('WTF');
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.error).to.equal('WTF');
    });

    it('should report an invalid meeting (but no error) if the event is not found in the calendar', function() {
      var ctrl = initCtrl('REQUEST', '1234', '0');

      calEventService.getEventByUID = qReject({ status: 404 }); // err is supposed to be a HTTP response
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.invalid).to.equal(true);
      expect(ctrl.meeting.error).to.equal(undefined);
    });

    it('should fetch the event using the UID present in the message headers', function() {
      var ctrl = initCtrl('REQUEST', '1234', '0', '20170115T100000Z'); // This occurrence does not exist

      calEventService.getEventByUID = function(calendarHomeId, uid) {
        expect(calendarHomeId).to.equal('cal');
        expect(uid).to.equal('1234');

        return $q.reject({ status: 404 });
      };
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.invalid).to.equal(true);
    });

    it('should report an invalid meeting if the specified occurrence does not exist', function() {
      var ctrl = initCtrl('REQUEST', '1234', '0', '20170115T100000Z'); // This occurrence does not exist

      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.invalid).to.equal(true);
    });

    it('should report an invalid meeting if the current user is not involved in the event', function() {
      var ctrl = initCtrl('REQUEST', '1234', '0'); // This occurrence does not exist

      session.user.emails = {};
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.invalid).to.equal(true);
    });

    it('should report an invalid meeting if the sequence is outdated', function() {
      var ctrl = initCtrl('REQUEST', '1234', '0'); // Event sequence is 2

      session.user.emails = ['admin@linagora.com'];
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.invalid).to.equal(true);
    });

    it('should expose the event', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['admin@linagora.com'];
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.invalid).to.equal(undefined);
      expect(ctrl.event).to.deep.equal(shells.recurringEventWithTwoExceptions);
    });

    it('should expose a loaded=true when event loading process is successful', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['admin@linagora.com'];
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.loaded).to.equal(true);
    });

    it('should expose a loaded=true when event loading process fails', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      calEventService.getEventByUID = qReject('WTF');
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.meeting.loaded).to.equal(true);
    });

    it('should not expose the replyAttendee when the meeting is not a reply', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['admin@linagora.com'];
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.replyAttendee).to.equal(undefined);
    });

    it('should not expose the replyAttendee when the meeting is a reply but the attendee is not found', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2', null, 'another@open-paas.org');

      session.user.emails = ['admin@linagora.com'];
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.replyAttendee).to.equal(undefined);
    });

    it('should expose the replyAttendee when the meeting is a reply and the attendee is found', function() {
      var ctrl = initCtrl('REPLY', '1234', '2', null, 'ddolcimascolo@linagora.com');

      session.user.emails = ['admin@linagora.com'];
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.replyAttendee).to.shallowDeepEqual({
        email: 'ddolcimascolo@linagora.com',
        partstat: 'NEEDS-ACTION'
      });
    });

    it('should expose the replyAttendee when the meeting is a counter and the attendee is found', function() {
      var ctrl = initCtrl('COUNTER', '1234', '2', null, 'ddolcimascolo@linagora.com');

      session.user.emails = ['admin@linagora.com'];
      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      ctrl.$onInit();
      $rootScope.$digest();

      expect(ctrl.replyAttendee).to.shallowDeepEqual({
        email: 'ddolcimascolo@linagora.com',
        partstat: 'NEEDS-ACTION'
      });
    });

  });

  describe('The getParticipationButtonClass method', function() {

    it('should return btn-default if the user is NEEDS-ACTION', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['ddolcimascolo@linagora.com'];
      ctrl.event = shells.recurringEventWithTwoExceptions;
      ctrl.event.changeParticipation('NEED-ACTION');

      ['ACCEPTED', 'TENTATIVE', 'DECLINED'].forEach(function(partstat) {
        expect(ctrl.getParticipationButtonClass('btn-success', partstat)).to.equal('btn-default');
      });
    });

    it('should return btn-success for ACCEPTED if the user is ACCEPTED', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['ddolcimascolo@linagora.com'];
      ctrl.event = shells.recurringEventWithTwoExceptions;
      ctrl.event.changeParticipation('ACCEPTED');

      expect(ctrl.getParticipationButtonClass('btn-success', 'ACCEPTED')).to.equal('btn-success');
    });

    it('should return btn-danger for DECLINED if the user is DECLINED', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['ddolcimascolo@linagora.com'];
      ctrl.event = shells.recurringEventWithTwoExceptions;
      ctrl.event.changeParticipation('DECLINED');

      expect(ctrl.getParticipationButtonClass('btn-danger', 'DECLINED')).to.equal('btn-danger');
    });

    it('should return btn-primary for TENTATIVE if the user is TENTATIVE', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['ddolcimascolo@linagora.com'];
      ctrl.event = shells.recurringEventWithTwoExceptions;
      ctrl.event.changeParticipation('TENTATIVE');

      expect(ctrl.getParticipationButtonClass('btn-primary', 'TENTATIVE')).to.equal('btn-primary');
    });

  });

  describe('The changeParticipation method', function() {

    it('should call calEventService.changeParticipation with the correct options and partstat', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['ddolcimascolo@linagora.com'];
      ctrl.event = shells.recurringEventWithTwoExceptions;

      ctrl.changeParticipation('ACCEPTED');

      expect(calEventService.changeParticipation).to.have.been.calledWith('path', ctrl.event, ['ddolcimascolo@linagora.com'], 'ACCEPTED', 'etag');
    });

    it('should not call calEventService.changeParticipation if partstat is already correct', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      session.user.emails = ['ddolcimascolo@linagora.com'];
      ctrl.event = shells.recurringEventWithTwoExceptions;
      ctrl.event.changeParticipation('DECLINED', ['ddolcimascolo@linagora.com']);

      ctrl.changeParticipation('DECLINED');

      expect(calEventService.changeParticipation).to.have.not.been.calledWith();
    });

    it('should update the bound event with an updated event', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2');

      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      session.user.emails = ['ddolcimascolo@linagora.com'];

      ctrl.$onInit();
      $rootScope.$digest();

      ctrl.changeParticipation('ACCEPTED');
      $rootScope.$digest();

      expect(ctrl.event.etag).to.equal('updatedEtag');
      expect(ctrl.event.isInstance()).to.equal(false);
    });

    it('should update the bound event with an updated occurrence event when the blue bar handles an occurrence', function() {
      var ctrl = initCtrl('REQUEST', '1234', '2', '20170114T100000Z');

      calEventService.getEventByUID = qResolve(shells.recurringEventWithTwoExceptions);
      session.user.emails = ['ddolcimascolo@linagora.com'];

      ctrl.$onInit();
      $rootScope.$digest();

      ctrl.changeParticipation('ACCEPTED');
      $rootScope.$digest();

      expect(ctrl.event.etag).to.equal('updatedEtag');
      expect(ctrl.event.isInstance()).to.equal(true);
    });

    describe('When method is COUNTER', function() {
      it('should fetch the ICS from attachment and set it in context', function() {
        var url = 'http://localhost:1080/jmap/attachment/2';
        var attachments = [{
          type: 'foo',
          getSignedDownloadUrl: sinon.stub().returns($q.reject(new Error('Should not be called')))
        }, {
          type: 'application/ics',
          getSignedDownloadUrl: sinon.stub().returns($q.when(url))
        }, {
          type: 'application/ics',
          getSignedDownloadUrl: sinon.stub().returns($q.reject(new Error('Should not be called')))
        }];
        var ctrl = initCtrl('COUNTER', '1234', '2', null, null, attachments);

        calEventService.getEventByUID = sinon.stub().returns($q.when(shells.recurringEventWithTwoExceptions));
        calEventService.getEventFromICSUrl = sinon.stub().returns($q.when(shells.recurringEventWithTwoExceptions));
        session.user.emails = ['admin@linagora.com'];

        ctrl.$onInit();
        $rootScope.$digest();

        expect(ctrl.additionalEvent).to.be.defined;
        expect(attachments[0].getSignedDownloadUrl).to.not.have.been.called;
        expect(attachments[1].getSignedDownloadUrl).to.have.been.calledOnce;
        expect(attachments[2].getSignedDownloadUrl).to.not.have.been.called;
        expect(calEventService.getEventFromICSUrl).to.have.been.calledWith(url);
        expect(ctrl.meeting.error).to.not.be.defined;
      });
    });
  });
});

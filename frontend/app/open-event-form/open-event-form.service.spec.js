'use strict';

/* global chai: false */
/* global sinon: false */

var expect = chai.expect;

describe('The calOpenEventForm service', function() {
  var $modal, $q, $rootScope, $state, calEventUtils, calOpenEventForm, calendarService, calUIAuthorizationService, notificationFactory, CAL_DEFAULT_CALENDAR_ID, CAL_EVENTS;
  var calendar, calendarHomeId, instance, master, regularEvent, session;

  beforeEach(function() {
    calendarHomeId = '123';
    calendar = {id: 1, calendarHomeId: calendarHomeId};
    $modal = sinon.spy();
    $state = {
      go: sinon.spy()
    };
    calendarService = {
      calendarHomeId: calendarHomeId,
      getCalendar: sinon.spy(function() {
        return $q.when(calendar);
      })
    };
    regularEvent = {
      etag: 'etag',
      uid: '456',
      calendarHomeId: 'eventCalendarHomeId',
      calendarId: 'eventCalendarId',
      isInstance: sinon.stub().returns(false)
    };
    master = {};
    instance = {
      id: '456',
      isInstance: sinon.stub().returns(true),
      getModifiedMaster: sinon.spy(function() {
        return $q.when(master);
      }),
      isPublic: sinon.stub().returns(true)
    };

    angular.mock.module('linagora.esn.graceperiod', 'esn.calendar');
    angular.mock.module(function($provide) {
      $provide.value('$modal', $modal);
      $provide.value('$state', $state);
      $provide.value('calendarService', calendarService);
    });
  });

  beforeEach(angular.mock.inject(function(_$q_, _$rootScope_, _calEventUtils_, _calOpenEventForm_, _calUIAuthorizationService_, _notificationFactory_, _session_, _CAL_DEFAULT_CALENDAR_ID_, _CAL_EVENTS_) {
    $rootScope = _$rootScope_;
    $q = _$q_;
    calEventUtils = _calEventUtils_;
    calOpenEventForm = _calOpenEventForm_;
    calUIAuthorizationService = _calUIAuthorizationService_;
    notificationFactory = _notificationFactory_;
    session = _session_;
    CAL_DEFAULT_CALENDAR_ID = _CAL_DEFAULT_CALENDAR_ID_;
    CAL_EVENTS = _CAL_EVENTS_;
  }));

  describe('calOpenEventForm', function() {
    var canAccessEventDetail, canModifyEvent;

    beforeEach(function() {
      canAccessEventDetail = true;
      canModifyEvent = true;
      session.user._id = '_id';

      sinon.stub(calUIAuthorizationService, 'canAccessEventDetails', function() {
        return canAccessEventDetail;
      });
      sinon.stub(calUIAuthorizationService, 'canModifyEvent', function() {
        return canModifyEvent;
      });

    });

    it('should call calendarService with event calendar id', function(done) {
      calendarService.getCalendar = sinon.spy(function(_calendarHomeId, _calendarId) {
        expect(_calendarHomeId).to.equal(regularEvent.calendarHomeId);
        expect(_calendarId).to.equal(regularEvent.calendarId);
        done();
      });

      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();
    });

    it('should call calendarService with default calendar and user calendarHomeId if event is new', function(done) {
      regularEvent = {
      };

      calendarService.getCalendar = sinon.spy(function(_calendarHomeId, _calendarId) {
        expect(_calendarHomeId).to.equal(calendarHomeId);
        expect(_calendarId).to.equal(CAL_DEFAULT_CALENDAR_ID);
        done();
      });

      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();
    });

    it('should call $modal', function() {
      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();

      expect($modal).to.have.been.called;
      expect($state.go).to.not.have.been;
      expect($modal).to.have.been.calledWith(sinon.match({
        templateUrl: '/calendar/app/open-event-form/event-form-view.html',
        backdrop: 'static',
        placement: 'center'
      }));
    });

    it('should call $modal only once even if clicking several times', function() {
      calOpenEventForm(calendarHomeId, regularEvent);
      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();

      expect($modal).to.have.been.calledOnce;
    });

    it('should recall $modal if closed before', function() {
      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();

      expect($modal).to.have.been.calledWith(sinon.match({
        controller: sinon.match.func.and(sinon.match(function(controller) {
          var openForm = sinon.spy();
          var $hide = sinon.spy();
          var $scope = {
            $hide: $hide
          };

          controller($scope, instance, openForm);
          $scope.$hide();
          expect($hide).to.have.been.called;

          return true;
        }))
      }));

      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();

      expect($modal).to.have.been.calledTwice;
    });

    it('should hide modal when CAL_EVENTS.MODAL.hide is broadcasted', function(done) {
      var calendarUnselectListenerSpy = sinon.spy();

      $rootScope.$on(CAL_EVENTS.CALENDAR_UNSELECT, calendarUnselectListenerSpy);

      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();

      expect($modal).to.have.been.calledWith(sinon.match({
        controller: sinon.match.func.and(sinon.match(function(controller) {
          var openForm = sinon.spy();
          var $hide = sinon.spy();

          var $scope = {
            $hide: $hide
          };

          controller($scope, instance, openForm);

          $rootScope.$broadcast(CAL_EVENTS.MODAL + '.hide');

          expect($hide).to.have.been.called;
          expect($scope.calendarHomeId).to.equal(session.user._id);
          expect(calendarUnselectListenerSpy).to.have.been.called;

          done();

          return true;
        }))
      }));
    });

    it('should unregister the listener of CAL_EVENTS.MODAL.hide after hiding the modal', function(done) {
      var calendarUnselectListenerSpy = sinon.spy();

      $rootScope.$on(CAL_EVENTS.CALENDAR_UNSELECT, calendarUnselectListenerSpy);

      calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();

      expect($modal).to.have.been.calledWith(sinon.match({
        controller: sinon.match.func.and(sinon.match(function(controller) {
          var openForm = sinon.spy();
          var $hide = sinon.spy();

          var $scope = {
            $hide: $hide
          };

          controller($scope, instance, openForm);

          $rootScope.$broadcast(CAL_EVENTS.MODAL + '.hide');
          $rootScope.$broadcast(CAL_EVENTS.MODAL + '.hide');

          expect($hide).to.have.been.calledOnce;
          expect($scope.calendarHomeId).to.equal(session.user._id);
          expect(calendarUnselectListenerSpy).to.have.been.calledOnce;

          done();

          return true;
        }))
      }));
    });

    it('should prevent click action and display notification if event is private and current user is not the owner', function() {
      sinon.spy(notificationFactory, 'weakInfo');
      canAccessEventDetail = false;

      var openEventForm = calOpenEventForm(calendarHomeId, regularEvent);

      $rootScope.$digest();

      expect(regularEvent.isInstance).to.have.not.been.called;
      expect(notificationFactory.weakInfo).to.have.been.calledWith('Private event', 'Cannot access private event');
      expect(openEventForm).to.be.undefined;
    });

    describe('Recurrent event', function() {
      it('should call $modal with master and instance of recurrent event passed as arguments', function(done) {
        sinon.spy(calEventUtils, 'setEditedEvent');

        calOpenEventForm(calendarHomeId, instance);
        $rootScope.$digest();

        expect($modal).to.have.been.calledWith(sinon.match({
          templateUrl: '/calendar/app/open-event-form/event-form-view.html',
          controller: sinon.match.func.and(sinon.match(function(controller) {
            var $scope = {
              event: null
            };

            controller($scope, instance, master);
            $rootScope.$digest();

            expect($scope.eventInstanceRecurrent).to.equal(instance);
            expect(calEventUtils.setEditedEvent).to.have.been.calledWith(master);

            done();
            return true;
          }))
        }));
      });
    });
  });
});

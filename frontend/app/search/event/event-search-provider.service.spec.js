'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The calSearchEventProviderService service', function() {

  var $rootScope, calSearchEventProviderService, $httpBackend, calendarService, searchProvidersMock;
  var calendarHomeId = 'calendarHomeId';

  beforeEach(function() {
    searchProvidersMock = {
      add: sinon.spy(),
      remove: sinon.spy()
    };

    angular.mock.module('esn.calendar', function($provide) {
      $provide.value('calendarHomeService', {
        getUserCalendarHomeId: function() {
          return $q.when(calendarHomeId);
        }
      });

      $provide.value('searchProviders', searchProvidersMock);
      $provide.value('Cache', function() {});
    });
  });

  beforeEach(angular.mock.inject(function(_$rootScope_, _$httpBackend_, _calSearchEventProviderService_, _calendarService_) {
    $rootScope = _$rootScope_;
    calSearchEventProviderService = _calSearchEventProviderService_;
    $httpBackend = _$httpBackend_;
    calendarService = _calendarService_;
  }));

  describe('The setUpSearchProvider', function() {
    it('should register a search provider for calendar module', function(done) {
      calSearchEventProviderService.setUpSearchProvider()
        .then(function(provider) {
          expect(searchProvidersMock.add).to.have.been.calledWith(provider);
          done();
        });
      $rootScope.$digest();
    });

    it('should build a provider which search for events from each calendar, return aggregated results having date prop', function(done) {
      var calendarIds = ['calendar1', 'calendar2'];
      var davCalendars = calendarIds.map(function(calendarId) {
        return {
          _links: {
            self: { href: '/calendars/' + calendarHomeId + '/' + calendarId + '.json'}
          }
        };
      });

      $httpBackend.expectGET('/dav/api/calendars/' + calendarHomeId + '.json?personal=true&sharedDelegationStatus=accepted&sharedPublicSubscription=true&withRights=true').respond(200, {
        _embedded: {
          'dav:calendar': davCalendars
        }
      });

      calSearchEventProviderService.setUpSearchProvider()
        .then(assertThatRegisteredProviderTriggersDAVRequests);

      $rootScope.$digest();
      $httpBackend.flush();

      function assertThatRegisteredProviderTriggersDAVRequests(provider) {
        function davReferences(calendarId) {
          return {
            self: { href: '/prepath/path/to/' + calendarId + '/myuid.ics' }
          };
        }
        function fakeDAVResults(calendarId) {
          return [{
            _links: davReferences(calendarId),
            etag: '"123123"',
            data: 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR'
          }];
        }

        calendarIds.forEach(function(calendarId) {
          $httpBackend.expectGET('/calendar/api/calendars/' + calendarHomeId + '/' + calendarId + '/events.json?limit=200&offset=0&query=abcd').respond(200, {
            _links: davReferences(calendarId),
            _embedded: {
              'dav:item': fakeDAVResults(calendarId)
            }
          });
        });

        function assertOnAggregatedResults(events) {
          expect(events.length).to.equal(calendarIds.length);
          events.forEach(function(event) {
            expect(event).to.have.ownProperty('date');
          });
        }

        provider.fetch('abcd')()
          .then(assertOnAggregatedResults)
          .then(done);
      }
    });

    it('should prevent error when sabre is down', function(done) {
      calendarService.listPersonalAndAcceptedDelegationCalendars = function() { return $q.reject(); };

      calSearchEventProviderService.setUpSearchProvider()
        .then(function(provider) {
          provider.fetch('abcd')()
            .catch(done);
        });
      $rootScope.$digest();
    });
  });
});

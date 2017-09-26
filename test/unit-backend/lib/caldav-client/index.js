'use strict';

const expect = require('chai').expect,
      sinon = require('sinon'),
      mockery = require('mockery'),
      moment = require('moment');

const DEFAULT_CALENDAR_URI = 'events';

describe('Caldav-client helper', function() {
  let authMock, davServerMock, request, davEndpoint, userId, calendarId, eventId, token, jcal;

  beforeEach(function() {
    davEndpoint = 'http://davendpoint:8003';
    userId = 'user1';
    calendarId = 'calendar2';
    eventId = 'event3';
    token = 'aToken';
    jcal = {};
  });

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    authMock = {
      token: {
        getNewToken: sinon.spy(function(opts, callback) {
          return callback(null, { token: token });
        })
      }
    };

    davServerMock = {
      utils: {
        getDavEndpoint: sinon.spy(function(callback) {
          return callback(davEndpoint);
        })
      }
    };

    this.moduleHelpers.addDep('auth', authMock);
    this.moduleHelpers.addDep('davserver', davServerMock);
    this.requireModule = function() {
      return require(this.calendarModulePath + '/backend/lib/caldav-client')(this.moduleHelpers.dependencies);
    };
  });

  describe('the getEvent function', function() {
    beforeEach(function() {
      request = {
        method: 'GET',
        url: [davEndpoint, 'calendars', userId, calendarId, eventId + '.ics'].join('/'),
        headers: { ESNToken: token }
      };
    });

    it('should fail if token retrieval fails', function(done) {
      authMock.token.getNewToken = sinon.spy(function(opts, callback) {
        return callback(new Error());
      });

      this.requireModule()
        .getEvent(userId, 'calendarId', 'eventUid')
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should call request with the built parameters and reject if it fails', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(new Error());
      };

      mockery.registerMock('request', requestMock);

      this.requireModule()
        .getEvent(userId, calendarId, eventId)
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should return a long eventPath if all arguments are passed', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, { body: 'result', headers: { etag: 'etag' } });
      };

      mockery.registerMock('request', requestMock);

      this.requireModule()
        .getEvent(userId, calendarId, eventId)
        .then(
          function(event) {
            expect(event).to.deep.equal({ ical: 'result', etag: 'etag' });
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });

    it('should return only userId if calendarURI is not passed', function(done) {
      const requestMock = function(opts, callback) {
        request.url = [davEndpoint, 'calendars', userId].join('/');

        expect(opts).to.deep.equal(request);

        callback(null, { body: 'result', headers: { etag: 'etag' } });
      };

      mockery.registerMock('request', requestMock);

      this.requireModule()
        .getEvent(userId, null, eventId)
        .then(
          function(event) {
            expect(event).to.deep.equal({ ical: 'result', etag: 'etag' });
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });

    it('should return only userId if eventUID is not passed', function(done) {
      const requestMock = function(opts, callback) {
        request.url = [davEndpoint, 'calendars', userId].join('/');

        expect(opts).to.deep.equal(request);

        callback(null, { body: 'result', headers: { etag: 'etag' }});
      };

      mockery.registerMock('request', requestMock);

      this.requireModule()
        .getEvent(userId, calendarId)
        .then(
          function(event) {
            expect(event).to.deep.equal({ ical: 'result', etag: 'etag' });
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });

  });

  describe('the iTipRequest function', function() {
    beforeEach(function() {
        request = {
          method: 'ITIP',
          url: [davEndpoint, 'calendars', userId].join('/'),
          headers: {
            ESNToken: token
          },
          json: true,
          body: jcal
        };
      }
    );

    it('should fail if token retrieval fails', function(done) {
      authMock.token.getNewToken = sinon.spy(function(opts, callback) {
        return callback(new Error());
      });

      this.requireModule()
        .iTipRequest(userId, calendarId, eventId, jcal)
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should call request with the built parameters and reject if it fails', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(new Error());
      };

      mockery.registerMock('request', requestMock);

      this.requireModule()
        .iTipRequest(userId, jcal)
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should call request with the built parameters and resolve with its results if it succeeds', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, { body: 'result' });
      };

      mockery.registerMock('request', requestMock);

      this.requireModule()
        .iTipRequest(userId, jcal)
        .then(
          function(event) {
            expect(event).to.deep.equal('result');
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });
  });

  describe('The getCalendarList function', function() {
    beforeEach(function() {
      request = {
        method: 'GET',
        url: [davEndpoint, 'calendars', userId].join('/'),
        headers: {
          Accept: 'application/json',
          ESNToken: token
        },
        json: true
      };
    });

    it('should fail if token retrieval fails', function(done) {
      authMock.token.getNewToken = sinon.spy(function(opts, callback) {
        return callback(new Error());
      });

      this.requireModule().getCalendarList(userId).then(() => done('Test should have failed'), () => done());
    });

    it('should call request with the built parameters and reject if it fails', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(new Error());
      };

      mockery.registerMock('request', requestMock);

      this.requireModule().getCalendarList(userId).then(() => done('Test should have failed'), () => done());
    });

    it('should call request with the built parameters and reject if response is an error', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, {
          statusCode: 500
        });
      };

      mockery.registerMock('request', requestMock);

      this.requireModule().getCalendarList(userId).then(() => done('Test should have failed'), () => done());
    });

    it('should call request with the built parameters and resolve with an empty list if response is not a calendar list', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, {
          statusCode: 200,
          body: {}
        });
      };

      mockery.registerMock('request', requestMock);

      this.requireModule().getCalendarList(userId).then(list => {
        expect(list).to.deep.equal([]);

        done();
      });
    });

    it('should call request with the built parameters and resolve with a calendar list', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, {
          statusCode: 200,
          body: {
            _links: {
              self: {
                href: '/dav/calendars/584abaa9e2d7d7686cff340f.json'
              }
            },
            _embedded: {
              'dav:calendar': [
                {
                  _links: {
                    self: {
                      href: '/dav/calendars/584abaa9e2d7d7686cff340f/events.json'
                    }
                  }
                },
                {
                  _links: {
                    self: {
                      href: '/dav/calendars/584abaa9e2d7d7686cff340f/df68daee-a30d-4191-80de-9c1d689062e1.json'
                    }
                  },
                  'dav:name': 'Personal',
                  'caldav:description': 'Description of Personal',
                  'apple:color': '#aa37bb'
                }
              ]
            }
          }
        });
      };

      mockery.registerMock('request', requestMock);

      this.requireModule().getCalendarList(userId).then(list => {
        expect(list).to.deep.equal([
          {
            id: 'events',
            uri: '/dav/calendars/584abaa9e2d7d7686cff340f/events',
            name: 'Events',
            description: undefined,
            color: undefined
          },
          {
            id: 'df68daee-a30d-4191-80de-9c1d689062e1',
            uri: '/dav/calendars/584abaa9e2d7d7686cff340f/df68daee-a30d-4191-80de-9c1d689062e1',
            name: 'Personal',
            description: 'Description of Personal',
            color: '#aa37bb'
          }
        ]);

        done();
      });
    });

  });

  describe('the getEventInDefaultCalendar function', function() {

    it('should GET an event in the default calendar', function(done) {
      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'GET',
          url: [davEndpoint, 'calendars', userId, DEFAULT_CALENDAR_URI, eventId + '.ics'].join('/'),
          headers: {
            ESNToken: token
          }
        });

        done();
      });

      this.requireModule().getEventInDefaultCalendar({ id: userId }, eventId);
    });

  });

  describe('the storeEvent function', function() {

    it('should PUT the event', function(done) {
      const event = [['vcalendar', [], []]];

      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'PUT',
          url: [davEndpoint, 'calendars', userId, calendarId, eventId + '.ics'].join('/'),
          json: true,
          headers: {
            ESNToken: token
          },
          body: event
        });

        done();
      });

      this.requireModule().storeEvent({ id: userId }, calendarId, eventId, event);
    });

  });

  describe('the storeEventInDefaultCalendar function', function() {

    it('should PUT the event in the default calendar', function(done) {
      const event = ['vcalendar', [], []];

      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'PUT',
          url: [davEndpoint, 'calendars', userId, DEFAULT_CALENDAR_URI, eventId + '.ics'].join('/'),
          json: true,
          headers: {
            ESNToken: token
          },
          body: event
        });

        done();
      });

      this.requireModule().storeEventInDefaultCalendar({ id: userId }, eventId, event);
    });

  });

  describe('the deleteEvent function', function() {

    it('should DELETE the event', function(done) {
      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'DELETE',
          url: [davEndpoint, 'calendars', userId, calendarId, eventId + '.ics'].join('/'),
          headers: {
            ESNToken: token
          }
        });

        done();
      });

      this.requireModule().deleteEvent({ id: userId }, calendarId, eventId);
    });

  });

  describe('the deleteEventInDefaultCalendar function', function() {

    it('should DELETE the event in the default calendar', function(done) {
      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'DELETE',
          url: [davEndpoint, 'calendars', userId, DEFAULT_CALENDAR_URI, eventId + '.ics'].join('/'),
          headers: {
            ESNToken: token
          }
        });

        done();
      });

      this.requireModule().deleteEventInDefaultCalendar({ id: userId }, eventId);
    });

  });

  describe('the createEventInDefaultCalendar function', function() {

    it('should create a 1h event in the default calendar', function(done) {
      const summary = 'Summary',
            location = 'Location',
            start = moment('2017-01-01T12:00:00Z'),
            event = [
              'vcalendar',
              [],
              [
                [
                  'vevent',
                  [
                    ['uid', {}, 'text', 'UUIDv4'],
                    ['summary', {}, 'text', summary],
                    ['location', {}, 'text', location],
                    ['dtstart', {}, 'date-time', '2017-01-01T12:00:00Z'],
                    ['dtend', {}, 'date-time', '2017-01-01T13:00:00Z'] // 1h event
                  ],
                  []
                ]
              ]
            ];

      mockery.registerMock('uuid/v4', () => 'UUIDv4');
      mockery.registerMock('request', opts => {
        expect(opts).to.shallowDeepEqual({
          method: 'PUT',
          url: [davEndpoint, 'calendars', userId, DEFAULT_CALENDAR_URI, 'UUIDv4.ics'].join('/'),
          json: true,
          headers: {
            ESNToken: token
          }
        });
        expect(opts.body.jCal).to.deep.equal(event);

        done();
      });

      this.requireModule().createEventInDefaultCalendar({ id: userId }, { summary, location, start });
    });

  });

});

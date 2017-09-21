'use strict';

const request = require('request');
const urljoin = require('url-join');
const async = require('async');
const Q = require('q');
const _ = require('lodash');
const path = require('path');
const uuidV4 = require('uuid/v4');
const ICAL = require('ical.js');

const JSON_CONTENT_TYPE = 'application/json';
const DEFAULT_CALENDAR_NAME = 'Events';
const DEFAULT_CALENDAR_URI = 'events';

module.exports = dependencies => {
  const davserver = dependencies('davserver').utils;
  const token = dependencies('auth').token;

  return {
    getCalendarList,
    getEvent,
    getEventInDefaultCalendar,
    getEventPath,
    storeEvent,
    storeEventInDefaultCalendar,
    deleteEvent,
    deleteEventInDefaultCalendar,
    iTipRequest,
    createEventInDefaultCalendar
  };

  function createEventInDefaultCalendar(user, options) {
    const eventUid = uuidV4(),
      event = _buildJCalEvent(eventUid, options);

    return storeEventInDefaultCalendar(user, eventUid, event);
  }

  function storeEventInDefaultCalendar(user, eventUid, event) {
    return storeEvent(user, DEFAULT_CALENDAR_URI, eventUid, event);
  }

  function storeEvent(user, calendarUri, eventUid, event) {
    return _requestCaldav(user.id, calendarUri, eventUid, (url, token) => ({
      method: 'PUT',
      url,
      json: true,
      headers: {
        ESNToken: token
      },
      body: event
    }));
  }

  function deleteEventInDefaultCalendar(user, eventUid) {
    return deleteEvent(user, DEFAULT_CALENDAR_URI, eventUid);
  }

  function deleteEvent(user, calendarUri, eventUid) {
    return _requestCaldav(user.id, calendarUri, eventUid, (url, token) => ({
      method: 'DELETE',
      url,
      headers: {
        ESNToken: token
      }
    }));
  }

  function getCalendarList(userId) {
    return _requestCaldav(userId, null, null, (url, token) => ({
      method: 'GET',
      url: url,
      json: true,
      headers: {
        ESNToken: token,
        Accept: JSON_CONTENT_TYPE
      }
    })).then(res => {
      if (res && res._embedded && res._embedded['dav:calendar']) {
        return _.map(res._embedded['dav:calendar'], calendar => {
          const uri = calendar._links.self.href.replace('.json', ''); // No JSON for *DAV URI

          return {
            id: path.basename(uri),
            uri: uri,
            name: calendar['dav:name'] || DEFAULT_CALENDAR_NAME,
            description: calendar['caldav:description'],
            color: calendar['apple:color']
          };
        });
      }

      return [];
    });
  }

  function getEventInDefaultCalendar(user, eventUID) {
    return getEvent(user.id, DEFAULT_CALENDAR_URI, eventUID);
  }

  function getEvent(userId, calendarURI, eventUID) {
    return _requestCaldav(userId, calendarURI, eventUID, (url, token) => ({
        method: 'GET',
        url: url,
        headers: {
          ESNToken: token
        }
      })
    );
  }

  function getEventPath(userId, calendarURI, eventUID) {
    return calendarURI && eventUID ? urljoin(userId, calendarURI, eventUID + '.ics') : userId;
  }

  function iTipRequest(userId, jcal) {
    return _requestCaldav(userId, null, null, (url, token) => ({
      method: 'ITIP',
      url: url,
      headers: {
        ESNToken: token
      },
      body: jcal,
      json: true
    }));
  }

  function _requestCaldav(userId, calendarURI, eventUID, formatRequest) {
    const deferred = Q.defer();

    async.parallel([
        function(cb) {
          _buildEventUrl(userId, calendarURI, eventUID, url => cb(null, url));
        },
        function(cb) {
          token.getNewToken({user: userId}, cb);
        }
      ],
      (err, results) => {
        if (err) {
          return deferred.reject(err);
        }

        request(formatRequest(results[0], results[1].token), (err, response) => {
          if (err || response.statusCode < 200 || response.statusCode >= 300) {
            return deferred.reject(err ? err.message : response.body);
          }

          return deferred.resolve(response.body);
        });
      });

    return deferred.promise;
  }

  function _buildEventUrl(userId, calendarURI, eventUID, callback) {
    davserver.getDavEndpoint(function(davserver) {
      return callback(urljoin(davserver, 'calendars', getEventPath(userId, calendarURI, eventUID)));
    });
  }

  function _buildJCalEvent(uid, options) {
    const vCalendar = new ICAL.Component(['vcalendar', [], []]),
      vEvent = new ICAL.Component('vevent'),
      event = new ICAL.Event(vEvent);

    event.uid = uid;
    event.summary = options.summary;
    event.location = options.location;
    event.startDate = ICAL.Time.fromJSDate(options.start.toDate(), true);
    event.endDate = ICAL.Time.fromJSDate(options.start.add(1, 'hour').toDate(), true);

    vCalendar.addSubcomponent(vEvent);

    return vCalendar;
  }
};

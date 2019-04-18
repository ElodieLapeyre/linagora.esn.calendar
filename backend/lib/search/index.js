'use strict';

var SEARCH = require('../constants').SEARCH;

module.exports = dependencies => {
  const logger = dependencies('logger');
  const elasticsearch = dependencies('elasticsearch');
  const listener = require('./searchHandler')(dependencies);
  const pubsub = require('./pubsub')(dependencies);
  let searchHandler;

  return {
    indexEvent,
    listen,
    removeEventFromIndex,
    searchEvents,
    searchNextEvent
  };

  function indexEvent(event, callback) {
    if (!searchHandler) {
      return callback(new Error('Event search is not initialized'));
    }

    if (!event) {
      return callback(new Error('Event is required'));
    }

    searchHandler.indexData(event, callback);
  }

  function removeEventFromIndex(event, callback) {
    if (!searchHandler) {
      return callback(new Error('Event search is not initialized'));
    }

    if (!event) {
      return callback(new Error('Event is required'));
    }

    searchHandler.removeFromIndex(event, callback);
  }

  function searchNextEvent(user, callback) {
    return _searchEvents({
      range: {
        start: {
          gt: 'now'
        }
      }
    }, {
      limit: 1,
      sortKey: 'start',
      sortOrder: 'asc',
      userId: user.id
    }, callback);
  }

  function searchEvents(query, callback) {
    const terms = query.search;

    return _searchEvents({
      multi_match: {
        query: terms,
        type: 'cross_fields',
        fields: [
          'summary',
          'description',
          'organizer.cn',
          'organizer.email',
          'attendees.email',
          'attendees.cn'
        ],
        operator: 'and',
        tie_breaker: 0.5
      }
    }, query, callback);
  }

  function _searchEvents(esQuery, query, callback) {
    const offset = query.offset || 0;
    const limit = 'limit' in query ? query.limit : SEARCH.DEFAULT_LIMIT;
    const sortKey = query.sortKey || SEARCH.DEFAULT_SORT_KEY;
    const sortOrder = query.sortOrder || SEARCH.DEFAULT_SORT_ORDER;
    const filters = [];
    const sort = {};

    sort[sortKey] = {
      order: sortOrder
    };

    const elasticsearchQuery = {
      query: {
        bool: {
          must: esQuery
        }
      },
      sort: sort
    };

    if (query.calendarId) {
      filters.push({
        term: {
          calendarId: query.calendarId
        }
      });
    }

    if (query.userId) {
      filters.push({
        term: {
          userId: query.userId.toString()
        }
      });
    }

    if (filters.length) {
      elasticsearchQuery.query.bool.filter = filters;
    }

    logger.debug('Searching events with options', {
      userId: query.userId.toString(),
      calendarId: query.calendarId,
      esQuery,
      offset,
      limit,
      sort
    });

    elasticsearch.searchDocuments({
      index: SEARCH.INDEX_NAME,
      type: SEARCH.TYPE_NAME,
      from: offset,
      size: limit,
      body: elasticsearchQuery
    }, (err, result) => {
      if (err) {
        return callback(err);
      }

      callback(null, {
        total_count: result.hits.total,
        list: result.hits.hits
      });
    });
  }

  function listen() {
    logger.info('Subscribing to event updates for indexing');
    pubsub.listen();
    searchHandler = listener.register();

    logger.info('Register reindexing for calendar events');
    require('./reindex')(dependencies).register();
  }
};

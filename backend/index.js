'use strict';

const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;
const path = require('path');
const glob = require('glob-all');
const cors = require('cors');

const FRONTEND_JS_PATH = path.join(__dirname, '/../frontend/app/');
const APP_ENTRY_POINT = path.join(FRONTEND_JS_PATH, 'app.js');

const AwesomeCalendarModule = new AwesomeModule('linagora.esn.calendar', {
  dependencies: [
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.db', 'db'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.graceperiod', 'graceperiod'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.config', 'config'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.esn-config', 'esn-config'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.elasticsearch', 'elasticsearch'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.user', 'user'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.domain', 'domain'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.collaboration', 'collaboration'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.activitystreams', 'activitystreams'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.pubsub', 'pubsub'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.messaging', 'messaging'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.helpers', 'helpers'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.message', 'message'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.auth', 'auth'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.collaboration', 'collaborationMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.authorization', 'authorizationMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.module', 'moduleMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.token', 'tokenMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.domain', 'domainMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.email', 'email'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.wsserver', 'wsserver'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.i18n', 'i18n'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.davserver', 'davserver'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.cron', 'cron'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.jobqueue', 'jobqueue'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.amqp', 'amqpClientProvider'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.resource', 'resource'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.technical-user', 'technical-user'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.autoconf', 'autoconf', true),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.dav.import', 'dav.import')
  ],

  states: {
    lib: function(dependencies, callback) {
      const libModule = require('./lib')(dependencies);
      const api = require('./webserver/api')(dependencies, libModule);

      callback(null, {
        ...libModule,
        api
      });
    },

    deploy: function(dependencies, callback) {
      // Register the webapp
      const app = require('./webserver/application')(dependencies);

      app.all('/api/*', cors({origin: true, credentials: true}));
      app.use('/api', this.api);

      const webserverWrapper = dependencies('webserver-wrapper');

      const frontendFullPathModules = glob.sync([
        APP_ENTRY_POINT,
        FRONTEND_JS_PATH + '**/!(*spec).js'
      ]);

      const frontendUriModules = frontendFullPathModules.map(filepath => filepath.replace(FRONTEND_JS_PATH, ''));
      const fullCalendarPath = '../components/fullcalendar/dist';
      const fullCalendarJSFiles = ['fullcalendar.min.js', 'locale-all.js'].map(file => `${fullCalendarPath}/${file}`);
      const fullCalendarCSSFiles = ['fullcalendar.css'].map(file => `${fullCalendarPath}/${file}`);

      webserverWrapper.injectLess('calendar', [path.resolve(__dirname, '../frontend/app/styles.less')], 'esn');
      webserverWrapper.injectAngularAppModules('calendar', frontendUriModules, ['esn.calendar', 'esn.ical'], ['esn'], {localJsFiles: frontendFullPathModules});
      webserverWrapper.injectJS('calendar', fullCalendarJSFiles, 'esn');
      webserverWrapper.injectCSS('calendar', fullCalendarCSSFiles, 'esn');
      webserverWrapper.addApp('calendar', app);

      return callback();
    },

    start: function(dependencies, callback) {
      require('./ws').init(dependencies);

      dependencies('autoconf') && dependencies('autoconf').addTransformer(require('./lib/autoconf')(dependencies));
      this.start(callback);
    }
  }
});

/**
 * The main AwesomeModule describing the application.
 * @type {AwesomeModule}
 */
module.exports = AwesomeCalendarModule;

'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The calEventDateConsultationController', function() {
  var $controller, calMoment, CalendarShell;

  beforeEach(function() {
    angular.mock.module('esn.calendar');

    angular.mock.inject(function(_$controller_, _calMoment_, _CalendarShell_) {
      $controller = _$controller_;
      calMoment = _calMoment_;
      CalendarShell = _CalendarShell_;
    });
  });

  function initController(bindings) {
    return $controller('calEventDateConsultationController', null, bindings);
  }

  describe('when the event is on one day', function() {

    describe('when scope.event.allday', function() {

      it('should set start day to well formatted days of scope.event.start and no end day', function() {
        var bindings = {
          event: CalendarShell.fromIncompleteShell({
            start: calMoment('2016-12-06'),
            end: calMoment('2016-12-07'),
            location: 'aLocation'
          })
        };
        var ctrl = initController(bindings);

        expect(ctrl.start).to.equal(ctrl.event.start.format('MMM D'));
        expect(ctrl.startVerbose).to.equal(ctrl.event.start.format('MMM D'));
        expect(ctrl.end).to.be.undefined;
        expect(ctrl.endVerbose).to.be.undefined;
      });
    });

    describe('when scope.event is not an all day event', function() {

      it('should set start day to formatted value of scope.event.start and the end day to scope.event.end hours & minutes', function() {
        var bindings = {
          event: CalendarShell.fromIncompleteShell({
            start: calMoment('2016-12-06 00:00'),
            end: calMoment('2016-12-06 01:00'),
            location: 'aLocation'
          })
        };
        var ctrl = initController(bindings);

        expect(ctrl.start).to.equal(ctrl.event.start.format('MMM D HH:mm'));
        expect(ctrl.startVerbose).to.equal(ctrl.event.start.format('MMM D HH:mm'));
        expect(ctrl.end).to.equal(ctrl.event.end.format('HH:mm'));
        expect(ctrl.endVerbose).to.equal(ctrl.event.end.format('HH:mm'));
      });
    });
  });

  describe('when the event is on more than one day', function() {

    describe('when scope.event.allday', function() {

      it('should set scope.start and scope.end to well formatted days of scope.event start and end (no hours no minutes)', function() {
        var bindings = {
          event: CalendarShell.fromIncompleteShell({
            start: calMoment('2016-12-06'),
            end: calMoment('2016-12-08'),
            location: 'aLocation'
          })
        };
        var ctrl = initController(bindings);

        expect(ctrl.start).to.equal(ctrl.event.start.format('MMM D'));
        expect(ctrl.startVerbose).to.equal(ctrl.event.start.format('MMM D'));
        expect(ctrl.end).to.equal(ctrl.event.end.clone().subtract(1, 'day').format('MMM D'));
        expect(ctrl.endVerbose).to.equal(ctrl.event.end.clone().subtract(1, 'day').format('MMM D'));
      });
    });

    describe('when scope.event is not an all day event', function() {

      it('should set scope.start to formatted value of scope.event.start and scope.event to scope.event.edn hours & minutes', function() {
        var bindings = {
          event: CalendarShell.fromIncompleteShell({
            start: calMoment('2016-12-06 00:00'),
            end: calMoment('2016-12-07 01:00'),
            location: 'aLocation'
          })
        };
        var ctrl = initController(bindings);

        expect(ctrl.start).to.equal(ctrl.event.start.format('MMM D'));
        expect(ctrl.startVerbose).to.equal(ctrl.event.start.format('MMM D'));
        expect(ctrl.end).to.equal(ctrl.event.end.format('MMM D'));
        expect(ctrl.endVerbose).to.equal(ctrl.event.end.format('MMM D'));
      });
    });
  });
});

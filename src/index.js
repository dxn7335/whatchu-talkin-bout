import { run } from '@cycle/rxjs-run';
import { Observable, Scheduler } from 'rxjs';
import { h, div, makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';

const main = ({ DOM, HTTP }) => {

  const vdom$ = DOM.select( '#render' )
    .events( 'click' )
    .startWith( false );

  const req$ = Observable.interval(1000)
    .map(
      () => {
        return {
          url: 'https://twitter.com/search?q=%40twitterapi',
          category: 'users',
          method: 'GET'
        };
      }
    );

  HTTP.select('users')
    .subscribe( e => console.log( e ) );

  const sinks = {
    DOM: vdom$,
    HTTP: req$,
  }

  return sinks;
};

const drivers = () => ({
  DOM: makeDOMDriver('#app_container'),
  HTTP: makeHTTPDriver(),
});

window.onload = () => run(main, drivers());

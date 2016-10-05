import { run } from '@cycle/rxjs-run';
import { Observable, Scheduler } from 'rxjs';
import { h, div, makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';

const main = ({ DOM, HTTP }) => {
  const search$ = DOM.select( '#username' )
    .events( 'keyup' )
    .filter( ({ target }) => target.value && target.value.length >= 3 )
    .map( ({ target }) => target.value );

  // Make request based on input field
  const searchReq$ = search$
    .map( searchTerm => {
      return {
        url: `https://api.github.com/search/users?q=${searchTerm}`,
        category: 'users',
        method: 'GET'
      };
    });

  // Parse responses for users
  const searchResponse$ = HTTP.select('users')
    .mergeAll()
    .map( req => {
      return req.body
    })
    .startWith(null);

  // Get commits by a user
  const commitReq$ = searchResponse$
    .map( resp => resp && resp.items[0].login )
    .map( username => {
      console.log(username);
      return {
        url: `https://api.github.com/users/${username}/events/public`,
        category: 'commits',
        method: 'GET'
      };
    });

  // Parse responses for users
  const commitResponse$ = HTTP.select('commits')
    .mergeAll()
    .map( ({ body }) => body.filter( evt => evt.type === 'PushEvent' ) )
    .map( events => events.map( ({ payload }) => payload.commits ) )
    .startWith(null)
    .subscribe( e => console.log(e) );

  // Assemble dom from response stream
  const vdom$ = searchResponse$
    .map( info => {
      return div( '.input-prompt',
        [
          h('h2', 'WHAT YOU COMMITIN, '),
          h('input#username'),
        ]
      );
    });

  const sinks = {
    DOM: vdom$,
    HTTP: Observable.merge( searchReq$, commitReq$ ),
  }

  return sinks;
};

const drivers = () => ({
  DOM: makeDOMDriver('#app_container'),
  HTTP: makeHTTPDriver(),
});

window.onload = () => run(main, drivers());

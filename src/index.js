import R, { flatten, take } from 'ramda';
import { run } from '@cycle/rxjs-run';
import { Observable, Scheduler } from 'rxjs';
import { h, div, makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';

const renderHeader = username =>
  h( 'header.question-header', [
    h('span.question-header__wrapper', [
      'What you commitin,',
      h('br'),
      h('div.question-header__input', [
        h('input#username.user-input'),
        h('input.auto-complete', { props: { value: username } } ),
      ]),
      '?',
    ])
  ]);

const renderCommits = commits =>
  h('section.question-results', [
      h('ul', take( 5, commits ).map( c => h( 'li', [c] ) ) )
    ]);

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
    .map( resp => resp && resp.items[0] && resp.items[0].login )
    .startWith(null);

  // Get commits by a user
  const commitReq$ = searchResponse$
    .map( username => {
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
    .map( events => flatten( events.map( ({ payload }) => payload.commits ) ) )
    .map( events => events.map( ({ message }) => message ) )
    .startWith([]);

  // Assemble dom from response stream
  const vdom$ = Observable.combineLatest( searchResponse$, commitResponse$ )
    .map( ([ username, commits ]) => {
      return div([
        renderHeader( username ),
        renderCommits( commits ),
      ]);
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

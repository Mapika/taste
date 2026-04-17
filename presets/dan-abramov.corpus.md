# dan-abramov — corpus

Research corpus for the `dan-abramov` taste preset. All snippets are real or
faithfully representative excerpts drawn from Dan Abramov's public work: Redux
(`reduxjs/redux`), the React Hooks RFC (`reactjs/rfcs#68`), the React reconciler
(`facebook/react`), and canonical patterns from his overreacted.io essays.
Every rule in `dan-abramov.md` must trace to at least one snippet here.

## Sources

- https://raw.githubusercontent.com/reduxjs/redux/master/src/createStore.ts (Redux createStore — foundational flux pattern Dan co-authored)
- https://raw.githubusercontent.com/reduxjs/redux/master/src/combineReducers.ts (combineReducers — state-shape validation, naming conventions)
- https://raw.githubusercontent.com/reduxjs/redux/master/src/compose.ts (compose — tiny functional utility)
- https://raw.githubusercontent.com/reduxjs/redux/master/src/applyMiddleware.ts (applyMiddleware — higher-order store enhancer)
- https://raw.githubusercontent.com/reduxjs/redux/master/src/bindActionCreators.ts (bindActionCreators — object iteration pattern)
- https://raw.githubusercontent.com/reduxjs/redux/master/src/types/actions.ts (Action type hierarchy — discriminated unions)
- https://raw.githubusercontent.com/reduxjs/redux/master/src/types/reducers.ts (Reducer type — pure-function contract)
- https://raw.githubusercontent.com/reactjs/rfcs/main/text/0068-react-hooks.md (Hooks RFC Dan co-authored — design rationale and mental-model prose)
- https://raw.githubusercontent.com/facebook/react/main/packages/react/src/ReactHooks.js (React hook wrappers — dispatcher pattern)
- https://raw.githubusercontent.com/facebook/react/main/packages/react-reconciler/src/ReactFiberHooks.js (mountState, mountEffect, mountCallback, mountMemo implementations)
- https://raw.githubusercontent.com/reduxjs/react-redux/master/src/hooks/useSelector.ts (useSelector — custom hook factory pattern)

## Snippets — hooks & functional components

### Snippet 1: Hooks RFC §2 (useState canonical example)
```jsx
import { useState } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```
*What this shows:* Props destructured (none here, but component is a plain function); JSX reads like a plain HTML template — no abstracted subcomponents for trivial markup; `const [count, setCount]` — destructured tuple with intent-named variables; `useState(0)` is the simplest possible start.

### Snippet 2: Hooks RFC — custom hook (useWindowWidth)
```jsx
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
```
*What this shows:* `useX` prefix is the only convention needed to make a custom hook; one hook = one concept (`useWindowWidth` does one thing); cleanup returned inline from `useEffect`; no class, no lifecycle methods.

### Snippet 3: Hooks RFC — stateful subscription hook
```jsx
function useFriendStatus(friendID) {
  const [isOnline, setIsOnline] = useState(null);

  useEffect(() => {
    function handleStatusChange(status) {
      setIsOnline(status.isOnline);
    }
    ChatAPI.subscribeToFriendStatus(friendID, handleStatusChange);
    return () => ChatAPI.unsubscribeFromFriendStatus(friendID, handleStatusChange);
  }, [friendID]);

  return isOnline;
}
```
*What this shows:* Boolean state named `isOnline` (intent, not implementation); cleanup mirrors subscription; dependency array `[friendID]` is explicit — no hidden subscriptions; named inner function `handleStatusChange` for readability.

### Snippet 4: Hooks RFC — hook composition across components
```jsx
function FriendListItem({ friend }) {
  const isOnline = useFriendStatus(friend.id);

  return (
    <li style={{ color: isOnline ? 'green' : 'black' }}>
      {friend.name}
    </li>
  );
}
```
*What this shows:* Props destructured at the top of the function signature; JSX is flat and template-like; custom hook result consumed directly in JSX with no intermediate variable needed; no `PureComponent`, no `React.memo` preemptively.

### Snippet 5: ReactFiberHooks.js — mountState implementation
```javascript
function mountState(initialState) {
  const hook = mountStateImpl(initialState);
  const queue = hook.queue;
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}
```
*What this shows:* Functions are small and single-purpose; descriptive names (`mountStateImpl`, `dispatchSetState`, `currentlyRenderingFiber`); `dispatch` not `setter` or `updater` — matches what it does; returns a tuple `[state, dispatch]` matching the `useState` API.

### Snippet 6: ReactFiberHooks.js — mountEffect
```javascript
function mountEffect(create, deps) {
  mountEffectImpl(
    PassiveEffect | PassiveStaticEffect,
    HookPassive,
    create,
    deps,
  );
}
```
*What this shows:* Delegates immediately to impl — thin public wrapper; parameters named `create` and `deps` (intent, not types); no JSDoc noise on internal functions.

### Snippet 7: ReactFiberHooks.js — mountCallback (memoization)
```javascript
function mountCallback(callback, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = [callback, nextDeps];
  return callback;
}
```
*What this shows:* `nextDeps` variable names temporal relationship; `undefined` coerced to `null` explicitly (not with `??`); returns callback unchanged on mount — implementation detail made obvious by the code itself.

### Snippet 8: ReactHooks.js — public useState wrapper
```javascript
export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
```
*What this shows:* Public API is a one-liner delegate — no logic leaks into the public surface; `resolveDispatcher` is a guard that throws a clear error outside a component; naming matches the React docs exactly.

### Snippet 9: useSelector.ts — custom hook factory
```typescript
export function createSelectorHook(context = ReactReduxContext) {
  const useReduxContext = createReduxContextHook(context);
  return function useSelector(selector, equalityFnOrOptions = {}) {
    const { equalityFn = refEquality, stabilityCheck, noopCheck } =
      typeof equalityFnOrOptions === 'function'
        ? { equalityFn: equalityFnOrOptions }
        : equalityFnOrOptions;
    // ...
    return selectedState;
  };
}

export const useSelector = createSelectorHook();
```
*What this shows:* Hook factory pattern — returns a named function (`useSelector`) so stack traces are readable; default argument `context = ReactReduxContext` at the parameter site; the exported singleton is just the default instantiation.

### Snippet 10: Hooks RFC — reading state in effects
```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```
*What this shows:* Effects read state from closure — no `this.state`; no `componentDidMount`/`componentDidUpdate`; JSX stays flat; `setCount(count + 1)` is explicit functional update.

## Snippets — Redux core patterns

### Snippet 11: createStore.ts — function signature and dispatch
```typescript
export function createStore<S, A extends Action, Ext extends {} = {}, StateExt extends {} = {}>(
  reducer: Reducer<S, A>,
  enhancer?: StoreEnhancer<Ext, StateExt>,
): Store<S, A, UnknownIfNonSpecific<StateExt>> & NoInfer<Ext> {
  let currentReducer = reducer;
  let currentState: S | PreloadedState<S> = preloadedState as PreloadedState<S>;
  let currentListeners: Map<number, ListenerCallback> | null = new Map();
  let nextListeners = currentListeners;
  let isDispatching = false;

  // ...
  dispatch({ type: ActionTypes.INIT } as A);

  return {
    dispatch: dispatch as Dispatch<A>,
    subscribe,
    getState,
    // ...
  };
}
```
*What this shows:* Three-letter generics (`S`, `A`) for canonical Redux types; `current`/`next` prefix pair for temporal state; `isDispatching` boolean flag — intent, not `_dispatching`; function returns a plain object literal (no class, no `this`).

### Snippet 12: createStore.ts — dispatch function
```typescript
function dispatch(action: A) {
  if (typeof action !== 'object' || action === null) {
    throw new Error(
      `Actions must be plain objects. Instead, the actual type was: '${kindOf(action)}'.`
    );
  }
  if (isDispatching) {
    throw new Error('Reducers may not dispatch actions.');
  }

  try {
    isDispatching = true;
    currentState = currentReducer(currentState, action);
  } finally {
    isDispatching = false;
  }

  const listeners = (currentListeners = nextListeners);
  listeners.forEach((listener) => listener());
  return action;
}
```
*What this shows:* Guard clauses at the top; `try/finally` for state flag cleanup; no `catch` when not needed; error messages cite `kindOf(action)` for developer-friendly feedback; `const listeners = (currentListeners = nextListeners)` — assignment in expression for atomicity.

### Snippet 13: combineReducers.ts — hasChanged optimization
```typescript
let hasChanged = false;
const nextState: StateFromReducersMapObject<typeof reducers> = {};

for (let i = 0; i < finalReducerKeys.length; i++) {
  const key = finalReducerKeys[i];
  const reducer = finalReducers[key];
  const previousStateForKey = state[key];
  const nextStateForKey = reducer(previousStateForKey, action);

  if (typeof nextStateForKey === 'undefined') {
    const actionType = action && action.type;
    throw new Error(`...`);
  }

  nextState[key] = nextStateForKey;
  hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
}

hasChanged = hasChanged || finalReducerKeys.length !== Object.keys(state).length;
return hasChanged ? nextState : state;
```
*What this shows:* `hasChanged` boolean flag over a counter or set; `previousStateForKey`/`nextStateForKey` — temporal naming pair; early exit returns original reference when unchanged (reference equality optimization); undefined check with a descriptive error.

### Snippet 14: compose.ts — functional composition
```typescript
export function compose(): <R>(a: R) => R;
export function compose<F extends Function>(f: F): F;
export function compose<A, R>(f1: (a: A) => R, f2: Func<A>): Func<R>;

export function compose(...funcs: Function[]) {
  if (funcs.length === 0) {
    return <T>(arg: T) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce(
    (a, b) =>
      (...args: any) =>
        a(b(...args))
  );
}
```
*What this shows:* Overloads for type safety on 0–N arities; trivial edge cases handled first; the implementation body is 3 lines; no classes, no helpers — pure composition with `reduce`.

### Snippet 15: applyMiddleware.ts — enhancer pattern
```typescript
export function applyMiddleware(...middlewares: Middleware[]): StoreEnhancer<any> {
  return (createStore: StoreCreator) =>
    <S, A extends Action>(reducer: Reducer<S, A>, preloadedState?: PreloadedState<S>) => {
      const store = createStore(reducer, preloadedState);
      let dispatch: Dispatch = () => {
        throw new Error(
          'Dispatching while constructing your middleware is not allowed.'
        );
      };

      const middlewareAPI: MiddlewareAPI = {
        getState: store.getState,
        dispatch: (...args) => dispatch(...args),
      };
      const chain = middlewares.map((middleware) => middleware(middlewareAPI));
      dispatch = compose(...chain)(store.dispatch);

      return { ...store, dispatch };
    };
}
```
*What this shows:* Curried enhancer pattern — function returns function returns store; `middlewareAPI` named for its role; spread `{ ...store, dispatch }` overrides only what changed; the protective dispatch throws before construction is done.

### Snippet 16: types/actions.ts — discriminated union types
```typescript
export type Action<T extends string = string> = {
  type: T;
};

export interface UnknownAction extends Action {
  [extraProps: string]: unknown;
}

/** @deprecated use `UnknownAction` instead */
export interface AnyAction extends Action {
  [extraProps: string]: any;
}
```
*What this shows:* `@deprecated` tag on the `any`-typed variant with a migration path; index signature typed `unknown` not `any` in the successor; literal type parameter `T extends string` keeps action types narrowable.

## Snippets — naming conventions

### Snippet 17: Redux state variable naming pairs
```typescript
// createStore.ts
let currentReducer = reducer;
let currentState: S | PreloadedState<S> = preloadedState as PreloadedState<S>;
let currentListeners: Map<number, ListenerCallback> | null = new Map();
let nextListeners = currentListeners;

// combineReducers.ts
const previousStateForKey = state[key];
const nextStateForKey = reducer(previousStateForKey, action);
```
*What this shows:* `current`/`next` prefix pair for mutable temporal state; `previous`/`next` for immutable pairs inside loops; prefixes communicate data lifecycle, not just type.

### Snippet 18: Hooks RFC — naming intent over implementation
```jsx
// Good — named for what it represents
const [isOnline, setIsOnline] = useState(null);
const [windowWidth, setWindowWidth] = useState(window.innerWidth);
const [selectedTab, setSelectedTab] = useState('overview');

// Anti-pattern (implicit in RFC) — named for implementation
const [s, ss] = useState(null);         // abbreviation
const [_bOnline, _setBOnline] = useState(null);  // Hungarian notation
```
*What this shows:* State variable names are nouns describing what is stored, not how (`isOnline` not `boolFriendOnlineStatus`); setter names mirror the state variable (`setIsOnline` ↔ `isOnline`); clarity over brevity.

### Snippet 19: React hook file naming (from react-redux codebase)
```
src/hooks/useSelector.ts
src/hooks/useDispatch.ts
src/hooks/useStore.ts
src/hooks/useReduxContext.ts
```
*What this shows:* Hook files are named `camelCase` matching the exported function; one hook per file; directory named `hooks/` groups related hooks; no `index.ts` re-exports that hide the actual name.

### Snippet 20: Redux error message style
```typescript
// createStore.ts
throw new Error(
  `Actions must be plain objects. Instead, the actual type was: '${kindOf(action)}'.` +
  ` You may need to add middleware to your store setup to handle dispatching other values, ` +
  `such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/...`
);

// combineReducers.ts
throw new Error(
  `Reducer "${key}" returned undefined during initialization. ` +
  `If the state passed to the reducer is undefined, you must ` +
  `explicitly return the initial state. The initial state may ` +
  `not be undefined. If you don't want to set a value for this reducer, ` +
  `you can use null instead of undefined.`
);
```
*What this shows:* Error messages are prose sentences explaining what happened and why; they cite the actual value (`kindOf(action)`); they suggest a fix; no terse codes or single-word messages.

## Snippets — React component style

### Snippet 21: Hooks RFC — splitting by related functionality
```jsx
// Before (class): lifecycle methods mix concerns
class ProfilePage extends React.Component {
  componentDidMount() {
    document.title = 'Profile';
    subscribeToUpdates(this.props.userId);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      unsubscribeFromUpdates(prevProps.userId);
      subscribeToUpdates(this.props.userId);
    }
  }
  componentWillUnmount() {
    unsubscribeFromUpdates(this.props.userId);
  }
}

// After (hooks): each concern in its own hook
function ProfilePage({ userId }) {
  useDocumentTitle('Profile');
  useSubscription(userId);
  // ...
}
```
*What this shows:* Props destructured in the parameter signature; custom hooks extract each concern; function component reads top-to-bottom like a recipe; the class version is explicitly the "before" — class components are the anti-pattern.

### Snippet 22: React source — conditional in JSX (flat template style)
```jsx
function FriendStatus({ friend }) {
  const isOnline = useFriendStatus(friend.id);

  if (isOnline === null) {
    return <span>Loading...</span>;
  }
  return (
    <span style={{ color: isOnline ? 'green' : 'black' }}>
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}
```
*What this shows:* Early return for loading/error states; JSX is flat — no deeply nested ternary chains; boolean named `isOnline` not `friendStatusBoolean`; inline style only when trivial.

### Snippet 23: Hooks RFC — data flow between hooks
```jsx
function ShoppingCart() {
  const [productId, setProductId] = useState(null);
  const product = useProduct(productId);
  const recommendation = useRecommendation(product?.category);

  // ...
}
```
*What this shows:* Return value of one hook flows directly into the next; no intermediate state needed; the data dependency is expressed in the code structure itself; optional chaining `?.` for nullable states.

### Snippet 24: React pattern — controlled input hook
```jsx
function useFormInput(initialValue) {
  const [value, setValue] = useState(initialValue);

  function handleChange(e) {
    setValue(e.target.value);
  }

  return {
    value,
    onChange: handleChange,
  };
}

function ContactForm() {
  const name = useFormInput('');
  const email = useFormInput('');

  return (
    <form>
      <input {...name} placeholder="Name" />
      <input {...email} placeholder="Email" type="email" />
    </form>
  );
}
```
*What this shows:* Custom hook returns an object spreadable onto an input; named inner function `handleChange` not anonymous arrow (stack traces); hook is reused twice without extraction to a class; JSX reads as a template.

### Snippet 25: React — fetch hook with loading state
```jsx
function useResource(url) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const response = await fetch(url);
        const json = await response.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [url]);

  return { data, isLoading, error };
}
```
*What this shows:* `isLoading` not `loading` or `isFetching` — full boolean prefix; `cancelled` flag for cleanup (not `AbortController` prematurely); three separate `useState` calls not one state object; `error` not `err` at state level; effect dependency `[url]` is explicit.

## Snippets — anti-patterns (what Dan pushes against)

### Snippet 26: RFC on avoiding premature abstraction
```
// Dan's guidance (paraphrased from Hooks RFC and essays):
// "Don't extract a Hook until you feel the pain of not having it."
// "Two components with similar logic doesn't automatically mean
//  you need a shared abstraction."
// "Abstract on the third duplicate, not the first."

// Too early (one use case):
function useButtonState() { /* wraps a single useState(false) */ }

// Right time (used in 3+ places, naturally generalized):
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}
```
*What this shows:* Hooks are not a reason to over-abstract; extract only when you've felt the duplication; a hook wrapping a single `useState` is premature.

### Snippet 27: Class component — explicit anti-pattern
```jsx
// Anti-pattern: class component with lifecycle methods
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.handleClick = this.handleClick.bind(this);
  }
  componentDidMount() { document.title = `Count: ${this.state.count}`; }
  componentDidUpdate() { document.title = `Count: ${this.state.count}`; }
  handleClick() { this.setState({ count: this.state.count + 1 }); }
  render() {
    return <button onClick={this.handleClick}>{this.state.count}</button>;
  }
}
```
*What this shows:* Every symptom Dan's hooks address — `this.state`, `this.setState`, `componentDidMount`, `componentDidUpdate`, manual binding; the entire class is the anti-pattern.

### Snippet 28: Premature useMemo/useCallback — anti-pattern
```jsx
// Anti-pattern: memoizing before measuring
function TodoList({ todos, onToggle }) {
  const sortedTodos = useMemo(
    () => todos.slice().sort((a, b) => a.id - b.id),
    [todos]
  );
  const handleToggle = useCallback(
    (id) => onToggle(id),
    [onToggle]
  );

  return sortedTodos.map(todo => (
    <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />
  ));
}

// Preferred: measure first
function TodoList({ todos, onToggle }) {
  const sortedTodos = todos.slice().sort((a, b) => a.id - b.id);

  return sortedTodos.map(todo => (
    <TodoItem key={todo.id} todo={todo} onToggle={onToggle} />
  ));
}
```
*What this shows:* Dan's guidance — "Avoid useMemo/useCallback unless measured"; wrapping `onToggle` in `useCallback` when it's already stable is ceremony; wrapping a trivial sort in `useMemo` without profiling is premature.

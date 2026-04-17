# dan-abramov

Distilled from Redux (`reduxjs/redux`), the React Hooks RFC (`reactjs/rfcs#68`),
the React reconciler (`facebook/react`), and canonical patterns from Dan Abramov's
essays on overreacted.io. Dan co-authored Redux and the Hooks proposal, and his
code represents the foundational idiomatic React and Redux style.

## Voice

Dan Abramov's code is readable before it is clever. Functional components are the
default — not a preference, a rule. `useState` is the starting point for all local
state, and you live there until the problem outgrows it. When it does, you reach for
`useReducer`; you never reach for a class. Hooks follow a strict naming convention:
`useX` prefix, one concept per hook, files named after the hook they export
(`useFormInput.ts`, `useFriendStatus.ts`). Props are destructured in the function
signature so the component's dependencies are visible at a glance. JSX reads like an
HTML template — flat, imperative, light on abstraction. There are no
over-engineered micro-components extracting two lines of markup just to have a name.

State variables are named for what they store, not how they are stored: `isLoading`,
`selectedTab`, `windowWidth` — never `_bFetching`, never `s`. Boolean state
variables get the `is`/`has`/`can` prefix (`isOnline`, `hasError`). Setter names
mirror the state variable (`setIsOnline` ↔ `isOnline`). Temporal variable pairs get
`current`/`next` or `previous`/`next` prefixes, as seen throughout Redux
(`currentReducer`, `nextListeners`, `previousStateForKey`, `nextStateForKey`). These
prefixes communicate lifecycle, not types.

Abstraction is earned, not preemptive. Dan's rule: duplicate twice, abstract on the
third. A hook wrapping a single `useState` is not an abstraction — it is noise.
`useMemo` and `useCallback` appear only after profiling shows a problem; they are
not defensive wrappers added to every callback. Comments explain the mental model or
the *why* — why a flag exists, why cleanup mirrors setup, why a dependency is
included — never just what the next line does.

## Examples

- good: `const [isLoading, setIsLoading] = useState(true);`
- good: `function useWindowWidth() { const [width, setWidth] = useState(window.innerWidth); ... return width; }`
- good: `function Counter({ initialCount }) { const [count, setCount] = useState(initialCount); ... }`
- good: `useEffect(() => { subscribe(id); return () => unsubscribe(id); }, [id]);`
- good: `return { data, isLoading, error };` (explicit named returns, not a class instance)
- good: `const chain = middlewares.map(m => m(middlewareAPI)); dispatch = compose(...chain)(store.dispatch);`
- good: `export type Action<T extends string = string> = { type: T };`
- good: `const previousStateForKey = state[key]; const nextStateForKey = reducer(previousStateForKey, action);`
- bad: `class Counter extends React.Component { constructor(props) { super(props); this.state = { count: 0 }; } }`
- bad: `componentDidMount() { ... }` (use `useEffect`)
- bad: `this.setState({ count: this.state.count + 1 })` (use `useState`)
- bad: `const handleClick = useCallback(() => onClick(id), [onClick, id])` (before measuring)
- bad: `const [s, setS] = useState(false)` (abbreviated, intent-free name)
- bad: `function useButtonWrapper() { return useState(false)[0]; }` (premature abstraction)

## Hard rules

- banned-token: `\bclass\s+\w+\s+extends\s+(React\.)?Component\b` — "No class components; use functional components with hooks; see corpus snippet 27 (class component anti-pattern)"
- banned-token: `\bthis\.state\b|\bthis\.setState\b` — "No class state API; use `useState` or `useReducer`; see corpus snippet 27"
- banned-token: `\bcomponentDid(Mount|Update|Unmount)\b` — "No class lifecycle methods; use `useEffect` with a cleanup return; see corpus snippets 21 and 27"
- file-naming: camelCase — "Hook files and React utility files are camelCase matching the exported name: `useFormInput.ts`, `useFriendStatus.ts`, `createStore.ts`; see corpus snippet 19"
- banned-token: `\bextends\s+(React\.)?PureComponent\b` — "No PureComponent subclasses; use a functional component — if shallow equality optimisation is needed, wrap with `React.memo` only after profiling; see corpus snippet 27 (class component as anti-pattern) and Hooks RFC §4"
- banned-token: `\.bind\s*\(\s*this\s*\)` — "No manual `this` binding; the hooks model removes `this` entirely — callbacks are plain closures inside functional components; see corpus snippet 27 (`this.handleClick = this.handleClick.bind(this)` as anti-pattern)"
- banned-token: `\bcomponentWillUnmount\b` — "No `componentWillUnmount` lifecycle; return a cleanup function from `useEffect` instead — cleanup mirrors setup in the same effect; see corpus snippet 21 (before/after comparison) and snippet 27"
- banned-token: `\bshouldComponentUpdate\b` — "No `shouldComponentUpdate` override; memoisation in hooks-era React is achieved with `React.memo` on a functional component, and only after profiling; class-based optimisation bypasses the hooks model; see corpus snippet 28 (premature memoisation anti-pattern)"
- banned-token: `\bReact\.createClass\b` — "No legacy `React.createClass` factory; it was removed in React 16 and replaced by functional components with hooks; see corpus snippet 27 and Hooks RFC §1"
- banned-token: `\bUNSAFE_\w+` — "No `UNSAFE_` lifecycle methods (`UNSAFE_componentWillMount`, `UNSAFE_componentWillReceiveProps`, `UNSAFE_componentWillUpdate`); these are deprecated React 16 escape hatches; replace with hooks (`useEffect`, `useState`); see Hooks RFC §3"
- banned-token: `\bPropTypes\.\w+` — "No runtime PropTypes; Dan's hooks-era style uses TypeScript type annotations in function signatures for zero-cost static checking; PropTypes adds bundle weight and only catches errors at runtime; see corpus snippet 4 (`function FriendListItem({ friend })` typed via TypeScript, not PropTypes)"
- banned-token: `\b(str|obj|arr|bIs|num)[A-Z]\w*\s*,\s*set[A-Z]` — "No Hungarian notation in state destructuring (`strEmail`, `bIsSubmitting`, `objError`); name state variables for what they store, not their type — `email`, `isSubmitting`, `error`; see corpus snippet 18 (naming intent over implementation)"
- banned-token: `function\s+\w+\s*\(\s*props\s*\)` — "Destructure props in the function signature so the component's dependencies are visible at a glance; `function UserCard(props)` → `function UserCard({ name, email, bio })`; see corpus snippet 4 (`function FriendListItem({ friend })`) and Voice prose"
- banned-token: `//\s+(?:Create|Set|Get|Return)\s+(?:a\s+state\s+variable|a\s+function\s+that)` — "Comments must explain the mental model or the *why*, never just restate what the next line does; remove comments like `// Create a state variable called count` — the code itself is clear; see corpus snippet 20 (error message prose) and Voice prose: 'Comments explain the mental model or the why'"

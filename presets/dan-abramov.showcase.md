# dan-abramov — showcase

Representative before/after pairs and canonical examples that demonstrate the
`dan-abramov` taste preset in action.

## 1. The fundamental transformation: class → hook

**Before (class component)**
```jsx
class FriendStatus extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isOnline: null };
  }
  componentDidMount() {
    ChatAPI.subscribeToFriendStatus(this.props.friend.id, this.handleStatusChange);
  }
  componentDidUpdate(prevProps) {
    ChatAPI.unsubscribeFromFriendStatus(prevProps.friend.id, this.handleStatusChange);
    ChatAPI.subscribeToFriendStatus(this.props.friend.id, this.handleStatusChange);
  }
  componentWillUnmount() {
    ChatAPI.unsubscribeFromFriendStatus(this.props.friend.id, this.handleStatusChange);
  }
  handleStatusChange(status) {
    this.setState({ isOnline: status.isOnline });
  }
  render() {
    if (this.state.isOnline === null) return <span>Loading...</span>;
    return <span>{this.state.isOnline ? 'Online' : 'Offline'}</span>;
  }
}
```

**After (hooks)**
```jsx
function useFriendStatus(friendId) {
  const [isOnline, setIsOnline] = useState(null);

  useEffect(() => {
    function handleStatusChange(status) {
      setIsOnline(status.isOnline);
    }
    ChatAPI.subscribeToFriendStatus(friendId, handleStatusChange);
    return () => ChatAPI.unsubscribeFromFriendStatus(friendId, handleStatusChange);
  }, [friendId]);

  return isOnline;
}

function FriendStatus({ friend }) {
  const isOnline = useFriendStatus(friend.id);

  if (isOnline === null) return <span>Loading...</span>;
  return <span style={{ color: isOnline ? 'green' : 'black' }}>
    {isOnline ? 'Online' : 'Offline'}
  </span>;
}
```

What changed: the subscription logic is now reusable (`useFriendStatus`); cleanup mirrors setup in the same effect; props are destructured; JSX reads like a template; no `this` anywhere.

## 2. useState until it hurts — then useReducer

**First: reach for useState**
```jsx
function Checkout() {
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ...
}
```

**Only when the state transitions get complex:**
```jsx
// Three separate actions that always coordinate → useReducer earned.
const initialState = { step: 'cart', items: [], coupon: null };

function checkoutReducer(state, action) {
  switch (action.type) {
    case 'APPLY_COUPON':
      return { ...state, coupon: action.coupon };
    case 'PROCEED_TO_SHIPPING':
      return { ...state, step: 'shipping' };
    case 'BACK_TO_CART':
      return { ...state, step: 'cart', coupon: null };
    default:
      return state;
  }
}

function Checkout() {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);
  // ...
}
```

## 3. Custom hook factory — one concept, reusable

```jsx
// Extracted at the third component that needed this pattern.
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    // Cancel the previous timer when value or delay changes.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

## 4. Explicit data flow — no hidden context magic

```jsx
// Data flows down through props, not through magic context singletons.
// Each dependency is visible in the function signature.

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

function UserProfile({ userId }) {
  const { data: user, isLoading, error } = useResource(`/api/users/${userId}`);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!user) return null;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

## 5. Redux — small composable functions

```typescript
// compose.ts — 8 lines; no class; no state
export function compose(...funcs: Function[]) {
  if (funcs.length === 0) return <T>(arg: T) => arg;
  if (funcs.length === 1) return funcs[0];
  return funcs.reduce((a, b) => (...args: any) => a(b(...args)));
}

// Reducer — pure function, temporal naming, explicit transition
function cartReducer(state: CartState = emptyCart, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.item] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'CLEAR':
      return emptyCart;
    default:
      return state;
  }
}
```

## Voice summary

Hooks over classes. Small, named for intent. Explicit data flow over clever magic. `useState` until it hurts. Components read like templates. Types clarify, don't ceremony. Abstract on the third duplicate, not the first.

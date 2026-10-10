const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// --- Storage key rename: base44_ → unrufld_ ---
// The app's client is branded "unrufld", so browser storage keys use the
// `unrufld_` prefix. The underlying SDK still writes its auth token to
// `base44_access_token`; we alias that one key to `unrufld_access_token` via a
// localStorage interceptor so the SDK and the app converge on a single key.
// All other app-param keys are written directly under `unrufld_` below.
if (!isNode) {
	const _set = storage.setItem.bind(storage);
	const _get = storage.getItem.bind(storage);
	const _del = storage.removeItem.bind(storage);

	// One-time migration of legacy base44_ keys → unrufld_ keys.
	['access_token', 'app_id', 'functions_version', 'app_base_url', 'from_url'].forEach((k) => {
		const oldKey = `base44_${k}`;
		const newKey = `unrufld_${k}`;
		if (_get(newKey) == null && _get(oldKey) != null) {
			_set(newKey, _get(oldKey));
			_del(oldKey);
		}
	});
	// Remove any lingering legacy token once the unrufld_ one exists.
	if (_get('unrufld_access_token') != null) _del('base44_access_token');

	// Alias base44_access_token ↔ unrufld_access_token for the SDK's reads/writes.
	storage.setItem = function (key, value) {
		if (key === 'base44_access_token') key = 'unrufld_access_token';
		return _set(key, value);
	};
	storage.getItem = function (key) {
		if (key === 'base44_access_token') return _get('unrufld_access_token');
		return _get(key);
	};
	storage.removeItem = function (key) {
		if (key === 'base44_access_token') key = 'unrufld_access_token';
		return _del(key);
	};
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `unrufld_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('unrufld_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}
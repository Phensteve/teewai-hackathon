// Paystack public key (safe to expose — used by the inline checkout popup).
export const PAYSTACK_PUBLIC_KEY = 'pk_live_772bf2c82fdeaef8ea6e92f62456688f55cf5ae7';

let paystackPromise = null;

// Dynamically loads the Paystack inline script and resolves with window.PaystackPop.
export const loadPaystack = () => {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  if (!paystackPromise) {
    paystackPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      // v2 is required for Apple Pay (wallet support). v1's setup()/openIframe()
      // flow is replaced by `new PaystackPop().checkout(...)` in the callers.
      s.src = 'https://js.paystack.co/v2/inline.js';
      s.async = true;
      s.onload = () => resolve(window.PaystackPop);
      s.onerror = () => {
        paystackPromise = null;
        reject(new Error('Paystack failed to load'));
      };
      document.body.appendChild(s);
    });
  }
  return paystackPromise;
};
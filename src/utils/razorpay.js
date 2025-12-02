/**
 * Loads the Razorpay checkout script dynamically.
 * Returns the Razorpay constructor if loaded successfully.
 */
export const loadRazorpay = () => {
  return new Promise((resolve) => {
    // Prevent script from being added multiple times
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      console.error("Razorpay SDK failed to load");
      resolve(null);
    };

    document.body.appendChild(script);
  });
};

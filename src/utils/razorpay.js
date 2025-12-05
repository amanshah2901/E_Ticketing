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
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Add CSS to fix SVG attribute errors
      const style = document.createElement('style');
      style.textContent = `
        .razorpay-checkout-modal svg {
          width: 100% !important;
          height: 100% !important;
        }
        .razorpay-checkout-modal svg[width="auto"] {
          width: 100% !important;
        }
        .razorpay-checkout-modal svg[height="auto"] {
          height: 100% !important;
        }
        /* Override SVG attributes that cause console errors */
        .razorpay-checkout-modal svg[width="auto"],
        .razorpay-checkout-modal svg[height="auto"] {
          width: 100% !important;
          height: 100% !important;
        }
      `;
      document.head.appendChild(style);

      // Override SVG attribute setters to prevent errors
      const originalSetAttribute = SVGElement.prototype.setAttribute;
      SVGElement.prototype.setAttribute = function(name, value) {
        if ((name === 'width' || name === 'height') && value === 'auto') {
          return; // Ignore 'auto' values that cause errors
        }
        return originalSetAttribute.call(this, name, value);
      };

      resolve(window.Razorpay);
    };

    script.onerror = () => {
      console.error("Razorpay SDK failed to load");
      resolve(null);
    };

    document.body.appendChild(script);
  });
};

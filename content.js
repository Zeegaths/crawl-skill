// Content script — detects 402 responses and triggers payment

(async function() {
  // Check if page returned a 402 by looking for x402 meta or trying to fetch
  const url = window.location.href;

  // Probe the current URL
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.status !== 402) return;

    const offer = await res.json();
    if (!offer.x402Version) return;

    // Ask background to pay
    const result = await chrome.runtime.sendMessage({
      type: 'PAY_FOR_URL',
      url,
      offer,
    });

    if (result.success) {
      // Refetch with payment header
      const paid = await fetch(url, {
        headers: {
          'Payment-Signature': btoa(JSON.stringify(result)),
        }
      });
      if (paid.ok) {
        const html = await paid.text();
        document.open();
        document.write(html);
        document.close();
      }
    }
  } catch (e) {
    // Not a 402 page, ignore
  }
})();

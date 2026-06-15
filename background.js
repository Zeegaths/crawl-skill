// Background service worker
// Listens for messages from content script when a 402 is detected

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PAY_FOR_URL') {
    handlePayment(msg.url, msg.offer, sender.tab.id).then(sendResponse);
    return true; // keep channel open for async
  }
  if (msg.type === 'GET_SESSION') {
    chrome.storage.local.get('session', ({ session }) => sendResponse(session));
    return true;
  }
});

async function handlePayment(url, offer, tabId) {
  const { session } = await chrome.storage.local.get('session');
  if (!session || Date.now() > session.expiry) {
    return { success: false, error: 'No active session' };
  }

  const option = offer.accepts?.[0];
  if (!option) return { success: false, error: 'No payment option' };

  const amount = parseInt(option.maxAmountRequired);
  if (session.spent + amount > session.budget) {
    return { success: false, error: 'Budget exceeded' };
  }

  try {
    const { ethers } = await import('https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.umd.min.js');
    const wallet = new ethers.Wallet(session.privKey);

    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const timestamp = Math.floor(Date.now() / 1000);
    const urlHash = ethers.keccak256(ethers.toUtf8Bytes(url + '\n' + timestamp));
    const CHAIN_ID = 688689;

    const settlementHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'bytes32', 'uint256', 'bytes32', 'uint256', 'uint256'],
      [wallet.address, option.payTo, urlHash, BigInt(amount), nonce, timestamp, CHAIN_ID]
    );
    const signature = await wallet.signMessage(ethers.getBytes(settlementHash));

    const receipt = { url, amount, nonce, timestamp, urlHash, signature, crawlerWallet: wallet.address, publisherWallet: option.payTo };

    // Update session
    session.spent += amount;
    session.fetches += 1;
    session.receipts = [...(session.receipts || []), receipt];
    await chrome.storage.local.set({ session });

    return { success: true, receipt, signature, nonce, timestamp, urlHash };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

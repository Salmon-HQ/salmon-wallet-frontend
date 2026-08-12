// Manual dApp harness for the WEB wallet (apps/web). Paste this whole file into
// the DevTools console of the running web-wallet tab (http://localhost:5173/).
//
// Why a console script and not a standalone .html: the web wallet talks to its
// approval popups over a SAME-ORIGIN BroadcastChannel, and window.__salmonWallet
// is only registered by the SPA (main.tsx -> SalmonWalletRegistrar). So the
// harness must run inside the SPA window. It injects a floating panel that drives
// the REAL provider -> real /dapp/* popups -> real bridge. You control the dApp
// `origin` (first arg of every __salmonWallet method), so SIWS domain binding and
// the domain-mismatch guard are exercised exactly as a remote dApp would trigger them.
(function () {
  'use strict';

  const provider = window.__salmonWallet;
  if (!provider) {
    console.error(
      '[salmon-harness] window.__salmonWallet not found. Open the running web wallet SPA (http://localhost:5173/) and unlock a wallet first.'
    );
    alert(
      'window.__salmonWallet no encontrado.\nAbrí la wallet web (http://localhost:5173/), desbloqueá una cuenta y volvé a pegar el script.'
    );
    return;
  }
  if (document.getElementById('salmon-harness')) {
    document.getElementById('salmon-harness').remove();
  }

  // The simulated dApp origin. Everything binds to this: SIWS domain becomes its
  // host, isSecureOrigin() is true (https). Change it to test other origins.
  const DAPP_ORIGIN = 'https://test-dapp.salmon.example';

  // Real serialized legacy Solana Message — isTransactionLookalike() -> true.
  const TX_MESSAGE_BYTES = [
    1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 6, 155, 136, 87, 254, 171, 129, 132, 251, 104, 127, 99, 70, 24, 192, 53, 218, 196,
    57, 220, 26, 235, 59, 85, 152, 160, 240, 0, 0, 0, 0, 1, 196, 154, 231, 118, 3, 120, 32, 84, 241,
    122, 157, 236, 234, 67, 180, 68, 235, 160, 237, 177, 44, 111, 29, 49, 198, 224, 228, 168, 75,
    240, 82, 235, 1, 0, 2, 0, 1, 12, 2, 0, 0, 0, 232, 3, 0, 0, 0, 0, 0, 0,
  ];

  // Minimal base58 decode (Bitcoin alphabet) so we can turn the connected address
  // into the Uint8Array[] requiredSigners the web provider expects for OCMS.
  function bs58decode(str) {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const bytes = [];
    for (const ch of str) {
      const v = A.indexOf(ch);
      if (v === -1) throw new Error('bad base58 char: ' + ch);
      let carry = v;
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    for (let k = 0; k < str.length && str[k] === '1'; k++) bytes.push(0);
    return new Uint8Array(bytes.reverse());
  }

  const b64 = (u8) => btoa(String.fromCharCode.apply(null, u8));
  const hex = (u8) =>
    Array.from(u8)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  const utf8 = (u8) => {
    try {
      return new TextDecoder('utf-8').decode(u8);
    } catch {
      return '(no-utf8)';
    }
  };
  const errText = (e) => (e && e.message ? e.message : String(e));

  let account = null; // { address, pubKeyBytes }

  const panel = document.createElement('div');
  panel.id = 'salmon-harness';
  panel.innerHTML = `
    <style>
      #salmon-harness { position: fixed; top: 12px; right: 12px; width: 360px; max-height: 90vh; overflow: auto;
        z-index: 2147483647; background: #161b22; color: #e6edf3; border: 1px solid #2a313c; border-radius: 10px;
        font: 13px/1.5 system-ui, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,.5); }
      #salmon-harness .hd { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #2a313c; }
      #salmon-harness .hd b { font-size: 13px; }
      #salmon-harness .hd .x { margin-left: auto; cursor: pointer; color: #8b949e; border: 0; background: none; font-size: 16px; }
      #salmon-harness .mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: #8b949e; }
      #salmon-harness .sec { padding: 10px 12px; border-bottom: 1px solid #2a313c; }
      #salmon-harness h3 { margin: 0 0 6px; font-size: 12px; }
      #salmon-harness .desc { margin: 0 0 8px; color: #8b949e; font-size: 11px; }
      #salmon-harness button.act { background: #ff7a59; color: #0e1116; border: 0; border-radius: 6px; padding: 6px 10px;
        font-weight: 600; font-size: 12px; cursor: pointer; margin-right: 6px; margin-top: 4px; }
      #salmon-harness button.sec2 { background: transparent; color: #e6edf3; border: 1px solid #2a313c; }
      #salmon-harness input[type=text] { background: #0e1116; color: #e6edf3; border: 1px solid #2a313c; border-radius: 6px;
        padding: 5px 8px; font-family: ui-monospace, monospace; font-size: 11px; width: 100%; margin-bottom: 4px; }
      #salmon-harness label { font-size: 11px; color: #8b949e; display: inline-flex; gap: 5px; align-items: center; }
      #salmon-harness .out { margin-top: 8px; font-family: ui-monospace, monospace; font-size: 11px; white-space: pre-wrap;
        word-break: break-all; background: #0e1116; border: 1px solid #2a313c; border-radius: 6px; padding: 8px; min-height: 16px; color: #8b949e; }
      #salmon-harness .out.ok { border-color: #3fb950; color: #e6edf3; }
      #salmon-harness .out.err { border-color: #f85149; color: #ffb9b3; }
      #salmon-harness .out.warn { border-color: #d29922; color: #f2cc60; }
    </style>
    <div class="hd"><b>🐟 Salmon web dApp harness</b><button class="x" title="cerrar">×</button></div>
    <div class="sec"><div class="mono" id="h-origin"></div><div class="mono" id="h-acct"></div></div>

    <div class="sec">
      <h3>0 · Connect</h3>
      <p class="desc">__salmonWallet.connect(origin). Requerido antes de firmar.</p>
      <button class="act" data-a="connect">Connect</button>
      <button class="act sec2" data-a="disconnect">Disconnect</button>
      <div class="out" id="o-connect"></div>
    </div>

    <div class="sec">
      <h3>1 · signMessage — texto</h3>
      <button class="act" data-a="text">Firmar texto</button>
      <div class="out" id="o-text"></div>
    </div>

    <div class="sec">
      <h3>2 · signMessage — tx-lookalike (guard)</h3>
      <p class="desc">Popup: banner rojo "Signing blocked" + Firmar deshabilitado. Sólo Rechazar → resultado null = bloqueado (esperado).</p>
      <button class="act" data-a="tx">Intentar firmar tx</button>
      <div class="out" id="o-tx"></div>
    </div>

    <div class="sec">
      <h3>3 · signOffchainMessage — OCMS (PR#92)</h3>
      <p class="desc">Requiere Connect (usa tu pubkey como requiredSigner).</p>
      <button class="act" data-a="ocms">Firmar OCMS</button>
      <div class="out" id="o-ocms"></div>
    </div>

    <div class="sec">
      <h3>4 · signIn — SIWS (PR#93)</h3>
      <p class="desc">domain vacío = usa el origin real (${DAPP_ORIGIN}). Distinto = mismatch.</p>
      <input type="text" id="siws-domain" placeholder="domain (vacío = origin real)" />
      <label><input type="checkbox" id="siws-ocms" /> envolver en OCMS (useOffchainMessage)</label>
      <div style="margin-top:6px">
        <button class="act" data-a="siws">Sign In</button>
        <button class="act sec2" data-a="siws-fake">Sign In dominio falso</button>
      </div>
      <div class="out" id="o-siws"></div>
    </div>
  `;
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector('#' + id);
  $('h-origin').textContent = 'dApp origin: ' + DAPP_ORIGIN;
  function setAcct(addr, bytes) {
    account = addr ? { address: addr, pubKeyBytes: bytes } : null;
    $('h-acct').textContent = addr ? 'account: ' + addr : 'account: (none)';
  }
  setAcct(null);
  function show(id, cls, obj) {
    const el = $(id);
    el.className = 'out ' + cls;
    el.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  }

  panel.querySelector('.x').onclick = () => panel.remove();

  const handlers = {
    async connect() {
      show('o-connect', 'warn', 'Abriendo popup de connect…');
      const res = await provider.connect(DAPP_ORIGIN);
      if (!res) return show('o-connect', 'err', 'connect rechazado (null)');
      const addr = res.publicKey; // base58 string
      setAcct(addr, bs58decode(addr));
      show('o-connect', 'ok', { connected: true, address: addr });
    },
    async disconnect() {
      try {
        await provider.disconnect?.(DAPP_ORIGIN);
      } catch {}
      setAcct(null);
      show('o-connect', 'warn', 'disconnected (local)');
    },
    async text() {
      const msg = 'Hola desde el web harness — ' + new Date().toISOString();
      show('o-text', 'warn', 'Firmando… aprobá en el popup.');
      const sig = await provider.signMessage(DAPP_ORIGIN, new TextEncoder().encode(msg));
      if (!sig) return show('o-text', 'err', 'rechazado (null)');
      show('o-text', 'ok', { message: msg, signature_b64: b64(sig), len: sig.length });
    },
    async tx() {
      show(
        'o-tx',
        'warn',
        'Mandando tx-lookalike… mirá el popup (banner rojo + Firmar deshabilitado).'
      );
      const sig = await provider.signMessage(DAPP_ORIGIN, new Uint8Array(TX_MESSAGE_BYTES));
      if (!sig)
        return show(
          'o-tx',
          'ok',
          'Bloqueado/rechazado (esperado). El popup mostró banner "Signing blocked" y Firmar deshabilitado.'
        );
      show('o-tx', 'err', '⚠️ GUARD FALLÓ: firmó una tx disfrazada. sig_b64=' + b64(sig));
    },
    async ocms() {
      if (!account) return show('o-ocms', 'err', 'Connect primero.');
      const msg = 'OCMS test: login challenge ' + Date.now();
      show('o-ocms', 'warn', 'Firmando OCMS… aprobá en el popup.');
      const res = await provider.signOffchainMessage(DAPP_ORIGIN, {
        messageVersion: 1,
        message: msg,
        requiredSigners: [account.pubKeyBytes],
      });
      if (!res) return show('o-ocms', 'err', 'rechazado (null)');
      show('o-ocms', 'ok', {
        message: msg,
        signatureType: res.signatureType,
        signature_b64: b64(res.signature),
        signedOffchainMessage_len: res.signedOffchainMessage.length,
        domain_prefix_hex: hex(res.signedOffchainMessage.slice(0, 16)),
      });
    },
    siws() {
      return runSiws($('siws-domain').value.trim(), 'o-siws');
    },
    'siws-fake'() {
      return runSiws('phishing-site.example', 'o-siws');
    },
  };

  async function runSiws(domainValue, outId) {
    const input = {
      statement: 'Sign in to the Salmon web harness.',
      uri: DAPP_ORIGIN,
      version: '1',
      chainId: 'solana:mainnet',
      nonce: String(Date.now()),
      issuedAt: new Date().toISOString(),
    };
    if (domainValue) input.domain = domainValue;
    if ($('siws-ocms').checked) input.useOffchainMessage = { messageVersion: 1 };
    show(
      outId,
      'warn',
      'signIn… aprobá en el popup (domain: ' + (domainValue || '(origin real)') + ').'
    );
    const res = await provider.signIn(DAPP_ORIGIN, input);
    if (!res)
      return show(
        outId,
        'ok',
        'Rechazado (null). En el caso dominio-falso, esto = mismatch correctamente rechazado (banner en el popup, Firmar deshabilitado).'
      );
    show(outId, 'ok', {
      address: res.account.address,
      signatureType: res.signatureType,
      signedMessageFormat: res.signedMessageFormat || '(raw utf-8)',
      signature_b64: b64(res.signature),
      signedMessage_preview: utf8(res.signedMessage).slice(0, 300),
    });
  }

  panel.addEventListener('click', (e) => {
    const a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
    if (!a || !handlers[a]) return;
    Promise.resolve(handlers[a]()).catch((err) => {
      const outId = {
        connect: 'o-connect',
        disconnect: 'o-connect',
        text: 'o-text',
        tx: 'o-tx',
        ocms: 'o-ocms',
        siws: 'o-siws',
        'siws-fake': 'o-siws',
      }[a];
      show(outId, 'err', errText(err));
    });
  });

  console.log('[salmon-harness] panel injected. dApp origin =', DAPP_ORIGIN);
})();

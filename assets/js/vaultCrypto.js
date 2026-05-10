(function () {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  const ARGON2_TIME_COST = 3;
  const ARGON2_MEMORY_KB = 65536;
  const ARGON2_PARALLELISM = 1;
  const KDF_ITERATIONS = 210000;

  function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  function toBase64(bytes) {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let bin = "";
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin);
  }

  function fromBase64(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveAesKeyFromSecret(secret, saltBytes, kdfConfig) {
    const kdf = (kdfConfig && kdfConfig.kdf) || "argon2id";
    if (kdf === "argon2id" && window.argon2 && typeof window.argon2.hash === "function") {
      const typeEnum =
        window.argon2.ArgonType && window.argon2.ArgonType.Argon2id != null
          ? window.argon2.ArgonType.Argon2id
          : 2;
      const result = await window.argon2.hash({
        pass: secret,
        salt: saltBytes,
        time: ARGON2_TIME_COST,
        mem: ARGON2_MEMORY_KB,
        parallelism: ARGON2_PARALLELISM,
        hashLen: 32,
        type: typeEnum,
      });
      const keyBytes =
        result && result.hash instanceof Uint8Array
          ? result.hash
          : result && result.hash
            ? new Uint8Array(result.hash)
            : null;
      if (!keyBytes || keyBytes.length !== 32) {
        throw new Error("Argon2id derivation failed");
      }
      return crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
      );
    }

    // Fallback for environments without Argon2 runtime.
    const baseKey = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(secret),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: saltBytes,
        iterations: KDF_ITERATIONS,
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
  }

  async function aesGcmEncryptUtf8(key, plaintext) {
    const iv = randomBytes(12);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      textEncoder.encode(plaintext)
    );
    return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
  }

  async function aesGcmDecryptUtf8(key, payload) {
    const iv = fromBase64(payload.iv);
    const ciphertext = fromBase64(payload.ciphertext);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return textDecoder.decode(plain);
  }

  async function createVaultBootstrap(passphrase) {
    const passphraseSalt = randomBytes(16);
    const recoverySalt = randomBytes(16);
    const wrapIvPassphrase = randomBytes(12);
    const wrapIvRecovery = randomBytes(12);
    const recoveryKey = toBase64(randomBytes(24));

    const kdfConfig = {
      kdf: window.argon2 ? "argon2id" : "pbkdf2-sha256",
      iterations: KDF_ITERATIONS,
      timeCost: ARGON2_TIME_COST,
      memoryKb: ARGON2_MEMORY_KB,
      parallelism: ARGON2_PARALLELISM,
    };
    const passphraseKey = await deriveAesKeyFromSecret(passphrase, passphraseSalt, kdfConfig);
    const recoveryWrapKey = await deriveAesKeyFromSecret(recoveryKey, recoverySalt, kdfConfig);
    const dataEncryptionKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const wrappedDekByPassphrase = await crypto.subtle.wrapKey(
      "raw",
      dataEncryptionKey,
      passphraseKey,
      { name: "AES-GCM", iv: wrapIvPassphrase }
    );
    const wrappedDekByRecovery = await crypto.subtle.wrapKey(
      "raw",
      dataEncryptionKey,
      recoveryWrapKey,
      { name: "AES-GCM", iv: wrapIvRecovery }
    );

    return {
      recoveryKey,
      metadata: {
        ...kdfConfig,
        passphraseSalt: toBase64(passphraseSalt),
        recoverySalt: toBase64(recoverySalt),
        wrapIvPassphrase: toBase64(wrapIvPassphrase),
        wrapIvRecovery: toBase64(wrapIvRecovery),
      },
      keyMaterial: {
        wrappedDekByPassphrase: toBase64(wrappedDekByPassphrase),
        wrappedDekByRecovery: toBase64(wrappedDekByRecovery),
      },
    };
  }

  async function unwrapDekWithPassphrase(passphrase, keyMaterial, metadata) {
    const passphraseKey = await deriveAesKeyFromSecret(passphrase, fromBase64(metadata.passphraseSalt), metadata);
    return crypto.subtle.unwrapKey(
      "raw",
      fromBase64(keyMaterial.wrappedDekByPassphrase),
      passphraseKey,
      { name: "AES-GCM", iv: fromBase64(metadata.wrapIvPassphrase) },
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async function unwrapDekWithRecoveryKey(recoveryKey, keyMaterial, metadata) {
    const recoveryWrapKey = await deriveAesKeyFromSecret(recoveryKey, fromBase64(metadata.recoverySalt), metadata);
    return crypto.subtle.unwrapKey(
      "raw",
      fromBase64(keyMaterial.wrappedDekByRecovery),
      recoveryWrapKey,
      { name: "AES-GCM", iv: fromBase64(metadata.wrapIvRecovery) },
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptFileBuffer(dataEncryptionKey, fileBuffer) {
    const iv = randomBytes(12);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      dataEncryptionKey,
      fileBuffer
    );
    return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
  }

  async function decryptFileBuffer(dataEncryptionKey, encryptedPayload) {
    return crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(encryptedPayload.iv) },
      dataEncryptionKey,
      fromBase64(encryptedPayload.ciphertext)
    );
  }

  async function rotateVaultPassphrase(currentDek, newPassphrase, existingMetadata, existingKeyMaterial) {
    const nextPassphraseSalt = randomBytes(16);
    const nextWrapIv = randomBytes(12);
    const passphraseKey = await deriveAesKeyFromSecret(newPassphrase, nextPassphraseSalt, existingMetadata);
    const wrappedDekByPassphrase = await crypto.subtle.wrapKey(
      "raw",
      currentDek,
      passphraseKey,
      { name: "AES-GCM", iv: nextWrapIv }
    );
    return {
      metadata: {
        ...existingMetadata,
        passphraseSalt: toBase64(nextPassphraseSalt),
        wrapIvPassphrase: toBase64(nextWrapIv),
      },
      keyMaterial: {
        ...existingKeyMaterial,
        wrappedDekByPassphrase: toBase64(wrappedDekByPassphrase),
      },
    };
  }

  window.vaultCrypto = {
    createVaultBootstrap,
    unwrapDekWithPassphrase,
    unwrapDekWithRecoveryKey,
    encryptFileBuffer,
    decryptFileBuffer,
    rotateVaultPassphrase,
    aesGcmEncryptUtf8,
    aesGcmDecryptUtf8,
  };
})();

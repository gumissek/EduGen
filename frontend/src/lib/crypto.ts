/**
 * AES-256-GCM transport encryption for API keys.
 *
 * The backend exposes a symmetric AES-256 key via an authenticated endpoint.
 * The frontend imports this key into Web Crypto API, encrypts the plaintext
 * API key, and sends the result as base64( IV[12] || ciphertext+tag ).
 * The backend decrypts before storing with Fernet at rest.
 */

/** Import a base64-encoded 256-bit key into a CryptoKey usable for AES-GCM. */
async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
  ]);
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 *
 * @param plaintext  The secret to encrypt (e.g. an OpenRouter API key).
 * @param keyB64     Base64-encoded 256-bit AES key from the backend.
 * @returns          Base64 string of `IV[12] || ciphertext+authTag[16]`.
 */
export async function encryptAesGcm(
  plaintext: string,
  keyB64: string,
): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  // Concatenate IV + ciphertext (which includes the 16-byte auth tag)
  const result = new Uint8Array(iv.length + ciphertextBuf.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertextBuf), iv.length);

  // Encode as base64
  let binary = "";
  for (const byte of result) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

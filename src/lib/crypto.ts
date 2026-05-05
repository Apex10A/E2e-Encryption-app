const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const textToBuffer = (text: string): ArrayBuffer => {
  return new TextEncoder().encode(text);
};

const bufferToText = (buffer: ArrayBuffer): string => {
  return new TextDecoder().decode(buffer);
};

export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
};

export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey('spki', key);
  return arrayBufferToBase64(exported);
};

export const importPublicKey = async (base64: string): Promise<CryptoKey> => {
  const buffer = base64ToArrayBuffer(base64);
  return crypto.subtle.importKey(
    'spki',
    buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
};

export const encryptMessage = async (
  plaintext: string,
  recipientPublicKey: CryptoKey
): Promise<{ encryptedContent: string; encryptedKey: string; iv: string }> => {
  const aesKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedContentBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    textToBuffer(plaintext)
  );

  const exportedAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const encryptedKeyBuffer = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    recipientPublicKey,
    exportedAesKey
  );

  return {
    encryptedContent: arrayBufferToBase64(encryptedContentBuffer),
    encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
    iv: arrayBufferToBase64(iv),
  };
};

export const decryptMessage = async (
  encryptedContent: string,
  encryptedKey: string,
  iv: string,
  privateKey: CryptoKey
): Promise<string> => {
  try {
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKey);
    const aesKeyBuffer = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedKeyBuffer
    );

    const aesKey = await crypto.subtle.importKey(
      'raw',
      aesKeyBuffer,
      'AES-GCM',
      true,
      ['decrypt']
    );

    const encryptedContentBuffer = base64ToArrayBuffer(encryptedContent);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer),
      },
      aesKey,
      encryptedContentBuffer
    );

    return bufferToText(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Decryption failed]';
  }
};

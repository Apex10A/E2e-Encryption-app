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

export const generateSalt = (): string => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return arrayBufferToBase64(salt.buffer);  // ← add .buffer here
};

export const deriveWrappingKey = async (password: string, saltBase64: string): Promise<CryptoKey> => {
  const salt = base64ToArrayBuffer(saltBase64);
  const passwordBuffer = textToBuffer(password);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['wrapKey', 'unwrapKey']
  );
};

export const wrapPrivateKey = async (privateKey: CryptoKey, wrappingKey: CryptoKey): Promise<{ wrappedKey: string; iv: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey(
    'pkcs8',
    privateKey,
    wrappingKey,
    {
      name: 'AES-GCM',
      iv
    }
  );
  return {
    wrappedKey: arrayBufferToBase64(wrapped),
    iv: arrayBufferToBase64(iv)
  };
};

export const unwrapPrivateKey = async (wrappedKeyBase64: string, wrappingKey: CryptoKey, ivBase64: string): Promise<CryptoKey> => {
  const wrappedKeyBuffer = base64ToArrayBuffer(wrappedKeyBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  return crypto.subtle.unwrapKey(
    'pkcs8',
    wrappedKeyBuffer,
    wrappingKey,
    {
      name: 'AES-GCM',
      iv
    },
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
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

export const encryptMessageForMultiple = async (
  plaintext: string,
  publicKeys: CryptoKey[]
): Promise<{ encryptedContent: string; encryptedKeys: string[]; iv: string }> => {
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
  
  const encryptedKeys = await Promise.all(publicKeys.map(pubKey => 
    crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      pubKey,
      exportedAesKey
    ).then(arrayBufferToBase64)
  ));

  return {
    encryptedContent: arrayBufferToBase64(encryptedContentBuffer),
    encryptedKeys,
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
